"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitContact } from "@/app/[locale]/contact/actions";
import { PILL } from "./pill";
import {
  CONTACT_FIELDS,
  HONEYPOT,
  LIMITS,
  type ContactField,
  type ContactState,
} from "./contact-form";

/**
 * Shared shape of the fields. Underline-only: no box, no fill — the border is
 * the whole affordance, so the row reads as a ruled line on the orange rather
 * than as a widget sitting on top of it.
 *
 * `border-black/25` is the same stroke DashedCircle uses for the rings, which
 * is what keeps the ruled lines, the cross lines and the circle reading as one
 * drawn layer instead of three near-misses.
 *
 * bg-transparent is not redundant: a bare input paints white in every browser,
 * and on an orange panel that is the whole difference between a line and a box.
 * The autofill overrides are the same fix for Chrome's yellow.
 *
 * `aria-invalid` darkens the line to the focus weight: the error text beside
 * it says what is wrong, the line says where.
 */
const FIELD =
  "w-full border-b border-black/25 bg-transparent py-space--1x text-base " +
  "placeholder:text-foreground/70 focus:border-black/60 focus:outline-none " +
  "aria-invalid:border-black/60 " +
  "[&:-webkit-autofill]:[-webkit-text-fill-color:var(--foreground)] " +
  "[&:-webkit-autofill]:[transition:background-color_9999s]";

const INPUTS: Record<
  Exclude<ContactField, "message">,
  { type: string; autoComplete: string }
> = {
  name: { type: "text", autoComplete: "name" },
  company: { type: "text", autoComplete: "organization" },
  email: { type: "email", autoComplete: "email" },
};

/** The Studio's placeholder for each field, where it has one; Contact
 *  resolves these and the button label before they get here. */
export type ContactFormCopy = Partial<Record<ContactField, string>> & {
  submit: string;
};

/**
 * The form, and the one part of the contact page that hydrates. After a
 * success it swaps for a thank-you, and "send another" brings back an empty
 * form by remounting it — a new key is a fresh useActionState, which is the
 * only way to put an action's state back to idle.
 */
export default function ContactForm({ copy }: { copy: ContactFormCopy }) {
  const [round, setRound] = useState(0);
  return (
    <Form key={round} copy={copy} onAgain={() => setRound((n) => n + 1)} />
  );
}

function Form({
  copy,
  onAgain,
}: {
  copy: ContactFormCopy;
  onAgain: () => void;
}) {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitContact,
    { status: "idle" },
  );

  // When the form came on screen, for the action's too-fast-to-be-a-person
  // check. Set in an effect so it is the reader's clock, not the build's: the
  // page is static, and a render-time timestamp would be hours old.
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-start">
        <p className="heading-style text-3xl leading-heading">
          {t("successTitle")}
        </p>
        <p className="mt-space-base max-w-[46ch] text-base leading-body">
          {t("successBody")}
          {state.confirmed && ` ${t("successConfirmation")}`}
        </p>
        <button
          type="button"
          onClick={onAgain}
          className={`${PILL} mt-space-2x bg-background text-foreground lg:mt-space-3x`}
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const failed = state.status === "error" && !errors;

  return (
    <form
      action={(formData) => {
        formData.set("elapsed", String(Date.now() - shownAt.current));
        formAction(formData);
      }}
      noValidate
      className="flex flex-col gap-space-base lg:gap-space-2x"
    >
      <input type="hidden" name="locale" value={locale} />

      {/* The honeypot: off-screen rather than display:none, which some bots
          know to skip, and out of the tab order and the accessibility tree so
          no person ever reaches it. Filled means a bot — so nothing a person
          uses may fill it either: see HONEYPOT for the name, and the data-
          attributes are the opt-outs 1Password, LastPass and Bitwarden
          honour. */}
      <input
        type="text"
        name={HONEYPOT}
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        aria-hidden
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      {CONTACT_FIELDS.map((field) => {
        const label = copy[field] ?? t(field);
        const error = errors?.[field];
        const shared = {
          id: field,
          name: field,
          placeholder: label,
          maxLength: LIMITS[field],
          defaultValue: values?.[field],
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? `${field}-error` : undefined,
        };
        return (
          <div key={field}>
            {/* The visible text is the placeholder, so the label has to exist
                separately for the accessible name — once a reader starts
                typing, a placeholder-only field has none. */}
            <label htmlFor={field} className="sr-only">
              {label}
            </label>
            {field === "message" ? (
              /* What the visitor types keeps its own case here: a paragraph
                 about their project in capitals would be shouting. Only the
                 placeholder matches the fields above. */
              <textarea
                {...shared}
                rows={2}
                className={`${FIELD} resize-none placeholder:uppercase`}
              />
            ) : (
              <input
                {...shared}
                {...INPUTS[field]}
                required
                className={`${FIELD} uppercase`}
              />
            )}
            {error && (
              <p
                id={`${field}-error`}
                className="mt-space--3x text-sm uppercase"
              >
                {t(error)}
              </p>
            )}
          </div>
        );
      })}

      <div
        aria-live="polite"
        className="mt-space-2x flex flex-col items-start gap-space-base lg:mt-space-3x"
      >
        {failed && (
          <p className="max-w-[46ch] text-sm leading-body">
            {t("serverError")}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className={`${PILL} cursor-pointer bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {pending ? t("sending") : copy.submit}
        </button>
      </div>
    </form>
  );
}
