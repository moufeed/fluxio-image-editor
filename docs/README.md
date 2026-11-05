# Documentation

## Interactive docs app

**Published:** https://moufeed.github.io/fluxio-image-editor/

Live `<fluxio-image-editor>` previews on each docs page. Edit the sample, then
**Export → PNG/JPEG/WebP** (export unlocks after you apply a change).

Local dev:

```bash
npm run start:docs
```

See [`projects/docs/README.md`](../projects/docs/README.md).

## Guides in this folder

| Doc | Topic |
| --- | --- |
| [integration.md](./integration.md) | Host install, config, handle API, entry points |
| [csp-cors.md](./csp-cors.md) | CSP / CORS compatibility and demo validation |
| [interaction-checks.md](./interaction-checks.md) | Manual QA checklist for the demo host |
| [bundle-comparison.md](./bundle-comparison.md) | Generated library / demo bundle sizes |
| [perf-pv45.md](./perf-pv45.md) | Generated Core microbench baseline |

Regenerate metrics:

```bash
npm run bundle:compare
npm run perf:pv45
```

## Build / deploy the docs site

```bash
npm run build:docs          # static output in dist/docs/browser
npm run build:docs:pages    # same, with the GitHub Pages base href
```

Deployment is automated by `.github/workflows/pages.yml` (GitHub Pages). For any
other host (Netlify, Vercel, Cloudflare Pages), publish `dist/docs/browser` and set
the base path to match the host if the site is not served from `/`.
