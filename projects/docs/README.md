# fluxio-image-editor documentation (Angular)

Interactive Angular docs app with **Preview / Code / API** tabs for every guide and plugin.

## Run

```bash
npm run start:docs
```

Open the URL printed by the CLI (default `http://localhost:4200/docs/getting-started`).

## Build

```bash
npm run build:docs
```

## Catalog

Canonical catalog content lives in `src/app/catalog/docs-content.ts`.

When `docs/site/` is present, regenerate with:

```bash
npm run docs:catalog
```

That pipeline writes `docs-content.ts` from `docs/site/assets/_gen-content.mjs` and attaches live preview settings in `tools/generate-docs-catalog.mjs`. If `docs/site/` is missing, edit `docs-content.ts` directly.

## Structure

- `layout/docs-shell` — nav, search, theme toggle
- `pages/doc-page` — Preview / Code / API tabs, TOC, breadcrumbs
- `shared/live-editor` — real `<fluxio-image-editor>` instance per page
- `shared/code-block` — syntax highlighting + Copy Code
