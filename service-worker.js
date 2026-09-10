import { detectLang, t } from './src/i18n.js';

const MENU_ID = 'cite-page';

const langOf = async () => {
  const { lang = '' } = await chrome.storage.local.get({ lang: '' });
  return lang || detectLang();
};

// ---------------------------------------------------------------- menu setup

async function buildMenu() {
  // removeAll before create keeps the label in step with the language toggle —
  // create() alone throws on a duplicate id.
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: t(await langOf(), 'menuTitle'),
    contexts: ['page'],
  });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lang) buildMenu();
});

// ------------------------------------------------------------------- action

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  // Nothing may be awaited before openPanel() reaches action.openPopup() — the
  // call has to happen inside the click's user gesture, and an await spends it.
  openPanel();
});

/**
 * Opens the same popup the toolbar icon opens, rather than exporting straight
 * from the menu. One surface means one place to review the extracted fields and
 * choose a format — a second silent export path would have its own stale
 * "last used format" state the user can't see.
 */
async function openPanel() {
  try {
    await chrome.action.openPopup();
  } catch {
    // action.openPopup() is only available to ordinary extensions from
    // Chrome/Edge 127. Older builds get pointed at the toolbar icon instead.
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: t(await langOf(), 'appName'),
        message: t(await langOf(), 'openPopupHint'),
      });
    } catch {
      /* notifications can be disabled system-wide; there is nothing left to try */
    }
  }
}
