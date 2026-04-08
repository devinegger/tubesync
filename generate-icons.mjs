/**
 * Generates icon-192.png and icon-512.png using pure Node.js.
 * Draws a music note (♩) on a dark background using a minimal PNG encoder.
 * No external dependencies required.
 */

import { writeFileSync } from 'fs';
import { createDeflate } from 'zlib';
import { promisify } from 'util';

const deflate = promisify((buf, opts, cb) => {
  const chunks = [];
  const d = createDeflate(opts);
  d.on('data', c => chunks.push(c));
  d.on('end', () => cb(null, Buffer.concat(chunks)));
  d.on('error', cb);
  d.write(buf);
  d.end();
});

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  const crcInput = Buffer.concat([typeBytes, data]);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

async function makePNG(size) {
  // RGBA canvas
  const pixels = new Uint8ClampedArray(size * size * 4);

  const BG = [0x11, 0x11, 0x11, 0xff];
  const GOLD = [0xe5, 0xa0, 0x0d, 0xff];

  // Fill background
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i]   = BG[0];
    pixels[i+1] = BG[1];
    pixels[i+2] = BG[2];
    pixels[i+3] = BG[3];
  }

  function setPixel(x, y, color) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    pixels[idx]   = color[0];
    pixels[idx+1] = color[1];
    pixels[idx+2] = color[2];
    pixels[idx+3] = color[3];
  }

  function fillRect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        setPixel(x + dx, y + dy, color);
  }

  function fillCircle(cx, cy, r, color) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (dx*dx + dy*dy <= r*r)
          setPixel(cx + dx, cy + dy, color);
  }

  // Draw a music note scaled to size
  const s = size / 192;
  const u = Math.max(1, Math.round(s));

  // Stem: vertical bar
  const stemX  = Math.round(110 * s);
  const stemY1 = Math.round(48  * s);
  const stemY2 = Math.round(130 * s);
  const stemW  = Math.round(10  * s);
  fillRect(stemX, stemY1, stemW, stemY2 - stemY1, GOLD);

  // Flag (curved top hook — simplified as two angled rects)
  const flagW = Math.round(36 * s);
  const flagH = Math.round(10 * s);
  fillRect(stemX + stemW, stemY1,                flagW, flagH, GOLD);
  fillRect(stemX + stemW, stemY1 + flagH * 1.2,  Math.round(flagW * 0.7), flagH, GOLD);

  // Note head: filled ellipse (wider than tall)
  const headCX = Math.round(88  * s);
  const headCY = Math.round(136 * s);
  const headRX = Math.round(28  * s);
  const headRY = Math.round(20  * s);
  for (let dy = -headRY; dy <= headRY; dy++) {
    for (let dx = -headRX; dx <= headRX; dx++) {
      const inEllipse = (dx*dx)/(headRX*headRX) + (dy*dy)/(headRY*headRY) <= 1;
      if (inEllipse) setPixel(headCX + dx, headCY + dy, GOLD);
    }
  }

  // Build raw PNG scanlines
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter byte = None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (1 + size * 4) + 1 + x * 4;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
      raw[dst+3] = pixels[src+3];
    }
  }

  const compressed = await deflate(raw, { level: 6 });

  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 6;  // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const [png192, png512] = await Promise.all([makePNG(192), makePNG(512)]);
writeFileSync('public/icon-192.png', png192);
writeFileSync('public/icon-512.png', png512);
console.log('Generated public/icon-192.png and public/icon-512.png');
