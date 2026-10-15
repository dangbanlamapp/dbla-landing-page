import { Fragment, type ReactNode } from "react";

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

/**
 * A heading edited in the Studio, the same two bits of markup in a shape that
 * needs no parsing: a list of lines, each a run of segments, some accented.
 * content.ts flattens the Studio's rich text into this, so components never
 * see a Portable Text block.
 */
export type RichHeading = { text: string; accent?: boolean }[][];

/**
 * A Studio heading as the markup `t.rich(key, RICH)` produces from a message —
 * the same `<br />` between lines and the same accent span — so SplitText and
 * every class on the heading behave exactly as they do with the fallback.
 */
export function richHeading(lines: RichHeading) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && RICH.br()}
      {line.map(({ text, accent }, j) => (
        <Fragment key={j}>{accent ? RICH.accent(text) : text}</Fragment>
      ))}
    </Fragment>
  ));
}
