import { EXPORT_FORMATS, getFormat } from '../src/formats/index.js';
import { CITATION_STYLES, getStyle } from '../src/styles/index.js';
import { pageExtractor } from '../src/extract.js';
import { authorsToString, isoDate, normalize, reparse, today } from '../src/normalize.js';
import { detectLang, otherLang, t } from '../src/i18n.js';
import { downloadText } from '../src/download.js';
import { filenameFor } from '../src/util.js';

const $ = (id) => document.getElementById(id);

const FIELD_IDS = ['f-title', 'f-authors', 'f-site', 'f-published', 'f-accessed', 'f-url'];

// chrome.storage.local, not sync: sync would ship the settings to Google's
// servers, which turns a "collects no data" privacy declaration into a
// disclosure. The cost is that preferences don't follow the user across
// machines — a fair trade for the cleanest possible store review.
const DEFAULTS = {
  lang: '',
  style: 'gbt7714',
  format: 'ris',
  retrievalDate: false,
  includeAbstract: false,
};

let settings = { ...DEFAULTS };
let lang = 'zh';
/** The normalised record currently on screen; null until extraction succeeds. */
let item = null;

// ------------------------------------------------------------------ start-up

async function init() {
  try {
    settings = { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
  } catch {
    /* storage can be unavailable in a brand-new profile — defaults are fine */
  }
  lang = settings.lang || detectLang();

  buildSelects();
  applyStaticStrings();
  wireEvents();
  await loadPage();
}

function buildSelects() {
  const styleSel = $('style');
  styleSel.replaceChildren();
  for (const s of CITATION_STYLES) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.dataset.i18n = s.labelKey;
    styleSel.append(opt);
  }
  styleSel.value = settings.style;

  const fmtSel = $('format');
  fmtSel.replaceChildren();
  for (const f of EXPORT_FORMATS) {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.dataset.i18n = f.labelKey;
    fmtSel.append(opt);
  }
  fmtSel.value = settings.format;

  $('retrieval').checked = Boolean(settings.retrievalDate);
  $('abstract').checked = Boolean(settings.includeAbstract);
}

function applyStaticStrings() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(lang, el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    el.title = t(lang, el.dataset.i18nTitle);
  }
  $('lang').textContent = lang === 'zh' ? 'EN' : '中';
  $('f-authors').placeholder = t(lang, 'fieldAuthorsHint');
  $('f-published').placeholder = t(lang, 'datePlaceholder');
  $('f-accessed').placeholder = t(lang, 'datePlaceholder');
}

// ---------------------------------------------------------------- extraction

async function loadPage() {
  showStatus(t(lang, 'loading'));
  $('main').hidden = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) throw new Error('No active tab');

    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageExtractor,
    });

    const raw = injected && injected.result;
    if (!raw) throw new Error('The page returned no metadata');

    item = normalize(raw, { accessed: today() });
    renderItem();
    $('main').hidden = false;

    if (item.title) hideStatus();
    else showStatus(t(lang, 'noTitleWarn'));
  } catch (err) {
    item = null;
    const message = (err && err.message) || String(err);

    // "must request permission" appears only when the host permission is really
    // missing — as opposed to a browser-internal page, where no grant can help.
    if (/must request permission/i.test(message)) {
      showStatus(t(lang, 'needAccess'), { grant: true, detail: t(lang, 'needAccessHint') });
    } else {
      showStatus(`${t(lang, 'errorTitle')} ${message ? `(${message})` : ''}`, {
        retry: true,
        detail: t(lang, 'errorHint'),
      });
    }
  }
}

// ----------------------------------------------------------------- rendering

function renderItem() {
  $('f-title').value = item.title || '';
  $('f-authors').value = authorsToString(item.authors);
  $('f-site').value = item.siteName || '';
  $('f-published').value = isoDate(item.published);
  $('f-accessed').value = isoDate(item.accessed);
  $('f-url').value = item.url || '';
  renderCitation();
}

function renderCitation() {
  if (!item) return;
  // textContent, never innerHTML — every one of these strings came from the page.
  $('citation').textContent = getStyle($('style').value).render(item, {
    retrievalDate: $('retrieval').checked,
  });
}

function onFieldEdit() {
  if (!item) return;
  item = reparse(item, {
    titleRaw: $('f-title').value,
    authorsRaw: $('f-authors').value,
    siteName: $('f-site').value,
    publishedRaw: $('f-published').value,
    accessedRaw: $('f-accessed').value,
    url: $('f-url').value,
  });
  renderCitation();
}

// ------------------------------------------------------------------- actions

function wireEvents() {
  for (const id of FIELD_IDS) $(id).addEventListener('input', onFieldEdit);

  $('style').addEventListener('change', () => {
    save({ style: $('style').value });
    renderCitation();
  });

  $('format').addEventListener('change', () => save({ format: $('format').value }));

  $('retrieval').addEventListener('change', () => {
    save({ retrievalDate: $('retrieval').checked });
    renderCitation();
  });

  // No re-render needed: the abstract only reaches the export formats, never the
  // citation styles.
  $('abstract').addEventListener('change', () => {
    save({ includeAbstract: $('abstract').checked });
  });

  $('lang').addEventListener('click', async () => {
    lang = otherLang(lang);
    await save({ lang });
    applyStaticStrings();
    renderCitation();
  });

  $('retry').addEventListener('click', loadPage);

  $('grant').addEventListener('click', async () => {
    // Called as the first statement of the click handler: chrome.permissions
    // .request needs a live user gesture, and any await before it would burn
    // the gesture window. Awaiting the *result* afterwards is fine.
    const granted = await chrome.permissions.request({
      origins: ['http://*/*', 'https://*/*'],
    });
    if (granted) await loadPage();
    else showStatus(t(lang, 'accessDenied'));
  });

  $('copy-citation').addEventListener('click', (e) => {
    if (!item) return;
    copyText(citationText(), e.currentTarget, 'copied');
  });

  $('copy-record').addEventListener('click', (e) => {
    if (!item) return;
    copyText(recordText(), e.currentTarget, 'recordCopied');
  });

  $('download').addEventListener('click', async (e) => {
    if (!item) return;
    const fmt = getFormat($('format').value);
    try {
      await downloadText(fmt.render(exportedItem()), filenameFor(item, fmt.ext));
      flash(e.currentTarget, t(lang, 'saved'));
    } catch (err) {
      showStatus(err && err.message ? err.message : String(err));
    }
  });
}

const citationText = () =>
  item ? getStyle($('style').value).render(item, { retrievalDate: $('retrieval').checked }) : '';

/**
 * The record handed to the export formats. The abstract is withheld unless the
 * user explicitly opted in: the other fields are facts (a title, a date), but an
 * abstract is the author's own prose copied verbatim, so nothing copyrighted
 * leaves without a deliberate choice.
 */
const exportedItem = () => (settings.includeAbstract ? item : { ...item, abstract: '' });

const recordText = () => (item ? getFormat($('format').value).render(exportedItem()) : '');

async function copyText(text, button, okKey) {
  try {
    await navigator.clipboard.writeText(text);
    flash(button, t(lang, okKey));
  } catch {
    flash(button, t(lang, 'copyFailed'));
  }
}

/** Briefly swap a button's label to confirm an action happened. */
function flash(button, message) {
  if (button.dataset.flashing) return;
  button.dataset.flashing = '1';
  const original = button.textContent;
  button.textContent = message;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
    delete button.dataset.flashing;
  }, 1200);
}

// -------------------------------------------------------------------- status

function showStatus(text, { retry = false, grant = false, detail = '' } = {}) {
  $('status-text').textContent = detail ? `${text}\n${detail}` : text;
  $('retry').hidden = !retry;
  $('grant').hidden = !grant;
  $('status').hidden = false;
}

function hideStatus() {
  $('status').hidden = true;
}

async function save(patch) {
  Object.assign(settings, patch);
  try {
    await chrome.storage.local.set(patch);
  } catch {
    /* non-fatal: the setting just won't persist across popup opens */
  }
}

init();
