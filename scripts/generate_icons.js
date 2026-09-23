const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator in pure Node.js (no external canvas/sharp dependencies needed)
function createPng(width, height, getPixelRgba) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, dataBuf) {
    const len = dataBuf.length;
    const chunk = Buffer.alloc(8 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    dataBuf.copy(chunk, 8);
    const crcVal = crc32(chunk.slice(4, 8 + len));
    chunk.writeUInt32BE(crcVal, 8 + len);
    return chunk;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const chunks = [
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat(chunks);
}

// Generate stylish gradient icon with "AI" and news emblem
function renderNewsIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2;
  const dx = (x - cx) / r;
  const dy = (y - cy) / r;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle / iOS icon shape
  const corner = Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4);
  if (corner > 0.95) {
    return [0, 0, 0, 0]; // transparent outside
  }

  // Dark modern gradient background (#0f172a to #1e1b4b)
  const t = (y / h) * 0.8 + (x / w) * 0.2;
  let bgR = Math.round(15 * (1 - t) + 30 * t);
  let bgG = Math.round(23 * (1 - t) + 27 * t);
  let bgB = Math.round(42 * (1 - t) + 75 * t);

  // Glow in center
  const glow = Math.max(0, 1 - dist * 1.2);
  bgR = Math.min(255, Math.round(bgR + glow * 40));
  bgG = Math.min(255, Math.round(bgG + glow * 80));
  bgB = Math.min(255, Math.round(bgB + glow * 180));

  // Draw simple AI emblem lines in middle
  // horizontal bars representing news feed
  const ny = (y - cy) / (h * 0.3);
  const nx = (x - cx) / (w * 0.3);

  // Center spark / star / newspaper motif
  if (Math.abs(nx) < 0.6 && Math.abs(ny) < 0.6) {
    // 3 lines
    const lineY = Math.abs(ny);
    if ((Math.abs(ny - 0.25) < 0.05 || Math.abs(ny + 0.25) < 0.05 || Math.abs(ny) < 0.05) && Math.abs(nx) < 0.45) {
      return [96, 165, 250, 255]; // bright blue
    }
    // accent badge on top left of newspaper
    if (nx > -0.45 && nx < -0.2 && ny > -0.4 && ny < -0.1) {
      return [56, 189, 248, 255]; // cyan
    }
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating app icons...');
const icon192 = createPng(192, 192, renderNewsIcon);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

const icon512 = createPng(512, 512, renderNewsIcon);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon192);

console.log('Icons generated successfully in public/');

