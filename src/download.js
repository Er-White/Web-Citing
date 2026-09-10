/**
 * Saves text to the user's downloads folder.
 *
 * The MIME type is deliberately application/octet-stream, NOT the format's real
 * type. chrome.downloads.download derives the file extension from the MIME type
 * and overrides whatever extension `filename` asks for — so a page exported with
 * `data:text/plain` always lands as `.txt`, no matter that the filename said
 * `.ris`. octet-stream has no default extension for Chrome to substitute, so the
 * filename wins. See https://github.com/w3c/webextensions/issues/856
 *
 * A data URL is used rather than a Blob URL because URL.createObjectURL does not
 * exist in a service worker — this keeps the module usable from both contexts.
 */
export async function downloadText(text, filename) {
  const url = `data:application/octet-stream;charset=utf-8,${encodeURIComponent(text)}`;
  return chrome.downloads.download({
    url,
    filename,
    saveAs: false,
    // Never silently clobber a previous export of the same page.
    conflictAction: 'uniquify',
  });
}
