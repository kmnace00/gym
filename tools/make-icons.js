/* Deterministic PNG icon generator (no dependencies). Run: node tools/make-icons.js */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c; }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

/* Two-colour logo, so a 1-bit indexed PNG is the honest encoding: bit depth 1,
   colour type 3, a 2-entry palette. It decodes to exactly the same pixels as
   the old RGBA output at ~1/25th the bytes (the precache ceiling is tight).  */
function pngIndexed2(width, height, pixel) {
  const rowBytes = (width + 7) >> 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    const row = o;
    for (let x = 0; x < width; x++) if (pixel(x, y)) raw[row + (x >> 3)] |= 0x80 >> (x & 7);
    o += rowBytes;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 1; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = Buffer.from([11, 14, 18, 53, 208, 184]); // #0b0e12, #35d0b8
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("PLTE", plte), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x < x1 && y >= y0 && y < y1;

function make(size) {
  const N = size, cy = N / 2;
  return pngIndexed2(N, N, (x, y) => {
    if (inRect(x, y, 0.30 * N, cy - 0.045 * N, 0.70 * N, cy + 0.045 * N)) return 1; // bar
    if (inRect(x, y, 0.22 * N, cy - 0.14 * N, 0.30 * N, cy + 0.14 * N)) return 1;  // inner L
    if (inRect(x, y, 0.70 * N, cy - 0.14 * N, 0.78 * N, cy + 0.14 * N)) return 1;  // inner R
    if (inRect(x, y, 0.16 * N, cy - 0.10 * N, 0.22 * N, cy + 0.10 * N)) return 1;  // outer L
    if (inRect(x, y, 0.78 * N, cy - 0.10 * N, 0.84 * N, cy + 0.10 * N)) return 1;  // outer R
    return 0;
  });
}

const root = path.join(__dirname, "..");
fs.writeFileSync(path.join(root, "icon-512.png"), make(512));
fs.writeFileSync(path.join(root, "icon-192.png"), make(192));
console.log("icons written: icon-512.png, icon-192.png");
