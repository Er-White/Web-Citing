import { authorToString, pad2 } from '../normalize.js';
import { citationKey, escapeBibtex } from '../util.js';

const MONTH_MACROS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const brace = (s) => `{${escapeBibtex(s)}}`;

function urlDate(d) {
  const md = d.month !== undefined ? `-${pad2(d.month)}` : '';
  const dd = d.day !== undefined ? `-${pad2(d.day)}` : '';
  return `${d.year}${md}${dd}`;
}

/**
 * @misc is used rather than @online because plain BibTeX (not only BibLaTeX)
 * has no @online entry type and would warn on it. `howpublished` is the one
 * field both BibTeX and BibLaTeX actually render, so the site name goes there.
 *
 * Values are pre-rendered including their braces. Escaping must happen BEFORE
 * wrapping — `escapeBibtex` would otherwise mangle the delimiters themselves.
 */
export function toBibtex(item) {
  const fields = [];

  if (item.authors.length) {
    fields.push(['author', brace((item.authors || []).map(authorToString).join(' and '))]);
  }

  // Double braces: the outer pair delimits the field, the inner pair stops
  // BibTeX from lower-casing the capitalisation out of the title.
  if (item.title) fields.push(['title', `{{${escapeBibtex(item.title)}}}`]);

  if (item.siteName) fields.push(['howpublished', brace(item.siteName)]);
  if (item.publisher && item.publisher !== item.siteName) {
    fields.push(['publisher', brace(item.publisher)]);
  }

  if (item.published) {
    fields.push(['year', `{${item.published.year}}`]);
    if (item.published.month !== undefined) {
      // Deliberately NOT braced: BibTeX only expands an unbraced month macro.
      fields.push(['month', MONTH_MACROS[item.published.month - 1]]);
    }
  }

  if (item.url) fields.push(['url', brace(item.url)]);
  if (item.accessed) fields.push(['urldate', `{${urlDate(item.accessed)}}`]);
  if (item.doi) fields.push(['doi', brace(item.doi)]);
  if (item.abstract) fields.push(['abstract', brace(item.abstract)]);

  const width = fields.reduce((max, [k]) => Math.max(max, k.length), 0);
  const body = fields.map(([k, v]) => `  ${k.padEnd(width)} = ${v},`).join('\n');

  return `@misc{${citationKey(item)},\n${body}\n}\n`;
}
