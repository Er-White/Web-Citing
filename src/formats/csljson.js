import { dateParts } from '../util.js';

const CSL_LANGS = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };

/**
 * CSL-JSON is Zotero's native format and the lossless one — it keeps the
 * webpage type, the container (site name) and the accessed date as structured
 * fields rather than flattening them into a string.
 *
 * The top level must be an ARRAY. Zotero rejects a bare object.
 */
export function toCslJson(item) {
  const entry = {
    id: item.url || item.title || 'reference',
    type: 'webpage',
  };

  if (item.title) entry.title = item.title;

  if (item.authors.length) {
    entry.author = item.authors.map((a) =>
      a.literal ? { literal: a.literal } : { family: a.family, given: a.given || '' }
    );
  }

  // For a web page the site is the containing work, which is what CSL calls
  // container-title.
  if (item.siteName) entry['container-title'] = item.siteName;
  if (item.publisher && item.publisher !== item.siteName) entry.publisher = item.publisher;

  if (item.url) entry.URL = item.url;
  if (item.doi) entry.DOI = item.doi;

  const issued = dateParts(item.published);
  if (issued) entry.issued = { 'date-parts': [issued] };

  const accessed = dateParts(item.accessed);
  if (accessed) entry.accessed = { 'date-parts': [accessed] };

  if (item.language) entry.language = CSL_LANGS[item.language] || item.language;
  if (item.abstract) entry.abstract = item.abstract;

  return `${JSON.stringify([entry], null, 2)}\n`;
}
