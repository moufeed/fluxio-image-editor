/** Parsed RGBA color (channels 0–255 for RGB, 0–1 for alpha). */
export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const HEX3 = /^#([0-9a-f]{3})$/i;
const HEX4 = /^#([0-9a-f]{4})$/i;
const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX8 = /^#([0-9a-f]{8})$/i;
const RGB =
  /^rgba?\(\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*(?:,\s*([+-]?\d*\.?\d+%?)\s*)?\)$/i;

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function channelFromToken(token: string): number {
  const trimmed = token.trim();
  if (trimmed.endsWith('%')) {
    return clampByte((parseFloat(trimmed) / 100) * 255);
  }
  return clampByte(parseFloat(trimmed));
}

function alphaFromToken(token: string | undefined): number {
  if (token == null || token === '') {
    return 1;
  }
  const trimmed = token.trim();
  if (trimmed.endsWith('%')) {
    return clampUnit(parseFloat(trimmed) / 100);
  }
  return clampUnit(parseFloat(trimmed));
}

function hexNibble(ch: string): number {
  return parseInt(ch, 16);
}

/** Parse common CSS color strings into RGBA. Falls back when parsing fails. */
export function parseCssColor(value: string | null | undefined, fallback: RgbaColor): RgbaColor {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'none') {
    return fallback;
  }
  if (trimmed === 'transparent') {
    return { r: fallback.r, g: fallback.g, b: fallback.b, a: 0 };
  }

  let match = HEX8.exec(trimmed);
  if (match) {
    const h = match[1]!;
    return {
      r: hexNibble(h.slice(0, 2)),
      g: hexNibble(h.slice(2, 4)),
      b: hexNibble(h.slice(4, 6)),
      a: hexNibble(h.slice(6, 8)) / 255,
    };
  }

  match = HEX6.exec(trimmed);
  if (match) {
    const h = match[1]!;
    return {
      r: hexNibble(h.slice(0, 2)),
      g: hexNibble(h.slice(2, 4)),
      b: hexNibble(h.slice(4, 6)),
      a: 1,
    };
  }

  match = HEX4.exec(trimmed);
  if (match) {
    const h = match[1]!;
    return {
      r: hexNibble(h[0]!) * 17,
      g: hexNibble(h[1]!) * 17,
      b: hexNibble(h[2]!) * 17,
      a: hexNibble(h[3]!) / 15,
    };
  }

  match = HEX3.exec(trimmed);
  if (match) {
    const h = match[1]!;
    return {
      r: hexNibble(h[0]!) * 17,
      g: hexNibble(h[1]!) * 17,
      b: hexNibble(h[2]!) * 17,
      a: 1,
    };
  }

  match = RGB.exec(trimmed);
  if (match) {
    return {
      r: channelFromToken(match[1]!),
      g: channelFromToken(match[2]!),
      b: channelFromToken(match[3]!),
      a: alphaFromToken(match[4]),
    };
  }

  return fallback;
}

/** `#rrggbb` for native `<input type="color">`. */
export function toColorInputValue(color: RgbaColor): string {
  const hex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
}

export const DEFAULT_OPAQUE_WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
export const DEFAULT_OPAQUE_BLACK: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };
export const DEFAULT_OPAQUE_RED: RgbaColor = { r: 255, g: 59, b: 48, a: 1 };

/**
 * Opaque hex when alpha is ~1; otherwise `rgba(r,g,b,a)`.
 * Keeps RGB at a≈0 (does not collapse to `transparent`) so raising opacity restores the same hue.
 */
export function formatCssColor(color: RgbaColor): string {
  const r = clampByte(color.r);
  const g = clampByte(color.g);
  const b = clampByte(color.b);
  const a = clampUnit(color.a);
  if (a >= 0.999) {
    return toColorInputValue({ r, g, b, a: 1 });
  }
  const alpha = a <= 0.001 ? 0 : Math.round(a * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** True for `transparent`, empty/none, or parsed alpha ≈ 0. */
export function isCssColorTransparent(
  value: string | null | undefined,
  fallback: RgbaColor = DEFAULT_OPAQUE_WHITE,
): boolean {
  if (typeof value !== 'string') {
    return true;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'none' || trimmed === 'transparent') {
    return true;
  }
  return parseCssColor(value, fallback).a <= 0.001;
}

/** Replace RGB channels; keep existing alpha. */
export function withRgbHex(cssColor: string, hexRgb: string, fallback: RgbaColor): string {
  const current = parseCssColor(cssColor, fallback);
  const nextRgb = parseCssColor(hexRgb, current);
  return formatCssColor({ ...nextRgb, a: current.a });
}

/** Replace alpha (0–1); keep existing RGB. */
export function withAlpha(cssColor: string, alpha: number, fallback: RgbaColor): string {
  const current = parseCssColor(cssColor, fallback);
  return formatCssColor({ ...current, a: clampUnit(alpha) });
}

/** Alpha as 0–100 for range inputs. */
export function alphaPercent(cssColor: string, fallback: RgbaColor): number {
  return Math.round(parseCssColor(cssColor, fallback).a * 100);
}

/** HSL color (h in degrees 0–360, s/l in 0–1). */
export interface HslColor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** Convert RGB (0–255) to HSL. */
export function rgbToHsl(color: RgbaColor): HslColor {
  const r = clampByte(color.r) / 255;
  const g = clampByte(color.g) / 255;
  const b = clampByte(color.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
      break;
  }
  return { h, s, l };
}

/** Convert HSL to RGB (alpha preserved from caller when formatting). */
export function hslToRgb(hsl: HslColor): RgbaColor {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clampUnit(hsl.s);
  const l = clampUnit(hsl.l);
  if (s <= 0) {
    const v = clampByte(l * 255);
    return { r: v, g: v, b: v, a: 1 };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;
  const tr = hue2rgb(p, q, hk + 1 / 3);
  const tg = hue2rgb(p, q, hk);
  const tb = hue2rgb(p, q, hk - 1 / 3);
  return {
    r: clampByte(tr * 255),
    g: clampByte(tg * 255),
    b: clampByte(tb * 255),
    a: 1,
  };
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) {
    tt += 1;
  }
  if (tt > 1) {
    tt -= 1;
  }
  if (tt < 1 / 6) {
    return p + (q - p) * 6 * tt;
  }
  if (tt < 1 / 2) {
    return q;
  }
  if (tt < 2 / 3) {
    return p + (q - p) * (2 / 3 - tt) * 6;
  }
  return p;
}

export type ColorHarmonyScheme = 'complementary' | 'analogous' | 'triadic' | 'split';

/**
 * Suggest opaque `#rrggbb` harmony swatches for a base color.
 * Returns complementary (1), analogous (2), triadic (2), or split-complementary (2).
 */
export function harmonyColors(
  base: RgbaColor,
  scheme: ColorHarmonyScheme = 'analogous',
): readonly string[] {
  const hsl = rgbToHsl(base);
  const rotate = (deg: number) =>
    toColorInputValue(hslToRgb({ h: hsl.h + deg, s: Math.max(hsl.s, 0.35), l: hsl.l }));
  switch (scheme) {
    case 'complementary':
      return [rotate(180)];
    case 'triadic':
      return [rotate(120), rotate(240)];
    case 'split':
      return [rotate(150), rotate(210)];
    case 'analogous':
    default:
      return [rotate(-30), rotate(30)];
  }
}

/** All common harmony schemes for a base color (deduped opaque hex list). */
export function allHarmonyColors(base: RgbaColor): readonly string[] {
  const schemes: readonly ColorHarmonyScheme[] = ['complementary', 'analogous', 'triadic', 'split'];
  const out: string[] = [];
  const baseKey = toColorInputValue({ ...base, a: 1 });
  for (const scheme of schemes) {
    for (const color of harmonyColors(base, scheme)) {
      if (color.toLowerCase() === baseKey.toLowerCase()) {
        continue;
      }
      if (!out.some((item) => item.toLowerCase() === color.toLowerCase())) {
        out.push(color);
      }
    }
  }
  return out.slice(0, 6);
}

/** Max recent color swatches kept in the shell color fields. */
export const RECENT_COLORS_LIMIT = 8;

/** localStorage key for recent color history (shared across editor instances). */
export const RECENT_COLORS_STORAGE_KEY = 'fluxio-ie:recent-colors';

/**
 * Normalize a CSS color to opaque `#rrggbb` for recent-color history.
 * Returns `null` when the color is missing or fully transparent.
 */
export function normalizeRecentColorKey(
  cssColor: string | null | undefined,
  fallback: RgbaColor = DEFAULT_OPAQUE_WHITE,
): string | null {
  if (typeof cssColor !== 'string' || !cssColor.trim()) {
    return null;
  }
  const parsed = parseCssColor(cssColor, fallback);
  if (parsed.a <= 0.001) {
    return null;
  }
  return toColorInputValue(parsed);
}

/** Prepend `cssColor` into a recent list (deduped, capped). */
export function pushRecentColor(
  current: readonly string[],
  cssColor: string,
  limit: number = RECENT_COLORS_LIMIT,
  fallback: RgbaColor = DEFAULT_OPAQUE_WHITE,
): readonly string[] {
  const key = normalizeRecentColorKey(cssColor, fallback);
  if (!key) {
    return current;
  }
  const max = Math.max(1, Math.floor(limit));
  return [key, ...current.filter((item) => item !== key)].slice(0, max);
}

/** Read recent colors from storage; invalid / missing entries become `[]`. */
export function loadRecentColors(
  storage: Pick<Storage, 'getItem'> | null | undefined = safeLocalStorage(),
): readonly string[] {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(RECENT_COLORS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') {
        continue;
      }
      const key = normalizeRecentColorKey(item);
      if (key && !out.includes(key)) {
        out.push(key);
      }
      if (out.length >= RECENT_COLORS_LIMIT) {
        break;
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Persist recent colors (best-effort; ignores quota / private-mode failures). */
export function saveRecentColors(
  colors: readonly string[],
  storage: Pick<Storage, 'setItem'> | null | undefined = safeLocalStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    let next: readonly string[] = [];
    // `colors` is most-recent-first; rebuild by pushing oldest → newest.
    for (let i = colors.length - 1; i >= 0; i -= 1) {
      next = pushRecentColor(next, colors[i]!);
    }
    storage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures — history is progressive UX only.
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
