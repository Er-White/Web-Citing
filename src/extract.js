/**
 * Page metadata extraction.
 *
 * IMPORTANT: `pageExtractor` is injected with chrome.scripting.executeScript({func}),
 * which serialises the function with toString() and runs it in the page. It therefore
 * MUST be completely self-contained — no references to module scope, no imports, no
 * outer variables. Everything it needs is defined inside it.
 *
 * It returns a *raw* record. All cleaning and normalisation happens in normalize.js,
 * which keeps the injected payload small.
 */

export function pageExtractor() {
  // --------------------------------------------------------------- meta tags

  const metaAll = new Map();
  for (const el of document.querySelectorAll('meta[name], meta[property], meta[itemprop]')) {
    const key = (
      el.getAttribute('name') ||
      el.getAttribute('property') ||
      el.getAttribute('itemprop') ||
      ''
    ).trim().toLowerCase();
    if (!key) continue;
    const val = (el.getAttribute('content') || '').trim();
    if (!val) continue;
    const bucket = metaAll.get(key);
    if (bucket) bucket.push(val);
    else metaAll.set(key, [val]);
  }

  /** First non-empty value among the given keys. */
  const one = (...keys) => {
    for (const k of keys) {
      const v = metaAll.get(k);
      if (v && v[0]) return v[0];
    }
    return '';
  };

  /** Every value among the given keys, de-duplicated, order preserved. */
  const many = (...keys) => {
    const out = [];
    for (const k of keys) {
      for (const v of metaAll.get(k) || []) {
        if (!out.includes(v)) out.push(v);
      }
    }
    return out;
  };

  // ----------------------------------------------------------------- JSON-LD

  const ldNodes = [];
  for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed;
    try {
      parsed = JSON.parse(el.textContent || '');
    } catch {
      continue; // malformed JSON-LD is extremely common on real sites — just skip it
    }
    const stack = [parsed];
    const seen = new Set();
    while (stack.length) {
      const node = stack.shift();
      if (!node || typeof node !== 'object' || seen.has(node)) continue;
      seen.add(node);
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }
      if (node['@graph']) {
        const g = node['@graph'];
        stack.push(...(Array.isArray(g) ? g : [g]));
      }
      ldNodes.push(node);
    }
  }

  // Most-specific first: a page usually carries several linked nodes (WebSite,
  // Organization, BreadcrumbList, …) and we want the most article-like one.
  const LD_RANK = [
    'newsarticle', 'blogposting', 'liveblogposting', 'scholarlyarticle',
    'techarticle', 'report', 'article', 'reviewnewsarticle', 'webpage', 'creativework',
  ];

  let ld = null;
  let ldRank = Infinity;
  let ldType = '';
  for (const node of ldNodes) {
    const raw = node['@type'];
    const types = (Array.isArray(raw) ? raw : [raw])
      .filter((t) => typeof t === 'string')
      .map((t) => t.toLowerCase());
    for (const t of types) {
      const rank = LD_RANK.indexOf(t);
      if (rank !== -1 && rank < ldRank) {
        ldRank = rank;
        ld = node;
        ldType = t;
      }
    }
  }

  /** JSON-LD values may be a string, a nested object with `name`, or an array. */
  const asText = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return asText(v[0]);
    if (typeof v === 'object') {
      return String(v.name || v.headline || v['@id'] || '').trim();
    }
    return '';
  };

  const asUrl = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return asUrl(v[0]);
    if (typeof v === 'object') return String(v.url || v['@id'] || '').trim();
    return '';
  };

  const ldAuthors = (v) => {
    const arr = Array.isArray(v) ? v : [v];
    const out = [];
    for (const a of arr) {
      if (!a) continue;
      if (typeof a === 'string') {
        if (a.trim()) out.push(a.trim());
        continue;
      }
      if (typeof a !== 'object') continue;
      const given = String(a.givenName || '').trim();
      const family = String(a.familyName || '').trim();
      const name = String(a.name || '').trim();
      if (family) out.push(given ? `${family}, ${given}` : family);
      else if (name) out.push(name);
    }
    return out;
  };

  // ------------------------------------------------------------------- COinS
  // OpenURL context objects, still emitted by many library catalogues and
  // citation managers. <span class="Z3988" title="ctx_ver=...&rft.title=...">

  let coins = null;
  const coinsEl = document.querySelector('span.Z3988[title]');
  if (coinsEl) {
    try {
      coins = new URLSearchParams(coinsEl.getAttribute('title'));
    } catch {
      coins = null;
    }
  }

  const coinsAuthors = () => {
    if (!coins) return [];
    const out = coins.getAll('rft.au').map((s) => s.trim()).filter(Boolean);
    if (!out.length) {
      const last = (coins.get('rft.aulast') || '').trim();
      const first = (coins.get('rft.aufirst') || '').trim();
      if (last) out.push(first ? `${last}, ${first}` : last);
    }
    return out;
  };

  // ------------------------------------------------------------- HTML basics

  const attr = (sel, name) => {
    const el = document.querySelector(sel);
    return el ? (el.getAttribute(name) || '').trim() : '';
  };

  const canonical = attr('link[rel="canonical"]', 'href');
  const ogUrl = attr('meta[property="og:url"]', 'content');
  const timeEl = document.querySelector('time[datetime]');

  const htmlLang =
    document.documentElement.getAttribute('lang') ||
    document.documentElement.getAttribute('xml:lang') ||
    '';

  // ------------------------------------------------------------- assemble

  // Each field is resolved most-reliable-source-first. `sources` records which
  // layer won, so the popup can explain an odd value instead of just showing it.
  const sources = {};

  const pick = (field, candidates) => {
    for (const [source, value] of candidates) {
      const v = Array.isArray(value) ? value : [value];
      const clean = v.map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean);
      if (clean.length) {
        sources[field] = source;
        return Array.isArray(value) ? clean : clean[0];
      }
    }
    sources[field] = 'none';
    return Array.isArray(candidates[0][1]) ? [] : '';
  };

  const title = pick('title', [
    ['jsonld', ld ? asText(ld.headline) || asText(ld.name) : ''],
    ['og', one('og:title', 'twitter:title')],
    ['highwire', one('citation_title')],
    ['dublincore', one('dc.title', 'dcterms.title', 'dc.title.alternative')],
    ['coins', coins ? (coins.get('rft.title') || '').trim() : ''],
    ['document', document.title || ''],
  ]);

  const authors = pick('authors', [
    ['jsonld', ld ? ldAuthors(ld.author) : []],
    ['highwire', many('citation_author')],
    ['dublincore', many('dc.creator', 'dcterms.creator', 'dc.contributor')],
    ['coins', coinsAuthors()],
    ['meta', many('author', 'article:author', 'parsely-author', 'sailthru.author')],
  ]);

  const siteName = pick('siteName', [
    ['og', one('og:site_name', 'twitter:site')],
    ['jsonld', ld ? asText(ld.publisher) : ''],
    ['meta', one('application-name', 'apple-mobile-web-app-title', 'parsely-pub-domain')],
    ['dublincore', one('dc.publisher', 'dcterms.publisher')],
  ]);

  const publisher = pick('publisher', [
    ['jsonld', ld ? asText(ld.publisher) : ''],
    ['highwire', one('citation_publisher')],
    ['dublincore', one('dc.publisher', 'dcterms.publisher')],
    ['og', one('og:site_name')],
  ]);

  const published = pick('published', [
    ['jsonld', ld ? asText(ld.datePublished) || asText(ld.dateCreated) : ''],
    ['og', one('article:published_time', 'og:article:published_time', 'article:published')],
    ['highwire', one('citation_publication_date', 'citation_date')],
    ['dublincore', one('dcterms.issued', 'dc.date', 'dcterms.created', 'dc.date.issued')],
    ['meta', one('date', 'pubdate', 'publishdate', 'sailthru.date', 'parsely-pub-date')],
    ['coins', coins ? (coins.get('rft.date') || '').trim() : ''],
    ['html', timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent || '') : ''],
  ]);

  const modified = pick('modified', [
    ['jsonld', ld ? asText(ld.dateModified) : ''],
    ['og', one('article:modified_time', 'og:updated_time', 'article:modified')],
    ['dublincore', one('dcterms.modified', 'dc.modified')],
  ]);

  const abstract = pick('abstract', [
    ['jsonld', ld ? asText(ld.description) : ''],
    ['og', one('og:description', 'twitter:description')],
    ['highwire', one('citation_abstract')],
    ['dublincore', one('dc.description', 'dcterms.abstract', 'dcterms.description')],
    ['meta', one('description')],
  ]);

  // DOI: prefer an explicit citation_doi, otherwise look for a bare DOI string
  // in the identifiers these pages tend to carry.
  let doi = one('citation_doi', 'dc.identifier.doi', 'prism.doi', 'doi').trim();
  if (!doi) {
    for (const candidate of many('dc.identifier', 'dcterms.identifier', 'citation_doi')) {
      const m = candidate.match(/\b10\.\d{4,9}\/[^\s"'<>]+/);
      if (m) {
        doi = m[0];
        break;
      }
    }
  }
  doi = doi.replace(/^doi:\s*/i, '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
  if (doi && !/^10\.\d{4,9}\//.test(doi)) doi = '';
  sources.doi = doi ? 'meta' : 'none';

  return {
    // The live URL: what the address bar shows after redirects.
    url: location.href,
    canonicalUrl: canonical
      ? (() => {
          try {
            return new URL(canonical, location.href).href;
          } catch {
            return '';
          }
        })()
      : '',
    ogUrl,
    title,
    authors,
    siteName,
    publisher,
    published,
    modified,
    abstract,
    doi,
    language: (htmlLang || one('og:locale', 'dc.language', 'dcterms.language') || '').trim(),
    ldType,
    coinsPresent: Boolean(coins),
    sources,
  };
}
