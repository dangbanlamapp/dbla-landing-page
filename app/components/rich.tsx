import type { ReactNode } from "react";

/**
 * The two tags the UI strings in messages/ may use, for `t.rich(key, RICH)`.
 *
 * The headings carry markup mid-sentence — a line break and an accent-coloured
 * phrase — and where those fall is a matter of each language's word order:
 * "We build <accent>digital products</accent>" puts the accent last, and the
 * Vietnamese may not. So the message decides where the tags go, and this
 * decides what they render, keeping class names out of the JSON.
 *
 * Paired `<br></br>` in the messages, not `<br/>`: ICU message syntax has no
 * self-closing tags.
 */
export const RICH = {
  br: () => <br />,
  accent: (chunks: ReactNode) => <span className="text-accent">{chunks}</span>,
};
