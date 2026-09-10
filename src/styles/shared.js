import { MONTHS_LONG, MONTHS_SHORT } from '../util.js';

/** "G." -> "G." ; "G. P." -> "G. P." ; "George Peter" -> "G. P." */
export function initials(given) {
  return String(given || '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(' ');
}

/** GB/T 7714 writes Western names as "MAURER P C" — caps surname, bare initials. */
export function gbtName(a) {
  if (a.literal) return a.literal;
  const family = String(a.family || '').toUpperCase();
  const init = String(a.given || '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase());
  return init.length ? `${family} ${init.join(' ')}` : family;
}

export const familyOf = (a) => (a ? a.literal || a.family || '' : '');

export function ensurePeriod(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  return /[.!?。！？]$/.test(t) ? t : `${t}.`;
}

export const monthLong = (m) => MONTHS_LONG[m - 1] || '';
export const monthShort = (m) => MONTHS_SHORT[m - 1] || '';

/** True when the first author is just the site repeating itself (e.g. BBC News). */
export function authorIsSite(item) {
  if (!item.siteName || !item.authors.length) return false;
  const a = familyOf(item.authors[0]).toLowerCase();
  const s = String(item.siteName).toLowerCase();
  return a === s || s.includes(a) || a.includes(s);
}

// ------------------------------------------------- per-style author lists

export function apaAuthors(authors) {
  const names = authors.map((a) => (a.literal ? a.literal : `${a.family}, ${initials(a.given)}`));
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  // APA 7: up to 20 authors are listed in full; 21+ elides the middle.
  if (names.length <= 20) return `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`;
  return `${names.slice(0, 19).join(', ')}, ... ${names.at(-1)}`;
}

export function mlaAuthors(authors) {
  if (!authors.length) return '';
  const first = authors[0].literal
    ? authors[0].literal
    : `${authors[0].family}${authors[0].given ? `, ${authors[0].given}` : ''}`;
  if (authors.length === 1) return first;
  if (authors.length === 2) {
    const second = authors[1].literal || `${authors[1].given} ${authors[1].family}`.trim();
    return `${first}, and ${second}`;
  }
  return `${first}, et al`;
}

export function chicagoAuthors(authors) {
  if (!authors.length) return '';
  const invert = (a) =>
    a.literal ? a.literal : `${a.family}${a.given ? `, ${a.given}` : ''}`;
  const normal = (a) => (a.literal ? a.literal : `${a.given} ${a.family}`.trim());

  if (authors.length === 1) return invert(authors[0]);
  if (authors.length === 2) return `${invert(authors[0])}, and ${normal(authors[1])}`;
  if (authors.length === 3) {
    return `${invert(authors[0])}, ${normal(authors[1])}, and ${normal(authors[2])}`;
  }
  // Chicago drops to "et al." from four authors on.
  return `${invert(authors[0])}, et al`;
}

export function harvardAuthors(authors) {
  if (!authors.length) return '';
  const fmt = (a) => (a.literal ? a.literal : `${a.family}, ${initials(a.given)}`);
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])} and ${fmt(authors[1])}`;
  if (authors.length === 3) {
    return `${fmt(authors[0])}, ${fmt(authors[1])} and ${fmt(authors[2])}`;
  }
  return `${fmt(authors[0])} et al`;
}

/** GB/T 7714-2015: up to 3 named in full, then ", 等" / ", et al". */
export function gbtAuthors(authors) {
  if (!authors.length) return '';
  const cjk = authors.some((a) => a.literal);
  const fmt = (a) => (a.literal ? a.literal : gbtName(a));
  if (authors.length <= 3) return authors.map(fmt).join(', ');
  return `${authors.slice(0, 3).map(fmt).join(', ')}${cjk ? ', 等' : ', et al'}`;
}
