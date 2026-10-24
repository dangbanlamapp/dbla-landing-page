import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/**
 * The two emails a submission sends, as plain HTML strings: two short
 * messages do not earn a templating dependency. Inline styles only, because
 * that is all most mail clients keep.
 *
 * Everything the visitor typed is escaped before it goes in — it is their
 * text inside our HTML, and a name like `<img src=…>` must arrive as words.
 */

export type Submission = {
  name: string;
  company: string;
  email: string;
  message: string;
  locale: Locale;
};

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Line breaks survive the escape as `<br>`, so a message keeps its shape. */
const paragraph = (text: string) => escape(text).replace(/\r?\n/g, "<br>");

const wrap = (inner: string) =>
  `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:560px">${inner}</div>`;

function table(rows: [label: string, value: string][]) {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escape(label)}</td><td style="padding:6px 0">${value}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse">${cells}</table>`;
}

/** To the team. In English whatever page it came from — the language is a
 *  row in the table instead, so the reply can be written in it. */
export function notification(s: Submission) {
  const mailto = `<a href="mailto:${escape(s.email)}">${escape(s.email)}</a>`;
  const rows: [string, string][] = [
    ["Name", escape(s.name)],
    ["Company", escape(s.company)],
    ["Email", mailto],
    ["Language", s.locale === "vi" ? "Vietnamese" : "English"],
    ["Message", s.message ? paragraph(s.message) : "<em>(none)</em>"],
  ];
  return {
    subject: `New enquiry — ${s.name}, ${s.company}`,
    html: wrap(
      `<p style="margin:0 0 16px"><strong>New message from the contact form.</strong> Reply to this email to answer ${escape(s.name)} directly.</p>${table(rows)}`,
    ),
    text: [
      `New message from the contact form.`,
      ``,
      `Name: ${s.name}`,
      `Company: ${s.company}`,
      `Email: ${s.email}`,
      `Language: ${s.locale === "vi" ? "Vietnamese" : "English"}`,
      ``,
      s.message || "(no message)",
    ].join("\n"),
  };
}

/** To the visitor, in the language of the page they wrote from. */
export async function confirmation(s: Submission) {
  const t = await getTranslations({
    locale: s.locale,
    namespace: "ContactEmail",
  });
  const rows: [string, string][] = [
    [t("name"), escape(s.name)],
    [t("company"), escape(s.company)],
    [t("email"), escape(s.email)],
  ];
  if (s.message) rows.push([t("message"), paragraph(s.message)]);

  return {
    subject: t("subject"),
    html: wrap(
      [
        `<p style="margin:0 0 16px">${escape(t("greeting", { name: s.name }))}</p>`,
        `<p style="margin:0 0 16px">${escape(t("body"))}</p>`,
        `<p style="margin:0 0 8px;color:#666">${escape(t("recap"))}</p>`,
        table(rows),
        `<p style="margin:24px 0 0">${escape(t("signoff"))}<br>${escape(t("team"))}</p>`,
      ].join(""),
    ),
    text: [
      t("greeting", { name: s.name }),
      ``,
      t("body"),
      ``,
      t("recap"),
      `${t("name")}: ${s.name}`,
      `${t("company")}: ${s.company}`,
      `${t("email")}: ${s.email}`,
      ...(s.message ? [`${t("message")}:`, s.message] : []),
      ``,
      t("signoff"),
      t("team"),
    ].join("\n"),
  };
}
