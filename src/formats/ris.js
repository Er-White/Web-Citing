import { authorToString, pad2 } from '../normalize.js';

/**
 * RIS records are "TAG  - value": a two-character tag, TWO spaces, a hyphen,
 * ONE space. Getting that spacing wrong makes parsers drop the whole record
 * silently, so it is centralised here.
 */
const line = (tag, value) => `${tag}  - ${value}`;

/** RIS dates are YYYY, YYYY/MM or YYYY/MM/DD — never zero-padded months alone. */
function risDate(d) {
  if (!d) return '';
  if (d.month === undefined) return String(d.year);
  if (d.day === undefined) return `${d.year}/${pad2(d.month)}`;
  return `${d.year}/${pad2(d.month)}/${pad2(d.day)}`;
}

export function toRis(item) {
  const out = [];

  // RIS has no "web page" tag of its own in the original spec; WEB is what
  // Zotero, EndNote and Mendeley all agree on for this record type.
  out.push(line('TY', 'WEB'));
  if (item.title) out.push(line('TI', item.title));

  for (const a of item.authors) out.push(line('AU', authorToString(a)));

  if (item.siteName) out.push(line('T2', item.siteName));
  if (item.publisher && item.publisher !== item.siteName) out.push(line('PB', item.publisher));
  if (item.abstract) out.push(line('AB', item.abstract));

  const published = risDate(item.published);
  if (published) out.push(line('DA', published));
  if (item.published) out.push(line('PY', String(item.published.year)));

  // Two access-date tags, because the two big importers disagree on where a web
  // page keeps it: Zotero reads Y2, EndNote writes (and reads) M1. Emitting both
  // is safe — Zotero's importer explicitly avoids letting M1 overwrite Y2.
  const accessed = risDate(item.accessed);
  if (accessed) {
    out.push(line('Y2', accessed));
    out.push(line('M1', accessed));
  }

  if (item.url) out.push(line('UR', item.url));
  if (item.doi) out.push(line('DO', item.doi));
  if (item.language) out.push(line('LA', item.language));

  out.push(line('ER', ''));

  // Each record must be closed by a blank line, otherwise the next record runs on.
  return `${out.join('\r\n')}\r\n\r\n`;
}
