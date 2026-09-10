/** Small helpers shared by the export formats and the citation styles. */

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_SHORT = [
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June',
  'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.',
];

/** "2023-05-12" -> [2023, 5, 12]; month/day omitted when unknown (CSL style). */
export function dateParts(d) {
  if (!d) return null;
  const out = [d.year];
  if (d.month !== undefined) out.push(d.month);
  if (d.day !== undefined) out.push(d.day);
  return out;
}

/** Strips combining accents so "Kucsko" survives non-ASCII input safely. */
export function deaccent(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const BIBTEX_ESCAPES = {
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
  '\\': '\\textbackslash{}',
};

export function escapeBibtex(s) {
  return String(s || '').replace(/[&%$#_{}~^\\]/g, (c) => BIBTEX_ESCAPES[c]);
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'on', 'of', 'in', 'and', 'to', 'for', 'with', 'at',
  'by', 'from', 'is', 'are', 'as', 'or', 'how', 'what', 'why',
]);

/**
 * A stable, human-readable BibTeX key: <surname><year><first-meaningful-word>.
 * Falls back to the site's domain when CJK author/title would yield nothing.
 */
export function citationKey(item) {
  const first = (item.authors || [])[0];
  let surname = first ? first.family || first.literal || '' : '';
  surname = deaccent(surname).replace(/[^A-Za-z0-9]/g, '');

  if (!surname) {
    surname = deaccent((item.host || '').split('.')[0] || '').replace(/[^A-Za-z0-9]/g, '');
  }
  if (!surname) surname = 'web';

  const year = (item.published && item.published.year) || (item.accessed && item.accessed.year) || '';

  let word = '';
  if (/[A-Za-z]/.test(item.title || '')) {
    for (const w of deaccent(item.title).toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length > 2 && !STOPWORDS.has(w)) {
        word = w;
        break;
      }
    }
  }

  // BibTeX keys are case-sensitive but lowercase is the universal convention.
  const key = `${surname}${year}${word}`.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  return key || 'reference';
}

/** Keep CJK, latin letters, digits and hyphens; drop everything else. */
const CJK = '一-鿿㐀-䶿';

/**
 * A download filename that is safe on Windows and stays readable:
 * "Kucsko-2013-nanometre-scale-thermometry.ris"
 */
export function filenameFor(item, ext) {
  const first = (item.authors || [])[0];
  let who = first ? first.family || first.literal || '' : '';
  if (!who) who = item.host || 'web';
  // Dots become hyphens first so a host fallback reads as "bbc-com", not "bbccom".
  who = String(who)
    .replace(/\./g, '-')
    .replace(new RegExp(`[^A-Za-z0-9${CJK}-]`, 'g'), '');

  const year =
    (item.published && item.published.year) || (item.accessed && item.accessed.year) || '';

  const slug = String(item.title || '')
    .replace(new RegExp(`[^A-Za-z0-9${CJK}]+`, 'g'), '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const name = [who, year, slug].filter(Boolean).join('-') || 'citation';

  // Windows rejects these outright, and silently drops trailing dots/spaces.
  const safe = name.replace(/[\\/:*?"<>|]/g, '').replace(/[. ]+$/, '');
  return `${safe.slice(0, 120)}.${ext}`;
}
