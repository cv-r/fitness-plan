/**
 * 生成 PWA 图标：纯 Node 实现（zlib 内置），不依赖任何三方库。
 * 用法：node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* ---------------------------- PNG 编码 ---------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** rgba: Uint8Array，长度 = size*size*4 */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------- 图标绘制 ---------------------------- */

const BRAND = [0x38, 0xbd, 0xf8];
const AQUA = [0x2d, 0xd4, 0xbf];
const INK = [0x04, 0x0a, 0x14];

/** 字形点阵：11×7 的哑铃，中间三行是横杆，两端由内向外收窄 */
const GLYPH = [
  '..#.....#..',
  '.##.....##.',
  '###########',
  '###########',
  '###########',
  '.##.....##.',
  '..#.....#..',
];

const GLYPH_W = 11;
const GLYPH_H = 7;

const SUPERSAMPLE = 3;

function inRoundedRect(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** 在 [0,1] 参数空间上采样一次，返回 [r,g,b,a] */
function sample(u, v, opts) {
  const { size, radius, glyphOriginX, glyphOriginY, unit } = opts;

  // 圆角矩形外 => 透明
  if (!inRoundedRect(u * size, v * size, size, radius)) return [0, 0, 0, 0];

  // 渐变底
  const t = (u + v) / 2;
  const bg = [
    Math.round(BRAND[0] + (AQUA[0] - BRAND[0]) * t),
    Math.round(BRAND[1] + (AQUA[1] - BRAND[1]) * t),
    Math.round(BRAND[2] + (AQUA[2] - BRAND[2]) * t),
  ];

  // 点阵字
  const gx = Math.floor((u * size - glyphOriginX) / unit);
  const gy = Math.floor((v * size - glyphOriginY) / unit);
  if (gy >= 0 && gy < GLYPH_H && gx >= 0 && gx < GLYPH_W && GLYPH[gy][gx] === '#') {
    return [...INK, 255];
  }

  return [...bg, 255];
}

function renderIcon(size) {
  const radius = size * 0.22;
  const unit = (size * 0.62) / GLYPH_W; // 字形占宽度的 62%
  const glyphWidth = unit * GLYPH_W;
  const glyphHeight = unit * GLYPH_H;
  const opts = {
    size,
    unit,
    radius,
    glyphOriginX: (size - glyphWidth) / 2,
    glyphOriginY: (size - glyphHeight) / 2,
  };

  const rgba = new Uint8Array(size * size * 4);
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const [sr, sg, sb, sa] = sample(
            (x + (sx + 0.5) / SUPERSAMPLE) / size,
            (y + (sy + 0.5) / SUPERSAMPLE) / size,
            opts,
          );
          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }
      const offset = (y * size + x) * 4;
      if (a === 0) {
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        rgba[offset + 3] = 0;
      } else {
        rgba[offset] = Math.round(r / a);
        rgba[offset + 1] = Math.round(g / a);
        rgba[offset + 2] = Math.round(b / a);
        rgba[offset + 3] = Math.round(a / samples);
      }
    }
  }

  return encodePng(size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32x32.png', 32],
];

for (const [name, size] of targets) {
  const png = renderIcon(size);
  writeFileSync(resolve(OUT_DIR, name), png);
  console.log(`✓ ${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
