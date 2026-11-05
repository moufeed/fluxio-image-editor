/**
 * CSS custom properties that drive shell chrome under `.fluxio-image-editor`.
 * Prefer overriding these from host CSS when `theme: 'custom'` (or via `themeTokens`).
 */
export const EDITOR_THEME_CSS_VARS = [
  '--fluxio-bg',
  '--fluxio-bg-elevated',
  '--fluxio-bg-panel',
  '--fluxio-border',
  '--fluxio-border-strong',
  '--fluxio-text',
  '--fluxio-muted',
  '--fluxio-accent',
  '--fluxio-accent-hover',
  '--fluxio-accent-contrast',
  '--fluxio-danger',
  '--fluxio-warn',
  '--fluxio-ok',
  '--fluxio-control-bg',
  '--fluxio-control-border',
  '--fluxio-focus',
  '--fluxio-shadow',
  '--fluxio-shadow-soft',
  '--fluxio-radius',
  '--fluxio-radius-sm',
  '--fluxio-font',
  '--fluxio-canvas-a',
  '--fluxio-canvas-b',
  '--fluxio-range-track',
  '--fluxio-range-thumb',
  '--fluxio-range-thumb-border',
] as const;

export type EditorThemeCssVar = (typeof EDITOR_THEME_CSS_VARS)[number];

/** Host map of CSS variables → values for `theme: 'custom'`. Prefer `EDITOR_THEME_CSS_VARS` keys. */
export type EditorThemeTokens = Readonly<Partial<Record<EditorThemeCssVar, string>>> &
  Readonly<Readonly<Record<string, string | undefined>>>;
