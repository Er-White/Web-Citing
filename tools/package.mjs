// Builds the ZIP submitted to the Edge Add-ons store. Pure Node + zlib, so it
// needs neither the `zip` binary (absent on Windows) nor PowerShell.
//
// Run: node tools/package.mjs
//
// It ships an explicit ALLOW-LIST rather than excluding dev paths: a directory
// added to the project later then has to be opted in, instead of silently
// ending up in the published package.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Everything the browser needs at runtime, and nothing else. */
const INCLUDE_DIRS = ['popup', 'src', 'icons', '_locales'];

// LICENSE ships too: the GPL requires the licence to accompany any distribution,
// and the store package is one.
const INCLUDE_FILES = ['manifest.json', 'service-worker.js', 'LICENSE'];

// ------------------------------------------------------------------- zip bits

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** MS-DOS packed date/time, which is what the ZIP format stores. */
function dosStamp(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function zip(entries, stamp) {
  const { time, date } = dosStamp(stamp);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { path, data } of entries) {
    const name = Buffer.from(path, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    // Bit 11 marks the filename as UTF-8; without it non-ASCII paths mangle.
    const flags = 0x0800;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length

    locals.push(local, name, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);

    centrals.push(central, name);
    offset += local.length + name.length + deflated.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...locals, centralBuf, eocd]);
}

// ------------------------------------------------------------------- assemble

function walk(dir, base) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = `${base}/${name}`;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push({ path: rel, data: readFileSync(abs) });
  }
  return out;
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));

const files = [
  ...INCLUDE_FILES.map((f) => ({ path: f, data: readFileSync(join(ROOT, f)) })),
  ...INCLUDE_DIRS.flatMap((d) => walk(join(ROOT, d), d)),
].sort((a, b) => a.path.localeCompare(b.path));

const out = join(ROOT, `web-citing-v${manifest.version}.zip`);
writeFileSync(out, zip(files, new Date()));

console.log(`manifest version : ${manifest.version}`);
console.log(`files packaged   : ${files.length}`);
for (const f of files) console.log(`  ${f.path}`);
console.log(`\ncreated ${out.split(/[\\/]/).pop()}`);
