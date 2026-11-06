import {
  ALWAYS_ON_EDITOR_PLUGIN_IDS,
  ANNOTATION_EDITOR_PLUGIN_IDS,
  type EditorControlsPanelPosition,
  type EditorPluginId,
  type EditorPluginRequestId,
  type EditorToolbarActionDisplay,
  type EditorToolbarBarPosition,
  type EditorToolbarPosition,
  OPTIONAL_EDITOR_PLUGIN_IDS,
} from 'fluxio-image-editor';
import type { EditorTextDirection, EditorThemeMode } from 'fluxio-image-editor/core';

export interface DemoPluginMeta {
  readonly id: EditorPluginId;
  readonly label: string;
  readonly summary: string;
  readonly alwaysOn: boolean;
}

/** Host aliases (`config.plugins`) for the demo Plugins section. */
export interface DemoPluginAliasPreset {
  readonly id: EditorPluginRequestId;
  readonly label: string;
  readonly summary: string;
  readonly expandsTo: readonly EditorPluginId[];
}

const PLUGIN_SUMMARIES: Record<EditorPluginId, { label: string; summary: string }> = {
  viewport: { label: 'Viewport', summary: 'Pan, zoom, fit, wheel zoom, zoom presets' },
  transform: {
    label: 'Transform',
    summary: 'Rotate, resize (size presets), flip, arbitrary angle',
  },
  export: { label: 'Export', summary: 'Raster save / download pipeline' },
  crop: {
    label: 'Crop',
    summary:
      'Rect & elliptical crop, aspect presets, profile-circle / bleed guides, mobile minimizeToolbar',
  },
  adjustments: { label: 'Adjustments', summary: 'Brightness, contrast, saturation, exposure' },
  effects: { label: 'Effects', summary: 'Blur, sharpen, pixelate, vignette' },
  filters: {
    label: 'Filters',
    summary: 'Preset + host color-matrix filters (config.filters.filterFunctions)',
  },
  focus: {
    label: 'Focus',
    summary: 'Radial bokeh and linear tilt-shift selective blur',
  },
  redact: {
    label: 'Redact',
    summary: 'Secure censor rectangles — mosaic + scramble bake into the photo',
  },
  'crop-mask': {
    label: 'Crop mask',
    summary: 'Clip output to shapes (circle, star, heart, …) plus optional host SVG gallery (CM03)',
  },
  'color-overlay': {
    label: 'Fill (overlay)',
    summary: 'Solid or gradient color wash on top of the image',
  },
  fill: {
    label: 'Background',
    summary: 'Fill transparent pixels behind the photo (Pintura Fill / PV25)',
  },
  frame: {
    label: 'Frame',
    summary: 'Decorative borders — solid, double, rounded, gradient, Polaroid, film',
  },
  text: { label: 'Text', summary: 'Editable text annotations' },
  shapes: { label: 'Shapes', summary: 'Rect, ellipse, line, polygon annotations' },
  drawing: {
    label: 'Draw',
    summary: 'Freehand brush strokes on the canvas',
  },
  path: {
    label: 'Path',
    summary: 'Click-to-place polyline paths (Pintura / Photoshop Pen-style)',
  },
  'image-overlay': { label: 'Image overlay', summary: 'Add images from host gallery' },
  stickers: { label: 'Stickers', summary: 'Preset SVG/PNG stickers on canvas' },
  emoji: {
    label: 'Emoji',
    summary:
      'Searchable emoji picker with category tabs, skin tones, recent/favorites — places emoji as text annotations',
  },
  watermark: { label: 'Watermark', summary: 'Text or image watermark layer' },
  persistence: { label: 'Persistence', summary: 'Design-state JSON save / restore hooks' },
  compare: { label: 'Compare', summary: 'Hold or pin original for before/after' },
  'history-snapshots': {
    label: 'History snapshots',
    summary: 'Visual undo timeline — jump to any edit step',
  },
  layers: {
    label: 'Layers',
    summary: 'Annotation layers panel — select, reorder, duplicate, delete',
  },
  templates: {
    label: 'Templates',
    summary: 'Social / output size presets — crop + resize in one step',
  },
  'color-picker': {
    label: 'Color picker',
    summary: 'Eyedropper on color fields — sample from the canvas',
  },
  'batch-export': {
    label: 'Batch export',
    summary: 'Export multiple formats and sizes in one pass',
  },
  rulers: {
    label: 'Rulers',
    summary: 'Snap grid, edge rulers, and guide lines for annotation layout (PV49)',
  },
  open: {
    label: 'Open',
    summary: 'Toolbar Upload + New blank (synthetic PNG) with dirty confirm',
  },
};

export const DEMO_PLUGIN_ALIAS_PRESETS: readonly DemoPluginAliasPreset[] = [
  {
    id: 'annotations',
    label: 'Annotations',
    summary: 'Group alias → text, shapes, drawing, path, image-overlay, stickers, emoji',
    expandsTo: [...ANNOTATION_EDITOR_PLUGIN_IDS],
  },
];

export const DEMO_PLUGIN_CATALOG: readonly DemoPluginMeta[] = [
  ...ALWAYS_ON_EDITOR_PLUGIN_IDS.map((id) => ({
    id,
    ...PLUGIN_SUMMARIES[id],
    alwaysOn: true,
  })),
  ...OPTIONAL_EDITOR_PLUGIN_IDS.map((id) => ({
    id,
    ...PLUGIN_SUMMARIES[id],
    alwaysOn: false,
  })),
];

/** Chrome toolbar actions (history group / dedicated shell controls). */
export const DEMO_CHROME_ACTION_OPTIONS = [
  { id: 'compare.original', label: 'Compare original', hint: 'Hold/pin original in the toolbar' },
  {
    id: 'history.panel',
    label: 'History panel',
    hint: 'Toolbar button only — use History plugin switch to unload the panel',
  },
  {
    id: 'layers.panel',
    label: 'Layers panel',
    hint: 'Toolbar button only — use Layers plugin switch to unload the panel',
  },
  {
    id: 'batch-export.dialog',
    label: 'Batch export',
    hint: 'Multi-format / multi-size export dialog',
  },
  { id: 'open.file', label: 'Open file', hint: 'Toolbar Upload — replace source from device' },
  { id: 'open.new', label: 'New blank', hint: 'Toolbar New — blank size menu / default blank' },
] as const;

/** Utilibar tool actions (+ annotations group alias). */
export const DEMO_UTILIBAR_ACTION_OPTIONS = [
  { id: 'crop.tool', label: 'Crop' },
  { id: 'transform.rotate-tool', label: 'Rotate' },
  { id: 'transform.resize-tool', label: 'Resize' },
  { id: 'viewport.fit', label: 'Fit' },
  { id: 'adjustments.tool', label: 'Adjustments' },
  { id: 'effects.tool', label: 'Effects' },
  { id: 'filters.tool', label: 'Filters' },
  { id: 'focus.tool', label: 'Focus' },
  { id: 'redact.tool', label: 'Redact' },
  { id: 'crop-mask.tool', label: 'Crop mask' },
  { id: 'color-overlay.tool', label: 'Fill' },
  { id: 'fill.tool', label: 'Background' },
  { id: 'frame.tool', label: 'Frame' },
  { id: 'templates.tool', label: 'Templates' },
  { id: 'annotations', label: 'Annotate (group)' },
  { id: 'text.tool', label: 'Text' },
  { id: 'shapes.tool', label: 'Shapes' },
  { id: 'drawing.tool', label: 'Draw' },
  { id: 'path.tool', label: 'Path' },
  { id: 'image-overlay.tool', label: 'Image overlay' },
  { id: 'stickers.tool', label: 'Stickers' },
  { id: 'emoji.tool', label: 'Emoji' },
  { id: 'watermark.tool', label: 'Watermark' },
  { id: 'rulers.tool', label: 'Rulers' },
] as const;

/** All action ids used by the demo visibility whitelist. */
export const DEMO_TOOL_ACTION_OPTIONS = [
  ...DEMO_UTILIBAR_ACTION_OPTIONS,
  ...DEMO_CHROME_ACTION_OPTIONS,
] as const;

export const DEMO_DEFAULT_TOOL_OPTIONS = [
  { id: 'crop', label: 'Crop' },
  { id: 'transform', label: 'Transform' },
  { id: 'adjustments', label: 'Adjustments' },
  { id: 'effects', label: 'Effects' },
  { id: 'filters', label: 'Filters' },
  { id: 'focus', label: 'Focus' },
  { id: 'redact', label: 'Redact' },
  { id: 'crop-mask', label: 'Crop mask' },
  { id: 'color-overlay', label: 'Fill' },
  { id: 'fill', label: 'Background' },
  { id: 'frame', label: 'Frame' },
  { id: 'templates', label: 'Templates' },
  { id: 'text', label: 'Text' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'drawing', label: 'Draw' },
  { id: 'path', label: 'Path' },
  { id: 'image-overlay', label: 'Image overlay' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'emoji', label: 'Emoji' },
  { id: 'watermark', label: 'Watermark' },
  { id: 'rulers', label: 'Rulers' },
] as const;

/** Same-origin fixtures for open/edit format smoke in the demo host. */
export const DEMO_FORMAT_SAMPLES = [
  { id: 'jpg', label: 'JPEG', src: '/fixtures/sample.jpg', note: 'Default raster' },
  { id: 'png', label: 'PNG', src: '/fixtures/sample.png', note: 'Alpha-capable raster' },
  { id: 'webp', label: 'WebP', src: '/fixtures/sample.webp', note: 'Modern raster' },
  { id: 'gif', label: 'GIF', src: '/fixtures/sample.gif', note: 'Opens as still frame' },
  { id: 'svg', label: 'SVG', src: '/fixtures/sample.svg', note: 'Rasterized by browser' },
] as const;

/** Demo host gallery override for `config.templates.gallery`. */
const DEMO_TEMPLATE_THUMB_SQUARE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#1f6feb"/><text x="36" y="42" text-anchor="middle" fill="#fff" font-size="14" font-family="sans-serif">1:1</text></svg>',
  );
const DEMO_TEMPLATE_THUMB_STORY =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="#0e7490"/><rect x="22" y="8" width="28" height="56" rx="4" fill="#67e8f9"/><text x="36" y="42" text-anchor="middle" fill="#083344" font-size="11" font-family="sans-serif">9:16</text></svg>',
  );

export const DEMO_HOST_TEMPLATE_GALLERY = [
  {
    id: 'demo-square',
    label: 'Demo Square 800×800',
    category: 'Demo',
    ratio: 1,
    width: 800,
    height: 800,
    thumbnail: DEMO_TEMPLATE_THUMB_SQUARE,
    placeholders: [
      {
        kind: 'text' as const,
        x: 0.1,
        y: 0.12,
        text: 'Headline',
        fontSize: 0.09,
        fontWeight: 'bold' as const,
        fill: '#ffffff',
        textAlign: 'center' as const,
        boxWidth: 0.8,
      },
      {
        kind: 'text' as const,
        x: 0.12,
        y: 0.78,
        text: 'Subtitle',
        fontSize: 0.045,
        fill: '#ffffff',
        textAlign: 'center' as const,
        boxWidth: 0.76,
      },
    ],
  },
  {
    id: 'demo-story',
    label: 'Demo Story 1080×1920',
    category: 'Demo',
    ratio: 9 / 16,
    width: 1080,
    height: 1920,
    thumbnail: DEMO_TEMPLATE_THUMB_STORY,
    placeholders: [
      {
        kind: 'ellipse' as const,
        x: 0.35,
        y: 0.08,
        width: 0.3,
        height: 0.12,
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 0.008,
      },
      {
        kind: 'text' as const,
        x: 0.1,
        y: 0.85,
        text: 'Swipe up',
        fontSize: 0.05,
        fontWeight: 'bold' as const,
        fill: '#ffffff',
        textAlign: 'center' as const,
        boxWidth: 0.8,
      },
    ],
  },
  {
    id: 'demo-wide',
    label: 'Demo Wide 1600×900',
    category: 'Demo',
    ratio: 16 / 9,
    width: 1600,
    height: 900,
  },
] as const;

/** Demo host gallery for `config.cropMask.gallery` (SVG `d` in viewBox `0 0 1 1`). */
export const DEMO_HOST_CROP_MASK_GALLERY = [
  {
    id: 'demo-shield',
    label: 'Shield',
    path: 'M0.5 0.06 L0.88 0.2 L0.88 0.48 C0.88 0.72 0.7 0.9 0.5 0.96 C0.3 0.9 0.12 0.72 0.12 0.48 L0.12 0.2 Z',
  },
  {
    id: 'demo-arrow',
    label: 'Arrow',
    path: 'M0.5 0.06 L0.86 0.42 L0.64 0.42 L0.64 0.94 L0.36 0.94 L0.36 0.42 L0.14 0.42 Z',
  },
  {
    id: 'demo-cloud',
    label: 'Cloud',
    path: 'M0.28 0.58 C0.14 0.58 0.08 0.46 0.18 0.38 C0.14 0.24 0.32 0.16 0.44 0.24 C0.5 0.12 0.7 0.14 0.76 0.28 C0.9 0.26 0.98 0.42 0.88 0.52 C0.94 0.66 0.8 0.74 0.66 0.7 L0.36 0.7 C0.24 0.74 0.16 0.66 0.28 0.58 Z',
  },
  {
    id: 'demo-badge',
    label: 'Badge',
    path: 'M0.5 0.04 L0.58 0.22 L0.78 0.16 L0.72 0.36 L0.94 0.5 L0.72 0.64 L0.78 0.84 L0.58 0.78 L0.5 0.96 L0.42 0.78 L0.22 0.84 L0.28 0.64 L0.06 0.5 L0.28 0.36 L0.22 0.16 L0.42 0.22 Z',
  },
  {
    id: 'demo-blob',
    label: 'Blob',
    path: 'M0.5 0.05 C0.78 0.05 0.95 0.28 0.9 0.52 C0.85 0.82 0.58 0.96 0.35 0.88 C0.12 0.78 0.08 0.42 0.22 0.22 C0.3 0.1 0.4 0.05 0.5 0.05 Z',
  },
] as const;

export const DEMO_THEME_OPTIONS: readonly EditorThemeMode[] = ['light', 'dark', 'custom'];
export const DEMO_LOCALE_OPTIONS = ['en', 'ar'] as const;
export const DEMO_DIR_OPTIONS: readonly EditorTextDirection[] = ['auto', 'ltr', 'rtl'];
export const DEMO_UTILS_POSITIONS: readonly EditorToolbarPosition[] = ['left', 'right'];
export const DEMO_CONTROLS_POSITIONS: readonly EditorControlsPanelPosition[] = ['left', 'right'];
export const DEMO_TOOLBAR_POSITIONS: readonly EditorToolbarBarPosition[] = ['top', 'bottom'];
export const DEMO_ACTION_DISPLAYS: readonly EditorToolbarActionDisplay[] = [
  'both',
  'icon',
  'label',
];
