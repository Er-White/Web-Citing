// Generates icons/icon-{16,48,128}.png with zero dependencies.
// Pure Node: builds PNG chunks by hand and deflates with the built-in zlib.
// Run: node tools/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- PNG writer

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

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** rgba: Uint8Array of size*size*4 */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines, each prefixed with filter byte 0 (None).
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------------- shapes

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * The mark: a rounded-square badge with a white double-quote (two rounded
 * bars) — "this is a citation". Drawn with 3x3 supersampling so the small
 * sizes don't alias into mush.
 */
function render(size) {
  const S = size;
  const BG = [47, 111, 235]; // #2F6FEB
  const FG = [255, 255, 255];

  const barW = S * 0.13;
  const barH = S * 0.30;
  const barTop = S * 0.29;
  const radius = barW / 2;
  const leftBarX = S * 0.29;
  const rightBarX = S * 0.58;

  const rgba = new Uint8Array(S * S * 4);
  const SUB = 3;

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      let bgHits = 0;
      let fgHits = 0;

      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const x = px + (sx + 0.5) / SUB;
          const y = py + (sy + 0.5) / SUB;

          if (!inRoundedRect(x, y, 0.5, 0.5, S - 0.5, S - 0.5, S * 0.22)) continue;
          bgHits++;

          const inLeft = inRoundedRect(
            x, y, leftBarX, barTop, leftBarX + barW, barTop + barH, radius
          );
          const inRight = inRoundedRect(
            x, y, rightBarX, barTop, rightBarX + barW, barTop + barH, radius
          );
          if (inLeft || inRight) fgHits++;
        }
      }

      const total = SUB * SUB;
      const i = (py * S + px) * 4;
      if (bgHits === 0) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
        continue;
      }

      // Premultiply-free blend of FG over BG, then scale alpha by coverage.
      const f = fgHits / total;
      rgba[i] = Math.round(BG[0] * (1 - f) + FG[0] * f);
      rgba[i + 1] = Math.round(BG[1] * (1 - f) + FG[1] * f);
      rgba[i + 2] = Math.round(BG[2] * (1 - f) + FG[2] * f);
      rgba[i + 3] = Math.round((bgHits / total) * 255);
    }
  }

  return rgba;
}

// ---------------------------------------------------------------------- main

const outDir = join(ROOT, 'icons');
mkdirSync(outDir, { recursive: true });

// The three sizes manifest.json references.
for (const size of [16, 48, 128]) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, render(size)));
  console.log(`created icons/icon-${size}.png (${size}x${size})`);
}

// The Edge Add-ons store additionally requires a 300x300 logo, which is a
// listing asset rather than part of the extension — so it lives in
// store-assets/ and stays out of the submission ZIP.
const storeDir = join(ROOT, 'store-assets');
mkdirSync(storeDir, { recursive: true });
writeFileSync(join(storeDir, 'store-logo-300.png'), encodePng(300, render(300)));
console.log('created store-assets/store-logo-300.png (300x300)');
