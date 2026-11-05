# Interaction checks

Manual checks against the demo host.

| Check | How | Expected |
|-------|-----|----------|
| Mount under strict CSP | `npm run start:demo:csp` | Editor visible; no CSP errors from library/Fabric |
| Load sample | Same-origin fixture / auto on start | Status ready; tools enabled |
| Load File / Blob | Demo controls | Loads; export still works |
| Load error fallback | Broken remote URL in demo | Typed `(error)` + host fallback |
| Rotate / undo | Utilibar (rotate) + toolbar (undo) | One history entry; undo restores |
| Export JPEG / Blob | Save / export dialog | Download; `(saved)` fires |
| Destroy / reopen | Demo “Destroy editor” → “Reopen” | Clean session; no leaked Fabric resources |
| Close dirty | Edit then Close | Confirm when dirty |

Strict CSP in the demo is a **validation host** policy only. See [csp-cors.md](./csp-cors.md).
