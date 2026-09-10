import { authorToString, pad2 } from '../normalize.js';

/**
 * A web page's Access Date is stored as MM/DD/YYYY — the shape EndNote itself
 * emits. Not YYYY/MM/DD: that is the Date field's convention, and using it here
 * is one of the two reasons an access date can land in the wrong shape.
 */
function accessDate(d) {
  if (d.month === undefined || d.day === undefined) return String(d.year);
  return `${pad2(d.month)}/${pad2(d.day)}/${d.year}`;
}

/** EndNote's Date field uses YYYY/MM/DD, as its own RIS export does. */
function isoDate(d) {
  const md = d.month !== undefined ? `/${pad2(d.month)}` : '';
  const dd = d.day !== undefined ? `/${pad2(d.day)}` : '';
  return `${d.year}${md}${dd}`;
}

/**
 * EndNote tagged format: one field per line, `%X value`, records separated by a
 * blank line.
 *
 * The tags below mirror a real `.enw` exported by EndNote for a Web Page, which
 * is the only reliable source: Clarivate publishes the tag table for the GENERIC
 * reference type only, and says other types are mapped by the import filter's
 * own template, which is not published. For a web page that template differs
 * sharply from the generic table — most importantly %N, "Number (Issue)" in the
 * generic table, carries the Access Date here.
 *
 * EndNote's own web page export, for reference:
 *   %0 Web Page / %A / %D / %T / %B / %N 09/10/2026 / %8 2026/09/10 / %U
 */
export function toEnw(item) {
  const out = [];

  out.push('%0 Web Page');
  if (item.title) out.push(`%T ${item.title}`);

  for (const a of item.authors) out.push(`%A ${authorToString(a)}`);

  if (item.siteName) out.push(`%B ${item.siteName}`);
  if (item.publisher && item.publisher !== item.siteName) out.push(`%I ${item.publisher}`);

  if (item.published) out.push(`%D ${item.published.year}`);

  // Access date, written to both tags EndNote uses for it so that whichever the
  // style reads is populated. %N is the Access Date field proper; %8 is the
  // generic Date field, which endnote.com also fills from the same value.
  if (item.accessed) {
    out.push(`%N ${accessDate(item.accessed)}`);
    out.push(`%8 ${isoDate(item.accessed)}`);
  }

  if (item.url) out.push(`%U ${item.url}`);
  if (item.doi) out.push(`%R ${item.doi}`);
  if (item.abstract) out.push(`%X ${item.abstract}`);

  return `${out.join('\r\n')}\r\n\r\n`;
}
