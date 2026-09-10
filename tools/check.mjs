// Verifies every module parses and that all relative imports resolve to real
// files. Run: node tools/check.mjs
//
// The popup and service worker touch browser globals that don't exist in Node,
// so a ReferenceError at import time is expected and means "parsed fine". Only
// SyntaxError and ERR_MODULE_NOT_FOUND are treated as failures.

const MODULES = [
  '../src/util.js',
  '../src/normalize.js',
  '../src/i18n.js',
  '../src/download.js',
  '../src/extract.js',
  '../src/formats/index.js',
  '../src/formats/ris.js',
  '../src/formats/enw.js',
  '../src/formats/bibtex.js',
  '../src/formats/csljson.js',
  '../src/styles/index.js',
  '../src/styles/shared.js',
  '../src/styles/apa.js',
  '../src/styles/mla.js',
  '../src/styles/chicago.js',
  '../src/styles/harvard.js',
  '../src/styles/gbt7714.js',
  '../popup/popup.js',
  '../service-worker.js',
];

// popup.js kicks off async work at module scope; its eventual rejection is
// expected in Node and must not take the process down.
process.on('unhandledRejection', () => {});

let failures = 0;

for (const path of MODULES) {
  try {
    await import(new URL(path, import.meta.url).href);
    console.log(`  ok   ${path}`);
  } catch (err) {
    const isSyntax = err instanceof SyntaxError;
    const isMissing = err && err.code === 'ERR_MODULE_NOT_FOUND';

    if (isSyntax || isMissing) {
      failures++;
      console.log(`  FAIL ${path}\n         ${err.message}`);
    } else {
      // Parsed and evaluated as far as the browser-only globals allow.
      console.log(`  ok   ${path}  (browser global: ${err.message})`);
    }
  }
}

console.log(
  failures ? `\n${failures} module(s) failed` : `\nAll ${MODULES.length} modules parse and resolve.`
);

// ------------------------------------------------------- regression guards

// Chrome rewrites a download's extension from the data URL's MIME type, so a
// `text/plain` payload made every export land as .txt whatever format was
// chosen. Only octet-stream (no default extension) leaves the filename alone.
{
  const assert = await import('node:assert/strict');
  const { downloadText } = await import('../src/download.js');

  let captured = null;
  globalThis.chrome = { downloads: { download: async (opts) => ((captured = opts), 1) } };

  await downloadText('TY  - WEB\nER  - \n', 'Kucsko-2013-nature.ris');

  const mime = captured.url.slice('data:'.length, captured.url.indexOf(';'));
  assert.equal(
    mime,
    'application/octet-stream',
    `download MIME must have no default extension, got "${mime}"`
  );
  assert.equal(captured.filename, 'Kucsko-2013-nature.ris');

  console.log('\nDownload extension is preserved (MIME has no default extension).');
}

process.exit(failures ? 1 : 0);
