/**
 * UI strings live here rather than in _locales because chrome.i18n can only be
 * read at start-up — it cannot switch language at runtime, and the popup offers
 * a language toggle. _locales still supplies the manifest name/description.
 */

const STRINGS = {
  zh: {
    appName: 'Web Citing',
    loading: '正在读取页面…',
    errorTitle: '无法读取当前页面',
    errorHint: '浏览器内部页面（edge://、chrome://）、扩展商店和 PDF 阅读器不允许扩展读取内容。请切换到普通网页后重试。',
    noTitleWarn: '未能识别页面标题，请手动填写后再导出。',
    retry: '重试',
    needAccess: '需要网页访问权限',
    needAccessHint: '浏览器未能临时授权读取本页。点「授权访问」后可长期读取网页元数据。',
    grant: '授权访问',
    accessDenied: '授权被拒绝，无法读取页面元数据。',

    fieldTitle: '标题',
    fieldAuthors: '作者',
    fieldAuthorsHint: '多个作者用分号分隔，如：张三; 李四',
    fieldSite: '网站名称',
    fieldPublished: '发布日期',
    fieldAccessed: '访问日期',
    fieldUrl: '网址',
    datePlaceholder: 'YYYY-MM-DD 或留空',

    styleLabel: '引用格式',
    retrievalDate: '加检索日期',
    retrievalNote: 'GB/T 7714 始终包含引用日期',

    copyCitation: '复制引用',
    copied: '已复制',
    copyFailed: '复制失败',

    formatLabel: '导出格式',
    download: '下载文件',
    copyRecord: '复制记录',
    recordCopied: '记录已复制',
    saved: '已保存',
    includeAbstract: '同时导出摘要',
    includeAbstractNote:
      '摘要会把网页上的原文段落复制进导出文件。标题、作者、日期等属于事实信息，摘要则是受著作权保护的表达，因此默认不导出。仅在确需时勾选。',

    styleGbt: 'GB/T 7714-2015',
    styleApa: 'APA 7th',
    styleMla: 'MLA 9th',
    styleChicago: 'Chicago（作者-日期）',
    styleHarvard: 'Harvard',

    formatRis: 'RIS (.ris)',
    formatEnw: 'EndNote (.enw)',
    formatBib: 'BibTeX (.bib)',
    formatCsl: 'CSL-JSON (.json)',

    // Service worker / context menu.
    menuTitle: '引用本页',
    openPopupHint: '无法自动打开面板，请点击工具栏上的扩展图标。',
  },

  en: {
    appName: 'Web Citing',
    loading: 'Reading page…',
    errorTitle: "Couldn't read this page",
    errorHint:
      'Browser-internal pages (edge://, chrome://), extension galleries and the PDF viewer block extensions from reading their content. Switch to a normal web page and try again.',
    noTitleWarn: 'No page title was detected — fill the fields in manually before exporting.',
    retry: 'Retry',
    needAccess: 'Web page access needed',
    needAccessHint:
      'The browser did not grant temporary access to this page. Grant access to read page metadata from now on.',
    grant: 'Grant access',
    accessDenied: 'Access was declined, so the page cannot be read.',

    fieldTitle: 'Title',
    fieldAuthors: 'Authors',
    fieldAuthorsHint: 'Separate multiple authors with a semicolon, e.g. Smith, John; Doe, Jane',
    fieldSite: 'Site name',
    fieldPublished: 'Published',
    fieldAccessed: 'Accessed',
    fieldUrl: 'URL',
    datePlaceholder: 'YYYY-MM-DD or leave blank',

    styleLabel: 'Citation style',
    retrievalDate: 'Retrieval date',
    retrievalNote: 'GB/T 7714 always includes the access date',

    copyCitation: 'Copy citation',
    copied: 'Copied',
    copyFailed: 'Copy failed',

    formatLabel: 'Export format',
    download: 'Download file',
    copyRecord: 'Copy record',
    recordCopied: 'Record copied',
    saved: 'Saved',
    includeAbstract: 'Include abstract',
    includeAbstractNote:
      'The abstract copies a passage of the page verbatim into the exported file. Titles, authors and dates are facts; an abstract is protected expression, so it is left out by default. Tick this only when you actually need it.',

    styleGbt: 'GB/T 7714-2015',
    styleApa: 'APA 7th',
    styleMla: 'MLA 9th',
    styleChicago: 'Chicago (Author–Date)',
    styleHarvard: 'Harvard',

    formatRis: 'RIS (.ris)',
    formatEnw: 'EndNote (.enw)',
    formatBib: 'BibTeX (.bib)',
    formatCsl: 'CSL-JSON (.json)',

    menuTitle: 'Cite this page',
    openPopupHint: "Couldn't open the panel automatically — click the extension icon in the toolbar.",
  },
};

export const LANGS = ['zh', 'en'];

/** Falls back to the browser's own language, then to Chinese. */
export function detectLang() {
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('zh')) return 'zh';
  if (raw.startsWith('en')) return 'en';
  return 'zh';
}

/**
 * @param {string} key
 * @param {Record<string,string>} [vars] substituted into {placeholders}
 */
export function t(lang, key, vars) {
  const table = STRINGS[lang] || STRINGS.zh;
  let s = table[key] ?? STRINGS.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  }
  return s;
}

export const otherLang = (lang) => (lang === 'zh' ? 'en' : 'zh');
