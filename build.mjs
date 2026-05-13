import { mkdir, rm, copyFile, cp } from 'node:fs/promises';
import { build } from 'esbuild';

const dist = new URL('./dist/', import.meta.url);

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

await cp(new URL('./icons/', import.meta.url), new URL('./dist/icons/', import.meta.url), { recursive: true });
