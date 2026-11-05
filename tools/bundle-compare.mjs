#!/usr/bin/env node
/**
 * Records library and demo bundle sizes.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();

function dirBytes(dir) {
  if (!existsSync(dir)) {
    return 0;
  }
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      total += dirBytes(full);
    } else {
      total += stats.size;
    }
  }
  return total;
}

function fileBytes(path) {
  return existsSync(path) ? statSync(path).size : 0;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

console.log('Building library + demo…');
execSync('npx ng build fluxio-image-editor', { stdio: 'inherit' });
execSync('npx ng build demo', { stdio: 'inherit' });

const demoBrowser = join(root, 'dist/demo/browser');
const libDist = join(root, 'dist/fluxio-image-editor');
const fesm = join(libDist, 'fesm2022');

function listJsFiles(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      listJsFiles(full, acc);
    } else if (entry.endsWith('.js') && !entry.endsWith('.js.map')) {
      acc.push({ path: full, name: entry, bytes: stats.size });
    }
  }
  return acc;
}

const demoBytes = dirBytes(demoBrowser);
const libBytes = dirBytes(libDist);

const demoJsFiles = listJsFiles(demoBrowser).sort((a, b) => b.bytes - a.bytes);
const lazyPluginChunks = demoJsFiles.filter(({ name }) =>
  /(?:adjustments|effects|filters|focus|text|shapes|drawing|image-overlay|stickers|watermark|persistence|compare|history-snapshots|layers)\.plugin/i.test(
    name,
  ),
);

const entryFiles = existsSync(fesm)
  ? readdirSync(fesm).filter((name) => name.endsWith('.mjs') && !name.endsWith('.map'))
  : [];

const entryRows = entryFiles
  .map((name) => {
    const bytes = fileBytes(join(fesm, name));
    return { name, bytes };
  })
  .sort((a, b) => b.bytes - a.bytes);

const previousLibKb = 310.2;
const libKbNum = libBytes / 1024;

const entryTable = entryRows
  .map((row) => `| \`${row.name}\` | ${kb(row.bytes)} |`)
  .join('\n');

const demoChunkTable = demoJsFiles
  .slice(0, 20)
  .map((row) => `| \`${row.name}\` | ${kb(row.bytes)} |`)
  .join('\n');

const lazyChunkTable = lazyPluginChunks
  .map((row) => `| \`${row.name}\` | ${kb(row.bytes)} |`)
  .join('\n');

const md = `# Bundle comparison

Generated: ${new Date().toISOString()}

| Artifact | Size | Notes |
|----------|------|-------|
| \`dist/fluxio-image-editor\` (library build) | ${kb(libBytes)} | Published package output |
| \`dist/demo/browser\` (demo host) | ${kb(demoBytes)} | Demo shell aggregate |

## Delta vs previous recorded baseline (2026-07-22)

| Artifact | Previous | Current | Delta |
|----------|----------|---------|-------|
| Library | ${previousLibKb.toFixed(1)} kB | ${libKbNum.toFixed(1)} kB | ${(libKbNum - previousLibKb).toFixed(1)} kB |

## Library entry points (fesm2022, uncompressed)

| Entry | Size |
|-------|------|
${entryTable || '| _(none)_ | — |'}

## Demo browser chunks (top 20 by size)

| Chunk | Size |
|-------|------|
${demoChunkTable || '| _(none)_ | — |'}

## Demo lazy plugin chunks (optional plugins, when dynamically imported)

| Chunk | Size |
|-------|------|
${lazyChunkTable || '| _(none — run demo with `config.plugins` subset)_ | — |'}

> Plugin lazy-load splits optional plugins into separate chunks when hosts set \`config.plugins\`.
> Default hosts (\`config.plugins\` omitted) keep synchronous static imports (backward compatible).

> Re-run: \`npm run bundle:compare\`

## Method

1. Production build of \`fluxio-image-editor\` and \`demo\`.
2. Sum of files under each \`dist\` folder (uncompressed on disk).
3. Per-entry sizes from \`dist/fluxio-image-editor/fesm2022/*.mjs\`.
`;

const outDir = join(root, 'docs');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'bundle-comparison.md'), md, 'utf8');
console.log('Wrote docs/bundle-comparison.md');
console.log(md);
