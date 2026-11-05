/** Built-in 24×24 outline icon path data for toolbar actions. */
export const TOOLBAR_ICON_PATHS: Readonly<Record<string, string>> = {
  crop: 'M6 2v4H2v2h4v12h12v4h2v-4h4v-2H14V6H6V2H4zm2 6h8v8H8V8z',
  rotate:
    'M12 5V2L8 6l4 4V7c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.9-4H5.08A7 7 0 0 0 12 19a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z',
  'flip-horizontal':
    'M3 5h2v14H3V5zm4 2.5L11 5v14l-4-2.5v-9zm10 0v9L13 19V5l4 2.5zM19 5h2v14h-2V5z',
  'flip-vertical':
    'M5 3h14v2H5V3zm2.5 4L5 11h14l-2.5-4h-9zm0 10L5 13h14l-2.5 4h-9zM5 19h14v2H5v-2z',
  resize:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z',
  adjustments:
    'M4 6h10v2H4V6zm12 0h4v2h-4V6zM4 11h4v2H4v-2zm6 0h10v2H10v-2zM4 16h8v2H4v-2zm10 0h6v2h-6v-2zM14 5v4h2V5h-2zm-8 5v4h2v-4H6zm4 5v4h2v-4h-2z',
  effects:
    'M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.8 5.7 21l2.3-7-6-4.8h7.6L12 2z',
  filters:
    'M3 5h18v2H3V5zm4 6h10v2H7v-2zm3 6h4v2h-4v-2z',
  focus:
    'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  redact:
    'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z',
  'crop-mask':
    'M12 3c-2.5 0-4.5 1.2-5.7 3H4v2h1.3C4.5 9.8 4 10.9 4 12c0 4.4 3.6 8 8 8s8-3.6 8-8c0-1.1-.5-2.2-1.3-4H20V6h-2.3C16.5 4.2 14.5 3 12 3zm0 2c1.7 0 3.1.8 4 2H8c.9-1.2 2.3-2 4-2zm0 14c-3.3 0-6-2.7-6-6 0-.7.1-1.3.4-1.9h11.2c.3.6.4 1.2.4 1.9 0 3.3-2.7 6-6 6z',
  frame:
    'M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z',
  'color-overlay':
    'M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.59.59-1.54 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5zM2 20h20v4H2z',
  fill:
    'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 8l2.2 2.8L14 12l3 4H9l0-2z',
  text: 'M5 4v3h5.5v12h3V7H19V4H5z',
  shapes:
    'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm12.5 0L21 20h-9l4.5-7z',
  drawing:
    'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  path: 'M4 18l4-10 5 6 5-10',
  'image-overlay':
    'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  watermark:
    'M12 2C8 2 4.7 4.1 3.3 7.5L2 12l1.3 4.5C4.7 19.9 8 22 12 22s7.3-2.1 8.7-5.5L22 12l-1.3-4.5C19.3 4.1 16 2 12 2zm0 3c2.4 0 4.5 1.2 5.7 3H6.3C7.5 6.2 9.6 5 12 5zm0 14c-2.4 0-4.5-1.2-5.7-3h11.4c-1.2 1.8-3.3 3-5.7 3z',
  compare:
    'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6V4zm0 14H4l6-7.5V18zM14 4v16h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-6zm0 2.5L20 14V6h-6z',
  history:
    'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 0 1 7-7 7 7 0 0 1 7 7 7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.95 8.95 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  layers:
    'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  templates:
    'M4 4h7v7H4V4zm9 0h7v4h-7V4zM4 13h7v7H4v-7zm9 6h7v4h-7v-4zm0-6h7v4h-7v-4z',
  'color-picker':
    'M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.23-1.21-1.42 1.42 1.21 1.23-7.96 7.96A3 3 0 0 0 5 18.59V20h1.41a3 3 0 0 0 2.12-.88l7.96-7.96 1.23 1.21 1.42-1.42-1.21-1.23 3.12-3.12a1 1 0 0 0 0-1.41zM8.41 18H7v-1.41l7.54-7.54 1.41 1.41L8.41 18z',
  annotations:
    'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7zM6 6h3v3H6V6zm9 0h3v3h-3V6zM6 15h3v3H6v-3zm9 0h3v3h-3v-3z',
  'align-left':
    'M3 5h18v2H3V5zm0 6h12v2H3v-2zm0 6h18v2H3v-2z',
  'align-center':
    'M3 5h18v2H3V5zm3 6h12v2H6v-2zm-3 6h18v2H3v-2z',
  'align-right':
    'M3 5h18v2H3V5zm6 6h12v2H9v-2zm-6 6h18v2H3v-2z',
  stickers:
    'M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.8 5.7 21l2.3-7-6-4.8h7.6L12 2zm0 4.2L10.7 10H6.9l3.1 2.5-1.2 3.6L12 14.2l3.2 1.9-1.2-3.6 3.1-2.5h-3.8L12 6.2z',
  emoji:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.2 7.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zm6.4 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM8.4 14.2c1.2 1.6 2.8 2.4 3.6 2.4s2.4-.8 3.6-2.4',
  rulers:
    'M3 4h18v3H3V4zm0 6h12v3H3v-3zm0 6h18v3H3v-3zM19 9h2v12h-2V9z',
  'persistence-export':
    'M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
  'persistence-load':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z',
  fit: 'M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z',
  'zoom-in':
    'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 7H9v2H7v1h2v2h1v-2h2V9h-2V7z',
  'zoom-out':
    'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7V9z',
  export:
    'M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z',
  'batch-export':
    'M5 20h14v-2H5v2zM9 4h2v8H9V4zm4 2h2v6h-2V6zm4 2h2v4h-2V8zM5 8h2v4H5V8z',
  duplicate:
    'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  delete:
    'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
};

/** Default icon keys for known toolbar action ids. */
export const DEFAULT_ACTION_ICON_KEYS: Readonly<Record<string, string>> = {
  'crop.tool': 'crop',
  'adjustments.tool': 'adjustments',
  'effects.tool': 'effects',
  'filters.tool': 'filters',
  'focus.tool': 'focus',
  'redact.tool': 'redact',
  'crop-mask.tool': 'crop-mask',
  'color-overlay.tool': 'color-overlay',
  'fill.tool': 'fill',
  'frame.tool': 'frame',
  'text.tool': 'text',
  'shapes.tool': 'shapes',
  'drawing.tool': 'drawing',
  'path.tool': 'path',
  'image-overlay.tool': 'image-overlay',
  'watermark.tool': 'watermark',
  'rulers.tool': 'rulers',
  'compare.original': 'compare',
  'history.panel': 'history',
  'layers.panel': 'layers',
  'templates.tool': 'templates',
  annotations: 'annotations',
  'stickers.tool': 'stickers',
  'emoji.tool': 'emoji',
  'persistence.export': 'persistence-export',
  'persistence.load': 'persistence-load',
  'transform.rotate-tool': 'rotate',
  'transform.rotate-cw': 'rotate',
  'transform.flip-h': 'flip-horizontal',
  'transform.flip-v': 'flip-vertical',
  'transform.resize-tool': 'resize',
  'transform.resize': 'resize',
  'viewport.fit': 'fit',
  'viewport.zoomIn': 'zoom-in',
  'viewport.zoomOut': 'zoom-out',
  'export.dialog': 'export',
  'batch-export.dialog': 'batch-export',
};

export function resolveToolbarIconPath(iconOrKey: string | undefined): string | null {
  if (!iconOrKey) {
    return null;
  }
  if (TOOLBAR_ICON_PATHS[iconOrKey]) {
    return TOOLBAR_ICON_PATHS[iconOrKey];
  }
  // Treat unknown values as raw SVG path data when they look like paths.
  if (iconOrKey.includes(' ') || iconOrKey.includes(',') || iconOrKey.startsWith('M')) {
    return iconOrKey;
  }
  return null;
}
