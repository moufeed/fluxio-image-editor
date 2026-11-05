#!/usr/bin/env node
/**
 * Core microbench report for large-image / dense-annotation paths.
 * Runs Vitest bench specs and writes docs/perf-pv45.md.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { platform, version as nodeVersion } from 'node:process';

const root = process.cwd();
const jsonPath = join(root, 'docs/perf-pv45-core.json');
const mdPath = join(root, 'docs/perf-pv45.md');

console.log('Running core microbenches (vitest + jsdom)…');
execSync(
  'npx ng test fluxio-image-editor --include=**/pv45-core.bench.spec.ts --watch=false',
  { stdio: 'inherit', cwd: root },
);

if (!existsSync(jsonPath)) {
  console.error(`Expected results at ${jsonPath} — bench did not write JSON.`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
data.environment = {
  ...(data.environment ?? {}),
  platform,
  node: nodeVersion,
};
writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

function fmtMs(ms) {
  return `${Number(ms).toFixed(2)} ms`;
}

const rows = Array.isArray(data.rows) ? data.rows : [];
const table = [
  '| ID | Scenario | Median | Iterations | Meta |',
  '| --- | --- | ---: | ---: | --- |',
  ...rows.map((row) => {
    const meta = row.meta
      ? Object.entries(row.meta)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : '—';
    return `| \`${row.id}\` | ${row.label} | ${fmtMs(row.ms)} | ${row.iterations} | ${meta} |`;
  }),
];

const md = `# Performance baseline

Generated: ${data.generatedAt}

**Scope:** Core microbenches in Vitest/jsdom (\`FakeRendererAdapter\`). These measure annotation/history/preview-sizing cost — **not** full Fabric \`composeDocumentCanvas\` / GPU paint.

| | |
| --- | --- |
| Platform | ${data.environment?.platform ?? 'unknown'} |
| Node | ${data.environment?.node ?? 'unknown'} |
| Runner | ${data.environment?.runner ?? 'unknown'} |

## Results

${table.join('\n')}

## Already-in-place mitigations

| Mitigation | Location |
| --- | --- |
| Preview long-edge cap (2048) | \`renderer-fabric/src/preview-compose.ts\` (\`MAX_PREVIEW_LONG_EDGE\`) |
| Zoom/DPR-aware preview budget | \`computePreviewMaxLongEdge\` |
| Layer cache on preview compose | Fabric adapter \`composeDocumentCanvas\` (\`useCache\`) |
| rAF coalesce | \`scheduleRefresh\` |
| History coalesce for sliders | \`BoundedHistory\` + \`coalesceKey\` |

## Interpretation / next optimization targets

1. **\`annotationsEqual\`** — still double-normalizes and \`JSON.stringify\`s; watch if dense markup commit cost grows.
2. **Fabric compose / export** — not measured here; if hosts report lag on 4K/8K + 200+ annotations, add a Playwright mark around \`handle.export\` / first paint and compare to this baseline.
3. Soft Vitest ceilings in \`pv45-core.bench.spec.ts\` catch pathological regressions only.

## Method

1. \`npm run perf:pv45\` → runs \`pv45-core.bench.spec.ts\` (writes \`docs/perf-pv45-core.json\`).
2. This script regenerates \`docs/perf-pv45.md\`.
3. Re-run on the same machine before/after perf changes.

${(data.notes ?? []).map((n) => `> ${n}`).join('\n')}
`;

writeFileSync(mdPath, md, 'utf8');
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
