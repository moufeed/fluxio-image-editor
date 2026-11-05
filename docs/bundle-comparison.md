# Bundle comparison

Generated: 2026-07-23T17:01:43.410Z

| Artifact | Size | Notes |
|----------|------|-------|
| `dist/fluxio-image-editor` (library build) | 963.9 kB | Published package output |
| `dist/demo/browser` (demo host) | 9133.9 kB | Demo shell aggregate |

## Delta vs previous recorded baseline (2026-07-22)

| Artifact | Previous | Current | Delta |
|----------|----------|---------|-------|
| Library | 310.2 kB | 963.9 kB | 653.7 kB |

## Library entry points (fesm2022, uncompressed)

| Entry | Size |
|-------|------|
| `fluxio-image-editor.mjs` | 214.5 kB |
| `fluxio-image-editor-core.mjs` | 76.5 kB |
| `fluxio-image-editor-renderer-fabric.mjs` | 41.8 kB |
| `fluxio-image-editor-plugins-transform.mjs` | 6.1 kB |
| `fluxio-image-editor-plugins-watermark.mjs` | 4.5 kB |
| `fluxio-image-editor-plugins-filters.mjs` | 3.9 kB |
| `fluxio-image-editor-plugins-crop.mjs` | 3.4 kB |
| `fluxio-image-editor-plugins-image-overlay.mjs` | 3.4 kB |
| `fluxio-image-editor-plugins-shapes.mjs` | 3.3 kB |
| `fluxio-image-editor-plugins-adjustments.mjs` | 3.0 kB |
| `fluxio-image-editor-plugins-drawing.mjs` | 2.8 kB |
| `fluxio-image-editor-plugins-text.mjs` | 2.7 kB |
| `fluxio-image-editor-plugins-viewport.mjs` | 2.7 kB |
| `fluxio-image-editor-plugins-effects.mjs` | 2.5 kB |
| `fluxio-image-editor-plugins-export.mjs` | 1.6 kB |
| `fluxio-image-editor-plugins-persistence.mjs` | 1.0 kB |
| `fluxio-image-editor-testing.mjs` | 0.7 kB |

> Re-run: `npm run bundle:compare`

## Method

1. Production build of `fluxio-image-editor` and `demo`.
2. Sum of files under each `dist` folder (uncompressed on disk).
3. Per-entry sizes from `dist/fluxio-image-editor/fesm2022/*.mjs`.
