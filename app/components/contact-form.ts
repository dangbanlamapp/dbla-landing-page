/**
 * What the contact form and its Server Action agree on. A plain module rather
 * than part of either: the action's file may only export async functions, and
 * the form needs the limits at render time for `maxLength`.
 */

/** In the order the form prints them. Only `message` is optional. */
export const CONTACT_FIELDS = ["name", "company", "email", "message"] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

/**
 * The hidden spam trap's name. It must mean nothing to autofill: Chrome and
 * password managers match fields by name and ignore `autocomplete="off"`, so
 * a trap called `website` or `url` gets filled for real people and their
 * message is dropped as spam.
 */
export const HONEYPOT = "_gotcha";

/**
 * Character caps, checked on the server and mirrored as `maxLength` so a
 * reader is stopped while typing rather than told afterwards. Generous on
 * purpose — they exist to refuse junk, not to edit anyone. 254 is the longest
 * address SMTP allows.
 */
export const LIMITS: Record<ContactField, number> = {
  name: 120,
  company: 160,
  email: 254,
  message: 5000,
};

/** Keys of the Contact messages, so the action can stay language-free and
 *  the form translates. */
export type FieldError = "required" | "invalidEmail" | "tooLong";

export type ContactState =
  | { status: "idle" }
  | {
      status: "success";
      /** Whether a confirmation reached Resend for the visitor's inbox. */
      confirmed: boolean;
    }
  | {
      status: "error";
      /** Unset when the input was fine and sending it failed. */
      errors?: Partial<Record<ContactField, FieldError>>;
      /** Echoed back so the fields refill: React resets a form after its
       *  action runs, and a reader who mistyped one address should not have
       *  to retype their whole project. */
      values: Partial<Record<ContactField, string>>;
    };
