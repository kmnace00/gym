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

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) { const p = pixel(x, y); raw[o++] = p[0]; raw[o++] = p[1]; raw[o++] = p[2]; raw[o++] = p[3]; }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const BG = [11, 14, 18, 255];      // #0b0e12
const TEAL = [53, 208, 184, 255];  // #35d0b8
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x < x1 && y >= y0 && y < y1;

function make(size) {
  const N = size, cy = N / 2;
  return png(N, N, (x, y) => {
    if (inRect(x, y, 0.30 * N, cy - 0.045 * N, 0.70 * N, cy + 0.045 * N)) return TEAL; // bar
    if (inRect(x, y, 0.22 * N, cy - 0.14 * N, 0.30 * N, cy + 0.14 * N)) return TEAL;  // inner L
    if (inRect(x, y, 0.70 * N, cy - 0.14 * N, 0.78 * N, cy + 0.14 * N)) return TEAL;  // inner R
    if (inRect(x, y, 0.16 * N, cy - 0.10 * N, 0.22 * N, cy + 0.10 * N)) return TEAL;  // outer L
    if (inRect(x, y, 0.78 * N, cy - 0.10 * N, 0.84 * N, cy + 0.10 * N)) return TEAL;  // outer R
    return BG;
  });
}

const root = path.join(__dirname, "..");
fs.writeFileSync(path.join(root, "icon-512.png"), make(512));
fs.writeFileSync(path.join(root, "icon-192.png"), make(192));
console.log("icons written: icon-512.png, icon-192.png");
