# fluxio-image-editor

Angular 21.2 image editor library with a plugin architecture and a Fabric.js renderer.

**Live docs:** https://moufeed.github.io/fluxio-image-editor/  
**Full demo (local):** `npm run start:demo` — all fixtures and host toggles, not deployed to Pages.

Written guides: [docs/](./docs/) · dev docs app: `npm run start:docs`

## Install

```bash
npm install fluxio-image-editor fabric
```

Peer dependencies: Angular `^21.2` (`@angular/common`, `@angular/core`) and
`fabric` `^6.9`.

## Quick start

```ts
import { Component } from '@angular/core';
import { FluxioImageEditor, type ImageEditorConfig } from 'fluxio-image-editor';

@Component({
  selector: 'app-editor',
  imports: [FluxioImageEditor],
  template: `
    <fluxio-image-editor
      [source]="source"
      [config]="config"
      (saved)="onSaved($event)"
      (error)="onError($event)"
    />
  `,
})
export class EditorComponent {
  readonly source = 'https://example.com/photo.jpg';
  readonly config: ImageEditorConfig = {
    theme: 'light',
    toolbar: { position: 'left', toolbarPosition: 'top', showSaveButton: true },
  };
}
```

See [docs/integration.md](./docs/integration.md) for config, events, the
programmatic handle, and export options.

## Package

- Name: `fluxio-image-editor`
- Secondary entries:
  - `fluxio-image-editor/core`
  - `fluxio-image-editor/renderer-fabric`
  - `fluxio-image-editor/plugins/adjustments`
  - `fluxio-image-editor/plugins/batch-export`
  - `fluxio-image-editor/plugins/color-overlay`
  - `fluxio-image-editor/plugins/color-picker`
  - `fluxio-image-editor/plugins/compare`
  - `fluxio-image-editor/plugins/crop`
  - `fluxio-image-editor/plugins/crop-mask`
  - `fluxio-image-editor/plugins/drawing`
  - `fluxio-image-editor/plugins/effects`
  - `fluxio-image-editor/plugins/emoji`
  - `fluxio-image-editor/plugins/export`
  - `fluxio-image-editor/plugins/fill`
  - `fluxio-image-editor/plugins/filters`
  - `fluxio-image-editor/plugins/focus`
  - `fluxio-image-editor/plugins/frame`
  - `fluxio-image-editor/plugins/history-snapshots`
  - `fluxio-image-editor/plugins/image-overlay`
  - `fluxio-image-editor/plugins/layers`
  - `fluxio-image-editor/plugins/path`
  - `fluxio-image-editor/plugins/persistence`
  - `fluxio-image-editor/plugins/redact`
  - `fluxio-image-editor/plugins/rulers`
  - `fluxio-image-editor/plugins/shapes`
  - `fluxio-image-editor/plugins/stickers`
  - `fluxio-image-editor/plugins/templates`
  - `fluxio-image-editor/plugins/text`
  - `fluxio-image-editor/plugins/transform`
  - `fluxio-image-editor/plugins/viewport`
  - `fluxio-image-editor/plugins/watermark`
  - `fluxio-image-editor/testing`

## Documentation

- **Live (GitHub Pages):** https://moufeed.github.io/fluxio-image-editor/
- [docs/integration.md](./docs/integration.md) — host install, config, handle API
- [docs/csp-cors.md](./docs/csp-cors.md) — CSP / CORS compatibility
- [docs/interaction-checks.md](./docs/interaction-checks.md) — manual QA checklist
- Local interactive app: `npm run start:docs`
- Full demo app (all options): `npm run start:demo`
- Build the static docs site: `npm run build:docs` → `dist/docs/browser`

## Publishing

Before publishing, open a pull request with the release changes and wait for CI
to pass. Check that the library version in
[`projects/fluxio-image-editor/package.json`](./projects/fluxio-image-editor/package.json)
matches the version heading in its `CHANGELOG.md`.

```bash
npm test
npm run pack:lib      # build + inspect the package contents
npm run build:docs
```

After merging the pull request to `main`, the **Create release** workflow
(`.github/workflows/release.yml`) runs when `package.json` or `CHANGELOG.md`
changes. It creates an annotated tag `v<version>`, a GitHub Release (notes from
`CHANGELOG.md`), and pushes the tag. That tag push triggers **Publish package**
(`.github/workflows/publish.yml`) to publish to npm.

You can also run **Actions → Create release → Run workflow** on `main` after
merging, if you need to retry without changing files.

Ensure the repository has an `NPM_TOKEN` Actions secret with permission to
publish this package.

Prepare a release in a pull request:

```bash
npm test
npm run pack:lib      # build + inspect the package contents
npm run build:docs
```

1. Bump `version` in [`projects/fluxio-image-editor/package.json`](./projects/fluxio-image-editor/package.json).
2. Add a `## [x.y.z]` section to [`CHANGELOG.md`](./projects/fluxio-image-editor/CHANGELOG.md).
3. Merge to `main` — tag `vx.y.z`, GitHub Release, and npm publish follow automatically
   (skip if that tag already exists).

Do not run `npm run publish:lib` for CI publishing; the tag workflow handles it.

Docs deploy to GitHub Pages via `.github/workflows/pages.yml` (enable **Settings →
Pages → Source: GitHub Actions**).

## CSP / CORS

The library is compatible with strict CSP hosts but does **not** define or own the
consuming app’s CSP or CORS. Details: [docs/csp-cors.md](./docs/csp-cors.md).

```bash
npm run start:demo       # normal demo
npm run start:demo:csp   # strict CSP validation host (demo only)
```

## Scripts

```bash
npm start                 # demo app (alias of start:demo)
npm run start:demo        # demo app
npm run start:demo:csp    # demo under strict CSP validation
npm run start:docs        # interactive documentation app
npm run build:lib         # library
npm run build:docs        # static docs site
npm run pack:lib          # build library + npm pack --dry-run
npm run bundle:compare    # write docs/bundle-comparison.md
npm test                  # unit + architecture tests
npm run test:e2e          # Playwright Chromium smoke (default)
npm run test:e2e:firefox  # Playwright Firefox
npm run test:e2e:webkit   # Playwright WebKit (Safari engine)
npm run test:e2e:browsers # Chromium + Firefox + WebKit
npm run test:e2e:csp      # Playwright CSP UI path (Chromium)
```

## License

MIT
