import { ensurePeriod, harvardAuthors, monthLong } from './shared.js';

/** Cite Them Right spells the month out: "10 September 2026". */
function harvardAccessed(d) {
  if (!d || d.month === undefined) return String((d && d.year) || '');
  const m = monthLong(d.month);
  return d.day === undefined ? `${m} ${d.year}` : `${d.day} ${m} ${d.year}`;
}

export function harvard(item, opts = {}) {
  const out = [];
  const authors = harvardAuthors(item.authors);
  const year = item.published ? String(item.published.year) : 'no date';

  if (authors) {
    out.push(`${ensurePeriod(authors)} (${year})`);
    if (item.title) out.push(ensurePeriod(item.title));
  } else if (item.title) {
    // No author: title first, then the year in parentheses.
    out.push(`${ensurePeriod(item.title)} (${year})`);
  }

  if (item.siteName) out.push(ensurePeriod(item.siteName));

  if (item.url) {
    let s = `Available at: ${item.url}`;
    if (item.accessed) s += ` (Accessed: ${harvardAccessed(item.accessed)})`;
    out.push(ensurePeriod(s));
  }

  return out.join(' ');
}
