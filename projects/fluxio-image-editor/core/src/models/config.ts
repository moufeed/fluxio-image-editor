import type { CropShape, LineEndStyle, TextAlign, TextFontWeight } from './image-document';
import type { FiltersPluginConfig } from './filter-registry';
import type { EditorThemeTokens } from './theme-tokens';
import type { CropGuidesConfig } from '../geometry/crop-guides';
import type { MarkupSnapConfig } from '../geometry/markup-snap';
import type { HostLocalePacks, MessageDictionary } from '../i18n/locale-catalog';

export type {
  CropGuideBleedLayout,
  CropGuideCircleLayout,
  CropGuideLayout,
  CropGuidesConfig,
} from '../geometry/crop-guides';
export {
  DEFAULT_CROP_BLEED_INSET,
  MAX_CROP_BLEED_INSET,
  clampCropBleedInset,
  cropGuidesActive,
  cropProfileCircleMaskPath,
  layoutCropGuides,
  resolveCropGuides,
} from '../geometry/crop-guides';

export type {
  MarkupGuide,
  MarkupSnapChrome,
  MarkupSnapConfig,
  MarkupSnapBoundsResult,
  MarkupSnapPointResult,
} from '../geometry/markup-snap';
export {
  DEFAULT_MARKUP_SNAP_CONFIG,
  applyMarkupSnapToGroupDrag,
  clampMarkupGridSize,
  clampMarkupSnapThreshold,
  collectAxisSnapTargets,
  createMarkupGuideId,
  markupGridVisible,
  markupSnapActive,
  nearestSnapTarget,
  normalizeMarkupGuides,
  resolveMarkupSnapConfig,
  snapMarkupBoundsMove,
  snapMarkupBoundsResize,
  snapMarkupPoint,
  snapScalarToGrid,
  snapScalarToTargets,
} from '../geometry/markup-snap';

export type { HostLocalePacks, MessageDictionary } from '../i18n/locale-catalog';
export {
  editorLocalePrimaryTag,
  isRtlEditorLocale,
  resolveHostLocaleMessages,
} from '../i18n/locale-catalog';

export type EditorThemeMode = 'light' | 'dark' | 'custom';
export type EditorLocaleCode = 'en' | 'ar' | (string & {});
export type EditorTextDirection = 'ltr' | 'rtl' | 'auto';
/**
 * Position of the utilities bar (tool tabs).
 * Only side rails are supported (left / right).
 */
export type EditorToolbarPosition = 'left' | 'right';
/** Side for the active-tool options panel. */
export type EditorControlsPanelPosition = 'left' | 'right';
/** Vertical edge for the chrome toolbar (zoom / history / export). */
export type EditorToolbarBarPosition = 'top' | 'bottom';
/** How utilibar action buttons render their content. */
export type EditorToolbarActionDisplay = 'icon' | 'label' | 'both';
/** Where a plugin action or group renders in the shell chrome. */
export type EditorActionSurface = 'utilibar' | 'toolbar';

/** Per-action overrides for visibility, label, icon, and display mode. */
export interface EditorToolbarActionConfig {
  /** When `false`, the action is hidden even if listed in `visibleActions`. Default: true. */
  readonly visible?: boolean;
  /** Override the displayed label (skips i18n for this action). */
  readonly label?: string;
  /** Icon key (built-in) or custom SVG path `d` for a 24×24 viewBox. */
  readonly icon?: string;
  /** Override the global `actionDisplay` for this action. */
  readonly display?: EditorToolbarActionDisplay;
  /**
   * Override where the action renders (`utilibar` | `toolbar`).
   * When omitted, uses the plugin registration (or chrome-owned defaults).
   */
  readonly surface?: EditorActionSurface;
  /**
   * Override sort order (WordPress-style; lower first).
   * Applied when `visibleActions` is omitted. Array order of `visibleActions` wins when set.
   */
  readonly position?: number;
}

/**
 * Chrome layout: toolbar (zoom/history/export) + utilibar (plugin tool actions)
 * + side options panel for the active tool.
 *
 * - `position` — utilibar side rail (`left` | `right`)
 * - `controlsPosition` — options panel side (`left` | `right`; defaults to `position`)
 * - `toolbarPosition` — chrome toolbar edge (`top` | `bottom`)
 */
export interface EditorToolbarConfig {
  /** Utilibar side rail. Default: `'left'`. */
  readonly position: EditorToolbarPosition;
  /** Toolbar vertical edge. Default: `'top'`. */
  readonly toolbarPosition: EditorToolbarBarPosition;
  /**
   * Active-tool options panel side. Default: same as `position`.
   * When utilibar and controls share a side, controls sit between the rail and the canvas.
   */
  readonly controlsPosition: EditorControlsPanelPosition;
  /**
   * Whitelist of utilibar / chrome plugin action ids (and group ids) to show.
   * - Omitted: all registered plugin actions are eligible (subject to shell filters and `actions[].visible`),
   *   sorted by each action’s `position` (ascending; WordPress-style), then registration order.
   * - Empty array (`[]`): hide all utilibar tool actions.
   * - Non-empty: only listed ids are eligible, in **this array’s order** (overrides `position`).
   * - Group alias `'annotations'` expands to annotation tool action ids, then nests under the
   *   annotations utilibar group when that group is registered.
   */
  readonly visibleActions?: readonly string[];
  readonly showSaveButton?: boolean;
  /** Default content mode for utilibar tool actions. Default: `'both'`. */
  readonly actionDisplay?: EditorToolbarActionDisplay;
  /** Per-action visibility / label / icon / display overrides keyed by action id. */
  readonly actions?: Readonly<Record<string, EditorToolbarActionConfig>>;
}

export interface AspectRatioPreset {
  readonly id: string;
  readonly label: string;
  /** Optional i18n key; when set, the UI prefers `t(labelKey)` over `label`. */
  readonly labelKey?: string;
  /**
   * width/height lock, or null for free crop.
   * When omitted but `width` + `height` are set, ratio is derived as width/height.
   */
  readonly ratio: number | null;
  /** Crop geometry for this preset. Default: `'rect'`. Use `'ellipse'` for elliptical crop. */
  readonly shape?: CropShape;
  /**
   * Optional target output size.
   * When `crop.autoResize` is true and both are set, Apply crops then resizes to these dimensions.
   */
  readonly width?: number;
  readonly height?: number;
}

/**
 * Crop options-panel density (Pintura `cropMinimizeToolbar` parity).
 * - `auto` — compact chrome on phone-width shells (`@container` ≤768)
 * - `always` — compact chrome whenever crop is open
 * - `never` — full inspector layout
 */
export type CropMinimizeToolbar = 'auto' | 'always' | 'never';

/** Crop plugin host options (Phase 4.1). */
export interface CropPluginConfig {
  /**
   * When true, applying a preset that defines both `width` and `height` crops then
   * resizes the output to that size (one history entry). Default: false.
   */
  readonly autoResize?: boolean;
  /**
   * When true, elliptical crops force PNG on export (transparency outside the ellipse).
   * Default: false.
   */
  readonly forcePngOnEllipticalCrop?: boolean;
  /**
   * Compact crop options chrome for short / phone layouts (PV37).
   * Default: `'auto'`.
   */
  readonly minimizeToolbar?: CropMinimizeToolbar;
  /**
   * Optional preview-only crop guide overlays (Pintura profile-circle / bleed parity).
   * Does not change apply / export geometry.
   * @see CropGuidesConfig
   */
  readonly guides?: CropGuidesConfig;
}

export interface RotatePluginConfig {
  readonly incrementDegrees: number;
  readonly allowArbitraryAngle?: boolean;
}

/** Named output size for the resize tool (Pintura resize preset parity — PV08). */
export interface ResizeSizePreset {
  readonly id: string;
  readonly label: string;
  /** Optional i18n key; when set, the UI prefers `t(labelKey)` over `label`. */
  readonly labelKey?: string;
  readonly width: number;
  readonly height: number;
}

/** Resize tool host options. */
export interface ResizePluginConfig {
  /**
   * Size preset chips in the resize panel.
   * Omit for {@link DEFAULT_RESIZE_SIZE_PRESETS}; pass `[]` to hide presets.
   */
  readonly sizePresets?: readonly ResizeSizePreset[];
}

export interface ZoomPreset {
  readonly id: string;
  /** Absolute zoom factor, or `'fit'` to fit the viewport. */
  readonly factor: number | 'fit';
  /** Optional fixed label (e.g. `25%`). Otherwise use `labelKey` via i18n. */
  readonly label?: string;
  readonly labelKey?: string;
}

export interface ViewportPluginConfig {
  readonly wheelZoom?: boolean;
  /** When true (default), two-finger pinch zooms and pans the viewport. */
  readonly pinchZoom?: boolean;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  /** When true (default), clicking the zoom % opens a presets menu. */
  readonly useZoomPresetsMenu?: boolean;
  readonly zoomPresets?: readonly ZoomPreset[];
  /** Multiplier for − / + zoom buttons (typical default: 1.1). */
  readonly zoomStepFactor?: number;
}

/**
 * Editor stage backdrop (Phase 4.8.6). Visual only — never baked into raster export.
 * Defaults to the built-in checkerboard CSS on `.fluxio-image-editor__viewport`.
 */
export interface CanvasBackgroundConfig {
  /** CSS color for the stage behind the image. */
  readonly backgroundColor?: string;
  /** CSS `background-image` value (e.g. `url(...)` or a gradient). */
  readonly backgroundImage?: string;
}

export interface ClosePolicyConfig {
  readonly warnOnUnsaved?: boolean;
  /**
   * When true, unsaved-close confirmation is delegated to the host via the
   * `confirmClose` output instead of `globalThis.confirm`.
   */
  readonly useCustomConfirm?: boolean;
}

/** Host-provided sticker / overlay gallery item (Phase 4.5). */
export interface ImageOverlayGalleryItem {
  readonly id: string;
  readonly label: string;
  /** Same-origin URL, data URL, or CORS-enabled remote URL. */
  readonly src: string;
}

export interface ImageOverlayPluginConfig {
  readonly gallery?: readonly ImageOverlayGalleryItem[];
}

/**
 * Host options for the stickers plugin (Phase 4.8.3).
 * Stickers are placed as `ImageAnnotation`s (same store path as overlays).
 */
export interface StickersPluginConfig {
  /** Preset sticker gallery (SVG/PNG data URLs or same-origin/CORS URLs). */
  readonly gallery?: readonly ImageOverlayGalleryItem[];
  /**
   * When true, show an upload control in the Stickers panel (default false —
   * Pintura-like presets; use Overlay for arbitrary uploads).
   */
  readonly allowUpload?: boolean;
}

/** Curated emoji preset for the emoji gallery / search. */
export interface EmojiGalleryItem {
  readonly id: string;
  /** Unicode emoji glyph(s) placed as a text annotation. */
  readonly emoji: string;
  readonly label: string;
  /** Optional search keywords (matched case-insensitively with label). */
  readonly keywords?: readonly string[];
  /** Optional gallery grouping label. */
  readonly category?: string;
  /** When true, the gallery applies the user's preferred Fitzpatrick skin tone. */
  readonly supportsSkinTone?: boolean;
}

/**
 * Host options for the emoji plugin.
 * Emojis are placed as `TextAnnotation`s (commits via `text.set`; requires `text`).
 */
export interface EmojiPluginConfig {
  /** Preset emoji gallery (defaults to a built-in curated list). */
  readonly gallery?: readonly EmojiGalleryItem[];
}

/** Host options for the watermark plugin (Phase 4.6). */
export interface WatermarkPluginConfig {
  /** Default text when entering text watermark mode. */
  readonly defaultText?: string;
  /** Host-provided default watermark image (same-origin / data / CORS URL). */
  readonly imageSrc?: string;
  /** Optional gallery of watermark images. */
  readonly gallery?: readonly ImageOverlayGalleryItem[];
}

/** One host-provided SVG crop-mask shape (path in unit square 0–1). */
export interface CropMaskGalleryItem {
  readonly id: string;
  readonly label: string;
  /** SVG path `d` in viewBox `0 0 1 1`. */
  readonly path: string;
  readonly category?: string;
}

/** Host options for the crop-mask plugin. */
export interface CropMaskPluginConfig {
  /** Optional SVG path gallery shown beside built-in shapes. */
  readonly gallery?: readonly CropMaskGalleryItem[];
}

/** Host options for the frame plugin. */
export interface FramePluginConfig {
  /** Optional image/SVG frame gallery (full-canvas overlays). */
  readonly gallery?: readonly ImageOverlayGalleryItem[];
}

/**
 * Placeholder text/shape laid out in **normalized output space** (0–1).
 * Materialized to real annotations when the template is applied.
 *
 * - Box `x`/`y`/`width`/`height` and line endpoints are fractions of output size.
 * - `fontSize` / `strokeWidth` / `padding` are fractions of `min(w,h)`, or absolute
 *   pixels when the value is `>= 1`.
 */
export type TemplatePlaceholder =
  | TemplateTextPlaceholder
  | TemplateRectPlaceholder
  | TemplateEllipsePlaceholder
  | TemplateLinePlaceholder;

export interface TemplateTextPlaceholder {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly fontSize?: number;
  readonly fill?: string;
  readonly fontFamily?: string;
  readonly fontWeight?: TextFontWeight;
  readonly fontStyle?: 'normal' | 'italic';
  readonly textAlign?: TextAlign;
  /** Fraction of output width (`0` = hug content). */
  readonly boxWidth?: number;
  readonly backgroundColor?: string;
  readonly padding?: number;
  readonly angle?: number;
  readonly underline?: boolean;
  readonly linethrough?: boolean;
}

export interface TemplateRectPlaceholder {
  readonly kind: 'rect';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly fill?: string;
  readonly angle?: number;
}

export interface TemplateEllipsePlaceholder {
  readonly kind: 'ellipse';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly fill?: string;
  readonly angle?: number;
}

export interface TemplateLinePlaceholder {
  readonly kind: 'line' | 'arrow';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly lineStart?: LineEndStyle;
  readonly lineEnd?: LineEndStyle;
}

/**
 * Design / output size template (social presets, print sizes, collages, …).
 * Applies a centered aspect crop and optional `width`×`height` resize in one history entry.
 * Optional {@link placeholders} become editable annotations after apply.
 * Optional {@link slots} (2+) enable multi-photo collage layouts: the document photo
 * fills the first slot via `designImage`; remaining slots become image overlays or
 * placeholder shapes.
 */
export interface TemplatePreset {
  readonly id: string;
  readonly label: string;
  /**
   * width/height lock, or null for free (full source).
   * When omitted but `width` + `height` are set, ratio is derived as width/height.
   */
  readonly ratio: number | null;
  readonly shape?: CropShape;
  /** Target output size after crop (always applied when both are set). */
  readonly width?: number;
  /** Target output size after crop (always applied when both are set). */
  readonly height?: number;
  /** Optional gallery grouping label (e.g. `Social`, `Print`, `Collage`). */
  readonly category?: string;
  /**
   * Optional host thumbnail URL (same-origin, data URL, or CORS-enabled remote).
   * When set, the Templates gallery shows an image preview beside the label.
   */
  readonly thumbnail?: string;
  /**
   * Optional text/shape placeholders (normalized 0–1 coords) appended on apply.
   * Crop + placeholders commit as one history entry via `templates.apply`.
   */
  readonly placeholders?: readonly TemplatePlaceholder[];
  /**
   * Optional collage image slots (normalized 0–1 output space).
   * When 2+ slots are set, apply places the document photo in the first slot and
   * materializes the rest as image overlays (`src`) or placeholder rects.
   * Gutters between slots stay transparent.
   */
  readonly slots?: readonly TemplateImageSlot[];
}

/**
 * One collage cell in a {@link TemplatePreset}.
 * Coordinates are fractions of the template output size (0–1).
 */
export interface TemplateImageSlot {
  /** Optional stable id for hosts / tests. */
  readonly id?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * Optional image URL for secondary slots (same-origin, data URL, or CORS remote).
   * Ignored on the first slot — that always uses the document photo via `designImage`.
   */
  readonly src?: string;
  /** Placeholder fill when `src` is omitted (secondary slots). Default: muted gray. */
  readonly placeholderFill?: string;
  /** Placeholder stroke when `src` is omitted. Default: soft border. */
  readonly placeholderStroke?: string;
}

/** Host options for the templates plugin. */
export interface TemplatesPluginConfig {
  /** Size / layout presets shown in the Templates panel. */
  readonly gallery?: readonly TemplatePreset[];
}

/**
 * Host options for the color-picker plugin.
 * When `enabled` is `false`, field eyedroppers are hidden even if the plugin is loaded.
 */
export interface ColorPickerPluginConfig {
  /** Default: true when the plugin is loaded. */
  readonly enabled?: boolean;
  /**
   * When true (default), fall back to the browser `EyeDropper` API if canvas
   * sampling fails (e.g. tainted CORS canvas) and the API is available.
   */
  readonly osEyeDropperFallback?: boolean;
}

/** One format/size target in a batch export run. */
export interface BatchExportPreset {
  readonly id: string;
  readonly label: string;
  readonly category?: string;
  readonly format: 'png' | 'jpeg' | 'webp';
  /** Target width (cover-fit with height when both set). */
  readonly width?: number;
  /** Target height (cover-fit with width when both set). */
  readonly height?: number;
  /**
   * Optional aspect lock (width/height). When set, that export pass uses a
   * centered max-fit crop from the source (export-only; does not mutate history).
   */
  readonly ratio?: number | null;
  /** Lossy quality override (jpeg/webp); falls back to dialog quality. */
  readonly quality?: number;
  /** Appended before the extension (e.g. `-story` → `photo-story.jpg`). */
  readonly fileNameSuffix?: string;
}

/** Host options for the batch-export plugin. */
export interface BatchExportPluginConfig {
  /** Presets shown in the batch export dialog. */
  readonly presets?: readonly BatchExportPreset[];
}

/**
 * Host options for the rulers plugin (PV49 / NF02).
 * Pintura parity: `annotateGridSize`, `annotateSnapToContext`, snap threshold.
 * Guides / edge rulers are fluxio extras for precise annotation layout.
 */
export type RulersPluginConfig = Partial<MarkupSnapConfig>;

/**
 * Host options for the fill plugin (PV25 / Pintura Fill).
 * Fills transparent pixels behind the photo — distinct from color-overlay wash.
 */
export interface FillPluginConfig {
  /** Solid color swatches shown in the Background panel. */
  readonly colors?: readonly string[];
  /** Optional background image gallery. */
  readonly gallery?: readonly ImageOverlayGalleryItem[];
}

/** One size/fill choice for the Open plugin “New blank” menu. */
export interface OpenBlankPreset {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** CSS color; default `#ffffff`. Use `transparent` for an alpha PNG. */
  readonly fill?: string;
}

/**
 * Host options for the optional Open plugin (toolbar Upload + New blank).
 * Blank documents are synthetic PNG rasters loaded via `session.load` — not a null source.
 */
export interface OpenPluginConfig {
  /** Register the Upload (`open.file`) toolbar action. Default: true. */
  readonly allowUpload?: boolean;
  /** Register the New blank (`open.new`) toolbar action. Default: true. */
  readonly allowBlank?: boolean;
  /**
   * Confirm before replacing the current document when dirty.
   * Also respects `close.warnOnUnsaved`. Default: true.
   */
  readonly confirmReplace?: boolean;
  /** Used for one-shot New when presets are empty / single. */
  readonly defaultBlank?: {
    readonly width: number;
    readonly height: number;
    readonly fill?: string;
  };
  /**
   * Blank size menu entries. Omit for built-in square / HD / story presets.
   * Pass `[]` to skip the menu and use `defaultBlank` immediately.
   */
  readonly blankPresets?: readonly OpenBlankPreset[];
}

/**
 * First-party plugin ids as a const object (enum-style) for host apps.
 * Prefer this over string literals: `EDITOR_PLUGIN_IDS.crop`, `EDITOR_PLUGIN_IDS.cropMask`.
 */
export const EDITOR_PLUGIN_IDS = {
  viewport: 'viewport',
  transform: 'transform',
  export: 'export',
  crop: 'crop',
  adjustments: 'adjustments',
  effects: 'effects',
  filters: 'filters',
  focus: 'focus',
  redact: 'redact',
  cropMask: 'crop-mask',
  colorOverlay: 'color-overlay',
  fill: 'fill',
  frame: 'frame',
  text: 'text',
  shapes: 'shapes',
  drawing: 'drawing',
  path: 'path',
  imageOverlay: 'image-overlay',
  stickers: 'stickers',
  emoji: 'emoji',
  watermark: 'watermark',
  persistence: 'persistence',
  compare: 'compare',
  historySnapshots: 'history-snapshots',
  layers: 'layers',
  templates: 'templates',
  colorPicker: 'color-picker',
  batchExport: 'batch-export',
  rulers: 'rulers',
  open: 'open',
} as const;

/** First-party plugin identifiers (secondary entry points under `plugins/*`). */
export type EditorPluginId = (typeof EDITOR_PLUGIN_IDS)[keyof typeof EDITOR_PLUGIN_IDS];

/**
 * Annotation tool plugins that share `document.annotations`.
 * Kept as separate entry points for code-splitting. Prefer spreading this
 * constant into `config.plugins`; the `'annotations'` request alias expands to
 * the same ids.
 */
export const ANNOTATION_EDITOR_PLUGIN_IDS = [
  EDITOR_PLUGIN_IDS.text,
  EDITOR_PLUGIN_IDS.shapes,
  EDITOR_PLUGIN_IDS.drawing,
  EDITOR_PLUGIN_IDS.path,
  EDITOR_PLUGIN_IDS.imageOverlay,
  EDITOR_PLUGIN_IDS.stickers,
  EDITOR_PLUGIN_IDS.emoji,
] as const satisfies readonly EditorPluginId[];

export type AnnotationEditorPluginId = (typeof ANNOTATION_EDITOR_PLUGIN_IDS)[number];

/**
 * Host-facing plugin request ids (concrete plugins + group aliases).
 * Prefer spreading {@link ANNOTATION_EDITOR_PLUGIN_IDS}; the `'annotations'`
 * alias expands to the same ids.
 */
export type EditorPluginRequestId = EditorPluginId | 'annotations';

/** Host request aliases that expand to one or more concrete plugin ids. */
const EDITOR_PLUGIN_REQUEST_ALIASES: Readonly<
  Record<Exclude<EditorPluginRequestId, EditorPluginId>, readonly EditorPluginId[]>
> = {
  annotations: ANNOTATION_EDITOR_PLUGIN_IDS,
};

/** Essential plugins always registered regardless of `config.plugins`. */
export const ALWAYS_ON_EDITOR_PLUGIN_IDS: readonly EditorPluginId[] = [
  EDITOR_PLUGIN_IDS.viewport,
  EDITOR_PLUGIN_IDS.transform,
  EDITOR_PLUGIN_IDS.export,
  EDITOR_PLUGIN_IDS.crop,
];

/** Optional plugins eligible for lazy loading when `config.plugins` is set. */
export const OPTIONAL_EDITOR_PLUGIN_IDS: readonly EditorPluginId[] = [
  EDITOR_PLUGIN_IDS.adjustments,
  EDITOR_PLUGIN_IDS.effects,
  EDITOR_PLUGIN_IDS.filters,
  EDITOR_PLUGIN_IDS.focus,
  EDITOR_PLUGIN_IDS.redact,
  EDITOR_PLUGIN_IDS.cropMask,
  EDITOR_PLUGIN_IDS.colorOverlay,
  EDITOR_PLUGIN_IDS.fill,
  EDITOR_PLUGIN_IDS.frame,
  EDITOR_PLUGIN_IDS.text,
  EDITOR_PLUGIN_IDS.shapes,
  EDITOR_PLUGIN_IDS.drawing,
  EDITOR_PLUGIN_IDS.path,
  EDITOR_PLUGIN_IDS.imageOverlay,
  EDITOR_PLUGIN_IDS.stickers,
  EDITOR_PLUGIN_IDS.emoji,
  EDITOR_PLUGIN_IDS.watermark,
  EDITOR_PLUGIN_IDS.persistence,
  EDITOR_PLUGIN_IDS.compare,
  EDITOR_PLUGIN_IDS.historySnapshots,
  EDITOR_PLUGIN_IDS.layers,
  EDITOR_PLUGIN_IDS.templates,
  EDITOR_PLUGIN_IDS.colorPicker,
  EDITOR_PLUGIN_IDS.batchExport,
  EDITOR_PLUGIN_IDS.rulers,
  EDITOR_PLUGIN_IDS.open,
];

/** Full first-party plugin set (default when `config.plugins` is omitted). */
export const ALL_EDITOR_PLUGIN_IDS: readonly EditorPluginId[] = [
  ...ALWAYS_ON_EDITOR_PLUGIN_IDS,
  ...OPTIONAL_EDITOR_PLUGIN_IDS,
];

export interface ImageEditorConfig {
  readonly toolbar?: Partial<EditorToolbarConfig>;
  /**
   * Shell color mode. Default: `'dark'`.
   * - `light` / `dark` — built-in CSS palettes on `[data-theme]`
   * - `custom` — host styles (CSS targeting `[data-theme='custom']` / `themeClass`)
   *   and/or programmatic `themeTokens`
   */
  readonly theme?: EditorThemeMode;
  /**
   * Extra host class on the editor root when theming via CSS
   * (e.g. `'brand-ocean'` → style `.fluxio-image-editor.brand-ocean`).
   */
  readonly themeClass?: string;
  /**
   * Active UI locale. Built-in catalogs: `en`, `ar`.
   * Any other code works when the host supplies packs via `locales` / `messages` (PV39).
   */
  readonly locale?: EditorLocaleCode;
  readonly dir?: EditorTextDirection;
  /**
   * Host message overrides for the **active** locale (Pintura locale-merge parity).
   * Wins over built-in + plugin catalogs. Re-applied when config changes.
   * @see locales
   * @see resolveHostLocaleMessages
   */
  readonly messages?: MessageDictionary;
  /**
   * Host locale packs keyed by locale code (e.g. `{ de: { 'crop.tool': 'Zuschneiden' } }`).
   * The pack for `locale` is merged, then `messages` overlays on top.
   */
  readonly locales?: HostLocalePacks;
  readonly rotate?: Partial<RotatePluginConfig>;
  /** Resize tool options (size presets — PV08). */
  readonly resize?: Partial<ResizePluginConfig>;
  readonly viewport?: Partial<ViewportPluginConfig>;
  /**
   * Non-exported stage backdrop (checkerboard override). Ignored by raster export.
   * @see CanvasBackgroundConfig
   */
  readonly canvasBackground?: CanvasBackgroundConfig;
  readonly crop?: Partial<CropPluginConfig>;
  readonly imageOverlay?: Partial<ImageOverlayPluginConfig>;
  readonly stickers?: Partial<StickersPluginConfig>;
  readonly emoji?: Partial<EmojiPluginConfig>;
  readonly watermark?: Partial<WatermarkPluginConfig>;
  readonly cropMask?: Partial<CropMaskPluginConfig>;
  readonly frame?: Partial<FramePluginConfig>;
  /**
   * Transparent-pixel background fill (Pintura Fill parity).
   * @see FillPluginConfig
   */
  readonly fill?: Partial<FillPluginConfig>;
  /**
   * Host-extensible filter registry (Pintura `filterFunctions` / `filterOptions` parity).
   * @see FiltersPluginConfig
   */
  readonly filters?: Partial<FiltersPluginConfig>;
  readonly templates?: Partial<TemplatesPluginConfig>;
  readonly colorPicker?: Partial<ColorPickerPluginConfig>;
  readonly batchExport?: Partial<BatchExportPluginConfig>;
  /**
   * Markup grid / snap / rulers (Pintura annotateGridSize / snap-to-context parity).
   * @see RulersPluginConfig
   */
  readonly rulers?: RulersPluginConfig;
  /**
   * Toolbar Upload / New blank (optional `open` plugin).
   * @see OpenPluginConfig
   */
  readonly open?: Partial<OpenPluginConfig>;
  readonly aspectRatios?: readonly AspectRatioPreset[];
  readonly historyLimit?: number;
  readonly close?: Partial<ClosePolicyConfig>;
  readonly visibleTools?: readonly string[];
  readonly defaultTool?: string;
  /**
   * Which first-party plugins to load. Omit to load all (backward-compatible default).
   * When set, only listed optional plugins are loaded (always-on plugins are merged in).
   * Prefer `...ANNOTATION_EDITOR_PLUGIN_IDS` for the annotation tool group.
   * Alias `'annotations'` still expands to the same ids.
   * Triggers dynamic `import()` per optional plugin for host bundle code-splitting.
   */
  readonly plugins?: readonly EditorPluginRequestId[];
  /**
   * Inline CSS custom property overrides when `theme` is `'custom'`.
   * Prefer host CSS when possible; use this for runtime / config-driven branding.
   * @see EDITOR_THEME_CSS_VARS
   */
  readonly themeTokens?: EditorThemeTokens;
}

/** Expand host request ids (`annotations` → concrete plugin ids). */
export function expandEditorPluginRequestIds(
  ids: readonly EditorPluginRequestId[],
): readonly EditorPluginId[] {
  const expanded: EditorPluginId[] = [];
  for (const id of ids) {
    if (id === 'annotations') {
      expanded.push(...EDITOR_PLUGIN_REQUEST_ALIASES.annotations);
      continue;
    }
    expanded.push(id);
  }
  return expanded;
}

/** Effective plugin ids after merging always-on plugins with an explicit host list. */
export function resolveRequestedPluginIds(config: ImageEditorConfig): readonly EditorPluginId[] {
  if (config.plugins === undefined) {
    return ALL_EDITOR_PLUGIN_IDS;
  }
  const valid = new Set<string>([
    ...ALL_EDITOR_PLUGIN_IDS,
    ...Object.keys(EDITOR_PLUGIN_REQUEST_ALIASES),
  ]);
  for (const id of config.plugins) {
    if (!valid.has(id)) {
      throw new Error(`Unknown editor plugin id: ${id}`);
    }
  }
  const requested = [...expandEditorPluginRequestIds(config.plugins)];
  // Emoji commits via `text.set` — ensure the text plugin is present.
  if (requested.includes('emoji') && !requested.includes('text')) {
    requested.push('text');
  }
  return [...new Set([...ALWAYS_ON_EDITOR_PLUGIN_IDS, ...requested])];
}

export function usesLazyPluginLoading(config: ImageEditorConfig): boolean {
  return config.plugins !== undefined;
}

export const DEFAULT_CROP_CONFIG: CropPluginConfig = {
  autoResize: false,
  forcePngOnEllipticalCrop: false,
  minimizeToolbar: 'auto',
  guides: {
    profileCircle: false,
    bleed: 0,
  },
};

const CROP_MINIMIZE_TOOLBAR: ReadonlySet<CropMinimizeToolbar> = new Set([
  'auto',
  'always',
  'never',
]);

export function resolveCropMinimizeToolbar(
  value?: CropMinimizeToolbar | null,
): CropMinimizeToolbar {
  return value && CROP_MINIMIZE_TOOLBAR.has(value) ? value : 'auto';
}

export function resolveCropConfig(partial?: Partial<CropPluginConfig>): CropPluginConfig {
  return {
    ...DEFAULT_CROP_CONFIG,
    ...partial,
    minimizeToolbar: resolveCropMinimizeToolbar(
      partial?.minimizeToolbar ?? DEFAULT_CROP_CONFIG.minimizeToolbar,
    ),
    guides: {
      ...DEFAULT_CROP_CONFIG.guides,
      ...partial?.guides,
    },
  };
}

export const DEFAULT_ASPECT_RATIOS: readonly AspectRatioPreset[] = [
  { id: 'free', label: 'Free', labelKey: 'crop.free', ratio: null },
  { id: 'ellipse', label: 'Ellipse', labelKey: 'crop.ellipse', ratio: null, shape: 'ellipse' },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
];

/** Default resize size chips (common web / social targets). */
export const DEFAULT_RESIZE_SIZE_PRESETS: readonly ResizeSizePreset[] = [
  {
    id: '1920x1080',
    label: '1920×1080',
    labelKey: 'transform.resize.preset.1920x1080',
    width: 1920,
    height: 1080,
  },
  {
    id: '1280x720',
    label: '1280×720',
    labelKey: 'transform.resize.preset.1280x720',
    width: 1280,
    height: 720,
  },
  {
    id: '1080x1080',
    label: '1080×1080',
    labelKey: 'transform.resize.preset.1080x1080',
    width: 1080,
    height: 1080,
  },
  {
    id: '800x600',
    label: '800×600',
    labelKey: 'transform.resize.preset.800x600',
    width: 800,
    height: 600,
  },
  {
    id: '640x480',
    label: '640×480',
    labelKey: 'transform.resize.preset.640x480',
    width: 640,
    height: 480,
  },
];

export const DEFAULT_RESIZE_CONFIG: ResizePluginConfig = {
  sizePresets: DEFAULT_RESIZE_SIZE_PRESETS,
};

export function normalizeResizeSizePresets(
  presets: readonly ResizeSizePreset[] | null | undefined,
): readonly ResizeSizePreset[] {
  if (!presets || presets.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const next: ResizeSizePreset[] = [];
  for (const preset of presets) {
    if (!preset?.id || seen.has(preset.id)) {
      continue;
    }
    const width = Math.round(preset.width);
    const height = Math.round(preset.height);
    if (!(width > 0) || !(height > 0)) {
      continue;
    }
    seen.add(preset.id);
    next.push({
      id: preset.id,
      label: preset.label?.trim() || `${width}×${height}`,
      labelKey: preset.labelKey,
      width,
      height,
    });
  }
  return next;
}

export function resolveResizeConfig(partial?: Partial<ResizePluginConfig>): ResizePluginConfig {
  return {
    sizePresets:
      partial?.sizePresets !== undefined
        ? normalizeResizeSizePresets(partial.sizePresets)
        : DEFAULT_RESIZE_SIZE_PRESETS,
  };
}

/** Match a size preset to exact output dimensions, or null when custom. */
export function matchResizeSizePreset(
  presets: readonly ResizeSizePreset[],
  width: number,
  height: number,
): ResizeSizePreset | null {
  const w = Math.round(width);
  const h = Math.round(height);
  return presets.find((preset) => preset.width === w && preset.height === h) ?? null;
}

/** Effective aspect lock for a preset (explicit ratio, or width/height). */
export function resolvePresetAspectRatio(preset: AspectRatioPreset): number | null {
  if (preset.ratio != null && preset.ratio > 0) {
    return preset.ratio;
  }
  if (preset.width != null && preset.height != null && preset.width > 0 && preset.height > 0) {
    return preset.width / preset.height;
  }
  return null;
}

export function presetHasAutoResizeTarget(preset: AspectRatioPreset): boolean {
  return preset.width != null && preset.height != null && preset.width > 0 && preset.height > 0;
}

/** Built-in zoom presets for the percentage dropdown. */
export const DEFAULT_ZOOM_PRESETS: readonly ZoomPreset[] = [
  { id: 'fit', factor: 'fit', labelKey: 'viewport.fitSize' },
  { id: 'actual', factor: 1, labelKey: 'viewport.actualSize' },
  { id: '25', factor: 0.25, label: '25%' },
  { id: '50', factor: 0.5, label: '50%' },
  { id: '75', factor: 0.75, label: '75%' },
  { id: '125', factor: 1.25, label: '125%' },
  { id: '170', factor: 1.7, label: '170%' },
  { id: '300', factor: 3, label: '300%' },
  { id: '500', factor: 5, label: '500%' },
  { id: '1000', factor: 10, label: '1000%' },
];

export const DEFAULT_TOOLBAR_CONFIG: EditorToolbarConfig = {
  position: 'left',
  toolbarPosition: 'top',
  controlsPosition: 'left',
  showSaveButton: true,
  actionDisplay: 'both',
};

/** Coerce legacy utilibar positions (`top` / `bottom`) to a supported side rail. */
export function normalizeToolbarPosition(value: string | undefined | null): EditorToolbarPosition {
  return value === 'right' ? 'right' : 'left';
}

/** Coerce controls panel side; falls back to utilibar side. */
export function normalizeControlsPanelPosition(
  value: string | undefined | null,
  utilsPosition: EditorToolbarPosition,
): EditorControlsPanelPosition {
  if (value === 'left' || value === 'right') {
    return value;
  }
  return utilsPosition;
}

export function resolveToolbarConfig(
  partial?: Partial<EditorToolbarConfig> & {
    /** Legacy hosts may still pass `top` / `bottom`; these map to `left`. */
    readonly position?: string;
    readonly controlsPosition?: string;
  },
): EditorToolbarConfig {
  const position = normalizeToolbarPosition(
    (partial?.position as string | undefined) ?? DEFAULT_TOOLBAR_CONFIG.position,
  );
  const controlsPosition = normalizeControlsPanelPosition(
    partial?.controlsPosition as string | undefined,
    position,
  );
  const { position: _position, controlsPosition: _controlsPosition, ...rest } = partial ?? {};
  return {
    ...DEFAULT_TOOLBAR_CONFIG,
    ...rest,
    position,
    controlsPosition,
  };
}
