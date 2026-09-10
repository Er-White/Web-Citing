// Dev harness: runs the pure formatters over sample records so the output can be
// eyeballed (and the name/date parsers asserted) without loading the extension.
// Run: node tools/preview.mjs

import assert from 'node:assert/strict';

import { EXPORT_FORMATS } from '../src/formats/index.js';
import { toEnw } from '../src/formats/enw.js';
import { CITATION_STYLES } from '../src/styles/index.js';
import {
  authorsToString, isoDate, parseAuthors, parseDate, splitName, splitTitleSuffix,
} from '../src/normalize.js';
import { citationKey, filenameFor } from '../src/util.js';

// ------------------------------------------------------------------ samples

const journal = {
  type: 'article',
  title: 'Nanometre-scale thermometry in a living cell',
  authors: [
    { family: 'Kucsko', given: 'G.' },
    { family: 'Maurer', given: 'P. C.' },
    { family: 'Yao', given: 'N. Y.' },
  ],
  siteName: 'Nature',
  publisher: 'Springer Science and Business Media LLC',
  url: 'https://doi.org/10.1038/nature12373',
  published: { year: 2013, month: 7, day: 31 },
  modified: null,
  accessed: { year: 2026, month: 9, day: 10 },
  language: 'en',
  doi: '10.1038/nature12373',
  abstract: '',
  host: 'doi.org',
};

const chinese = {
  type: 'webpage',
  title: '中国气象局发布2025年气候公报',
  authors: [{ literal: '张三' }, { literal: '李四' }, { literal: '王五' }, { literal: '赵六' }],
  siteName: '中国气象局',
  publisher: '',
  url: 'https://www.cma.gov.cn/2025climate.html',
  published: { year: 2026, month: 1, day: 15 },
  modified: null,
  accessed: { year: 2026, month: 9, day: 10 },
  language: 'zh',
  doi: '',
  abstract: '',
  host: 'cma.gov.cn',
};

const twoAuthors = {
  type: 'article',
  title: 'Deep learning for downscaling climate projections',
  authors: [
    { family: 'Smith', given: 'John A.' },
    { family: 'Doe', given: 'Jane' },
  ],
  siteName: 'Nature Climate Change',
  publisher: '',
  url: 'https://example.org/downscaling',
  published: { year: 2024, month: 3 },
  modified: null,
  accessed: { year: 2026, month: 9, day: 10 },
  language: 'en',
  doi: '',
  abstract: '',
  host: 'example.org',
};

// No author and no date — the two fields most likely to be missing in the wild.
const bare = {
  type: 'webpage',
  title: 'How to cite a website',
  authors: [],
  siteName: 'Example Site',
  publisher: '',
  url: 'https://example.com/citing',
  published: null,
  modified: null,
  accessed: { year: 2026, month: 9, day: 10 },
  language: 'en',
  doi: '',
  abstract: '',
  host: 'example.com',
};

// ------------------------------------------------------------------- asserts

assert.deepEqual(parseDate('2023-05-12T10:30:00Z'), { year: 2023, month: 5, day: 12 });
assert.deepEqual(parseDate('2023-05'), { year: 2023, month: 5 });
assert.deepEqual(parseDate('2023'), { year: 2023 });
assert.deepEqual(parseDate('12 May 2023'), { year: 2023, month: 5, day: 12 });
assert.deepEqual(parseDate('May 12, 2023'), { year: 2023, month: 5, day: 12 });
assert.deepEqual(parseDate('20230512'), { year: 2023, month: 5, day: 12 });
assert.equal(parseDate('not a date'), null);
assert.equal(parseDate(''), null);

assert.deepEqual(splitName('Kucsko, G.'), { family: 'Kucsko', given: 'G.' });
assert.deepEqual(splitName('John A. Smith'), { family: 'Smith', given: 'John A.' });
assert.deepEqual(splitName('Ludwig van Beethoven'), { family: 'van Beethoven', given: 'Ludwig' });
assert.deepEqual(splitName('张三'), { literal: '张三' });
assert.deepEqual(splitName('By John Smith'), { family: 'Smith', given: 'John' });
assert.deepEqual(splitName('Smith, John, Jr.'), { family: 'Smith', given: 'John' });

// Author field must survive a round trip through the editable popup input.
for (const raw of ['Kucsko, G.; Maurer, P. C.', '张三; 李四', 'van Beethoven, Ludwig']) {
  assert.equal(authorsToString(parseAuthors(raw)), raw.replace(/；/g, ';'));
}

const t = (title, site, url) => splitTitleSuffix(title, site, url).title;

assert.equal(t('Climate report | BBC News', 'BBC News', 'https://bbc.com/x'), 'Climate report');
assert.equal(t('Climate report - BBC', 'BBC News', 'https://bbc.com/x'), 'Climate report');
assert.equal(t('A - B - C', 'Unrelated Site', 'https://bbc.com/x'), 'A - B - C');

// Real case: the suffix and the host share no exact string, only vocabulary.
// The stripped suffix is reported back so it can serve as the site name.
const deepseek = splitTitleSuffix(
  'V4-Flash-Vision-Exp 上线，开启多模态 API 服务 | DeepSeek API Docs',
  'api-docs.deepseek.com',
  'https://api-docs.deepseek.com/zh-cn/news/news260821/'
);
assert.equal(deepseek.title, 'V4-Flash-Vision-Exp 上线，开启多模态 API 服务');
assert.equal(deepseek.site, 'DeepSeek API Docs');

// A two-letter suffix is far more likely to be a word in the title than a site.
assert.equal(t('China - US relations', 'us.com', 'https://us.com/x'), 'China - US relations');
assert.equal(splitTitleSuffix('China - US relations', 'us.com', 'https://us.com/x').site, '');

assert.equal(isoDate({ year: 2023 }), '2023');
assert.equal(isoDate({ year: 2023, month: 5 }), '2023-05');
assert.equal(isoDate({ year: 2023, month: 5, day: 2 }), '2023-05-02');

assert.equal(citationKey(journal), 'kucsko2013nanometre');
assert.equal(filenameFor(journal, 'ris'), 'Kucsko-2013-Nanometre-scale-thermometry-in-a-living-cell.ris');

// The .enw tags mirror a real export from EndNote for a Web Page. Clarivate
// publishes the tag table for the GENERIC reference type only, and for Web Page
// the mapping differs sharply: %N — "Number (Issue)" in the generic table —
// carries the Access Date, in MM/DD/YYYY shape rather than the Date field's
// YYYY/MM/DD. Both mistakes leave "(accessed )" empty in every journal style.
{
  const enw = toEnw({
    type: 'webpage',
    title: 'A title',
    authors: [{ literal: 'DeepSeek' }],
    siteName: 'DeepSeek API Docs',
    publisher: '',
    url: 'https://example.com/x',
    published: { year: 2026 },
    accessed: { year: 2026, month: 9, day: 10 },
    language: 'zh',
    doi: '',
    abstract: '',
  });

  assert.match(enw, /^%0 Web Page$/m);
  assert.match(enw, /^%N 09\/10\/2026$/m, 'Access Date must be %N in MM/DD/YYYY');
  assert.match(enw, /^%8 2026\/09\/10$/m, 'the Date field uses YYYY/MM/DD');
  assert.doesNotMatch(enw, /%\[/, '%[ does not map to Access Date for a web page');
}

console.log('all parser assertions passed\n');

// -------------------------------------------------------------------- output

const SAMPLES = [
  ['English (3 authors, full metadata)', journal],
  ['Chinese web page (4 authors)', chinese],
  ['Two authors, year+month only', twoAuthors],
  ['No author, no date', bare],
];

for (const [name, item] of SAMPLES) {
  console.log('='.repeat(78));
  console.log(name);
  console.log('='.repeat(78));

  for (const style of CITATION_STYLES) {
    console.log(`\n[${style.id}]`);
    console.log(style.render(item, { retrievalDate: true }));
  }

  for (const fmt of EXPORT_FORMATS) {
    console.log(`\n--- ${fmt.id} ---`);
    process.stdout.write(fmt.render(item));
  }
  console.log();
}
