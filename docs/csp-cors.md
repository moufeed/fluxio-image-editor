# CSP and CORS

The library is compatible with strict Content Security Policy hosts, but it does
**not** define, inject, modify, or own the consuming application’s CSP or CORS
policy.

The demo’s strict-CSP mode is a **validation host** only — not a required policy
for every consumer.

## What “CSP-compatible” means

The library must operate in a strict CSP host without requiring:

- `unsafe-eval`
- runtime CDN scripts
- external mandatory resources (fonts, scripts, images, services)
- library-owned CSP headers or meta tags

The host remains responsible for CSP, CORS, authentication, remote media, and
proxy policies.

## Library responsibilities

The library:

- avoids `eval`, `new Function`, and dynamically evaluated JavaScript;
- avoids runtime JavaScript dependencies loaded from a CDN;
- avoids injecting CSP meta tags or changing security headers;
- avoids embedding authentication tokens, credentials, or secrets;
- avoids automatically loading external fonts, scripts, images, or services;
- accepts host-provided `File`, `Blob`, object URL, data URL, and image URL sources;
- supports anonymous cross-origin image loading (`crossOrigin: 'anonymous'`) when
  the source loader requests it;
- returns typed errors for image-load, CORS, tainted-canvas, and export failures
  (`ImageEditorError` with codes `IMAGE_LOAD_FAILED`, `CORS_FAILED`,
  `TAINTED_CANVAS`, `EXPORT_FAILED`);
- prefers `canvas.toBlob` for raster export (avoid `fetch(data:)` which many
  strict `connect-src 'self'` policies block);
- cleans up object URLs, Fabric canvases, event listeners, and image references
  on destroy;
- keeps Fabric.js internal to `FabricRendererAdapter`.

Fabric types must not appear in Core state, plugin state, command payloads,
serialized snapshots, or public APIs.

## Host responsibilities

The consuming application is responsible for:

- defining CSP headers or meta policies;
- deciding which image and API origins are permitted;
- configuring server-side CORS;
- managing authentication and authorization;
- providing same-origin proxy endpoints for protected media when necessary;
- converting library errors into application-specific messages and fallback UI.

### Recommended media proxy pattern (host-owned)

Do not put secrets in the editor. When media is protected or cross-origin:

```text
Editor receives a host-provided same-origin URL
        ↑
Host API / media proxy
        ↑
Protected or cross-origin media storage
```

Point `source` at a same-origin URL the host controls so CSP `img-src 'self'`
and CORS stay simple.

### CORS behavior

| Scenario                                 | Library behavior                                                |
| ---------------------------------------- | --------------------------------------------------------------- |
| Same-origin URL / File / Blob / data URL | Preferred; no CORS                                              |
| Cross-origin with CORS + anonymous       | Loads when the server allows; `crossOrigin: 'anonymous'`        |
| Cross-origin without CORS                | Load or export fails with a typed error; no silent proxy retry  |
| Authenticated images                     | Host must proxy same-origin; library never attaches credentials |
| Tainted canvas on export                 | `TAINTED_CANVAS` typed error where detectable                   |

## Demo validation

```bash
npm run start:demo       # normal development (no CSP meta)
npm run start:demo:csp   # strict CSP validation host
```

`start:demo:csp` uses `projects/demo/src/index.csp.html` and matching
development-server `Content-Security-Policy` headers.

### Strict validation policy (demo host)

```text
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'   ← demo/Angular host limitation (component styles)
img-src 'self' blob: data:
connect-src 'self'
worker-src 'self' blob:
object-src 'none'
base-uri 'self'
```

- **No** `unsafe-eval`
- **No** arbitrary external domains
- `style-src 'unsafe-inline'` is a **demo-host limitation**, not a library
  requirement. Hosts may use stricter style policies compatible with their
  Angular build pipeline.

### Manual acceptance checklist

```text
Load a same-origin image
→ fit and center
→ zoom or pan
→ rotate
→ crop or transform
→ undo
→ export to Blob
→ download or preview the result
→ destroy and reopen the editor
```

Expected:

- no CSP violations caused by the library or Fabric adapter;
- no external runtime scripts;
- no requirement for `unsafe-eval`;
- Blob-based export works;
- File and object URL loading work;
- same-origin image loading works;
- an invalid remote URL produces a controlled typed error;
- editor cleanup releases Fabric and object URL resources;
- reopening the editor creates a clean session.

## Guarantees

| Guarantee                                      | Status    |
| ---------------------------------------------- | --------- |
| No `unsafe-eval` required                      | Yes       |
| No CDN runtime scripts                         | Yes       |
| No library-owned CSP / CORS headers            | Yes       |
| File / Blob / same-origin / data URL sources   | Yes       |
| Anonymous CORS loading when applicable         | Yes       |
| Typed load / CORS / tainted / export errors    | Yes       |
| Fabric isolated behind `FabricRendererAdapter` | Yes       |
| Host CSP / CORS / auth / proxy ownership       | Host only |
