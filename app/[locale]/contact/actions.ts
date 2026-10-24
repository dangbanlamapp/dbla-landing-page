"use server";

import { hasLocale } from "next-intl";
import { Resend } from "resend";
import {
  CONTACT_FIELDS,
  HONEYPOT,
  LIMITS,
  type ContactField,
  type ContactState,
  type FieldError,
} from "@/app/components/contact-form";
import { routing } from "@/i18n/routing";
import { writeClient } from "@/sanity/lib/writeClient";
import { confirmation, notification, type Submission } from "./emails";

/** Where the team hears about a new submission. */
const NOTIFY_TO = process.env.CONTACT_NOTIFY_TO || "dangbanlamapp@gmail.com";

/**
 * The sender. Resend's shared address works before a domain is verified, but
 * only to the Resend account's own email — fine for the team notification
 * while testing, useless for writing to a visitor. So the visitor's
 * confirmation is sent only once CONTACT_FROM names an address on a verified
 * domain.
 */
const FROM = process.env.CONTACT_FROM;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : undefined;

/** Deliberately loose: one @, something either side, a dot in the domain.
 *  The confirmation email is the real test of an address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Faster than this from first paint to submit is not a person. Kept short:
 *  someone who autofills the whole form in one click can submit in about two
 *  seconds, and a bot posts in milliseconds. */
const MIN_FILL_MS = 1000;

/**
 * The contact form's action — called by ContactForm through useActionState,
 * hence the unused previous state.
 *
 * A Server Action is a public endpoint whatever page renders the form, so
 * nothing the browser sent is trusted: every field is re-validated here and
 * the `required`/`maxLength` attributes on the inputs are only a courtesy.
 *
 * Order matters. The submission is written to Sanity first, because that is
 * the record; the emails go after it and their failure is logged, not shown.
 * Once the document exists the message has been received, and telling the
 * visitor otherwise would only make them send it twice.
 */
export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field, read(formData, field)]),
  ) as Record<ContactField, string>;

  // Spam. A bot fills every field it finds, including the one no person can
  // see, and submits the instant the page loads. Either earns a success it
  // can learn nothing from — an error would tell it what to change. A
  // missing timer is let through: it is only absent without JavaScript.
  //
  // Logged, because a false positive is otherwise invisible: the visitor sees
  // a thank-you and nothing is saved or sent. That is exactly how the first
  // version of the honeypot failed — it was named `website`, which browser
  // autofill and password managers fill in for real people.
  const elapsed = Number(formData.get("elapsed"));
  const trap = formData.get(HONEYPOT);
  if (trap || (elapsed > 0 && elapsed < MIN_FILL_MS)) {
    console.warn("[contact] dropped as spam", {
      honeypot: Boolean(trap),
      elapsed,
      email: values.email,
    });
    return { status: "success", confirmed: false };
  }

  const errors = validate(values);
  if (Object.keys(errors).length) return { status: "error", errors, values };

  const requested = String(formData.get("locale"));
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const submission: Submission = { ...values, locale };

  if (!writeClient) {
    console.error("[contact] SANITY_API_WRITE_TOKEN is not set");
    return { status: "error", values };
  }

  let id: string;
  try {
    // Dotted id: on a public dataset this is what keeps the document out of
    // unauthenticated reads. See the schema in the Studio.
    ({ _id: id } = await writeClient.create({
      _id: `submission.${crypto.randomUUID()}`,
      _type: "contactSubmission",
      status: "new",
      ...submission,
      submittedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("[contact] could not save the submission", error);
    return { status: "error", values };
  }

  console.info(`[contact] saved ${id}`);
  const confirmed = await sendEmails(submission, id);
  return { status: "success", confirmed };
}

/** Trimmed, and single-line fields collapsed to one line: a name with a line
 *  break in it would otherwise land in the notification's subject. */
function read(formData: FormData, field: ContactField) {
  const value = String(formData.get(field) ?? "").trim();
  return field === "message"
    ? value.replace(/\r\n/g, "\n")
    : value.replace(/\s+/g, " ");
}

function validate(values: Record<ContactField, string>) {
  const errors: Partial<Record<ContactField, FieldError>> = {};
  for (const field of CONTACT_FIELDS) {
    const value = values[field];
    if (!value && field !== "message") errors[field] = "required";
    else if (value.length > LIMITS[field]) errors[field] = "tooLong";
  }
  if (!errors.email && !EMAIL.test(values.email)) {
    errors.email = "invalidEmail";
  }
  return errors;
}

/**
 * Both emails at once, each allowed to fail without the other. The
 * idempotency keys are the document's id, so a retried request can never
 * deliver the same submission twice.
 *
 * Resolves to whether the visitor's confirmation went out, so the thank-you
 * only promises one when there is one to promise.
 */
async function sendEmails(submission: Submission, id: string) {
  if (!resend) {
    console.warn("[contact] RESEND_API_KEY is not set — saved, not emailed");
    return false;
  }

  const from = FROM || "DBLA Website <onboarding@resend.dev>";
  const sends = [
    resend.emails.send(
      {
        from,
        to: NOTIFY_TO,
        // Reply goes to the visitor, not back to the site's own address.
        replyTo: submission.email,
        ...notification(submission),
      },
      { idempotencyKey: `${id}/notify` },
    ),
  ];
  if (FROM) {
    sends.push(
      resend.emails.send(
        {
          from: FROM,
          to: submission.email,
          replyTo: NOTIFY_TO,
          ...(await confirmation(submission)),
        },
        { idempotencyKey: `${id}/confirm` },
      ),
    );
  }

  // The SDK reports API failures in `error` rather than throwing, so both
  // shapes are checked.
  const results = await Promise.allSettled(sends);
  const failed = results.map((result) => {
    const error =
      result.status === "rejected" ? result.reason : result.value.error;
    if (error) console.error(`[contact] email failed for ${id}`, error);
    return Boolean(error);
  });
  // The confirmation is the second send, when there is one.
  return sends.length > 1 && !failed[1];
}
