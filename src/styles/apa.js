import { apaAuthors, authorIsSite, ensurePeriod, monthLong } from './shared.js';

/** "(2023, May 12)" / "(2023, May)" / "(2023)" / "n.d." */
function apaDate(d) {
  if (!d) return 'n.d.';
  if (d.month === undefined) return String(d.year);
  const m = monthLong(d.month);
  return d.day === undefined ? `${d.year}, ${m}` : `${d.year}, ${m} ${d.day}`;
}

function apaAccessed(d) {
  if (!d || d.month === undefined) return String((d && d.year) || '');
  const m = monthLong(d.month);
  return d.day === undefined ? `${m} ${d.year}` : `${m} ${d.day}, ${d.year}`;
}

export function apa(item, opts = {}) {
  const out = [];
  const authors = apaAuthors(item.authors);
  const date = apaDate(item.published);

  if (authors) {
    out.push(`${authors} (${date}).`);
    if (item.title) out.push(ensurePeriod(item.title));
  } else if (item.title) {
    // No author: the title takes the author slot and the date follows it.
    out.push(`${ensurePeriod(item.title)} (${date}).`);
  }

  // APA omits the site name when it merely repeats the author.
  if (item.siteName && !authorIsSite(item)) out.push(ensurePeriod(item.siteName));

  if (item.url) {
    // A retrieval date is only called for when the content is designed to change.
    if (opts.retrievalDate && item.accessed) {
      out.push(`Retrieved ${apaAccessed(item.accessed)}, from ${item.url}`);
    } else {
      out.push(item.url);
    }
  }

  return out.join(' ');
}
