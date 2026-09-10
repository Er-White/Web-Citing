// Tests the page extractor the way the browser runs it.
//
// chrome.scripting.executeScript({func}) serialises the function with toString()
// and evaluates it in a fresh scope, so anything it borrows from module scope is
// gone. Running the source through vm.createContext reproduces that exactly: a
// stray outer reference throws ReferenceError here rather than silently failing
// inside the extension.
//
// Run: node tools/test-extract.mjs

import assert from 'node:assert/strict';
import vm from 'node:vm';

import { pageExtractor } from '../src/extract.js';
import { normalize } from '../src/normalize.js';

// --------------------------------------------------------------- DOM stand-in

class El {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
  }
  getAttribute(name) {
    const v = this.attrs[name];
    return v === undefined ? null : String(v);
  }
  get textContent() {
    return this.attrs._text === undefined ? '' : String(this.attrs._text);
  }
}

/** Enough of a CSS matcher for the exact selectors extract.js uses. */
function matches(el, selector) {
  const m = selector.trim().match(/^([a-z]+)(?:\.([\w-]+))?((?:\[[^\]]*\])*)$/);
  if (!m) return false;
  const [, tag, cls, attrPart] = m;
  if (el.tagName !== tag.toUpperCase()) return false;
  if (cls && !String(el.attrs.class || '').split(/\s+/).includes(cls)) return false;

  for (const raw of attrPart.match(/\[[^\]]*\]/g) || []) {
    const inner = raw.slice(1, -1);
    const eq = inner.indexOf('=');
    if (eq === -1) {
      if (el.getAttribute(inner) === null) return false;
    } else {
      const name = inner.slice(0, eq);
      const want = inner.slice(eq + 1).replace(/^["']|["']$/g, '');
      if (el.getAttribute(name) !== want) return false;
    }
  }
  return true;
}

function makeDom({ metas = [], scripts = [], links = [], times = [], coins = null, title = '', lang = '', url = 'https://example.com/page' }) {
  const all = [
    ...metas.map(([key, value, kind = 'name']) => new El('meta', { [kind]: key, content: value })),
    ...scripts.map((s) => new El('script', { type: 'application/ld+json', _text: typeof s === 'string' ? s : JSON.stringify(s) })),
    ...links.map((l) => new El('link', l)),
    ...times.map((t) => new El('time', { datetime: t })),
    ...(coins ? [new El('span', { class: 'Z3988', title: coins })] : []),
  ];

  return {
    document: {
      title,
      documentElement: { getAttribute: (n) => (n === 'lang' ? lang || null : null) },
      querySelectorAll: (sel) =>
        all.filter((el) => sel.split(',').some((s) => matches(el, s))),
      querySelector: (sel) =>
        all.find((el) => sel.split(',').some((s) => matches(el, s))) || null,
    },
    location: { href: url },
  };
}

/** Runs the extractor in an isolated realm, like the browser does. */
function runExtractor(spec) {
  const dom = makeDom(spec);
  const context = vm.createContext({
    document: dom.document,
    location: dom.location,
    // URL/URLSearchParams are Node globals, not ECMAScript — pass them in.
    URL,
    URLSearchParams,
    console,
  });
  const raw = vm.runInContext(`(${pageExtractor.toString()})()`, context);
  // Round-trip out of the vm realm so deepEqual compares plain objects.
  return JSON.parse(JSON.stringify(raw));
}

// -------------------------------------------------------------------- tests

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push(`  ok   ${name}`);
  } catch (err) {
    results.push(`  FAIL ${name}\n         ${err.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
};

// 1. JSON-LD outranks everything else.
check('JSON-LD NewsArticle is preferred over <title>', () => {
  const raw = runExtractor({
    metas: [['og:site_name', 'Example News']],
    scripts: [{
      '@type': 'NewsArticle',
      headline: 'Climate report released',
      author: [{ givenName: 'Jane', familyName: 'Doe' }],
      datePublished: '2026-01-15T08:00:00Z',
      publisher: { name: 'Example News' },
      description: 'A summary.',
    }],
    title: 'Climate report released | Example News',
    url: 'https://news.example.com/climate',
  });
  assert.equal(raw.title, 'Climate report released');
  assert.equal(raw.sources.title, 'jsonld');
  assert.deepEqual(raw.authors, ['Doe, Jane']);
  assert.equal(raw.ldType, 'newsarticle');
  assert.equal(raw.published, '2026-01-15T08:00:00Z');
  assert.equal(raw.siteName, 'Example News');
});

// 2. JSON-LD inside @graph and nested arrays must still be found.
check('JSON-LD @graph is traversed', () => {
  const raw = runExtractor({
    scripts: [{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', name: 'Ignored' },
      { '@type': 'BlogPosting', headline: 'Found me', datePublished: '2025-11-02' },
    ] }],
    title: 'Ignored',
  });
  assert.equal(raw.title, 'Found me');
  assert.equal(raw.ldType, 'blogposting');
});

// 3. OpenGraph fills in when JSON-LD is absent.
check('OpenGraph is the second choice', () => {
  const raw = runExtractor({
    metas: [
      ['og:title', 'My Blog Post'],
      ['og:site_name', 'My Blog'],
      ['article:published_time', '2026-03-02'],
    ],
    title: 'My Blog Post - My Blog',
  });
  assert.equal(raw.title, 'My Blog Post');
  assert.equal(raw.sources.title, 'og');
  assert.equal(raw.siteName, 'My Blog');
});

// 4. Malformed JSON-LD must not take the extraction down with it.
check('malformed JSON-LD is skipped, not fatal', () => {
  const raw = runExtractor({
    scripts: ['{ this is not json', '{"@type":"WebPage","name":"Good"}'],
    title: 'Fallback',
  });
  assert.equal(raw.title, 'Good');
});

// 5. Bare page: falls back to <title> and records the source.
check('bare page falls back to document.title', () => {
  const raw = runExtractor({ title: 'Some Article - BBC' });
  assert.equal(raw.title, 'Some Article - BBC');
  assert.equal(raw.sources.title, 'document');
});

// 6. HTML lang is captured so the styles can pick 等 vs et al.
check('html lang is captured', () => {
  const raw = runExtractor({ lang: 'zh-CN', title: '标题' });
  assert.equal(raw.language, 'zh-CN');
});

// 7. Highwire citation_* tags, including the repeated citation_author.
check('Highwire citation_* tags produce DOI and authors', () => {
  const raw = runExtractor({
    metas: [
      ['citation_title', 'A Paper'],
      ['citation_author', 'Kucsko, G.'],
      ['citation_author', 'Maurer, P. C.'],
      ['citation_doi', '10.1038/nature12373'],
      ['citation_publication_date', '2013/07/31'],
      ['citation_journal_title', 'Nature'],
    ],
    title: 'A Paper | Nature',
  });
  assert.equal(raw.title, 'A Paper');
  assert.deepEqual(raw.authors, ['Kucsko, G.', 'Maurer, P. C.']);
  assert.equal(raw.doi, '10.1038/nature12373');
  assert.equal(raw.published, '2013/07/31');
});

// 8. COinS is the last structured source before the HTML fallbacks.
check('COinS is parsed', () => {
  const raw = runExtractor({
    coins: 'ctx_ver=Z39.88-2004&rft_val_fmt=info:ofi/fmt:kev:mtx:journal'
      + '&rft.title=Coins%20Title&rft.au=Smith%2C%20John&rft.date=2020',
    title: 'page title',
  });
  assert.equal(raw.title, 'Coins Title');
  assert.deepEqual(raw.authors, ['Smith, John']);
  assert.equal(raw.published, '2020');
});

// 9. Canonical URL wins, and tracking parameters are dropped downstream.
check('canonical URL is picked up', () => {
  const raw = runExtractor({
    links: [{ rel: 'canonical', href: 'https://example.com/clean' }],
    title: 'T',
    url: 'https://example.com/clean?utm_source=newsletter',
  });
  assert.equal(raw.canonicalUrl, 'https://example.com/clean');

  const item = normalize(raw, {});
  assert.equal(item.url, 'https://example.com/clean');
});

// 10. A totally empty document must still return a well-formed record.
check('empty document does not throw', () => {
  const raw = runExtractor({});
  assert.equal(raw.title, '');
  assert.deepEqual(raw.authors, []);
  assert.equal(raw.sources.title, 'none');
});

// 11. End-to-end: the document.title suffix is stripped by normalize, but only
//     when it actually matches the site.
check('normalize strips a matching title suffix only', () => {
  const stripped = normalize(
    runExtractor({ title: 'Climate report - BBC', url: 'https://bbc.com/x' }),
    {}
  );
  assert.equal(stripped.title, 'Climate report');

  // "News" is not part of this site's vocabulary (there is no og:site_name
  // here), so the suffix is left in place rather than guessed at.
  const kept = normalize(
    runExtractor({ title: 'Climate report - BBC News', url: 'https://bbc.com/x' }),
    {}
  );
  assert.equal(kept.title, 'Climate report - BBC News');
});

// 12. Regression from a real citation. This is a Docusaurus page: it publishes
//     the suffixed title as og:title, has no og:site_name, no author and no
//     date. The suffix used to survive because stripping only ran when the
//     title had come from <title>.
check('site suffix is stripped even when og:title carries it', () => {
  const SUFFIXED = 'V4-Flash-Vision-Exp 上线，开启多模态 API 服务 | DeepSeek API Docs';
  const raw = runExtractor({
    metas: [
      ['og:title', SUFFIXED, 'property'],
      ['og:description', '今天，全新的多模态视觉理解模型…', 'property'],
    ],
    title: SUFFIXED,
    lang: 'zh-cn',
    url: 'https://api-docs.deepseek.com/zh-cn/news/news260821/',
  });

  assert.equal(raw.sources.title, 'og');
  assert.equal(raw.siteName, '', 'this page exposes no site name at all');

  const item = normalize(raw, { accessed: { year: 2026, month: 9, day: 10 } });
  assert.equal(item.title, 'V4-Flash-Vision-Exp 上线，开启多模态 API 服务');
  // Having proved the suffix is the site, it is a better site name than the host.
  assert.equal(item.siteName, 'DeepSeek API Docs');
  assert.equal(item.language, 'zh');
});

// 13. The guard that keeps the token match from eating a real headline.
check('a separator inside a headline is not mistaken for a site suffix', () => {
  const item = normalize(
    runExtractor({ title: 'China - US relations', url: 'https://us.com/analysis' }),
    {}
  );
  assert.equal(item.title, 'China - US relations');
});

console.log(results.join('\n'));
console.log(
  process.exitCode
    ? '\nSome extractor tests failed.'
    : '\nAll extractor tests passed (function is self-contained and correct).'
);
