import { ensurePeriod, mlaAuthors, monthShort } from './shared.js';

/** "12 May 2023" / "May 2023" / "2023" */
function mlaDate(d) {
  if (!d) return '';
  if (d.month === undefined) return String(d.year);
  const m = monthShort(d.month);
  return d.day === undefined ? `${m} ${d.year}` : `${d.day} ${m} ${d.year}`;
}

export function mla(item, opts = {}) {
  const out = [];
  const authors = mlaAuthors(item.authors);
  if (authors) out.push(`${authors}.`);

  // MLA quotes a source title when it lives inside a larger container (the site).
  if (item.title) {
    const t = ensurePeriod(item.title);
    out.push(item.siteName ? `"${t}"` : t);
  }

  // Everything after the title is one comma-separated run ending in a period.
  const tail = [];
  if (item.siteName) tail.push(item.siteName);
  if (item.published) tail.push(mlaDate(item.published));
  if (item.url) tail.push(item.url);
  if (tail.length) out.push(`${tail.join(', ')}.`);

  // MLA 9 places the access date at the very end of the entry, after the URL.
  if (opts.retrievalDate && item.accessed) {
    out.push(`Accessed ${mlaDate(item.accessed)}.`);
  }

  return out.join(' ');
}
