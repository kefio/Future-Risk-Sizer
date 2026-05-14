import { mkdir, rm, copyFile, cp, stat, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { build } from 'esbuild';

const dist = new URL('./dist/', import.meta.url);
const icons = new URL('./icons/', import.meta.url);
const distIcons = new URL('./dist/icons/', import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: {
    popup: 'src/popup/index.tsx',
    options: 'src/options/index.tsx',
    background: 'src/background/index.ts',
    content: 'src/content/index.ts'
  },
  outdir: 'dist',
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome114'],
  sourcemap: false,
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

const files = ['manifest.json', 'popup.html', 'options.html'];
for (const file of files) {
  const source = new URL(`./${file}`, import.meta.url);
  const destination = new URL(`./dist/${file}`, import.meta.url);
  await copyFile(source, destination);
}

// Copy user icons if they exist, otherwise generate default ones
let hasIcons = false;
try {
  await stat(new URL('16x16.png', icons));
  hasIcons = true;
} catch { /* fall through */ }

await mkdir(distIcons, { recursive: true });

if (hasIcons) {
  await cp(icons, distIcons, { recursive: true });
} else {
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const png = createSolidPNG(size, size, 11, 30, 46);
    await writeFile(new URL(`${size}x${size}.png`, icons), png);
    await writeFile(new URL(`${size}x${size}.png`, distIcons), png);
  }
}

function createSolidPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const off = y * (width * 3 + 1) + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }
  const compressed = deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc);
  return Buffer.concat([len, typeB, data, crcB]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
