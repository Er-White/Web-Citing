import { pad2 } from '../normalize.js';
import { gbtAuthors } from './shared.js';

/** GB/T uses YYYY-MM-DD, dropping the parts the page never disclosed. */
function iso(d) {
  if (!d) return '';
  if (d.month === undefined) return String(d.year);
  if (d.day === undefined) return `${d.year}-${pad2(d.month)}`;
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

/**
 * GB/T 7714-2015 electronic resource:
 *   主要责任者. 题名[EB/OL]. (发布日期)[引用日期]. 获取和访问路径.
 *
 * The 引用日期 (access date) is mandatory for online sources — that is the whole
 * reason the extension defaults it to today rather than leaving it blank.
 */
export function gbt7714(item) {
  const out = [];

  const authors = gbtAuthors(item.authors);
  if (authors) out.push(`${authors}.`);

  // No space between the title and the [EB/OL] type marker.
  if (item.title) out.push(`${item.title}[EB/OL].`);

  const published = iso(item.published);
  const accessed = iso(item.accessed);
  const dates = `${published ? `(${published})` : ''}${accessed ? `[${accessed}]` : ''}`;
  if (dates) out.push(`${dates}.`);

  if (item.url) out.push(`${item.url}.`);

  return out.join(' ');
}
