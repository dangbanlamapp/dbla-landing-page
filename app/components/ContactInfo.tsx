// No "use client" of its own. It holds no state and calls no hook — CopyButton
// below it is the client boundary, and that is the only part that needs to be.
// Imported from MenuPanel (a client component) this compiles into the client
// bundle anyway; imported from the contact page it stays on the server, which
// is why `onNavigate` is optional rather than a required closer.

import CopyButton from "./CopyButton";
import { EMAIL, PHONE, SOCIAL_LINKS } from "./contact-details";

/**
 * The email / phone / socials column, shared by MenuPanel and the contact page.
 *
 * Colour is deliberately NOT baked in, the same decision `pill.ts` makes about
 * its buttons: the block sits on the menu's orange sheet in beige-on-orange and
 * on the contact panel's orange in dark-on-orange, so each caller passes its own
 * pair through `link`. Nothing here sets a colour, so it inherits until told.
 *
 * `align` is a prop for a smaller reason: both callers want the column flushed
 * right at lg, and differ only in what it does below that — the menu stacks its
 * text left, the contact panel centres it.
 *
 * The copy affordance's own direction is NOT a prop, because it is not a free
 * choice: `flex-row-reverse lg:flex-row` puts the icon on the outside of
 * whichever edge the text is flushed to, so the values stay aligned with each
 * other rather than the icons doing it. That holds for either `align`.
 */
function Detail({
  label,
  value,
  copyLabel,
  align,
  link,
}: {
  label: string;
  value: string;
  copyLabel: string;
  align: string;
  link: string;
}) {
  return (
    <div className={`flex flex-col ${align}`}>
      <p>{label}</p>
      <CopyButton
        value={value}
        label={copyLabel}
        className={`flex-row-reverse lg:flex-row ${link}`}
      >
        <span className="heading-style text-md font-normal">{value}</span>
      </CopyButton>
    </div>
  );
}

export default function ContactInfo({
  align = "items-start lg:items-end",
  link = "",
  className = "",
  onNavigate,
}: {
  /** Cross-axis alignment, applied to the column and to every group in it. */
  align?: string;
  /** Colour and hover pair for the interactive text. */
  link?: string;
  className?: string;
  /** Only the menu needs one — it has to close itself on the way out. */
  onNavigate?: () => void;
}) {
  return (
    <div
      className={`flex flex-col justify-end gap-space-base ${align} ${className}`}
    >
      <Detail
        label="email"
        value={EMAIL}
        copyLabel="email address"
        align={align}
        link={link}
      />
      <Detail
        label="phone"
        value={PHONE}
        copyLabel="phone number"
        align={align}
        link={link}
      />

      <div className={`flex flex-col ${align}`}>
        <p>socials</p>
        <nav aria-label="Social">
          <ul className={`flex flex-col ${align}`}>
            {SOCIAL_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  onClick={onNavigate}
                  className={`heading-style block text-md font-normal transition-colors ${link}`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
