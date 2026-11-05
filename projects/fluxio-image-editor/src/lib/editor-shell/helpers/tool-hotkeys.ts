/**
 * Letter-key → toolbar/utilibar action id.
 * Unmodified keys only (no Ctrl/Cmd/Alt/Shift). Action must also be registered
 * on the session before the shortcut fires.
 */
export const TOOL_HOTKEYS: Readonly<Record<string, string>> = {
  c: 'crop.tool',
  r: 'transform.rotate-tool',
  d: 'transform.resize-tool',
  a: 'adjustments.tool',
  f: 'filters.tool',
  e: 'effects.tool',
  v: 'focus.tool',
  x: 'redact.tool',
  m: 'crop-mask.tool',
  o: 'color-overlay.tool',
  j: 'fill.tool',
  n: 'frame.tool',
  t: 'text.tool',
  s: 'shapes.tool',
  b: 'drawing.tool',
  p: 'path.tool',
  i: 'image-overlay.tool',
  g: 'stickers.tool',
  u: 'emoji.tool',
  y: 'templates.tool',
  w: 'watermark.tool',
  k: 'rulers.tool',
  h: 'history.panel',
  l: 'layers.panel',
};

/** Resolve a keyboard key to a tool action id, or `null` if unmapped. */
export function resolveToolHotkey(key: string): string | null {
  if (key.length !== 1) {
    return null;
  }
  return TOOL_HOTKEYS[key.toLowerCase()] ?? null;
}
