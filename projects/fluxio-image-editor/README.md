# FluxioImageEditor

Angular image editor component with a plugin architecture and a Fabric.js renderer.

- Angular **21.2+** standalone component
- Tree-shakeable secondary entry points (`core`, `renderer-fabric`, `plugins/*`)
- Crop, transform, adjustments, filters, text, shapes, drawing, watermarks, layers,
  history, export, persistence, background fill, rulers/snapping, and more
- Theme tokens, RTL support, strict-CSP friendly
- Interactive documentation with live previews in the repository

## Install

```bash
npm install fluxio-image-editor fabric
```

Peer dependencies: `@angular/common` and `@angular/core` ^21.2, `fabric` ^6.9.

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
      (ready)="onReady($event)"
      (saved)="onSaved($event)"
      (error)="onError($event)"
    />
  `,
})
export class EditorComponent {
  readonly source = 'https://example.com/photo.jpg';

  readonly config: ImageEditorConfig = {
    theme: 'light',
    locale: 'en',
    toolbar: { position: 'left', toolbarPosition: 'top', showSaveButton: true },
  };
}
```

The component also accepts `File` / `Blob`, `HTMLImageElement`, and `{ url, name? }`
sources. See the [host integration guide](https://github.com/moufeed/fluxio-image-editor/blob/main/docs/integration.md)
for config, events, the programmatic handle, and export options.

## Entry points

| Entry                                 | Use                                               |
| ------------------------------------- | ------------------------------------------------- |
| `fluxio-image-editor`                 | Angular shell component                           |
| `fluxio-image-editor/core`            | Session, ports, models, state                     |
| `fluxio-image-editor/renderer-fabric` | Fabric.js renderer adapter                        |
| `fluxio-image-editor/plugins/*`       | Optional editor features (crop, text, filters, …) |
| `fluxio-image-editor/testing`         | Test doubles for hosts                            |

Only import the plugins you enable to keep bundles small.

## Documentation

- Interactive docs app: `npm run start:docs` in the repository
- [Integration guide](https://github.com/moufeed/fluxio-image-editor/blob/main/docs/integration.md)
- [CSP / CORS notes](https://github.com/moufeed/fluxio-image-editor/blob/main/docs/csp-cors.md)
- [Documentation index](https://github.com/moufeed/fluxio-image-editor/blob/main/docs/README.md)

## License

MIT
