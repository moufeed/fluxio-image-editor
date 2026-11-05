# Host integration

## Install

```bash
npm install fluxio-image-editor fabric
```

```ts
import { FluxioImageEditor, type ImageEditorConfig } from 'fluxio-image-editor';
```

Peer dependencies: Angular 21.2+, `fabric` ^6.

## Minimal template

```html
<fluxio-image-editor
  [source]="imageSource"
  [config]="config"
  (ready)="onReady($event)"
  (changed)="onChanged($event)"
  (saved)="onSaved($event)"
  (closed)="onClosed($event)"
  (error)="onError($event)"
/>
```

```ts
readonly config: ImageEditorConfig = {
  theme: 'light',
  locale: 'en',
  dir: 'auto',
  toolbar: {
    // Utilibar (crop / rotate / resize / fit): left | right
    position: 'left',
    // Chrome toolbar (zoom / history / export): top | bottom
    toolbarPosition: 'top',
    showSaveButton: true,
    actionDisplay: 'both', // 'icon' | 'label' | 'both'
    // visibleActions: ['crop.tool', 'transform.rotate', 'transform.resize'],
  },
  crop: {
    autoResize: false,
    forcePngOnEllipticalCrop: false,
  },
  // aspectRatios: [{ id: 'ellipse', label: 'Ellipse', ratio: null, shape: 'ellipse' }],
  rotate: { incrementDegrees: 90, allowArbitraryAngle: false },
  viewport: { wheelZoom: true },
  close: { warnOnUnsaved: true },
};
```

## Chrome layout

| Region | Role | Config |
| --- | --- | --- |
| **Toolbar** | Zoom, undo/redo, export, close | `toolbar.toolbarPosition` (`top` \| `bottom`) |
| **Utilibar** | Plugin tools (crop, rotate, resize, fit, …) | `toolbar.position` (`left` \| `right`), `actionDisplay`, `visibleActions`, `actions` |
| **Controls bar** | Active-tool panel | Shown when a tool mode is active |

### Crop

| Option | Meaning |
| --- | --- |
| `aspectRatios[].shape: 'ellipse'` | Elliptical crop (transparent outside ellipse on PNG) |
| `aspectRatios[].width` / `height` | Target output size for that preset |
| `crop.autoResize` | When true, Apply crops then resizes to the preset's width×height (one undo) |
| `crop.forcePngOnEllipticalCrop` | Export dialog prefers PNG for elliptical crops |

### Finetune / adjustments

Optional plugin entry: `fluxio-image-editor/plugins/adjustments`. The shell registers it by default.

| Control | Document field | Notes |
| --- | --- | --- |
| Brightness / contrast / hue / saturation / value / warmth / exposure | `document.adjustments.*` ∈ [-1, 1] | Live preview while sliding; **Apply** writes one history entry |
| Blur / sharpen | `document.adjustments.blur` / `.sharpen` ∈ [0, 1] | Same Finetune panel |
| Utilibar action | `adjustments.tool` | Opens the finetune panel |

UI sliders use −100…100 (blur 0…100) and map to the normalized document ranges.

## Source types

- URL string
- `File` / `Blob`
- `HTMLImageElement`
- `{ url, name? }`

EXIF orientation is read when possible; display size follows the browser’s decoded image.

## Export

`(saved)` emits `{ blob, file?, format, width, height, fileName }`.

JPEG flattens transparency onto white (or `backgroundColor`).

## Programmatic handle

```ts
handle.load(source);
await handle.execute('transform.rotate', { degrees: 90 });
handle.undo();
handle.redo();
handle.reset();
handle.fitViewport();
handle.setZoom(1.5);
const result = await handle.export({ format: 'jpeg', quality: 0.9, asFile: true });
```

## Secondary entry points

| Entry | Use |
| --- | --- |
| `fluxio-image-editor` | Angular shell component |
| `fluxio-image-editor/core` | Session, ports, models |
| `fluxio-image-editor/renderer-fabric` | Fabric adapter |
| `fluxio-image-editor/plugins/transform` | Rotate / flip / resize |
| `fluxio-image-editor/plugins/crop` | Crop |
| `fluxio-image-editor/plugins/viewport` | Fit / zoom actions |
| `fluxio-image-editor/plugins/export` | Export actions |
| `fluxio-image-editor/plugins/compare` | Live original compare |
| `fluxio-image-editor/plugins/stickers` | Stickers / icons gallery |
| `fluxio-image-editor/plugins/emoji` | Searchable emoji picker (text annotations) |
| `fluxio-image-editor/plugins/color-overlay` | Solid/gradient color wash on top of the photo (Fill) |
| `fluxio-image-editor/plugins/fill` | Background fill behind transparent pixels |
| `fluxio-image-editor/plugins/rulers` | Rulers, grid, guides, and annotation snapping |
| `fluxio-image-editor/plugins/batch-export` | Multi-format / multi-size batch export |
| `fluxio-image-editor/plugins/persistence` | Design-state persistence |

Transform-only hosts may omit the crop plugin entry (see `tools/transform-only-entry.ts`).
