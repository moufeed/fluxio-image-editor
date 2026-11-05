/** Canonical docs catalog (docs/site is not checked in). Edit directly, or regenerate with npm run docs:catalog when docs/site exists. */
import type { EditorPluginRequestId, ImageEditorConfig } from 'fluxio-image-editor';

export interface DocsNavItem {
  readonly id: string;
  readonly label: string;
}

export interface DocsNavGroup {
  readonly title: string;
  readonly items: readonly DocsNavItem[];
}

export interface DocsCodeBlock {
  readonly lang?: string;
  readonly label?: string;
  readonly code?: string;
  readonly note?: string;
}

export interface DocsApiSection {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly list?: readonly string[];
  readonly callout?: { readonly tone?: string; readonly title: string; readonly body: string };
  readonly table?: { readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] };
  readonly example?: { readonly lang?: string; readonly label?: string; readonly code: string };
}

export interface DocsLivePreview {
  readonly plugins?: readonly EditorPluginRequestId[] | undefined;
  readonly defaultTool?: string;
  readonly theme?: ImageEditorConfig['theme'];
  readonly locale?: ImageEditorConfig['locale'];
  readonly dir?: ImageEditorConfig['dir'];
  readonly imageOverlay?: ImageEditorConfig['imageOverlay'];
  readonly stickers?: ImageEditorConfig['stickers'];
  readonly watermark?: ImageEditorConfig['watermark'];
  readonly emoji?: ImageEditorConfig['emoji'];
  readonly templates?: ImageEditorConfig['templates'];
  readonly batchExport?: ImageEditorConfig['batchExport'];
  readonly colorPicker?: ImageEditorConfig['colorPicker'];
  readonly crop?: ImageEditorConfig['crop'];
  readonly cropMask?: ImageEditorConfig['cropMask'];
  readonly frame?: ImageEditorConfig['frame'];
  readonly filters?: ImageEditorConfig['filters'];
  readonly viewport?: ImageEditorConfig['viewport'];
  readonly rotate?: ImageEditorConfig['rotate'];
  readonly toolbar?: ImageEditorConfig['toolbar'];
  readonly canvasBackground?: ImageEditorConfig['canvasBackground'];
  readonly historyLimit?: number;
}

export interface DocsPage {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly summary: string;
  readonly badges?: readonly { readonly label: string; readonly accent?: boolean }[];
  readonly tags?: readonly string[];
  readonly related?: readonly string[];
  readonly previewKind?: string;
  readonly live: DocsLivePreview;
  readonly code: readonly DocsCodeBlock[];
  readonly api: readonly DocsApiSection[];
}

export const DOCS_NAV: readonly DocsNavGroup[] = [
  {
    "title": "Guides",
    "items": [
      {
        "id": "getting-started",
        "label": "Getting started"
      },
      {
        "id": "configuration",
        "label": "Configuration"
      },
      {
        "id": "theming-layout",
        "label": "Theming & layout"
      },
      {
        "id": "plugins-lazy",
        "label": "Plugins & lazy loading"
      },
      {
        "id": "custom-plugins",
        "label": "Custom plugins"
      },
      {
        "id": "events-handle",
        "label": "Events & handle API"
      },
      {
        "id": "i18n-rtl",
        "label": "i18n & RTL"
      },
      {
        "id": "csp-security",
        "label": "CSP & security"
      }
    ]
  },
  {
    "title": "Always-on plugins",
    "items": [
      {
        "id": "viewport",
        "label": "Viewport"
      },
      {
        "id": "transform",
        "label": "Transform"
      },
      {
        "id": "crop",
        "label": "Crop"
      },
      {
        "id": "export",
        "label": "Export"
      }
    ]
  },
  {
    "title": "Optional plugins",
    "items": [
      {
        "id": "adjustments",
        "label": "Adjustments"
      },
      {
        "id": "effects",
        "label": "Effects"
      },
      {
        "id": "filters",
        "label": "Filters"
      },
      {
        "id": "focus",
        "label": "Focus"
      },
      {
        "id": "redact",
        "label": "Redact"
      },
      {
        "id": "crop-mask",
        "label": "Crop mask"
      },
      {
        "id": "color-overlay",
        "label": "Color overlay"
      },
      {
        "id": "fill",
        "label": "Fill (background)"
      },
      {
        "id": "frame",
        "label": "Frame"
      },
      {
        "id": "text",
        "label": "Text"
      },
      {
        "id": "shapes",
        "label": "Shapes"
      },
      {
        "id": "drawing",
        "label": "Drawing"
      },
      {
        "id": "path",
        "label": "Path"
      },
      {
        "id": "image-overlay",
        "label": "Image overlay"
      },
      {
        "id": "stickers",
        "label": "Stickers"
      },
      {
        "id": "emoji",
        "label": "Emoji"
      },
      {
        "id": "watermark",
        "label": "Watermark"
      },
      {
        "id": "templates",
        "label": "Templates"
      },
      {
        "id": "persistence",
        "label": "Persistence"
      },
      {
        "id": "compare",
        "label": "Compare"
      },
      {
        "id": "history-snapshots",
        "label": "History snapshots"
      },
      {
        "id": "layers",
        "label": "Layers"
      },
      {
        "id": "color-picker",
        "label": "Color picker"
      },
      {
        "id": "batch-export",
        "label": "Batch export"
      },
      {
        "id": "rulers",
        "label": "Rulers & snapping"
      }
    ]
  }
] as const;

export const DOCS_PAGES: Readonly<Record<string, DocsPage>> = {
  "getting-started": {
    "id": "getting-started",
    "title": "Getting started",
    "group": "Guides",
    "summary": "Embed <code>fluxio-image-editor</code> in an Angular app, pass a source image and config, and listen for <code>ready</code> to obtain the imperative handle.",
    "badges": [
      {
        "label": "Angular 21.2+",
        "accent": true
      },
      {
        "label": "Standalone component"
      }
    ],
    "tags": [
      "install",
      "embed",
      "handle",
      "source"
    ],
    "related": [
      "configuration",
      "events-handle",
      "plugins-lazy"
    ],
    "code": [
      {
        "lang": "html",
        "label": "app.component.html",
        "code": "<fluxio-image-editor\n  [source]=\"photo()\"\n  [config]=\"editorConfig\"\n  (ready)=\"editor = $event\"\n  (saved)=\"download($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "app.component.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport {\n  FluxioImageEditor,\n  type ImageEditorConfig,\n  type ImageEditorHandle,\n  type ImageEditorExportResult,\n} from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-root',\n  imports: [FluxioImageEditor],\n  templateUrl: './app.component.html',\n})\nexport class AppComponent {\n  readonly photo = signal<string | File>('/assets/hero.jpg');\n  readonly editorConfig: ImageEditorConfig = {\n    theme: 'light',\n    locale: 'en',\n    toolbar: { showSaveButton: true },\n  };\n\n  editor: ImageEditorHandle | null = null;\n\n  download(result: ImageEditorExportResult): void {\n    const url = URL.createObjectURL(result.blob);\n    const a = document.createElement('a');\n    a.href = url;\n    a.download = result.fileName;\n    a.click();\n    URL.revokeObjectURL(url);\n  }\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "The root component wraps an <code>EditorSession</code>, registers plugins, and exposes Angular inputs/outputs for host integration."
      },
      {
        "id": "component-io",
        "title": "Component I/O",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>source</code>",
              "Input",
              "null",
              "Image to load: string URL, File, Blob, HTMLImageElement, or <code>{ url, name? }</code>."
            ],
            [
              "<code>config</code>",
              "Input",
              "{}",
              "Partial <code>ImageEditorConfig</code> — merged on change."
            ],
            [
              "<code>plugins</code>",
              "Input",
              "[]",
              "Host-provided plugin instances; when set with built-in ids, replaces lazy loading for those ids."
            ],
            [
              "<code>ready</code>",
              "Output",
              "—",
              "Emits <code>ImageEditorHandle</code> once the session and renderer are ready."
            ],
            [
              "<code>changed</code>",
              "Output",
              "—",
              "Emits document snapshot after history commits."
            ],
            [
              "<code>saved</code>",
              "Output",
              "—",
              "Emits <code>ImageEditorExportResult</code> after a successful single export."
            ],
            [
              "<code>batchSaved</code>",
              "Output",
              "—",
              "Emits array of export results after batch export."
            ],
            [
              "<code>closed</code>",
              "Output",
              "—",
              "Emits dirty/confirmed when the editor closes."
            ],
            [
              "<code>confirmClose</code>",
              "Output",
              "—",
              "Custom unsaved-close confirmation when <code>close.useCustomConfirm</code> is true."
            ],
            [
              "<code>action</code>",
              "Output",
              "—",
              "Unhandled toolbar actions from host/custom plugins."
            ],
            [
              "<code>loadProgress</code>",
              "Output",
              "—",
              "Staged load progress (<code>EditorProgressEvent</code>, 0→1)."
            ],
            [
              "<code>exportProgress</code>",
              "Output",
              "—",
              "Staged export progress (<code>EditorProgressEvent</code>, 0→1)."
            ],
            [
              "<code>error</code>",
              "Output",
              "—",
              "Human-readable error string (load, CORS, export, etc.)."
            ]
          ]
        }
      },
      {
        "id": "imports",
        "title": "Import paths",
        "list": [
          "<code>fluxio-image-editor</code> — <code>FluxioImageEditor</code>, config types, plugin id constants.",
          "<code>fluxio-image-editor/core</code> — session types, commands, document model, defaults.",
          "<code>fluxio-image-editor/renderer-fabric</code> — Fabric.js renderer adapter and compositing helpers.",
          "<code>fluxio-image-editor/plugins/&lt;id&gt;</code> — individual plugin classes and galleries.",
          "<code>fluxio-image-editor/testing</code> — architecture/test doubles for host specs."
        ]
      },
      {
        "id": "source-types",
        "title": "Source types",
        "body": "<code>ImageEditorSource</code> accepts remote/same-origin URLs, local <code>File</code>/<code>Blob</code>, an existing <code>HTMLImageElement</code>, or <code>{ url, name? }</code> for named downloads.",
        "callout": {
          "tone": "warn",
          "title": "CORS & tainted canvas",
          "body": "Cross-origin images need CORS headers (or a host proxy). Otherwise export fails with <code>TAINTED_CANVAS</code> / <code>CORS_FAILED</code>. See <a href=\"csp-security\">CSP &amp; security</a>."
        }
      }
    ],
    "live": {
      "theme": "light"
    },
    "previewKind": "home"
  },
  "configuration": {
    "id": "configuration",
    "title": "Configuration",
    "group": "Guides",
    "summary": "Shape editor chrome, defaults, and feature flags through the typed <code>ImageEditorConfig</code> object.",
    "tags": [
      "config",
      "toolbar",
      "plugins",
      "defaults"
    ],
    "related": [
      "theming-layout",
      "plugins-lazy",
      "viewport"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "editor.config.ts",
        "code": "import {\n  DEFAULT_ASPECT_RATIOS,\n  DEFAULT_ZOOM_PRESETS,\n  EDITOR_PLUGIN_IDS,\n  type ImageEditorConfig,\n} from 'fluxio-image-editor';\n\nexport const editorConfig: ImageEditorConfig = {\n  theme: 'light',\n  locale: 'en',\n  dir: 'auto',\n  historyLimit: 50,\n  defaultTool: 'crop',\n  plugins: [\n    EDITOR_PLUGIN_IDS.adjustments,\n    EDITOR_PLUGIN_IDS.filters,\n    'annotations',\n    EDITOR_PLUGIN_IDS.templates,\n  ],\n  toolbar: {\n    position: 'left',\n    toolbarPosition: 'top',\n    controlsPosition: 'left',\n    showSaveButton: true,\n    actionDisplay: 'both',\n    visibleActions: ['crop.tool', 'adjustments.tool', 'filters.tool', 'export.dialog'],\n  },\n  viewport: { wheelZoom: true, useZoomPresetsMenu: true, zoomPresets: DEFAULT_ZOOM_PRESETS },\n  crop: { autoResize: false },\n  aspectRatios: DEFAULT_ASPECT_RATIOS,\n  close: { warnOnUnsaved: true, useCustomConfirm: false },\n};"
      },
      {
        "lang": "html",
        "label": "host template",
        "code": "<fluxio-image-editor [source]=\"src\" [config]=\"editorConfig\" />"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Central host contract — every plugin reads its slice from this config at bootstrap."
      },
      {
        "id": "config-keys",
        "title": "ImageEditorConfig keys",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>toolbar</code>",
              "Partial&lt;EditorToolbarConfig&gt;",
              "see defaults",
              "Utilibar side, chrome toolbar edge, visible actions, save button."
            ],
            [
              "<code>theme</code>",
              "'light' | 'dark' | 'custom'",
              "'dark'",
              "Shell theme; <code>custom</code> → host CSS and/or <code>themeTokens</code>."
            ],
            [
              "<code>themeClass</code>",
              "string",
              "—",
              "Extra class on the editor root for CSS custom themes."
            ],
            [
              "<code>locale</code>",
              "string (<code>en</code> | <code>ar</code> built-in)",
              "'en'",
              "Active UI locale. Custom codes work with host <code>locales</code> / <code>messages</code>."
            ],
            [
              "<code>dir</code>",
              "'ltr' | 'rtl' | 'auto'",
              "'auto'",
              "Text direction on the host element. <code>auto</code> uses RTL for ar/he/fa/ur/…"
            ],
            [
              "<code>messages</code>",
              "MessageDictionary",
              "—",
              "Host overrides for the active locale (wins over core + plugins)."
            ],
            [
              "<code>locales</code>",
              "Record&lt;string, MessageDictionary&gt;",
              "—",
              "Host locale packs keyed by locale code; merged then overlaid by <code>messages</code>."
            ],
            [
              "<code>rotate</code>",
              "Partial&lt;RotatePluginConfig&gt;",
              "90° step",
              "<code>incrementDegrees</code>, <code>allowArbitraryAngle</code>."
            ],
            [
              "<code>resize</code>",
              "Partial&lt;ResizePluginConfig&gt;",
              "DEFAULT_RESIZE_SIZE_PRESETS",
              "Resize panel size presets; <code>[]</code> hides presets."
            ],
            [
              "<code>viewport</code>",
              "Partial&lt;ViewportPluginConfig&gt;",
              "wheel on",
              "Zoom limits, presets menu, wheel zoom."
            ],
            [
              "<code>canvasBackground</code>",
              "CanvasBackgroundConfig",
              "checkerboard",
              "Stage backdrop — not baked into export."
            ],
            [
              "<code>crop</code>",
              "Partial&lt;CropPluginConfig&gt;",
              "see crop page",
              "<code>autoResize</code>, <code>forcePngOnEllipticalCrop</code>, <code>guides</code>."
            ],
            [
              "<code>aspectRatios</code>",
              "AspectRatioPreset[]",
              "DEFAULT_ASPECT_RATIOS",
              "Crop/template aspect presets."
            ],
            [
              "<code>filters</code>",
              "Partial&lt;FiltersPluginConfig&gt;",
              "built-ins",
              "Host <code>filterFunctions</code> / <code>presets</code> / <code>labels</code>."
            ],
            [
              "<code>cropMask</code>",
              "Partial&lt;CropMaskPluginConfig&gt;",
              "—",
              "Optional SVG path gallery beside built-in mask shapes."
            ],
            [
              "<code>frame</code>",
              "Partial&lt;FramePluginConfig&gt;",
              "—",
              "Optional image/SVG frame gallery."
            ],
            [
              "<code>fill</code>",
              "Partial&lt;FillPluginConfig&gt;",
              "DEFAULT_FILL_COLORS",
              "Background fill behind transparent pixels: <code>colors</code>, <code>gallery</code>."
            ],
            [
              "<code>imageOverlay</code>",
              "ImageOverlayPluginConfig",
              "—",
              "Overlay gallery."
            ],
            [
              "<code>stickers</code>",
              "StickersPluginConfig",
              "DEFAULT_STICKER_GALLERY",
              "Sticker gallery + <code>allowUpload</code>."
            ],
            [
              "<code>emoji</code>",
              "EmojiPluginConfig",
              "DEFAULT_EMOJI_GALLERY",
              "Emoji gallery items."
            ],
            [
              "<code>watermark</code>",
              "WatermarkPluginConfig",
              "—",
              "Default text/image watermark."
            ],
            [
              "<code>templates</code>",
              "TemplatesPluginConfig",
              "DEFAULT_TEMPLATE_GALLERY",
              "Output size templates; optional <code>placeholders</code> on each <code>TemplatePreset</code>."
            ],
            [
              "<code>colorPicker</code>",
              "ColorPickerPluginConfig",
              "enabled",
              "Eyedropper fields when plugin loaded."
            ],
            [
              "<code>batchExport</code>",
              "BatchExportPluginConfig",
              "DEFAULT_BATCH_EXPORT_PRESETS",
              "Batch export preset list."
            ],
            [
              "<code>rulers</code>",
              "RulersPluginConfig",
              "snap off",
              "Grid, snap threshold, rulers, and guide lines; see rulers page."
            ],
            [
              "<code>historyLimit</code>",
              "number",
              "50",
              "Undo stack depth."
            ],
            [
              "<code>close</code>",
              "ClosePolicyConfig",
              "warn on",
              "Unsaved close policy."
            ],
            [
              "<code>visibleTools</code>",
              "string[]",
              "all",
              "Restrict utilibar tool ids."
            ],
            [
              "<code>defaultTool</code>",
              "string",
              "—",
              "Initial active tool id."
            ],
            [
              "<code>plugins</code>",
              "EditorPluginRequestId[]",
              "all",
              "Optional lazy plugin list; see plugins guide."
            ],
            [
              "<code>themeTokens</code>",
              "EditorThemeTokens",
              "—",
              "Inline <code>--fluxio-*</code> overrides when theme is <code>custom</code> (see <code>EDITOR_THEME_CSS_VARS</code>)."
            ]
          ]
        }
      },
      {
        "id": "toolbar-config",
        "title": "Toolbar config",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>position</code>",
              "'left' | 'right'",
              "'left'",
              "Utilibar side rail."
            ],
            [
              "<code>toolbarPosition</code>",
              "'top' | 'bottom'",
              "'top'",
              "Zoom/history/export bar edge."
            ],
            [
              "<code>controlsPosition</code>",
              "'left' | 'right'",
              "same as position",
              "Active-tool options panel side."
            ],
            [
              "<code>visibleActions</code>",
              "string[]",
              "all registered",
              "Whitelist utilibar/chrome action ids; order preserved."
            ],
            [
              "<code>showSaveButton</code>",
              "boolean",
              "true",
              "Chrome save shortcut."
            ],
            [
              "<code>actionDisplay</code>",
              "'icon' | 'label' | 'both'",
              "'both'",
              "Utilibar button rendering."
            ],
            [
              "<code>actions</code>",
              "Record&lt;string, EditorToolbarActionConfig&gt;",
              "—",
              "Per-action visibility, label, icon, surface, position."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "adjustments",
        "filters",
        "annotations"
      ],
      "defaultTool": "crop",
      "theme": "light"
    },
    "previewKind": "config-playground"
  },
  "theming-layout": {
    "id": "theming-layout",
    "title": "Theming & layout",
    "group": "Guides",
    "summary": "Control light/dark/custom themes, CSS tokens, utilibar placement, and toolbar chrome layout.",
    "tags": [
      "theme",
      "toolbar",
      "layout",
      "tokens"
    ],
    "related": [
      "configuration",
      "i18n-rtl"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "themed-editor.ts",
        "code": "import { Component } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-branded-editor',\n  imports: [FluxioImageEditor],\n  template: `<fluxio-image-editor [source]=\"'/assets/photo.jpg'\" [config]=\"config\" />`,\n  styles: [`\n    :host ::ng-deep .fluxio-image-editor.brand-ocean[data-theme='custom'] {\n      --fluxio-bg: #0f172a;\n      --fluxio-bg-elevated: #1e293b;\n      --fluxio-accent: #38bdf8;\n      --fluxio-text: #f8fafc;\n    }\n  `],\n})\nexport class BrandedEditorComponent {\n  readonly config: ImageEditorConfig = {\n    theme: 'custom',\n    themeClass: 'brand-ocean',\n    // Optional runtime overrides (same CSS vars):\n    // themeTokens: { '--fluxio-accent': '#38bdf8' },\n    toolbar: {\n      position: 'right',\n      toolbarPosition: 'bottom',\n      controlsPosition: 'right',\n      actionDisplay: 'icon',\n    },\n    canvasBackground: {\n      backgroundColor: '#0b1220',\n      backgroundImage: 'linear-gradient(45deg,#111827 25%,transparent 25%)',\n    },\n  };\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Visual chrome is namespaced under <code>.fluxio-image-editor</code> with <code>data-theme</code> on the host. Prefer host CSS for custom themes; use <code>themeTokens</code> only for runtime maps."
      },
      {
        "id": "theme-modes",
        "title": "Theme modes",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>light</code>",
              "mode",
              "—",
              "Light shell palette."
            ],
            [
              "<code>dark</code>",
              "mode",
              "default",
              "Dark shell palette."
            ],
            [
              "<code>custom</code>",
              "mode",
              "—",
              "Host CSS via <code>themeClass</code> / <code>[data-theme='custom']</code>, and/or <code>themeTokens</code>."
            ]
          ]
        }
      },
      {
        "id": "layout",
        "title": "Layout surfaces",
        "body": "Three regions: utilibar (tool tabs), controls panel (active tool options), and toolbar (zoom/history/export). <code>controlsPosition</code> can mirror or oppose the utilibar side."
      },
      {
        "id": "canvas-bg",
        "title": "Canvas background",
        "body": "<code>canvasBackground</code> styles the stage only — it never appears in raster export.",
        "example": {
          "lang": "ts",
          "label": "Checkerboard override",
          "code": "canvasBackground: {\n  backgroundColor: '#e5e7eb',\n  backgroundImage: 'linear-gradient(45deg,#d1d5db 25%,transparent 25%)',\n},"
        }
      }
    ],
    "live": {
      "plugins": [
        "adjustments"
      ],
      "theme": "dark"
    },
    "previewKind": "config-playground"
  },
  "plugins-lazy": {
    "id": "plugins-lazy",
    "title": "Plugins & lazy loading",
    "group": "Guides",
    "summary": "Trim bundle size with <code>config.plugins</code>, pass instances via <code>[plugins]</code>, or register host plugins with <code>provideImageEditorPlugins</code> / <code>registerPlugin</code>.",
    "tags": [
      "plugins",
      "lazy",
      "code-splitting",
      "annotations",
      "registerPlugin",
      "provideImageEditorPlugins"
    ],
    "related": [
      "configuration",
      "custom-plugins",
      "getting-started"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "lazy-host.ts",
        "code": "import { Component } from '@angular/core';\nimport { FluxioImageEditor, EDITOR_PLUGIN_IDS, type ImageEditorConfig } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-trimmed-editor',\n  imports: [FluxioImageEditor],\n  template: `<fluxio-image-editor [source]=\"src\" [config]=\"config\" />`,\n})\nexport class TrimmedEditorComponent {\n  readonly src = '/assets/photo.jpg';\n  readonly config: ImageEditorConfig = {\n    plugins: [\n      EDITOR_PLUGIN_IDS.adjustments,\n      EDITOR_PLUGIN_IDS.filters,\n      'annotations', // → text, shapes, drawing, path, image-overlay, stickers, emoji\n    ],\n  };\n}"
      },
      {
        "lang": "ts",
        "label": "explicit-import.ts",
        "code": "import { Component } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorPlugin } from 'fluxio-image-editor';\nimport { AdjustmentsPlugin } from 'fluxio-image-editor/plugins/adjustments';\nimport { FiltersPlugin } from 'fluxio-image-editor/plugins/filters';\n\n@Component({\n  selector: 'app-explicit-editor',\n  imports: [FluxioImageEditor],\n  template: `<fluxio-image-editor [source]=\"src\" [config]=\"{}\" [plugins]=\"plugins\" />`,\n})\nexport class ExplicitEditorComponent {\n  readonly src = '/assets/photo.jpg';\n  readonly plugins: ImageEditorPlugin[] = [new AdjustmentsPlugin(), new FiltersPlugin()];\n}"
      },
      {
        "lang": "ts",
        "label": "provide-plugins.ts",
        "code": "import { ApplicationConfig } from '@angular/core';\nimport { provideImageEditorPlugins, registerPlugin } from 'fluxio-image-editor';\nimport { AdjustmentsPlugin } from 'fluxio-image-editor/plugins/adjustments';\nimport { HostSavePlugin } from './host-save.plugin';\n\n// Preferred in Angular apps (app or component providers):\nexport const appConfig: ApplicationConfig = {\n  providers: [provideImageEditorPlugins(HostSavePlugin, AdjustmentsPlugin)],\n};\n\n// FilePond-style global registration (non-DI / module bootstrap):\nregisterPlugin(HostSavePlugin);"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Always-on plugins (viewport, transform, export, crop) register regardless of the host list."
      },
      {
        "id": "host-registration",
        "title": "Host registration order",
        "body": "Merged host plugins = <code>provideImageEditorPlugins</code> (DI) → <code>registerPlugin</code> (global) → <code>[plugins]</code> input. Custom ids append onto the built-in/lazy set; any built-in optional id in that merged list replaces optional loading."
      },
      {
        "id": "plugin-sets",
        "title": "Plugin sets",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "Always-on",
              "viewport, transform, export, crop",
              "—",
              "Merged into every session."
            ],
            [
              "Optional",
              "adjustments … redact … batch-export",
              "all when omitted",
              "Lazy-loaded when <code>config.plugins</code> is set."
            ],
            [
              "Alias <code>annotations</code>",
              "text, shapes, drawing, path, image-overlay, stickers, emoji",
              "—",
              "Expands to annotation tools; nests under utilibar group."
            ]
          ]
        }
      },
      {
        "id": "emoji-text",
        "title": "Emoji auto-includes text",
        "callout": {
          "tone": "tip",
          "title": "Dependency injection",
          "body": "Requesting <code>emoji</code> automatically adds <code>text</code> because emoji commits via <code>text.set</code>."
        }
      },
      {
        "id": "constants",
        "title": "Constants & entry points",
        "list": [
          "<code>EDITOR_PLUGIN_IDS</code>, <code>ALL_EDITOR_PLUGIN_IDS</code>, <code>OPTIONAL_EDITOR_PLUGIN_IDS</code>",
          "<code>ALWAYS_ON_EDITOR_PLUGIN_IDS</code>, <code>ANNOTATION_EDITOR_PLUGIN_IDS</code>",
          "<code>provideImageEditorPlugins</code>, <code>registerPlugin</code>, <code>clearRegisteredPlugins</code>",
          "<code>resolveRequestedPluginIds</code>, <code>expandEditorPluginRequestIds</code>, <code>usesLazyPluginLoading</code>",
          "<code>import { CropPlugin } from 'fluxio-image-editor/plugins/crop'</code>"
        ]
      }
    ],
    "live": {
      "plugins": [
        "adjustments",
        "filters",
        "annotations"
      ],
      "theme": "light"
    },
    "previewKind": "static"
  },
  "custom-plugins": {
    "id": "custom-plugins",
    "title": "Custom plugins",
    "group": "Guides",
    "summary": "Implement <code>ImageEditorPlugin</code> to add host tools, commands, panels, toolbar actions/groups, and locale strings, then register the plugin through DI, global registration, or the <code>[plugins]</code> input.",
    "tags": [
      "custom",
      "plugin",
      "host",
      "toolbar",
      "command",
      "locale"
    ],
    "related": [
      "plugins-lazy",
      "events-handle",
      "configuration"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "host-save.plugin.ts",
        "code": "import { registerAnnotationsToolbarAction } from 'fluxio-image-editor';\nimport type {\n  EditorCommandResult,\n  ImageEditorPlugin,\n  ImageEditorPluginContext,\n} from 'fluxio-image-editor/core';\n\nexport class HostSavePlugin implements ImageEditorPlugin {\n  readonly id = 'host-save';\n\n  setup(context: ImageEditorPluginContext): void {\n    context.registerLocale({\n      locale: 'en',\n      messages: { 'hostSave.tool': 'Save copy' },\n    });\n\n    context.registerCommand({\n      id: 'host-save.run',\n      execute: (_payload, ctx): EditorCommandResult => ({\n        document: ctx.document,\n        label: 'Save copy',\n      }),\n    });\n\n    // Nest the action under the built-in Annotate group.\n    registerAnnotationsToolbarAction(context, {\n      id: 'host-save.tool',\n      label: 'Save copy',\n      icon: 'M4 4h16v16H4z',\n      commandId: 'host-save.run',\n    });\n  }\n\n  destroy(): void {\n    /* release host resources */\n  }\n}"
      },
      {
        "lang": "ts",
        "label": "register.ts",
        "code": "import type { ApplicationConfig } from '@angular/core';\nimport { provideImageEditorPlugins, registerPlugin } from 'fluxio-image-editor';\nimport { HostSavePlugin } from './host-save.plugin';\n\n// Angular DI (recommended): app or component providers.\nexport const appConfig: ApplicationConfig = {\n  providers: [provideImageEditorPlugins(HostSavePlugin)],\n};\n\n// Non-DI / module bootstrap registration.\nregisterPlugin(HostSavePlugin);"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Host plugins extend the editor without forking it. A plugin gets a registration context during bootstrap and can add tools, commands, panels, toolbar actions/groups, and locale messages. Always-on and lazy first-party plugins use the same contract."
      },
      {
        "id": "contract",
        "title": "Plugin contract",
        "table": {
          "headers": [
            "Member",
            "Type",
            "Description"
          ],
          "rows": [
            [
              "<code>id</code>",
              "string",
              "Unique plugin id. Custom ids append to the built-in set; reusing a built-in optional id replaces lazy loading for it."
            ],
            [
              "<code>setup(context)</code>",
              "method",
              "Called once per editor session during bootstrap."
            ],
            [
              "<code>destroy?()</code>",
              "method",
              "Optional teardown when the session is destroyed."
            ]
          ]
        }
      },
      {
        "id": "registration",
        "title": "Registration forms",
        "body": "Every registration entry can be a live instance, a zero-arg factory, or a zero-arg class constructor. Sources merge in this order: DI → global <code>registerPlugin</code> → component <code>[plugins]</code> input.",
        "table": {
          "headers": [
            "Form",
            "Example",
            "Use"
          ],
          "rows": [
            [
              "Instance",
              "<code>new HostSavePlugin()</code>",
              "Pre-built plugin with constructor options."
            ],
            [
              "Factory",
              "<code>() => new HostSavePlugin(options)</code>",
              "Deferred construction / host dependencies."
            ],
            [
              "Class",
              "<code>HostSavePlugin</code>",
              "Zero-arg class constructor (FilePond-style)."
            ]
          ]
        }
      },
      {
        "id": "context",
        "title": "Registration context",
        "table": {
          "headers": [
            "Method",
            "Purpose"
          ],
          "rows": [
            [
              "<code>registerTool({ id, label })</code>",
              "Adds an activatable tool id for <code>setActiveTool()</code> and <code>config.defaultTool</code>."
            ],
            [
              "<code>registerCommand(handler)</code>",
              "Adds <code>handle.execute(id, payload?)</code>. Handler returns <code>{ document, label, inversePayload? }</code>."
            ],
            [
              "<code>registerPanel({ id, label })</code>",
              "Declares a controls panel id for the shell."
            ],
            [
              "<code>registerToolbarAction(action)</code>",
              "Adds a utilibar/toolbar action; optional <code>commandId</code>, <code>icon</code>, <code>surface</code>, <code>groupId</code>, <code>position</code>."
            ],
            [
              "<code>registerToolbarGroup(group)</code>",
              "Adds a collapsible group with <code>id</code>, <code>label</code>, optional <code>actionIds</code> and <code>position</code>."
            ],
            [
              "<code>registerLocale({ locale, messages })</code>",
              "Adds or merges plugin message keys for a locale."
            ]
          ]
        }
      },
      {
        "id": "toolbar-helpers",
        "title": "Annotations group helper",
        "body": "Use <code>registerAnnotationsToolbarAction(context, action)</code> to register the shared <strong>Annotate</strong> group once and nest a custom action beside text, shapes, drawing, path, image-overlay, stickers, and emoji. The constants <code>ANNOTATIONS_TOOLBAR_GROUP_ID</code>, <code>ANNOTATIONS_TOOL_ACTION_IDS</code>, and <code>ANNOTATIONS_TOOLBAR_GROUP</code> are exported from the package root.",
        "example": {
          "lang": "ts",
          "label": "Nested action",
          "code": "registerAnnotationsToolbarAction(context, {\n  id: 'host-badge.tool',\n  label: 'Badge',\n  commandId: 'host-badge.add',\n});"
        }
      },
      {
        "id": "notes",
        "title": "Notes",
        "list": [
          "Commands should treat <code>context.document</code> as immutable and return a new document.",
          "Use <code>handle.execute(id, payload, { coalesceKey })</code> to merge continuous slider/spinner edits into one undo entry.",
          "Call <code>clearRegisteredPlugins()</code> in tests to reset global registrations.",
          "The same plugin can be loaded lazily by config id or supplied explicitly; do not register the same id twice."
        ]
      }
    ],
    "live": {
      "plugins": [
        "adjustments"
      ],
      "theme": "light"
    },
    "previewKind": "static"
  },
  "events-handle": {
    "id": "events-handle",
    "title": "Events & handle API",
    "group": "Guides",
    "summary": "Use Angular outputs for lifecycle events and the imperative <code>ImageEditorHandle</code> for commands, history, and export.",
    "tags": [
      "handle",
      "execute",
      "undo",
      "export"
    ],
    "related": [
      "getting-started",
      "export",
      "persistence"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "handle-bridge.ts",
        "code": "import { Component } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-handle-bridge',\n  imports: [FluxioImageEditor],\n  template: `<fluxio-image-editor [source]=\"src\" (ready)=\"onReady($event)\" (confirmClose)=\"onConfirmClose($event)\" />`,\n})\nexport class HandleBridgeComponent {\n  readonly src = '/assets/photo.jpg';\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  async rotate90(): Promise<void> {\n    await this.handle?.execute('transform.rotate', { degrees: 90 });\n  }\n\n  onConfirmClose(event: { dirty: boolean; resolve: (ok: boolean) => void }): void {\n    const ok = event.dirty ? window.confirm('Discard edits?') : true;\n    event.resolve(ok);\n  }\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "<code>ImageEditorHandle</code> is stable for the session lifetime until <code>destroy()</code>."
      },
      {
        "id": "handle-methods",
        "title": "Handle methods",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>load(source)</code>",
              "Promise",
              "—",
              "Replace the loaded image."
            ],
            [
              "<code>execute(commandId, payload?, options?)</code>",
              "Promise",
              "—",
              "Run a registered command (history entry). <code>options.coalesceKey</code> merges continuous edits into one undo step."
            ],
            [
              "<code>sealHistoryCoalescing()</code>",
              "void",
              "—",
              "End the active coalesced run so the next command starts a new undo entry."
            ],
            [
              "<code>undo()</code> / <code>redo()</code>",
              "void",
              "—",
              "History navigation."
            ],
            [
              "<code>jumpToHistoryIndex(n)</code>",
              "void",
              "—",
              "Jump to history index (0 = original)."
            ],
            [
              "<code>reset()</code>",
              "void",
              "—",
              "Revert to loaded baseline."
            ],
            [
              "<code>fitViewport()</code>",
              "void",
              "—",
              "Fit image in viewport."
            ],
            [
              "<code>centerViewport()</code>",
              "void",
              "—",
              "Keep zoom and recenter pan so content sits in the middle."
            ],
            [
              "<code>setZoom(z, x?, y?)</code>",
              "void",
              "—",
              "Absolute zoom around optional point."
            ],
            [
              "<code>panBy(dx, dy)</code>",
              "void",
              "—",
              "Pan viewport by pixels."
            ],
            [
              "<code>setPreview(preview)</code>",
              "void",
              "—",
              "Live preview without committing history."
            ],
            [
              "<code>setActiveTool(id|null)</code>",
              "void",
              "—",
              "Activate utilibar tool."
            ],
            [
              "<code>setCompareOriginal(active)</code>",
              "void",
              "—",
              "View-only original overlay."
            ],
            [
              "<code>isComparingOriginal()</code>",
              "boolean",
              "—",
              "Compare mode state."
            ],
            [
              "<code>export(options?)</code>",
              "Promise",
              "—",
              "Raster export (png/jpeg/webp)."
            ],
            [
              "<code>exportDesignState()</code>",
              "object",
              "—",
              "JSON design envelope."
            ],
            [
              "<code>loadDesignState(input, options?)</code>",
              "Promise",
              "—",
              "Restore saved design JSON. <code>options.allowSourceMismatch</code> permits a different source size."
            ],
            [
              "<code>getSnapshot()</code>",
              "object",
              "—",
              "Current document + viewport snapshot."
            ],
            [
              "<code>isDirty()</code>",
              "boolean",
              "—",
              "Edited since load/reset."
            ],
            [
              "<code>destroy()</code>",
              "void",
              "—",
              "Teardown session, URLs, listeners."
            ]
          ]
        }
      },
      {
        "id": "outputs",
        "title": "Component outputs",
        "body": "Prefer outputs for UI reactions; use the handle for imperative control from parent components or services. <code>loadProgress</code> / <code>exportProgress</code> emit staged 0→1 progress (<code>EditorProgressEvent</code>) for large-image UX."
      },
      {
        "id": "command-options",
        "title": "Command options",
        "body": "The optional third argument to <code>execute()</code> controls history coalescing.",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>coalesceKey</code>",
              "string",
              "—",
              "Merge consecutive executions of the same command sharing this key into one history entry. End the run with <code>sealHistoryCoalescing()</code>, undo/redo, or another command."
            ]
          ]
        },
        "callout": {
          "tone": "warn",
          "title": "Absolute payloads only",
          "body": "Coalescing is safe only when the payload describes an absolute target state (for example slider values), not a relative delta."
        }
      },
      {
        "id": "close-policy",
        "title": "Close policy",
        "body": "Unsaved-close behavior is controlled by <code>ImageEditorConfig.close</code>.",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>close.warnOnUnsaved</code>",
              "boolean",
              "true",
              "Show a confirmation when closing a dirty session."
            ],
            [
              "<code>close.useCustomConfirm</code>",
              "boolean",
              "false",
              "Delegate confirmation to the host through the <code>confirmClose</code> output instead of <code>globalThis.confirm</code>."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "adjustments"
      ],
      "theme": "light"
    },
    "previewKind": "static"
  },
  "i18n-rtl": {
    "id": "i18n-rtl",
    "title": "i18n & RTL",
    "group": "Guides",
    "summary": "Built-in English and Arabic catalogs with automatic direction when <code>dir: 'auto'</code>.",
    "tags": [
      "locale",
      "rtl",
      "arabic",
      "i18n"
    ],
    "related": [
      "theming-layout",
      "configuration"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "rtl-host.ts",
        "code": "import { Component } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-rtl-editor',\n  imports: [FluxioImageEditor],\n  template: `<fluxio-image-editor [source]=\"src\" [config]=\"config\" />`,\n})\nexport class RtlEditorComponent {\n  readonly src = '/assets/photo.jpg';\n  readonly config: ImageEditorConfig = {\n    locale: 'ar',\n    dir: 'auto',\n    toolbar: { position: 'right', controlsPosition: 'right' },\n  };\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Plugins register locale keys via <code>registerLocale</code>. Hosts merge overrides with <code>config.messages</code> / <code>config.locales</code> (PV39)."
      },
      {
        "id": "locale-config",
        "title": "Configuration",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>locale</code>",
              "string",
              "'en'",
              "Active locale. Built-in catalogs: <code>en</code>, <code>ar</code>."
            ],
            [
              "<code>dir</code>",
              "'ltr' | 'rtl' | 'auto'",
              "'auto'",
              "Host <code>dir</code> attribute; auto uses RTL for ar/he/fa/ur/…"
            ],
            [
              "<code>messages</code>",
              "MessageDictionary",
              "—",
              "Overrides for the active locale (wins over core + plugins)."
            ],
            [
              "<code>locales</code>",
              "Record&lt;string, MessageDictionary&gt;",
              "—",
              "Host locale packs; pack for <code>locale</code> is merged then overlaid by <code>messages</code>."
            ]
          ]
        }
      },
      {
        "id": "custom-locale",
        "title": "Custom messages",
        "body": "Prefer host <code>messages</code> / <code>locales</code> for app-level overrides. Plugins can still <code>registerLocale</code> at setup. Lookup order: host → plugin overlays → built-in → English fallback."
      }
    ],
    "live": {
      "plugins": [
        "crop"
      ],
      "defaultTool": "crop",
      "theme": "light",
      "locale": "ar",
      "dir": "auto"
    },
    "previewKind": "static"
  },
  "csp-security": {
    "id": "csp-security",
    "title": "CSP & security",
    "group": "Guides",
    "summary": "The library avoids eval/CDN runtime deps and surfaces typed errors for CORS, tainted canvas, export, and design-state failures.",
    "tags": [
      "csp",
      "cors",
      "security",
      "errors",
      "design-state"
    ],
    "related": [
      "getting-started",
      "export",
      "image-overlay"
    ],
    "code": [
      {
        "lang": "ts",
        "label": "error-handling.ts",
        "code": "import { Component } from '@angular/core';\nimport { FluxioImageEditor } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-secure-editor',\n  imports: [FluxioImageEditor],\n  template: `<fluxio-image-editor [source]=\"proxyUrl\" (error)=\"onError($event)\" />`,\n})\nexport class SecureEditorComponent {\n  /** Host API returns same-origin bytes — never embed tokens in the editor. */\n  readonly proxyUrl = '/api/media/photo-123';\n\n  onError(message: string): void {\n    // The error output is a string formatted as `[CODE] message`.\n    const code = message.startsWith('[') ? message.slice(1, message.indexOf(']')) : null;\n    switch (code) {\n      case 'CORS_FAILED':\n      case 'TAINTED_CANVAS':\n        // Surface a proxy/CORS hint.\n        break;\n      case 'DESIGN_STATE_INVALID':\n      case 'DESIGN_STATE_UNSUPPORTED_VERSION':\n        // Ask the host to re-export the design JSON.\n        break;\n      default:\n        // IMAGE_LOAD_FAILED | EXPORT_FAILED\n        break;\n    }\n  }\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Designed for strict CSP hosts: no eval, no mandatory external scripts/fonts from the library."
      },
      {
        "id": "error-codes",
        "title": "Error codes",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>IMAGE_LOAD_FAILED</code>",
              "code",
              "—",
              "Source could not be decoded."
            ],
            [
              "<code>CORS_FAILED</code>",
              "code",
              "—",
              "Cross-origin load without CORS."
            ],
            [
              "<code>TAINTED_CANVAS</code>",
              "code",
              "—",
              "Export blocked by tainted canvas."
            ],
            [
              "<code>EXPORT_FAILED</code>",
              "code",
              "—",
              "Raster encode failed."
            ],
            [
              "<code>DESIGN_STATE_INVALID</code>",
              "code",
              "—",
              "Design JSON failed validation."
            ],
            [
              "<code>DESIGN_STATE_UNSUPPORTED_VERSION</code>",
              "code",
              "—",
              "Design JSON uses an unsupported schema version."
            ]
          ]
        }
      },
      {
        "id": "media-guidance",
        "title": "Media guidance",
        "list": [
          "Serve protected assets through a host proxy URL.",
          "Prefer data URLs or same-origin SVGs for sticker/watermark galleries.",
          "Call <code>handle.destroy()</code> to revoke object URLs and release Fabric resources."
        ]
      }
    ],
    "live": {
      "plugins": [],
      "theme": "light"
    },
    "previewKind": "static"
  },
  "viewport": {
    "id": "viewport",
    "title": "Viewport",
    "group": "Always-on plugins",
    "summary": "Pan, zoom, fit, and wheel zoom — always registered; viewport math lives in the core session.",
    "badges": [
      {
        "label": "Always on"
      }
    ],
    "tags": [
      "zoom",
      "pan",
      "fit",
      "wheel"
    ],
    "related": [
      "configuration",
      "transform"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  viewport: {\n    wheelZoom: true,\n    pinchZoom: true,\n    minZoom: 0.1,\n    maxZoom: 10,\n    useZoomPresetsMenu: true,\n    zoomStepFactor: 1.1,\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Pan, zoom, fit, and wheel zoom — always registered; viewport math lives in the core session."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>wheelZoom</code>",
              "boolean",
              "true",
              "Scroll wheel zoom on the canvas stage."
            ],
            [
              "<code>pinchZoom</code>",
              "boolean",
              "true",
              "Two-finger pinch zoom and pan on the stage."
            ],
            [
              "<code>minZoom</code> / <code>maxZoom</code>",
              "number",
              "0.1 / 10",
              "Clamp zoom factor."
            ],
            [
              "<code>useZoomPresetsMenu</code>",
              "boolean",
              "true",
              "Click zoom % to open preset menu."
            ],
            [
              "<code>zoomPresets</code>",
              "ZoomPreset[]",
              "DEFAULT_ZOOM_PRESETS",
              "Preset list (<code>factor</code> or <code>fit</code>)."
            ],
            [
              "<code>zoomStepFactor</code>",
              "number",
              "1.1",
              "Multiplier for − / + buttons."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>viewport.fit</code>",
              "action",
              "Fit image to viewport (utilibar)."
            ],
            [
              "<code>viewport.zoomIn</code>",
              "action",
              "Zoom in by step factor (toolbar)."
            ],
            [
              "<code>viewport.zoomOut</code>",
              "action",
              "Zoom out by step factor (toolbar)."
            ]
          ]
        }
      },
      {
        "id": "notes",
        "title": "Usage notes",
        "callout": {
          "tone": "tip",
          "title": "Handle shortcuts",
          "body": "Prefer <code>handle.fitViewport()</code>, <code>handle.setZoom()</code>, and <code>handle.panBy()</code> for programmatic control — they bypass toolbar UI."
        }
      },
      {
        "id": "example",
        "title": "Example",
        "example": {
          "lang": "ts",
          "label": "Custom presets",
          "code": "import { DEFAULT_ZOOM_PRESETS } from 'fluxio-image-editor/core';\n\nviewport: {\n  zoomPresets: [\n    ...DEFAULT_ZOOM_PRESETS,\n    { id: '200', factor: 2, label: '200%' },\n  ],\n},"
        }
      }
    ],
    "live": {
      "plugins": [],
      "theme": "dark"
    },
    "previewKind": "config-playground"
  },
  "transform": {
    "id": "transform",
    "title": "Transform",
    "group": "Always-on plugins",
    "summary": "Rotate, flip, and resize the raster output with history-tracked transform commands.",
    "badges": [
      {
        "label": "Always on"
      }
    ],
    "tags": [
      "rotate",
      "flip",
      "resize"
    ],
    "related": [
      "crop",
      "viewport"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  rotate: {\n    incrementDegrees: 90,\n    allowArbitraryAngle: true,\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Rotate, flip, and resize the raster output with history-tracked transform commands."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>rotate.incrementDegrees</code>",
              "number",
              "90",
              "Default step for rotate command/tool."
            ],
            [
              "<code>rotate.allowArbitraryAngle</code>",
              "boolean",
              "false",
              "Enable free-angle rotate UI."
            ],
            [
              "<code>resize.sizePresets</code>",
              "ResizeSizePreset[]",
              "DEFAULT_RESIZE_SIZE_PRESETS",
              "Size chips in the resize panel ({ id, label, width?, height?, ratio? }); pass <code>[]</code> to hide them."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>transform.rotate-tool</code>",
              "action",
              "Enter rotate mode."
            ],
            [
              "<code>transform.resize-tool</code>",
              "action",
              "Enter resize mode."
            ],
            [
              "<code>transform.rotate</code>",
              "command",
              "Rotate by payload.degrees (default increment)."
            ],
            [
              "<code>transform.setRotation</code>",
              "command",
              "Set absolute rotation degrees."
            ],
            [
              "<code>transform.flipHorizontal</code>",
              "command",
              "Mirror horizontally."
            ],
            [
              "<code>transform.flipVertical</code>",
              "command",
              "Mirror vertically."
            ],
            [
              "<code>transform.resize</code>",
              "command",
              "Resize output { width, height, lockAspectRatio? }."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [],
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "crop": {
    "id": "crop",
    "title": "Crop",
    "group": "Always-on plugins",
    "summary": "Interactive crop with aspect presets, elliptical shapes, and optional auto-resize to target dimensions.",
    "badges": [
      {
        "label": "Always on"
      }
    ],
    "tags": [
      "crop",
      "aspect",
      "ellipse"
    ],
    "related": [
      "templates",
      "crop-mask",
      "configuration"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  crop: {\n    autoResize: false,\n    forcePngOnEllipticalCrop: false,\n    guides: { profileCircle: true, bleed: 0.05 },\n  },\n  aspectRatios: [\n    { id: 'free', label: 'Free', ratio: null },\n    { id: '1:1', label: '1:1', ratio: 1 },\n    { id: '16:9', label: '16:9', ratio: 16 / 9, width: 1920, height: 1080 },\n    { id: 'ellipse', label: 'Ellipse', ratio: null, shape: 'ellipse' },\n  ],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Interactive crop with aspect presets, elliptical shapes, and optional auto-resize to target dimensions."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>crop.autoResize</code>",
              "boolean",
              "false",
              "After Apply, resize to preset width×height when both set."
            ],
            [
              "<code>crop.forcePngOnEllipticalCrop</code>",
              "boolean",
              "false",
              "Force PNG export for elliptical crops."
            ],
            [
              "<code>crop.guides</code>",
              "CropGuidesConfig",
              "off",
              "Preview-only overlays: <code>profileCircle</code>, <code>bleed</code> (fraction per edge). Not baked into export."
            ],
            [
              "<code>aspectRatios[]</code>",
              "AspectRatioPreset",
              "DEFAULT_ASPECT_RATIOS",
              "id, label, ratio, shape, width, height."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>crop.tool</code>",
              "action",
              "Enter crop mode."
            ],
            [
              "<code>crop.set</code>",
              "command",
              "Apply crop region from payload."
            ],
            [
              "<code>crop.clear</code>",
              "command",
              "Clear crop / revert crop state."
            ]
          ]
        }
      },
      {
        "id": "example",
        "title": "Example",
        "example": {
          "lang": "ts",
          "label": "Programmatic crop",
          "code": "await handle.execute('crop.set', {\n  region: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },\n  aspectRatioId: '1:1',\n});"
        }
      }
    ],
    "live": {
      "plugins": [],
      "defaultTool": "crop",
      "theme": "dark",
      "crop": {
        "guides": {
          "profileCircle": true,
          "bleed": 0.05
        }
      }
    },
    "previewKind": "crop"
  },
  "export": {
    "id": "export",
    "title": "Export",
    "group": "Always-on plugins",
    "summary": "Raster export dialog and programmatic <code>handle.export()</code> for PNG, JPEG, and WebP.",
    "badges": [
      {
        "label": "Always on"
      }
    ],
    "tags": [
      "export",
      "png",
      "jpeg",
      "webp"
    ],
    "related": [
      "batch-export",
      "events-handle",
      "csp-security"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  toolbar: { showSaveButton: true },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Raster export dialog and programmatic <code>handle.export()</code> for PNG, JPEG, and WebP."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['export']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>export.dialog</code>",
              "action",
              "Open export dialog (toolbar/chrome)."
            ]
          ]
        }
      },
      {
        "id": "export-options",
        "title": "Export options",
        "body": "Options accepted by <code>handle.export(options?)</code> (<code>PublicExportOptions</code>).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>format</code>",
              "'png' | 'jpeg' | 'webp'",
              "required",
              "Raster format for the export."
            ],
            [
              "<code>quality</code>",
              "number",
              "0.92",
              "Lossy quality (0–1) for JPEG/WebP."
            ],
            [
              "<code>multiplier</code>",
              "number",
              "1",
              "Scale relative to document output size when width/height are omitted."
            ],
            [
              "<code>width</code> / <code>height</code>",
              "number",
              "—",
              "Target pixels; pair both for cover-fit. Max dimension is 8192."
            ],
            [
              "<code>backgroundColor</code>",
              "string",
              "'#ffffff'",
              "Alpha flatten color for JPEG (and optionally WebP)."
            ],
            [
              "<code>fileName</code>",
              "string",
              "source name",
              "Download name without extension."
            ],
            [
              "<code>asFile</code>",
              "boolean",
              "false",
              "Return <code>result.file</code> (a <code>File</code>) as well as the blob."
            ],
            [
              "<code>timeoutMs</code>",
              "number",
              "60000",
              "Abort the encode after this many ms; <code>0</code> disables the timeout."
            ]
          ]
        }
      },
      {
        "id": "programmatic",
        "title": "Programmatic export",
        "example": {
          "lang": "ts",
          "label": "handle.export",
          "code": "const result = await handle.export({\n  format: 'jpeg',\n  quality: 0.92,\n  fileName: 'edited-photo',\n});\n// result.blob, result.fileName, result.mimeType"
        }
      }
    ],
    "live": {
      "plugins": [],
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "adjustments": {
    "id": "adjustments",
    "title": "Adjustments",
    "group": "Optional plugins",
    "summary": "Finetune brightness, contrast, saturation, exposure, and related tonal controls.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "finetune",
      "brightness",
      "contrast"
    ],
    "related": [
      "filters",
      "effects"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['adjustments'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Finetune brightness, contrast, saturation, exposure, and related tonal controls."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['adjustments']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>adjustments.tool</code>",
              "action",
              "Open finetune panel."
            ],
            [
              "<code>adjustments.set</code>",
              "command",
              "Apply partial adjustments payload."
            ],
            [
              "<code>adjustments.reset</code>",
              "command",
              "Reset to identity adjustments."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "adjustments"
      ],
      "defaultTool": "adjustments",
      "theme": "dark"
    },
    "previewKind": "adjustments"
  },
  "effects": {
    "id": "effects",
    "title": "Effects",
    "group": "Optional plugins",
    "summary": "Stacked creative effects (blur, pixelate, etc.) applied to the raster document.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "effects",
      "blur"
    ],
    "related": [
      "adjustments",
      "filters"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['effects'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Stacked creative effects (blur, pixelate, etc.) applied to the raster document."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['effects']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>effects.tool</code>",
              "action",
              "Open effects panel."
            ],
            [
              "<code>effects.set</code>",
              "command",
              "Apply effects state."
            ],
            [
              "<code>effects.reset</code>",
              "command",
              "Clear effects."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "effects"
      ],
      "defaultTool": "effects",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "filters": {
    "id": "filters",
    "title": "Filters",
    "group": "Optional plugins",
    "summary": "One-click filter presets (grayscale, sepia, vintage, …) on the document filters state.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "filters",
      "presets"
    ],
    "related": [
      "adjustments",
      "effects"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['filters'],\n  filters: {\n    // Host color-matrix filters (4×5 / 20 numbers). Colliding ids override built-ins.\n    filterFunctions: {\n      cool: [\n        0.9, 0, 0.1, 0, 0,\n        0, 0.95, 0.1, 0, 0,\n        0.05, 0.05, 1.1, 0, 0,\n        0, 0, 0, 1, 0,\n      ],\n    },\n    presets: ['none', 'grayscale', 'sepia', 'cool'],\n    labels: { cool: 'Cool' },\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "One-click filter presets (grayscale, sepia, vintage, …) on the document filters state. Hosts can register extra color-matrix filters via <code>config.filters</code>."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig.filters</code> (Pintura <code>filterFunctions</code> / <code>filterOptions</code> parity).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>filters.filterFunctions</code>",
              "Record&lt;string, FilterColorMatrixSource&gt;",
              "—",
              "Host 4×5 color matrices keyed by preset id. Colliding built-in ids override render."
            ],
            [
              "<code>filters.presets</code>",
              "string[]",
              "built-ins then host keys",
              "Ordered preset ids shown in the Filters panel."
            ],
            [
              "<code>filters.labels</code>",
              "Record&lt;string, string&gt;",
              "—",
              "Display labels for host (or built-in override) ids. Locale key <code>filters.preset.&lt;id&gt;</code> wins when present."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>filters.tool</code>",
              "action",
              "Open filters panel."
            ],
            [
              "<code>filters.set</code>",
              "command",
              "Set preset id on document.filters."
            ],
            [
              "<code>filters.reset</code>",
              "command",
              "Reset to none."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "filters"
      ],
      "defaultTool": "filters",
      "theme": "dark"
    },
    "previewKind": "filters"
  },
  "focus": {
    "id": "focus",
    "title": "Focus",
    "group": "Optional plugins",
    "summary": "Radial or linear focus/vignette controls to direct attention.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "focus",
      "vignette"
    ],
    "related": [
      "effects",
      "filters"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['focus'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Radial or linear focus/vignette controls to direct attention."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['focus']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>focus.tool</code>",
              "action",
              "Open focus panel."
            ],
            [
              "<code>focus.set</code>",
              "command",
              "Apply focus state."
            ],
            [
              "<code>focus.reset</code>",
              "command",
              "Clear focus."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "focus"
      ],
      "defaultTool": "focus",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "redact": {
    "id": "redact",
    "title": "Redact",
    "group": "Optional plugins",
    "summary": "Secure censor rectangles — mosaic and scramble bake into the photo on export.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "redact",
      "privacy",
      "censor"
    ],
    "related": [
      "crop",
      "drawing",
      "export"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['redact'],\n  defaultTool: 'redact',\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Drag rectangular regions on the canvas to censor sensitive areas. Regions are stored on the document and baked (mosaic / scramble) into the raster on export — not a removable overlay."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['redact']</code> or omit from a trimmed list.",
          "Drag on the image to add a region; drag the region or its corners to adjust; Apply commits to history."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>redact.tool</code>",
              "action",
              "Enter redact mode."
            ],
            [
              "<code>redactions.set</code>",
              "command",
              "Replace document redaction regions from payload."
            ],
            [
              "<code>redactions.reset</code>",
              "command",
              "Clear all redaction regions."
            ]
          ]
        }
      },
      {
        "id": "example",
        "title": "Example",
        "example": {
          "lang": "ts",
          "label": "Programmatic redaction",
          "code": "await handle.execute('redactions.set', {\n  redactions: [\n    { id: 'face', x: 0.35, y: 0.2, width: 0.25, height: 0.3 },\n  ],\n});"
        }
      }
    ],
    "live": {
      "plugins": [
        "redact"
      ],
      "defaultTool": "redact",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "crop-mask": {
    "id": "crop-mask",
    "title": "Crop mask",
    "group": "Optional plugins",
    "summary": "Clip output to shapes (circle, star, heart, …) plus an optional host SVG gallery.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "mask",
      "clip",
      "gallery"
    ],
    "related": [
      "crop",
      "frame"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['crop-mask'],\n  cropMask: {\n    gallery: [\n      {\n        id: 'shield',\n        label: 'Shield',\n        path: 'M0.5 0.06 L0.88 0.2 L0.88 0.48 C0.88 0.72 0.7 0.9 0.5 0.96 C0.3 0.9 0.12 0.72 0.12 0.48 L0.12 0.2 Z',\n      },\n    ],\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Clip the exported image to built-in shapes (circle, rounded rect, star, heart, …) or a host-provided SVG path. Mask geometry is stored on the document and applied at export."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig.cropMask</code>.",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>cropMask.gallery</code>",
              "CropMaskGalleryItem[]",
              "[]",
              "Extra SVG shapes shown beside built-ins. Each item needs <code>id</code>, <code>label</code>, and path <code>d</code> in viewBox <code>0 0 1 1</code>."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>crop-mask.tool</code>",
              "action",
              "Open mask panel."
            ],
            [
              "<code>crop-mask.set</code>",
              "command",
              "Apply mask geometry."
            ],
            [
              "<code>crop-mask.reset</code>",
              "command",
              "Clear mask."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "crop-mask"
      ],
      "defaultTool": "crop-mask",
      "theme": "dark",
      "cropMask": {
        "gallery": [
          {
            "id": "docs-shield",
            "label": "Shield",
            "path": "M0.5 0.06 L0.88 0.2 L0.88 0.48 C0.88 0.72 0.7 0.9 0.5 0.96 C0.3 0.9 0.12 0.72 0.12 0.48 L0.12 0.2 Z"
          }
        ]
      }
    },
    "previewKind": "static"
  },
  "color-overlay": {
    "id": "color-overlay",
    "title": "Color overlay",
    "group": "Optional plugins",
    "summary": "Solid or gradient color wash on top of the image (none, solid, linear, radial, angular). The toolbar label is <strong>Fill</strong>; this is separate from the background fill plugin.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "color-overlay",
      "gradient",
      "overlay",
      "wash"
    ],
    "related": [
      "fill",
      "frame",
      "filters"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['color-overlay'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Solid or gradient color wash composited on top of the photo (none, solid, linear, radial, angular). The utilibar action is labeled <strong>Fill</strong>. Use the separate <a href=\"fill\">fill</a> plugin to fill transparent pixels <em>behind</em> the photo."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['color-overlay']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>color-overlay.tool</code>",
              "action",
              "Open the color overlay (Fill) panel."
            ],
            [
              "<code>color-overlay.set</code>",
              "command",
              "Apply colorOverlay partial state."
            ],
            [
              "<code>color-overlay.reset</code>",
              "command",
              "Clear fill."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "color-overlay"
      ],
      "defaultTool": "color-overlay",
      "theme": "dark"
    },
    "previewKind": "fill-frame"
  },
  "fill": {
    "id": "fill",
    "title": "Fill (background)",
    "group": "Optional plugins",
    "summary": "Fill transparent pixels <em>behind</em> the photo with a solid color or a background image. The toolbar label is <strong>Background</strong>; this is separate from the color overlay plugin.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "fill",
      "background",
      "transparent",
      "gallery"
    ],
    "related": [
      "color-overlay",
      "frame"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.png');\n  readonly config: ImageEditorConfig = {\n    plugins: ['fill'],\n    fill: {\n      colors: ['#ffffff', '#000000', '#f5f5f5', '#ff3b30'],\n      gallery: [\n        { id: 'paper', label: 'Paper', src: '/assets/backgrounds/paper.jpg' },\n      ],\n    },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Fills transparent pixels behind the photo with a solid color or an image. This is the Pintura-style <strong>background</strong> fill and runs before annotations and raster export. It is not the same as <a href=\"color-overlay\">color overlay</a>, which washes color on top of the photo.",
        "callout": {
          "tone": "tip",
          "title": "Two different fills",
          "body": "Toolbar <strong>Background</strong> = this plugin (behind the photo). Toolbar <strong>Fill</strong> = color overlay (on top of the photo)."
        }
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig.fill</code>.",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>fill.colors</code>",
              "string[]",
              "DEFAULT_FILL_COLORS",
              "Solid color swatches shown in the Background panel."
            ],
            [
              "<code>fill.gallery</code>",
              "ImageOverlayGalleryItem[]",
              "[]",
              "Background image gallery; uploads are also supported in the panel."
            ]
          ]
        }
      },
      {
        "id": "state",
        "title": "Fill state",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>mode</code>",
              "'none' | 'solid' | 'image'",
              "'none'",
              "Clear, solid color, or background image."
            ],
            [
              "<code>color</code>",
              "string",
              "'#ffffff'",
              "CSS color for solid mode."
            ],
            [
              "<code>opacity</code>",
              "number",
              "1",
              "0–1 opacity multiplier for solid or image fill."
            ],
            [
              "<code>imageSrc</code>",
              "string",
              "''",
              "Background image URL when <code>mode</code> is <code>image</code>."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>fill.tool</code>",
              "action",
              "Open the Background panel."
            ],
            [
              "<code>fill.set</code>",
              "command",
              "Apply a partial <code>FillState</code>: <code>{ fill: { mode, color, opacity, imageSrc } }</code>."
            ],
            [
              "<code>fill.reset</code>",
              "command",
              "Clear the background fill."
            ]
          ]
        }
      },
      {
        "id": "behavior",
        "title": "Commit behavior",
        "list": [
          "Panel edits render as a live preview; <strong>Apply</strong> commits one <code>fill.set</code> history entry.",
          "An image mode without <code>imageSrc</code> is draft-only and persists as a cleared fill.",
          "The fill is baked into PNG/WebP output; JPEG flattens it with the rest of the image."
        ]
      }
    ],
    "live": {
      "plugins": [
        "fill"
      ],
      "defaultTool": "fill",
      "theme": "dark"
    },
    "previewKind": "fill-frame"
  },
  "frame": {
    "id": "frame",
    "title": "Frame",
    "group": "Optional plugins",
    "summary": "Decorative frames: solid, double, rounded, gradient, polaroid, and film styles.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "frame",
      "border"
    ],
    "related": [
      "color-overlay",
      "fill",
      "templates"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['frame'],\n  frame: {\n    gallery: [\n      { id: 'ornate', label: 'Ornate', src: '/assets/frames/ornate.svg' },\n    ],\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Decorative frames: solid, double, rounded, gradient, polaroid, and film styles — plus optional host image/SVG frame gallery."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig.frame</code>.",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>frame.gallery</code>",
              "ImageOverlayGalleryItem[]",
              "[]",
              "Optional full-canvas image/SVG frames shown in the Frame panel."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>frame.tool</code>",
              "action",
              "Open frame panel."
            ],
            [
              "<code>frame.set</code>",
              "command",
              "Apply frame partial state."
            ],
            [
              "<code>frame.reset</code>",
              "command",
              "Clear frame."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "frame"
      ],
      "defaultTool": "frame",
      "theme": "dark"
    },
    "previewKind": "fill-frame"
  },
  "text": {
    "id": "text",
    "title": "Text",
    "group": "Optional plugins",
    "summary": "Editable text annotations with font, color, alignment, and canvas placement.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "text",
      "annotations"
    ],
    "related": [
      "emoji",
      "watermark",
      "layers"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['text'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Editable text annotations with font, color, alignment, and canvas placement."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['text']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>text.tool</code>",
              "action",
              "Enter text placement mode."
            ],
            [
              "<code>text.set</code>",
              "command",
              "Replace text annotations array."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "text"
      ],
      "defaultTool": "text",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "shapes": {
    "id": "shapes",
    "title": "Shapes",
    "group": "Optional plugins",
    "summary": "Rectangle, ellipse, line, and arrow vector annotations.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "shapes",
      "annotations"
    ],
    "related": [
      "drawing",
      "path",
      "layers"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['shapes'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Rectangle, ellipse, line, and arrow vector annotations."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['shapes']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>shapes.tool</code>",
              "action",
              "Enter shapes mode."
            ],
            [
              "<code>shapes.set</code>",
              "command",
              "Replace shape annotations."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "shapes"
      ],
      "defaultTool": "shapes",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "drawing": {
    "id": "drawing",
    "title": "Drawing",
    "group": "Optional plugins",
    "summary": "Freehand brush strokes stored as path annotations.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "draw",
      "brush",
      "annotations"
    ],
    "related": [
      "path",
      "shapes"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['drawing'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Freehand brush strokes stored as path annotations."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['drawing']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>drawing.tool</code>",
              "action",
              "Enter freehand draw mode."
            ],
            [
              "<code>drawing.set</code>",
              "command",
              "Replace drawing paths."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "drawing"
      ],
      "defaultTool": "drawing",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "path": {
    "id": "path",
    "title": "Path",
    "group": "Optional plugins",
    "summary": "Click-to-place polyline paths (distinct from freehand drawing).",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "path",
      "polyline",
      "annotations"
    ],
    "related": [
      "drawing",
      "shapes"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['path'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Click-to-place polyline paths (distinct from freehand drawing)."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['path']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>path.tool</code>",
              "action",
              "Enter path mode."
            ],
            [
              "<code>path.set</code>",
              "command",
              "Replace path annotations."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "path"
      ],
      "defaultTool": "path",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "image-overlay": {
    "id": "image-overlay",
    "title": "Image overlay",
    "group": "Optional plugins",
    "summary": "Upload or pick gallery images as movable image annotations.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "overlay",
      "upload",
      "annotations"
    ],
    "related": [
      "stickers",
      "watermark",
      "csp-security"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['image-overlay'],\n  imageOverlay: {\n    gallery: [{ id: 'logo', label: 'Logo', src: '/assets/logo.png' }],\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Upload or pick gallery images as movable image annotations."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>imageOverlay.gallery</code>",
              "ImageOverlayGalleryItem[]",
              "—",
              "id, label, src (URL or data URL)."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>image-overlay.tool</code>",
              "action",
              "Enter overlay mode."
            ],
            [
              "<code>image-overlay.set</code>",
              "command",
              "Replace image annotations."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "image-overlay"
      ],
      "defaultTool": "image-overlay",
      "theme": "dark",
      "imageOverlay": {
        "gallery": [
          {
            "id": "sample",
            "label": "Sample",
            "src": "fixtures/sample.jpg"
          }
        ]
      }
    },
    "previewKind": "static"
  },
  "stickers": {
    "id": "stickers",
    "title": "Stickers",
    "group": "Optional plugins",
    "summary": "Preset sticker gallery placed as image annotations (commits via image-overlay.set).",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "stickers",
      "gallery"
    ],
    "related": [
      "image-overlay",
      "emoji"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['stickers'],\n  stickers: {\n    gallery: undefined, // uses DEFAULT_STICKER_GALLERY\n    allowUpload: false,\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Preset sticker gallery placed as image annotations (commits via image-overlay.set)."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>stickers.gallery</code>",
              "ImageOverlayGalleryItem[]",
              "DEFAULT_STICKER_GALLERY",
              "Preset sticker items."
            ],
            [
              "<code>stickers.allowUpload</code>",
              "boolean",
              "false",
              "Show upload control in panel."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>stickers.tool</code>",
              "action",
              "Open stickers gallery."
            ]
          ]
        }
      },
      {
        "id": "example",
        "title": "Example",
        "example": {
          "lang": "ts",
          "label": "Import default gallery",
          "code": "import { DEFAULT_STICKER_GALLERY } from 'fluxio-image-editor/plugins/stickers';"
        }
      }
    ],
    "live": {
      "plugins": [
        "stickers"
      ],
      "defaultTool": "stickers",
      "theme": "dark",
      "stickers": {
        "allowUpload": true
      }
    },
    "previewKind": "gallery"
  },
  "emoji": {
    "id": "emoji",
    "title": "Emoji",
    "group": "Optional plugins",
    "summary": "Searchable emoji gallery placed as text annotations (requires text plugin — auto-included).",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "emoji",
      "text"
    ],
    "related": [
      "text",
      "stickers"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['emoji'], // auto-adds text\n  emoji: { gallery: undefined }, // DEFAULT_EMOJI_GALLERY\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Searchable emoji gallery placed as text annotations (requires text plugin — auto-included)."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>emoji.gallery</code>",
              "EmojiGalleryItem[]",
              "DEFAULT_EMOJI_GALLERY",
              "id, emoji, label, keywords?, category?."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>emoji.tool</code>",
              "action",
              "Open emoji gallery."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "emoji"
      ],
      "defaultTool": "emoji",
      "theme": "dark"
    },
    "previewKind": "gallery"
  },
  "watermark": {
    "id": "watermark",
    "title": "Watermark",
    "group": "Optional plugins",
    "summary": "Text or image watermarks with gallery defaults and repeat options.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "watermark",
      "text",
      "image"
    ],
    "related": [
      "text",
      "image-overlay",
      "export"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['watermark'],\n  watermark: {\n    defaultText: '© Your Company',\n    imageSrc: '/assets/wm.png',\n    gallery: [],\n  },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Text or image watermarks with gallery defaults and repeat options."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>watermark.defaultText</code>",
              "string",
              "—",
              "Initial text watermark string."
            ],
            [
              "<code>watermark.imageSrc</code>",
              "string",
              "—",
              "Default image watermark URL."
            ],
            [
              "<code>watermark.gallery</code>",
              "ImageOverlayGalleryItem[]",
              "[]",
              "Selectable watermark images."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>watermark.tool</code>",
              "action",
              "Enter watermark mode."
            ],
            [
              "<code>watermark.set</code>",
              "command",
              "Apply watermark document state."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "watermark"
      ],
      "defaultTool": "watermark",
      "theme": "dark",
      "watermark": {
        "defaultText": "© FLUXIO Docs"
      }
    },
    "previewKind": "static"
  },
  "templates": {
    "id": "templates",
    "title": "Templates",
    "group": "Optional plugins",
    "summary": "Social and print output templates — centered aspect crop, optional resize, and optional placeholder text/shapes in one history step.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "templates",
      "social",
      "sizes",
      "placeholders"
    ],
    "related": [
      "crop",
      "text",
      "shapes",
      "batch-export"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n    plugins: ['templates'],\n    templates: {\n      // Omit gallery to use DEFAULT_TEMPLATE_GALLERY (yt-thumb / ig-story include placeholders).\n      gallery: [\n        {\n          id: 'promo-square',\n          label: 'Promo Square',\n          category: 'Brand',\n          ratio: 1,\n          width: 1080,\n          height: 1080,\n          placeholders: [\n            {\n              kind: 'text',\n              x: 0.1,\n              y: 0.12,\n              text: 'Headline',\n              fontSize: 0.08,\n              fontWeight: 'bold',\n              fill: '#ffffff',\n              textAlign: 'center',\n              boxWidth: 0.8,\n            },\n            {\n              kind: 'rect',\n              x: 0.1,\n              y: 0.22,\n              width: 0.2,\n              height: 0.01,\n              fill: '#ffffff',\n              stroke: 'transparent',\n            },\n          ],\n        },\n      ],\n    },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Social and print output templates apply a centered aspect crop, optional <code>width</code>×<code>height</code> resize, and optional placeholder annotations — all in one history entry via <code>templates.apply</code>. After Apply, placeholders become normal editable text/shape annotations. Built-in gallery presets <strong>YouTube Thumbnail</strong> and <strong>Instagram Story</strong> ship with placeholders; the gallery labels those rows with “Includes text / shapes”."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>templates.gallery</code>",
              "TemplatePreset[]",
              "DEFAULT_TEMPLATE_GALLERY",
              "Each preset: <code>id</code>, <code>label</code>, <code>ratio</code>, optional <code>width</code>/<code>height</code>, <code>category</code>, <code>shape</code>, <code>placeholders</code>."
            ]
          ]
        }
      },
      {
        "id": "placeholders",
        "title": "Placeholders",
        "body": "Optional <code>TemplatePlaceholder[]</code> on a preset. Layout uses <strong>normalized output space (0–1)</strong> so the same template works at any resize target. After crop/resize, placeholders are materialized into document annotations and appended (existing annotations are kept).",
        "list": [
          "Kinds: <code>text</code>, <code>rect</code>, <code>ellipse</code>, <code>line</code>, <code>arrow</code>.",
          "Box <code>x</code>/<code>y</code>/<code>width</code>/<code>height</code> and line endpoints are fractions of output width/height.",
          "<code>fontSize</code>, <code>strokeWidth</code>, and <code>padding</code> are fractions of <code>min(w,h)</code>, or absolute pixels when the value is <code>≥ 1</code>.",
          "Text supports <code>fill</code>, <code>fontWeight</code>, <code>textAlign</code>, <code>boxWidth</code> (fraction of output width), and the usual text style fields."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>. The Templates UI calls <code>templates.apply</code> on Apply (not <code>crop.set</code>).",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>templates.tool</code>",
              "action",
              "Open templates gallery."
            ],
            [
              "<code>templates.apply</code>",
              "command",
              "Apply crop, optional <code>resizeTo</code>, and optional <code>placeholders</code> in one history entry. Payload: <code>{ crop, resizeTo?, placeholders? }</code>."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "templates"
      ],
      "defaultTool": "templates",
      "theme": "dark"
    },
    "previewKind": "gallery"
  },
  "persistence": {
    "id": "persistence",
    "title": "Persistence",
    "group": "Optional plugins",
    "summary": "Save/load JSON design state via handle methods and export menu entries.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "persistence",
      "json",
      "design-state"
    ],
    "related": [
      "events-handle",
      "history-snapshots"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['persistence'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Save/load JSON design state via handle methods and export menu entries."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['persistence']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>persistence.export</code>",
              "action",
              "Export design JSON (menu)."
            ],
            [
              "<code>persistence.load</code>",
              "action",
              "Load design JSON (menu)."
            ]
          ]
        }
      },
      {
        "id": "handle-persistence",
        "title": "Handle API",
        "example": {
          "lang": "ts",
          "label": "Design state",
          "code": "const envelope = handle.exportDesignState();\nawait handle.loadDesignState(envelope);\n\n// Allow a different source size (crop/annotation coords are source pixels):\nawait handle.loadDesignState(envelope, { allowSourceMismatch: true });"
        }
      },
      {
        "id": "helpers",
        "title": "Design-state helpers",
        "body": "The package root also exports pure helpers for persisting outside the handle. The envelope stores a <strong>source reference</strong>, not the pixels; re-bind the image before loading.",
        "table": {
          "headers": [
            "Export",
            "Use"
          ],
          "rows": [
            [
              "<code>DESIGN_STATE_KIND</code>",
              "Discriminator: <code>'fluxio-image-editor-design'</code>."
            ],
            [
              "<code>DESIGN_STATE_SCHEMA_VERSION</code>",
              "Current schema version (<code>1</code>); other versions are rejected."
            ],
            [
              "<code>serializeDesignState(document, { exportedAt? })</code>",
              "Build a JSON-safe envelope from a committed document."
            ],
            [
              "<code>parseDesignState(input)</code>",
              "Validate an unknown JSON value and return a typed envelope."
            ]
          ]
        },
        "list": [
          "Invalid envelopes throw <code>ImageEditorError</code> with <code>DESIGN_STATE_INVALID</code> or <code>DESIGN_STATE_UNSUPPORTED_VERSION</code>.",
          "<code>loadDesignState</code> rejects a source-size mismatch unless <code>allowSourceMismatch</code> is true."
        ]
      }
    ],
    "live": {
      "plugins": [
        "persistence"
      ],
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "compare": {
    "id": "compare",
    "title": "Compare",
    "group": "Optional plugins",
    "summary": "Hold or pin the original image for before/after review without mutating history.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "compare",
      "original"
    ],
    "related": [
      "history-snapshots",
      "events-handle"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['compare'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Hold or pin the original image for before/after review without mutating history."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['compare']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>compare.original</code>",
              "action",
              "Toggle/hold compare original view."
            ]
          ]
        }
      },
      {
        "id": "handle-compare",
        "title": "Handle methods",
        "body": "<code>setCompareOriginal(active)</code> and <code>isComparingOriginal()</code> are core session APIs."
      }
    ],
    "live": {
      "plugins": [
        "compare",
        "adjustments"
      ],
      "defaultTool": "adjustments",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "history-snapshots": {
    "id": "history-snapshots",
    "title": "History snapshots",
    "group": "Optional plugins",
    "summary": "Named history snapshots panel for jumping between edit milestones.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "history",
      "snapshots",
      "undo"
    ],
    "related": [
      "compare",
      "layers"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  historyLimit: 50,\n  plugins: ['history-snapshots'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Named history snapshots panel for jumping between edit milestones."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>historyLimit</code>",
              "number",
              "50",
              "Max undo depth (global config)."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>history.panel</code>",
              "action",
              "Open history side panel."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "history-snapshots",
        "adjustments"
      ],
      "defaultTool": "adjustments",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "layers": {
    "id": "layers",
    "title": "Layers",
    "group": "Optional plugins",
    "summary": "Annotation layer stack — select, reorder, duplicate, and delete annotations.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "layers",
      "annotations",
      "z-index"
    ],
    "related": [
      "text",
      "shapes",
      "history-snapshots"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['layers'],\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Annotation layer stack — select, reorder, duplicate, and delete annotations."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "No dedicated config keys — register the plugin via <code>config.plugins</code> or import the secondary entry.",
        "list": [
          "Load with <code>plugins: ['layers']</code> or omit from a trimmed list."
        ]
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>layers.panel</code>",
              "action",
              "Open layers side panel."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "layers",
        "annotations"
      ],
      "defaultTool": "text",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "color-picker": {
    "id": "color-picker",
    "title": "Color picker",
    "group": "Optional plugins",
    "summary": "Eyedropper support on color fields across tools when the plugin is loaded.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "color",
      "eyedropper"
    ],
    "related": [
      "text",
      "drawing",
      "frame"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['color-picker'],\n  colorPicker: { enabled: true },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Eyedropper support on color fields across tools when the plugin is loaded."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>colorPicker.enabled</code>",
              "boolean",
              "true",
              "When false, eyedroppers hide even if plugin loads."
            ]
          ]
        }
      }
    ],
    "live": {
      "plugins": [
        "color-picker",
        "text",
        "frame"
      ],
      "defaultTool": "text",
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "batch-export": {
    "id": "batch-export",
    "title": "Batch export",
    "group": "Optional plugins",
    "summary": "Export multiple formats/sizes in one run — emits batchSaved with ordered results.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "batch",
      "export",
      "presets"
    ],
    "related": [
      "export",
      "templates"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n  plugins: ['batch-export'],\n  batchExport: { presets: undefined }, // DEFAULT_BATCH_EXPORT_PRESETS\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Export multiple formats/sizes in one run — emits batchSaved with ordered results."
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig</code> (or plugin entry when lazy-loaded).",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>batchExport.presets</code>",
              "BatchExportPreset[]",
              "DEFAULT_BATCH_EXPORT_PRESETS",
              "id, label, format, width?, height?, quality?, fileNameSuffix?, category?"
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Commands & actions",
        "body": "Toolbar actions activate tools or open panels. Commands mutate document state via <code>handle.execute(id, payload)</code>.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>batch-export.dialog</code>",
              "action",
              "Open batch export dialog."
            ]
          ]
        }
      },
      {
        "id": "notes",
        "title": "Usage notes",
        "callout": {
          "tone": "tip",
          "title": "ZIP download (host-side)",
          "body": "Batch export does not package a ZIP. Prefer handling <code>(batchSaved)</code> in the host and creating one archive with <code>client-zip</code> (or similar). Avoid downloading each file from <code>(saved)</code> during a batch run."
        }
      },
      {
        "id": "example",
        "title": "Example",
        "example": {
          "lang": "ts",
          "label": "Default presets",
          "code": "import { DEFAULT_BATCH_EXPORT_PRESETS } from 'fluxio-image-editor/plugins/batch-export';"
        }
      }
    ],
    "live": {
      "plugins": [
        "batch-export"
      ],
      "theme": "dark"
    },
    "previewKind": "static"
  },
  "rulers": {
    "id": "rulers",
    "title": "Rulers & snapping",
    "group": "Optional plugins",
    "summary": "Canvas rulers, grid overlay, guide lines, and snap-to-edge alignment for annotations and the unlocked base photo. Chrome is preview-only and never baked into export.",
    "badges": [
      {
        "label": "Optional"
      }
    ],
    "tags": [
      "rulers",
      "grid",
      "snap",
      "guides",
      "alignment"
    ],
    "related": [
      "text",
      "shapes",
      "drawing"
    ],
    "code": [
      {
        "lang": "html",
        "label": "photo-editor.html",
        "code": "<fluxio-image-editor\n  [source]=\"photoUrl\"\n  [config]=\"config\"\n  (ready)=\"onReady($event)\"\n  (changed)=\"onChanged($event)\"\n  (saved)=\"onSaved($event)\"\n  (error)=\"onError($event)\"\n/>"
      },
      {
        "lang": "ts",
        "label": "photo-editor.ts",
        "code": "import { Component, signal } from '@angular/core';\nimport { FluxioImageEditor, type ImageEditorConfig, type ImageEditorHandle } from 'fluxio-image-editor';\n\n@Component({\n  selector: 'app-photo-editor',\n  imports: [FluxioImageEditor],\n  templateUrl: './photo-editor.html',\n})\nexport class PhotoEditorComponent {\n  readonly photoUrl = signal('/assets/sample.jpg');\n  readonly config: ImageEditorConfig = {\n    plugins: ['rulers', 'text', 'shapes', 'drawing'],\n    rulers: {\n      gridSize: 50,\n      snapThreshold: 8,\n      snapToContext: true,\n      showGrid: true,\n      showRulers: true,\n      guides: [{ id: 'center-x', axis: 'x', position: 1000 }],\n    },\n  };\n\n  private handle: ImageEditorHandle | null = null;\n\n  onReady(handle: ImageEditorHandle): void {\n    this.handle = handle;\n  }\n\n  onChanged(): void {\n    /* snapshot updates — wire autosave / dirty badges */\n  }\n\n  onSaved(result: { blob: Blob; fileName: string }): void {\n    /* host download or upload */\n  }\n\n  onError(message: string): void {\n    console.error(message);\n  }\n\n}"
      }
    ],
    "api": [
      {
        "id": "purpose",
        "title": "Purpose",
        "body": "Draws edge rulers and a pixel grid while you position annotations, and snaps text, shapes, and the unlocked base photo to output edges, center, grid lines, and guides. Snap and guide chrome are <strong>preview-only</strong> — they are not baked into raster export or design state.",
        "callout": {
          "tone": "tip",
          "title": "Enable snapping explicitly",
          "body": "Snapping is off by default. Set <code>snapThreshold</code> above <code>0</code> to enable it; set <code>gridSize</code> above <code>0</code> to show the grid."
        }
      },
      {
        "id": "configuration",
        "title": "Configuration",
        "body": "Host options under <code>ImageEditorConfig.rulers</code> (partial <code>MarkupSnapConfig</code>). Change the object to re-apply snap defaults.",
        "table": {
          "headers": [
            "Name",
            "Type",
            "Default",
            "Description"
          ],
          "rows": [
            [
              "<code>rulers.gridSize</code>",
              "number",
              "0",
              "Grid cell size in document pixels (clamped 2–512). <code>0</code> hides the grid and disables snap-to-grid."
            ],
            [
              "<code>rulers.snapThreshold</code>",
              "number",
              "0",
              "Max distance in document pixels to start snapping (clamped 1–64). <code>0</code> disables all snapping."
            ],
            [
              "<code>rulers.snapToContext</code>",
              "boolean",
              "true",
              "Snap to output plate edges and center. Only active when <code>snapThreshold &gt; 0</code>."
            ],
            [
              "<code>rulers.showGrid</code>",
              "boolean",
              "true",
              "Draw the grid overlay when <code>gridSize &gt; 0</code>."
            ],
            [
              "<code>rulers.showRulers</code>",
              "boolean",
              "false",
              "Draw edge rulers; click a ruler to place a guide."
            ],
            [
              "<code>rulers.guides</code>",
              "MarkupGuide[]",
              "[]",
              "Guide lines in document space: <code>{ id, axis: 'x' | 'y', position }</code>."
            ]
          ]
        }
      },
      {
        "id": "commands",
        "title": "Actions",
        "body": "The rulers plugin has no document commands. The shell owns the chrome, controls panel, and snap during annotation drags.",
        "table": {
          "headers": [
            "Id",
            "Kind",
            "Description"
          ],
          "rows": [
            [
              "<code>rulers.tool</code>",
              "action",
              "Open the rulers / grid / snap controls panel."
            ],
            [
              "<code>setActiveTool('rulers')</code>",
              "handle",
              "Activate the rulers tool programmatically."
            ]
          ]
        }
      },
      {
        "id": "behavior",
        "title": "Behavior",
        "list": [
          "Snap applies while dragging text, shapes, and the unlocked base photo — hold <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> to temporarily disable it.",
          "Guides are click-placed from the rulers and can be cleared from the controls panel.",
          "Grid, rulers, and guides are chrome only: exports and design JSON exclude them.",
          "The plugin registers the <code>rulers</code> tool and English/Arabic locale strings."
        ]
      }
    ],
    "live": {
      "plugins": [
        "rulers",
        "text",
        "shapes",
        "drawing"
      ],
      "defaultTool": "rulers",
      "theme": "dark"
    },
    "previewKind": "static"
  }
} as const;

export function getDocsPage(id: string): DocsPage {
  return DOCS_PAGES[id] ?? DOCS_PAGES['getting-started']!;
}

export const DOCS_SAMPLE_IMAGE = 'fixtures/sample.jpg';
