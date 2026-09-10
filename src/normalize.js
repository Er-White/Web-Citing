/**
 * Turns the raw extraction record into a single canonical shape that every
 * formatter and citation style reads from.
 *
 *   { type, title, authors[], siteName, publisher, url, published, modified,
 *     accessed, language, doi, abstract, sources }
 *
 * `published` / `modified` / `accessed` are {year, month?, day?} — month and day
 * are optional because plenty of pages only disclose a year.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const CJK_RE = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/;

// Particles that belong to the surname. "Ludwig van Beethoven" must not become
// family="Beethoven"; the surname is "van Beethoven".
const PARTICLES = new Set([
  'van', 'von', 'de', 'del', 'della', 'der', 'den', 'da', 'das', 'di', 'du',
  'la', 'le', 'ten', 'ter', 'dos', 'filho', 'bin', 'ibn', 'al',
]);

const NAME_SUFFIX_RE = /^(jr|sr|ii|iii|iv|v)\.?$/i;

// Query parameters that are pure tracking noise — dropping them keeps the URL
// in the citation stable and readable.
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref_src', 'spm_id_from',
  'yclid', 'igshid', 'share_token', 'from_source',
];

// ------------------------------------------------------------------- dates

function mkDate(year, month, day) {
  if (!Number.isFinite(year) || year < 1000 || year > 2999) return null;
  const out = { year };
  if (Number.isFinite(month) && month >= 1 && month <= 12) {
    out.month = month;
    if (Number.isFinite(day) && day >= 1 && day <= 31) out.day = day;
  }
  return out;
}

/** Parses the many date shapes pages emit into {year, month?, day?}. */
export function parseDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // 2023-05-12, 2023/5/12, 2023-05-12T10:30:00Z, 2023.05.12
  let m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (m) return mkDate(+m[1], +m[2], m[3] ? +m[3] : undefined);

  // 20230512
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return mkDate(+m[1], +m[2], +m[3]);

  // 2023
  m = s.match(/^(\d{4})$/);
  if (m) return mkDate(+m[1]);

  // "12 May 2023", "12 May, 2023"
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})/);
  if (m) {
    const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mo !== -1) return mkDate(+m[3], mo + 1, +m[1]);
  }

  // "May 12, 2023"
  m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mo !== -1) return mkDate(+m[3], mo + 1, +m[2]);
  }

  // "May 2023"
  m = s.match(/^([A-Za-z]+)\.?,?\s+(\d{4})/);
  if (m) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mo !== -1) return mkDate(+m[2], mo + 1);
  }

  // Last resort — anything the JS date parser accepts (RFC 2822 and friends).
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

  return null;
}

export const pad2 = (n) => String(n).padStart(2, '0');

/** "2023-05-12" / "2023-05" / "2023" — always zero-padded. */
export function isoDate(d) {
  if (!d) return '';
  if (d.month === undefined) return String(d.year);
  if (d.day === undefined) return `${d.year}-${pad2(d.month)}`;
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

/** Local-time today, not UTC — the user's "accessed" date is their own date. */
export function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

// ----------------------------------------------------------------- authors

export function isCjkName(name) {
  const stripped = String(name).replace(/\s+/g, '');
  if (!stripped) return false;
  const hits = stripped.match(new RegExp(CJK_RE.source, 'g')) || [];
  return hits.length / stripped.length >= 0.5;
}

/**
 * "Last, First"       -> {family: 'Last', given: 'First'}
 * "First Middle Last" -> {family: 'Last', given: 'First Middle'}
 * "Ludwig van Beethoven" -> {family: 'van Beethoven', given: 'Ludwig'}
 * "张三"               -> {literal: '张三'}   (CJK names are not inverted)
 */
export function splitName(raw) {
  let name = String(raw || '').trim();
  if (!name) return null;

  // meta[name=author] frequently carries a prefix or an affiliation suffix.
  name = name.replace(/^\s*(by|author[s]?|written by|posted by)\s*[:：]?\s*/i, '');
  name = name.replace(/\s*\([^)]*\)\s*$/, '');
  name = name.replace(/^\s*作者\s*[:：]\s*/, '');
  name = name.trim();
  if (!name) return null;

  if (isCjkName(name)) return { literal: name };

  // "Last, First" (also "Last, First, Jr." — the suffix is dropped)
  if (name.includes(',')) {
    const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const family = parts[0];
      const given = parts.slice(1).filter((p) => !NAME_SUFFIX_RE.test(p)).join(', ');
      return { family, given };
    }
    return { literal: name };
  }

  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return { literal: name };

  // A lowercase particle marks where the surname starts.
  const particleAt = tokens.findIndex((t, i) => i > 0 && i < tokens.length - 1 && PARTICLES.has(t.toLowerCase()));
  if (particleAt > 0) {
    return { family: tokens.slice(particleAt).join(' '), given: tokens.slice(0, particleAt).join(' ') };
  }

  return { family: tokens[tokens.length - 1], given: tokens.slice(0, -1).join(' ') };
}

export function parseAuthors(str) {
  return String(str || '')
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(splitName)
    .filter(Boolean);
}

/** Inverse of parseAuthors — used to seed the editable field in the popup. */
export function authorToString(a) {
  if (!a) return '';
  if (a.literal) return a.literal;
  return a.given ? `${a.family}, ${a.given}` : a.family;
}

export function authorsToString(authors) {
  return (authors || []).map(authorToString).filter(Boolean).join('; ');
}

// ------------------------------------------------------------------- title

const TITLE_SEPARATORS = [' | ', ' – ', ' — ', ' - ', ' · ', ' :: ', ' » ', ' / '];

/** Splits on anything that is not a letter, digit or CJK character. */
const words = (s) =>
  String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9㐀-䶿一-鿿豈-﫿]+/)
    .filter(Boolean);

/**
 * Titles are usually "Page Title | Site Name". Strip the site suffix, but only
 * when the suffix really is the site — otherwise a headline that legitimately
 * contains a separator would get truncated.
 *
 * Matching is token-based, not equality-based, because the suffix and the domain
 * usually disagree on wording: "DeepSeek API Docs" on api-docs.deepseek.com
 * shares no exact string with the host, yet every one of its words appears there.
 * A one-word suffix additionally has to be substantial (>= 4 chars) so that
 * "China - US relations" on us.com is left alone.
 */
export function splitTitleSuffix(title, siteName, url) {
  const t = String(title || '').trim();
  const unchanged = { title: t, site: '' };
  if (!t) return unchanged;

  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    /* url may be empty — the site name alone can still match */
  }

  const siteWords = new Set([...words(siteName), ...words(host)]);
  if (!siteWords.size) return unchanged;

  for (const sep of TITLE_SEPARATORS) {
    const idx = t.lastIndexOf(sep);
    if (idx <= 0) continue;
    const head = t.slice(0, idx).trim();
    const tail = t.slice(idx + sep.length).trim();
    if (!head || !tail) continue;

    const tailWords = words(tail);
    if (!tailWords.length) continue;
    if (!tailWords.every((w) => siteWords.has(w))) continue;

    // A multi-word suffix that is entirely the site's vocabulary is safe. A
    // single word has to be at least 3 characters, so that "China - US
    // relations" on us.com survives while "Climate report - BBC" on bbc.com
    // still gets trimmed. Erring towards leaving the suffix in place is
    // deliberate: a title keeping "| Site Name" is visible and fixable, whereas
    // a silently truncated title corrupts the citation unnoticed.
    if (tailWords.length >= 2 || tailWords[0].length >= 3) {
      // The suffix is returned as well as dropped — having just proved it is the
      // site, it is a far better site name than the bare hostname.
      return { title: head, site: tail };
    }
  }
  return unchanged;
}

// --------------------------------------------------------------------- url

function cleanUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    for (const p of TRACKING_PARAMS) u.searchParams.delete(p);
    return u.href;
  } catch {
    return '';
  }
}

function sameHost(a, b) {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, '').toLowerCase();
    const hb = new URL(b).hostname.replace(/^www\./, '').toLowerCase();
    return ha === hb;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- language

function normLang(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (s.startsWith('zh') || s.includes('hans') || s.includes('hant')) return 'zh';
  if (s.startsWith('ja') || s.startsWith('jp')) return 'ja';
  if (s.startsWith('ko') || s.startsWith('kr')) return 'ko';
  if (s.startsWith('en')) return 'en';
  return s.split(/[-_]/)[0];
}

const ARTICLE_LD_TYPES = new Set([
  'newsarticle', 'blogposting', 'liveblogposting', 'reviewnewsarticle',
  'scholarlyarticle', 'techarticle',
]);

// ------------------------------------------------------------------ main

export function normalize(raw, options = {}) {
  const url = cleanUrl(raw.url);
  const canonical = cleanUrl(raw.canonicalUrl);
  const ogUrl = cleanUrl(raw.ogUrl);

  // Only trust a canonical/og:url when it points at the same site — cross-host
  // ones are usually redirects or syndication, not the page the user is reading.
  let finalUrl = url;
  if (canonical && sameHost(canonical, url)) finalUrl = canonical;
  else if (ogUrl && sameHost(ogUrl, url)) finalUrl = ogUrl;

  let host = '';
  try {
    host = new URL(finalUrl).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }

  const rawTitle = String(raw.title || '').trim();
  const declaredSite = String(raw.siteName || '').trim();

  // Applied whatever the source. An earlier version only stripped the suffix
  // when the title had come from <title>, which let "… | Site Name" through
  // whenever og:title carried the same suffixed string — as it does on every
  // Docusaurus site.
  const split = splitTitleSuffix(rawTitle, declaredSite || host, finalUrl);
  const title = split.title;

  // A declared site name wins; otherwise adopt the suffix we just proved is the
  // site ("DeepSeek API Docs" reads far better than "api-docs.deepseek.com");
  // otherwise fall back to the host.
  const siteName = declaredSite || split.site || host;

  const authors = (raw.authors || []).map(splitName).filter(Boolean);

  const language =
    normLang(raw.language) ||
    (CJK_RE.test(title) || authors.some((a) => a.literal) ? 'zh' : 'en');

  return {
    type: ARTICLE_LD_TYPES.has(String(raw.ldType || '').toLowerCase()) ? 'article' : 'webpage',
    title: title || '',
    authors,
    siteName,
    publisher: String(raw.publisher || '').trim(),
    url: finalUrl,
    published: parseDate(raw.published),
    modified: parseDate(raw.modified),
    accessed: options.accessed || today(),
    language,
    doi: String(raw.doi || '').trim(),
    abstract: String(raw.abstract || '').trim(),
    host,
    sources: raw.sources || {},
  };
}

/** Re-parses an item after the user edits fields in the popup. */
export function reparse(item, edits) {
  const next = { ...item, ...edits };
  if (edits.authorsRaw !== undefined) next.authors = parseAuthors(edits.authorsRaw);
  if (edits.titleRaw !== undefined) next.title = String(edits.titleRaw).trim();
  if (edits.publishedRaw !== undefined) next.published = parseDate(edits.publishedRaw);
  if (edits.accessedRaw !== undefined) next.accessed = parseDate(edits.accessedRaw) || today();
  if (edits.url !== undefined) {
    // host feeds the filename fallback, so keep it in step with the edited URL.
    try {
      next.host = new URL(next.url).hostname.replace(/^www\./, '');
    } catch {
      next.host = '';
    }
  }
  delete next.authorsRaw;
  delete next.titleRaw;
  delete next.publishedRaw;
  delete next.accessedRaw;
  return next;
}
