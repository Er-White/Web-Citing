import { chicagoAuthors, ensurePeriod, monthLong } from './shared.js';

/** "May 12, 2023" — Chicago spells the month out. */
function chicagoDate(d) {
  if (!d || d.month === undefined) return '';
  const m = monthLong(d.month);
  return d.day === undefined ? `${m} ${d.year}` : `${m} ${d.day}, ${d.year}`;
}

/** Chicago Author-Date: year right after the author, then the quoted title. */
export function chicago(item, opts = {}) {
  const out = [];
  const authors = chicagoAuthors(item.authors);
  if (authors) out.push(ensurePeriod(authors));

  if (item.published) out.push(ensurePeriod(String(item.published.year)));

  if (item.title) {
    const t = ensurePeriod(item.title);
    out.push(item.siteName ? `"${t}"` : t);
  }

  if (item.siteName) out.push(ensurePeriod(item.siteName));

  const full = chicagoDate(item.published);
  if (full) out.push(ensurePeriod(full));

  // Access date follows the same setting as APA/MLA/Harvard rather than having
  // its own rule — one switch the user can reason about. (GB/T always includes
  // it, because there it is mandatory.)
  if (opts.retrievalDate && item.accessed) {
    const a = chicagoDate(item.accessed);
    if (a) out.push(ensurePeriod(`Accessed ${a}`));
  }

  if (item.url) out.push(ensurePeriod(item.url));

  return out.join(' ');
}
