import { nanoid } from 'nanoid';

import { clampEmbeddedImageSrc } from './embedded-image-url';

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

export interface ImageSourceReference {
  readonly kind: 'url' | 'blob-url' | 'file' | 'element';
  readonly id: string;
  readonly url?: string;
  readonly name?: string;
  readonly mimeType?: string;
}

/** Crop geometry: axis-aligned rect, or ellipse inscribed in the AABB. */
export type CropShape = 'rect' | 'ellipse';

/**
 * Crop region in source-image pixel coordinates (pre-transform).
 * The AABB is always stored; when `shape` is `'ellipse'`, export clips to the inscribed ellipse.
 */
export interface CropState {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Locked aspect ratio (width/height), or null for free crop. */
  readonly aspectRatio: number | null;
  /** Default: `'rect'`. */
  readonly shape?: CropShape;
}

export function resolveCropShape(crop: CropState | null | undefined): CropShape {
  return crop?.shape === 'ellipse' ? 'ellipse' : 'rect';
}

export function isEllipticalCrop(crop: CropState | null | undefined): boolean {
  return resolveCropShape(crop) === 'ellipse';
}

export interface TransformState {
  readonly rotationDegrees: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
}

/**
 * Finetune / adjustments values (renderer-neutral).
 * Ranges: brightness/contrast/hue/saturation/value/warmth/exposure/gamma ∈ [-1, 1];
 * blur/sharpen/vignette/clarity ∈ [0, 1].
 */
export interface AdjustmentsState {
  readonly brightness: number;
  readonly contrast: number;
  readonly hue: number;
  readonly saturation: number;
  readonly value: number;
  readonly warmth: number;
  readonly blur: number;
  /** Phase 4.8.4: EV-like gain (multiplicative), distinct from brightness offset. */
  readonly exposure: number;
  /** Phase 4.8.4: unsharp-mask style amount via convolution. */
  readonly sharpen: number;
  /** Midtone power curve (−1 darker midtones, +1 brighter). Identity at 0. */
  readonly gamma: number;
  /** Edge darkening amount (0 = none). */
  readonly vignette: number;
  /** Local midtone contrast / mild unsharp (0 = none). */
  readonly clarity: number;
}

/**
 * Raster effects (renderer-neutral).
 * `0` disables each channel. Non-zero values are normalized intensities in [0, 1]
 * (mapped to threshold cutoff, posterize levels, pixel block size, or noise amount in the adapter).
 */
export interface EffectsState {
  readonly threshold: number;
  readonly posterize: number;
  readonly pixelate: number;
  readonly noise: number;
}

/**
 * Rectangular redaction region (normalized 0–1 relative to output).
 * Scrambled at compose time so censored pixels are not recoverable from export.
 */
export interface RedactionRegion {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Focus/depth-of-field mode. */
export type FocusMode = 'none' | 'radial' | 'linear';

/**
 * Selective blur state (renderer-neutral).
 * Coordinates are normalized [0, 1] relative to output dimensions.
 */
export interface FocusState {
  readonly mode: FocusMode;
  /** Focus center X, normalized 0–1 (left → right). */
  readonly centerX: number;
  /** Focus center Y, normalized 0–1 (top → bottom). */
  readonly centerY: number;
  /** Blur intensity for out-of-focus regions, 0–1. */
  readonly blur: number;
  /** Radius of the in-focus region (radial) or band half-width (linear), 0–1. */
  readonly size: number;
  /** Gradient falloff width, 0–1 (0 = hard edge, 1 = full fade). */
  readonly feather: number;
  /** Tilt-shift band angle in degrees (linear mode only, 0 = horizontal). */
  readonly angle: number;
}

/** Shape presets for output clipping (transparent outside). */
export type CropMaskShapeId =
  | 'none'
  | 'circle'
  | 'rounded-rect'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'star'
  | 'heart'
  /** Host gallery SVG path (`customPath` in viewBox 0 0 1 1). */
  | 'custom';

/**
 * Shape-based output mask (renderer-neutral).
 * Applied to the photo stack before annotations (annotations stay unclipped).
 */
export interface CropMaskState {
  readonly shape: CropMaskShapeId;
  /** Mask center X, normalized 0–1 (left → right). Default 0.5 = image center. */
  readonly centerX: number;
  /** Mask center Y, normalized 0–1 (top → bottom). Default 0.5 = image center. */
  readonly centerY: number;
  /** Inset from edges, 0–1 (0 = full frame). */
  readonly inset: number;
  /** Rounded-rect corner radius, 0–1 relative to half of min edge after inset. */
  readonly cornerRadius: number;
  /** Soft edge feather, 0–1 (0 = hard edge). */
  readonly feather: number;
  /** Mask rotation in degrees. */
  readonly angle: number;
  /**
   * SVG path `d` in a unit square (0–1). Used when `shape === 'custom'`.
   * Host gallery items supply this; empty disables the custom shape.
   */
  readonly customPath?: string;
}

/** Decorative frame / border style presets. */
export type FrameStyleId =
  | 'none'
  | 'solid'
  | 'double'
  | 'rounded'
  | 'gradient'
  | 'polaroid'
  | 'film'
  /** Host gallery image / SVG overlay. */
  | 'image';

/**
 * Photo frame / border state (renderer-neutral).
 * Drawn as an inward overlay; does not change output size.
 */
export interface FrameState {
  readonly style: FrameStyleId;
  /** Border thickness relative to min(w,h), 0–0.25. */
  readonly thickness: number;
  /** Primary color (#rrggbb or css). */
  readonly color: string;
  /** Secondary / accent color (gradient, double inner). */
  readonly color2: string;
  /** 0–1 */
  readonly opacity: number;
  /** Rounded style corner radius, 0–1. */
  readonly cornerRadius: number;
  /** Image/SVG URL when `style === 'image'` (same-origin, data URL, or CORS). */
  readonly imageSrc?: string;
}

/** Full-canvas color wash / gradient overlay modes. */
export type ColorOverlayMode = 'none' | 'solid' | 'linear' | 'radial' | 'angular';

/**
 * Solid or gradient color overlay over the composed image (renderer-neutral).
 * Applied after focus FX and before annotations; does not change output size.
 */
export interface ColorOverlayState {
  readonly mode: ColorOverlayMode;
  /** Primary / start color (#rrggbb or css). */
  readonly color: string;
  /** End / accent color for gradients. */
  readonly color2: string;
  /** 0–1 */
  readonly opacity: number;
  /** Linear / angular direction in degrees (0 = left→right). */
  readonly angle: number;
}

/**
 * Fill transparent pixels behind the photo (Pintura Fill plugin parity / PV25).
 * Drawn with `destination-over` after the photo stack (and crop-mask), before annotations.
 */
export type FillMode = 'none' | 'solid' | 'image';

export interface FillState {
  readonly mode: FillMode;
  /** Solid fill color (css / #rrggbb / #rrggbbaa). */
  readonly color: string;
  /** 0–1 opacity multiplier for solid / image fill. */
  readonly opacity: number;
  /** Background image URL when `mode === 'image'`. */
  readonly imageSrc: string;
}

/** Built-in named color-look presets (Fabric Filters-style). */
export type BuiltinFilterPresetId =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'blackWhite'
  | 'brownie'
  | 'vintage'
  | 'kodachrome'
  | 'technicolor'
  | 'polaroid';

/**
 * Filter preset id: built-in or host-registered via `config.filters.filterFunctions`.
 * Custom ids must match `/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/`.
 */
export type FilterPresetId = BuiltinFilterPresetId | (string & {});

export interface FiltersState {
  readonly preset: FilterPresetId;
}

/** Corner / center placement for watermarks (Phase 4.6). */
export type WatermarkPosition =
  'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type WatermarkMode = 'none' | 'text' | 'image';

/**
 * Single document watermark (renderer-neutral).
 * Distinct from freeform annotations — one text or image mark with position/opacity/scale.
 * When `x`/`y` are finite, they override `position` for absolute placement (UX-I3).
 * Presets remain placement shortcuts that clear custom coordinates.
 */
export interface WatermarkState {
  readonly mode: WatermarkMode;
  readonly position: WatermarkPosition;
  /**
   * Absolute top-left in output pixels when set.
   * `null` = use `position` preset via {@link resolveWatermarkOrigin}.
   */
  readonly x: number | null;
  readonly y: number | null;
  /** 0–1 */
  readonly opacity: number;
  /** Relative size multiplier (minimum 0.1; no upper cap). */
  readonly scale: number;
  /** Clockwise rotation around the mark centre, `0–359` degrees. */
  readonly angle: number;
  readonly text: string;
  readonly fill: string;
  readonly fontFamily: string;
  /** URL or data URL when `mode === 'image'`. */
  readonly imageSrc: string;
}

/**
 * Annotation objects in **output** pixel space (after crop/transform/scale).
 * Plain domain state — never Fabric serialization (R20).
 */
export type AnnotationKind =
  'text' | 'rect' | 'ellipse' | 'polygon' | 'line' | 'arrow' | 'path' | 'image';

/**
 * Canvas 2D blend modes supported for annotation compositing.
 * `'normal'` maps to `source-over` at draw time.
 */
export type AnnotationBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export const ANNOTATION_BLEND_MODES: readonly AnnotationBlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
] as const;

/**
 * Shared layer chrome fields on every annotation kind.
 * Persist on `Annotation` (not `pluginState`) so export/preview/undo stay consistent.
 */
export interface AnnotationLayerProps {
  /** Layer opacity (0–1). Multiplies color alpha at draw time. Defaults to 1. */
  readonly opacity?: number;
  /** When false, skip draw + canvas hit-test. Defaults to true. */
  readonly visible?: boolean;
  /** When true, block transform / reorder / delete / restyle. Defaults to false. */
  readonly locked?: boolean;
  /** Compositing blend mode. Defaults to `'normal'`. */
  readonly blendMode?: AnnotationBlendMode;
  /** Optional custom display name for the layers panel. */
  readonly name?: string;
  /** Flat folder id shared by contiguous group members. */
  readonly groupId?: string;
  /** Display name for the folder (mirrored on every member). */
  readonly groupName?: string;
}

export interface AnnotationPoint {
  readonly x: number;
  readonly y: number;
}

export type TextFontStyle = 'normal' | 'italic';
export type TextFontWeight = 'normal' | 'bold';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  /** Text content; may contain `\n` for multi-line text (Pintura-style). */
  readonly text: string;
  readonly fontSize: number;
  readonly fill: string;
  readonly fontFamily: string;
  readonly angle: number;
  readonly fontStyle: TextFontStyle;
  readonly fontWeight: TextFontWeight;
  /** Draw a line under each text line. */
  readonly underline: boolean;
  /** Draw a strikethrough (line-through) across each text line. */
  readonly linethrough: boolean;
  readonly textAlign: TextAlign;
  /** Line-height multiplier relative to `fontSize` (typical 1–2). */
  readonly lineHeight: number;
  /**
   * Layout box width (content units, excluding padding) used for `textAlign`.
   * `0` hugs measured content — alignment only affects unequal multi-line widths.
   */
  readonly boxWidth: number;
  /** Highlight box color behind the text, or `'transparent'` for none. */
  readonly backgroundColor: string;
  /** Padding around the text inside the highlight box (only drawn with a background). */
  readonly padding: number;
}

export interface RectAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'rect';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly fill: string;
  readonly angle: number;
}

export interface EllipseAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'ellipse';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly fill: string;
  readonly angle: number;
}

export interface PolygonAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'polygon';
  readonly points: readonly AnnotationPoint[];
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly fill: string;
}

/** Decorative marker at a line/arrow endpoint (Pintura-compatible). */
export type LineEndStyle =
  'none' | 'bar' | 'arrow' | 'arrowSolid' | 'circle' | 'circleSolid' | 'square' | 'squareSolid';

export const LINE_END_STYLES: readonly LineEndStyle[] = [
  'none',
  'bar',
  'arrow',
  'arrowSolid',
  'circle',
  'circleSolid',
  'square',
  'squareSolid',
] as const;

export interface LineAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'line' | 'arrow';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  /** Marker at (x1, y1). */
  readonly lineStart: LineEndStyle;
  /** Marker at (x2, y2). */
  readonly lineEnd: LineEndStyle;
}

/** Freehand stroke or click-placed polyline (Phase 4.5 / path tool). */
export interface PathAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'path';
  readonly points: readonly AnnotationPoint[];
  readonly stroke: string;
  readonly strokeWidth: number;
  /**
   * When true, the path is closed (last segment connects to the first point).
   * Used by the Path tool; freehand Draw strokes stay open.
   */
  readonly closed?: boolean;
}

/** Image overlay in output space (Phase 4.5). `src` is a URL or data URL. */
export interface ImageAnnotation extends AnnotationLayerProps {
  readonly id: string;
  readonly kind: 'image';
  readonly src: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Layer opacity (0–1). */
  readonly opacity: number;
  readonly angle: number;
}

export type ShapeAnnotation =
  RectAnnotation | EllipseAnnotation | PolygonAnnotation | LineAnnotation;

export type Annotation = TextAnnotation | ShapeAnnotation | PathAnnotation | ImageAnnotation;

const SHAPE_KINDS = new Set<AnnotationKind>(['rect', 'ellipse', 'polygon', 'line', 'arrow']);

export interface OutputState {
  readonly width: number;
  readonly height: number;
}

/**
 * Placement of the oriented base photo inside `output` (document pixels).
 * When locked (default), the photo is non-interactive; unlock to move/resize on canvas.
 * Gaps inside `output` are transparent in compose/export (checkerboard is preview-only).
 */
export interface DesignImageState {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Placement rotation in degrees (unlocked canvas rotate handle). */
  readonly angle: number;
  readonly locked: boolean;
  /** When false, skip drawing the base photo plate. Defaults to true. */
  readonly visible?: boolean;
}

export interface ImageDocument {
  readonly schemaVersion: 1;
  readonly source: ImageSourceReference;
  readonly sourceSize: ImageSize;
  readonly crop: CropState | null;
  readonly transform: TransformState;
  readonly adjustments: AdjustmentsState;
  readonly effects: EffectsState;
  readonly filters: FiltersState;
  readonly focus: FocusState;
  /** Secure censor rectangles (baked into the photo stack before annotations). */
  readonly redactions: readonly RedactionRegion[];
  readonly cropMask: CropMaskState;
  readonly colorOverlay: ColorOverlayState;
  /**
   * Transparent-pixel fill behind the photo (PV25).
   * Optional on older documents — normalize to identity when missing.
   */
  readonly fill: FillState;
  readonly frame: FrameState;
  readonly watermark: WatermarkState;
  readonly annotations: readonly Annotation[];
  /** Base photo placement in output space. Defaults to fill + locked. */
  readonly designImage: DesignImageState;
  readonly output: OutputState;
  readonly pluginState: Readonly<Record<string, unknown>>;
}

export function createInitialTransform(): TransformState {
  return {
    rotationDegrees: 0,
    flipX: false,
    flipY: false,
  };
}

/** Default placement: fill the output frame and keep the photo locked. */
export function createInitialDesignImage(output: ImageSize): DesignImageState {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.round(output.width)),
    height: Math.max(1, Math.round(output.height)),
    angle: 0,
    locked: true,
    visible: true,
  };
}

const MIN_DESIGN_IMAGE_SIZE = 8;

function normalizeDesignImageAngle(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  let next = value % 360;
  if (next < 0) {
    next += 360;
  }
  return Math.round(next * 1000) / 1000;
}

/** Clamp / round design-image placement; missing fields fall back to fill + locked. */
export function normalizeDesignImage(
  partial: Partial<DesignImageState> | null | undefined,
  output: ImageSize,
): DesignImageState {
  const base = createInitialDesignImage(output);
  if (!partial) {
    return base;
  }
  const width = Math.max(
    MIN_DESIGN_IMAGE_SIZE,
    Math.round(Number.isFinite(partial.width) ? (partial.width as number) : base.width),
  );
  const height = Math.max(
    MIN_DESIGN_IMAGE_SIZE,
    Math.round(Number.isFinite(partial.height) ? (partial.height as number) : base.height),
  );
  const x = Math.round(Number.isFinite(partial.x) ? (partial.x as number) : base.x);
  const y = Math.round(Number.isFinite(partial.y) ? (partial.y as number) : base.y);
  return {
    x,
    y,
    width,
    height,
    angle: normalizeDesignImageAngle(partial.angle === undefined ? base.angle : partial.angle),
    locked: partial.locked === undefined ? base.locked : !!partial.locked,
    visible: partial.visible === undefined ? base.visible !== false : !!partial.visible,
  };
}

/** Resolve placement from a document (fills output when absent/legacy). */
export function resolveDesignImage(document: ReadonlyImageDocument): DesignImageState {
  return normalizeDesignImage(document.designImage, document.output);
}

export function designImagesEqual(
  left: DesignImageState | null | undefined,
  right: DesignImageState | null | undefined,
  output: ImageSize,
): boolean {
  const a = normalizeDesignImage(left, output);
  const b = normalizeDesignImage(right, output);
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.angle === b.angle &&
    a.locked === b.locked &&
    (a.visible !== false) === (b.visible !== false)
  );
}

export function createInitialAdjustments(): AdjustmentsState {
  return {
    brightness: 0,
    contrast: 0,
    hue: 0,
    saturation: 0,
    value: 0,
    warmth: 0,
    blur: 0,
    exposure: 0,
    sharpen: 0,
    gamma: 0,
    vignette: 0,
    clarity: 0,
  };
}

function clampUnit(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(min, value));
}

/** Clamp and round adjustment values for stable document equality. */
export function normalizeAdjustments(
  partial: Partial<AdjustmentsState> | null | undefined,
): AdjustmentsState {
  const base = createInitialAdjustments();
  if (!partial) {
    return base;
  }
  return {
    brightness: clampUnit(partial.brightness ?? base.brightness, -1, 1),
    contrast: clampUnit(partial.contrast ?? base.contrast, -1, 1),
    hue: clampUnit(partial.hue ?? base.hue, -1, 1),
    saturation: clampUnit(partial.saturation ?? base.saturation, -1, 1),
    value: clampUnit(partial.value ?? base.value, -1, 1),
    warmth: clampUnit(partial.warmth ?? base.warmth, -1, 1),
    blur: clampUnit(partial.blur ?? base.blur, 0, 1),
    exposure: clampUnit(partial.exposure ?? base.exposure, -1, 1),
    sharpen: clampUnit(partial.sharpen ?? base.sharpen, 0, 1),
    gamma: clampUnit(partial.gamma ?? base.gamma, -1, 1),
    vignette: clampUnit(partial.vignette ?? base.vignette, 0, 1),
    clarity: clampUnit(partial.clarity ?? base.clarity, 0, 1),
  };
}

export function isIdentityAdjustments(adjustments: AdjustmentsState | null | undefined): boolean {
  if (!adjustments) {
    return true;
  }
  return (
    adjustments.brightness === 0 &&
    adjustments.contrast === 0 &&
    adjustments.hue === 0 &&
    adjustments.saturation === 0 &&
    adjustments.value === 0 &&
    adjustments.warmth === 0 &&
    adjustments.blur === 0 &&
    adjustments.exposure === 0 &&
    adjustments.sharpen === 0 &&
    adjustments.gamma === 0 &&
    adjustments.vignette === 0 &&
    adjustments.clarity === 0
  );
}

export function adjustmentsEqual(
  a: AdjustmentsState | null | undefined,
  b: AdjustmentsState | null | undefined,
): boolean {
  const left = normalizeAdjustments(a);
  const right = normalizeAdjustments(b);
  return (
    left.brightness === right.brightness &&
    left.contrast === right.contrast &&
    left.hue === right.hue &&
    left.saturation === right.saturation &&
    left.value === right.value &&
    left.warmth === right.warmth &&
    left.blur === right.blur &&
    left.exposure === right.exposure &&
    left.sharpen === right.sharpen &&
    left.gamma === right.gamma &&
    left.vignette === right.vignette &&
    left.clarity === right.clarity
  );
}

export function createInitialEffects(): EffectsState {
  return {
    threshold: 0,
    posterize: 0,
    pixelate: 0,
    noise: 0,
  };
}

export function normalizeEffects(partial: Partial<EffectsState> | null | undefined): EffectsState {
  const base = createInitialEffects();
  if (!partial) {
    return base;
  }
  return {
    threshold: clampUnit(partial.threshold ?? base.threshold, 0, 1),
    posterize: clampUnit(partial.posterize ?? base.posterize, 0, 1),
    pixelate: clampUnit(partial.pixelate ?? base.pixelate, 0, 1),
    noise: clampUnit(partial.noise ?? base.noise, 0, 1),
  };
}

export function isIdentityEffects(effects: EffectsState | null | undefined): boolean {
  if (!effects) {
    return true;
  }
  return (
    effects.threshold === 0 &&
    effects.posterize === 0 &&
    effects.pixelate === 0 &&
    effects.noise === 0
  );
}

export function effectsEqual(
  a: EffectsState | null | undefined,
  b: EffectsState | null | undefined,
): boolean {
  const left = normalizeEffects(a);
  const right = normalizeEffects(b);
  return (
    left.threshold === right.threshold &&
    left.posterize === right.posterize &&
    left.pixelate === right.pixelate &&
    left.noise === right.noise
  );
}

export function createInitialRedactions(): readonly RedactionRegion[] {
  return [];
}

/** Clamp redaction rects to output-normalized space; drop degenerate regions. */
export function normalizeRedactions(
  regions: readonly Partial<RedactionRegion>[] | null | undefined,
): readonly RedactionRegion[] {
  if (!regions?.length) {
    return createInitialRedactions();
  }
  const out: RedactionRegion[] = [];
  for (const raw of regions) {
    if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) {
      continue;
    }
    const x = clampUnit(Number(raw.x), 0, 1);
    const y = clampUnit(Number(raw.y), 0, 1);
    const width = clampUnit(Number(raw.width), 0, 1);
    const height = clampUnit(Number(raw.height), 0, 1);
    if (width < 0.001 || height < 0.001) {
      continue;
    }
    const maxW = Math.max(0, 1 - x);
    const maxH = Math.max(0, 1 - y);
    out.push({
      id: raw.id.trim(),
      x,
      y,
      width: Math.min(width, maxW),
      height: Math.min(height, maxH),
    });
  }
  return out;
}

export function isIdentityRedactions(
  regions: readonly RedactionRegion[] | null | undefined,
): boolean {
  return !regions || regions.length === 0;
}

export function redactionsEqual(
  a: readonly RedactionRegion[] | null | undefined,
  b: readonly RedactionRegion[] | null | undefined,
): boolean {
  const left = normalizeRedactions(a);
  const right = normalizeRedactions(b);
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    const L = left[i]!;
    const R = right[i]!;
    if (
      L.id !== R.id ||
      L.x !== R.x ||
      L.y !== R.y ||
      L.width !== R.width ||
      L.height !== R.height
    ) {
      return false;
    }
  }
  return true;
}

export function createInitialFocus(): FocusState {
  return {
    mode: 'none',
    centerX: 0.5,
    centerY: 0.5,
    blur: 0.5,
    size: 0.3,
    feather: 0.4,
    angle: 0,
  };
}

const FOCUS_MODES: ReadonlySet<FocusMode> = new Set(['none', 'radial', 'linear']);

/** Clamp and validate focus values for stable document equality. */
export function normalizeFocus(partial: Partial<FocusState> | null | undefined): FocusState {
  const base = createInitialFocus();
  if (!partial) {
    return base;
  }
  const modeRaw = partial.mode ?? base.mode;
  const mode: FocusMode = FOCUS_MODES.has(modeRaw as FocusMode) ? (modeRaw as FocusMode) : 'none';
  return {
    mode,
    centerX: clampUnit(partial.centerX ?? base.centerX, 0, 1),
    centerY: clampUnit(partial.centerY ?? base.centerY, 0, 1),
    blur: clampUnit(partial.blur ?? base.blur, 0, 1),
    size: clampUnit(partial.size ?? base.size, 0, 1),
    feather: clampUnit(partial.feather ?? base.feather, 0, 1),
    angle: clampUnit(partial.angle ?? base.angle, -180, 180),
  };
}

export function isIdentityFocus(focus: FocusState | null | undefined): boolean {
  if (!focus) {
    return true;
  }
  return focus.mode === 'none';
}

export function focusEqual(
  a: FocusState | null | undefined,
  b: FocusState | null | undefined,
): boolean {
  const left = normalizeFocus(a);
  const right = normalizeFocus(b);
  return (
    left.mode === right.mode &&
    left.centerX === right.centerX &&
    left.centerY === right.centerY &&
    left.blur === right.blur &&
    left.size === right.size &&
    left.feather === right.feather &&
    left.angle === right.angle
  );
}

export const CROP_MASK_SHAPES: readonly CropMaskShapeId[] = [
  'none',
  'circle',
  'rounded-rect',
  'triangle',
  'diamond',
  'hexagon',
  'star',
  'heart',
  'custom',
] as const;

const CROP_MASK_SHAPE_SET: ReadonlySet<CropMaskShapeId> = new Set(CROP_MASK_SHAPES);

export function createInitialCropMask(): CropMaskState {
  return {
    shape: 'none',
    centerX: 0.5,
    centerY: 0.5,
    inset: 0,
    cornerRadius: 0.2,
    feather: 0,
    angle: 0,
    customPath: '',
  };
}

/** Clamp and validate crop-mask values for stable document equality. */
export function normalizeCropMask(
  partial: Partial<CropMaskState> | null | undefined,
): CropMaskState {
  const base = createInitialCropMask();
  if (!partial) {
    return base;
  }
  const shapeRaw = partial.shape ?? base.shape;
  let shape: CropMaskShapeId = CROP_MASK_SHAPE_SET.has(shapeRaw as CropMaskShapeId)
    ? (shapeRaw as CropMaskShapeId)
    : 'none';
  const customPath =
    typeof partial.customPath === 'string' ? partial.customPath.trim() : (base.customPath ?? '');
  if (shape === 'custom' && !customPath) {
    shape = 'none';
  }
  return {
    shape,
    centerX: clampUnit(partial.centerX ?? base.centerX, 0, 1),
    centerY: clampUnit(partial.centerY ?? base.centerY, 0, 1),
    inset: clampUnit(partial.inset ?? base.inset, 0, 0.45),
    cornerRadius: clampUnit(partial.cornerRadius ?? base.cornerRadius, 0, 1),
    feather: clampUnit(partial.feather ?? base.feather, 0, 1),
    angle: clampUnit(partial.angle ?? base.angle, -180, 180),
    customPath,
  };
}

export function isIdentityCropMask(mask: CropMaskState | null | undefined): boolean {
  if (!mask) {
    return true;
  }
  return normalizeCropMask(mask).shape === 'none';
}

export function cropMaskEqual(
  a: CropMaskState | null | undefined,
  b: CropMaskState | null | undefined,
): boolean {
  const left = normalizeCropMask(a);
  const right = normalizeCropMask(b);
  return (
    left.shape === right.shape &&
    left.centerX === right.centerX &&
    left.centerY === right.centerY &&
    left.inset === right.inset &&
    left.cornerRadius === right.cornerRadius &&
    left.feather === right.feather &&
    left.angle === right.angle &&
    (left.customPath ?? '') === (right.customPath ?? '')
  );
}

export const FRAME_STYLES: readonly FrameStyleId[] = [
  'none',
  'solid',
  'double',
  'rounded',
  'gradient',
  'polaroid',
  'film',
  'image',
] as const;

const FRAME_STYLE_SET: ReadonlySet<FrameStyleId> = new Set(FRAME_STYLES);

export function createInitialFrame(): FrameState {
  return {
    style: 'none',
    thickness: 0.04,
    color: '#ffffff',
    color2: '#111111',
    opacity: 1,
    cornerRadius: 0.15,
    imageSrc: '',
  };
}

/** Clamp and validate frame values for stable document equality. */
export function normalizeFrame(partial: Partial<FrameState> | null | undefined): FrameState {
  const base = createInitialFrame();
  if (!partial) {
    return base;
  }
  const styleRaw = partial.style ?? base.style;
  let style: FrameStyleId = FRAME_STYLE_SET.has(styleRaw as FrameStyleId)
    ? (styleRaw as FrameStyleId)
    : 'none';
  const imageSrc =
    typeof partial.imageSrc === 'string' ? partial.imageSrc.trim() : (base.imageSrc ?? '');
  if (style === 'image' && !imageSrc) {
    style = 'none';
  }
  return {
    style,
    thickness: clampUnit(partial.thickness ?? base.thickness, 0.005, 0.25),
    color: normalizeColor(partial.color, base.color),
    color2: normalizeColor(partial.color2, base.color2),
    opacity: clampUnit(partial.opacity ?? base.opacity, 0, 1),
    cornerRadius: clampUnit(partial.cornerRadius ?? base.cornerRadius, 0, 1),
    imageSrc,
  };
}

export function isIdentityFrame(frame: FrameState | null | undefined): boolean {
  if (!frame) {
    return true;
  }
  return normalizeFrame(frame).style === 'none';
}

export function frameEqual(
  a: FrameState | null | undefined,
  b: FrameState | null | undefined,
): boolean {
  const left = normalizeFrame(a);
  const right = normalizeFrame(b);
  return (
    left.style === right.style &&
    left.thickness === right.thickness &&
    left.color === right.color &&
    left.color2 === right.color2 &&
    left.opacity === right.opacity &&
    left.cornerRadius === right.cornerRadius &&
    (left.imageSrc ?? '') === (right.imageSrc ?? '')
  );
}

export const COLOR_OVERLAY_MODES: readonly ColorOverlayMode[] = [
  'none',
  'solid',
  'linear',
  'radial',
  'angular',
] as const;

const COLOR_OVERLAY_MODE_SET: ReadonlySet<ColorOverlayMode> = new Set(COLOR_OVERLAY_MODES);

export function createInitialColorOverlay(): ColorOverlayState {
  return {
    mode: 'none',
    color: '#000000',
    color2: '#ff6b35',
    opacity: 0.4,
    angle: 45,
  };
}

/** Clamp and validate color-overlay values for stable document equality. */
export function normalizeColorOverlay(
  partial: Partial<ColorOverlayState> | null | undefined,
): ColorOverlayState {
  const base = createInitialColorOverlay();
  if (!partial) {
    return base;
  }
  const modeRaw = partial.mode ?? base.mode;
  const mode: ColorOverlayMode = COLOR_OVERLAY_MODE_SET.has(modeRaw as ColorOverlayMode)
    ? (modeRaw as ColorOverlayMode)
    : 'none';
  const angleRaw = partial.angle ?? base.angle;
  const angle = Number.isFinite(angleRaw) ? ((angleRaw % 360) + 360) % 360 : base.angle;
  return {
    mode,
    color: normalizeColor(partial.color, base.color),
    color2: normalizeColor(partial.color2, base.color2),
    opacity: clampUnit(partial.opacity ?? base.opacity, 0, 1),
    angle,
  };
}

export function isIdentityColorOverlay(overlay: ColorOverlayState | null | undefined): boolean {
  if (!overlay) {
    return true;
  }
  return normalizeColorOverlay(overlay).mode === 'none';
}

export function colorOverlayEqual(
  a: ColorOverlayState | null | undefined,
  b: ColorOverlayState | null | undefined,
): boolean {
  const left = normalizeColorOverlay(a);
  const right = normalizeColorOverlay(b);
  return (
    left.mode === right.mode &&
    left.color === right.color &&
    left.color2 === right.color2 &&
    left.opacity === right.opacity &&
    left.angle === right.angle
  );
}

export const FILL_MODES: readonly FillMode[] = ['none', 'solid', 'image'] as const;

const FILL_MODE_SET: ReadonlySet<FillMode> = new Set(FILL_MODES);

/** Built-in solid swatches for the Fill (background) panel. */
export const DEFAULT_FILL_COLORS: readonly string[] = [
  '#ffffff',
  '#000000',
  '#f5f5f5',
  '#e8e8e8',
  '#ff3b30',
  '#007aff',
  '#34c759',
  '#ffcc00',
] as const;

export function createInitialFill(): FillState {
  return {
    mode: 'none',
    color: '#ffffff',
    opacity: 1,
    imageSrc: '',
  };
}

export function normalizeFill(partial: Partial<FillState> | null | undefined): FillState {
  const base = createInitialFill();
  if (!partial) {
    return base;
  }
  const modeRaw = partial.mode ?? base.mode;
  const mode: FillMode = FILL_MODE_SET.has(modeRaw as FillMode) ? (modeRaw as FillMode) : 'none';
  const imageSrc = typeof partial.imageSrc === 'string' ? partial.imageSrc.trim() : base.imageSrc;
  return {
    // Keep `image` with empty src for draft UI (picker / gallery); commit coerces via applyFill.
    mode,
    color: normalizeColor(partial.color, base.color),
    opacity: clampUnit(partial.opacity ?? base.opacity, 0, 1),
    imageSrc,
  };
}

export function isIdentityFill(fill: FillState | null | undefined): boolean {
  if (!fill) {
    return true;
  }
  const normalized = normalizeFill(fill);
  if (normalized.mode === 'none' || normalized.opacity <= 0) {
    return true;
  }
  // Image mode without a source is not a committed fill.
  return normalized.mode === 'image' && !normalized.imageSrc;
}

export function fillEqual(
  a: FillState | null | undefined,
  b: FillState | null | undefined,
): boolean {
  const left = normalizeFill(a);
  const right = normalizeFill(b);
  return (
    left.mode === right.mode &&
    left.color === right.color &&
    left.opacity === right.opacity &&
    left.imageSrc === right.imageSrc
  );
}

export const DEFAULT_FILTER_PRESETS: readonly BuiltinFilterPresetId[] = [
  'none',
  'grayscale',
  'sepia',
  'invert',
  'blackWhite',
  'brownie',
  'vintage',
  'kodachrome',
  'technicolor',
  'polaroid',
] as const;

/** Safe filter preset id pattern (built-in + host registry keys). */
const FILTER_PRESET_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

export function createInitialFilters(): FiltersState {
  return { preset: 'none' };
}

export function normalizeFilters(
  partial: Partial<FiltersState> | FilterPresetId | null | undefined,
): FiltersState {
  if (partial == null) {
    return createInitialFilters();
  }
  if (typeof partial === 'string') {
    return { preset: isFilterPresetId(partial) ? partial : 'none' };
  }
  const preset = partial.preset;
  return { preset: isFilterPresetId(preset) ? preset : 'none' };
}

export function isBuiltinFilterPresetId(value: unknown): value is BuiltinFilterPresetId {
  return typeof value === 'string' && (DEFAULT_FILTER_PRESETS as readonly string[]).includes(value);
}

/** True for built-in or host-safe custom preset ids. */
export function isFilterPresetId(value: unknown): value is FilterPresetId {
  return typeof value === 'string' && FILTER_PRESET_ID_PATTERN.test(value);
}

export function isIdentityFilters(filters: FiltersState | null | undefined): boolean {
  return normalizeFilters(filters).preset === 'none';
}

export function filtersEqual(
  a: FiltersState | null | undefined,
  b: FiltersState | null | undefined,
): boolean {
  return normalizeFilters(a).preset === normalizeFilters(b).preset;
}

const WATERMARK_POSITIONS = new Set<WatermarkPosition>([
  'center',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

export function createInitialWatermark(): WatermarkState {
  return {
    mode: 'none',
    position: 'bottom-right',
    x: null,
    y: null,
    opacity: 0.55,
    scale: 1,
    angle: 0,
    text: 'Watermark',
    fill: '#ffffff',
    fontFamily: 'sans-serif',
    imageSrc: '',
  };
}

/** Wrap a rotation into `[0, 360)` so inspector fields stay in one range. */
function wrapDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return ((value % 360) + 360) % 360;
}

function normalizeOptionalCoord(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

export function normalizeWatermark(partial?: Partial<WatermarkState> | null): WatermarkState {
  const base = createInitialWatermark();
  if (!partial) {
    return base;
  }
  const mode =
    partial.mode === 'text' || partial.mode === 'image' || partial.mode === 'none'
      ? partial.mode
      : base.mode;
  const position =
    partial.position && WATERMARK_POSITIONS.has(partial.position)
      ? partial.position
      : base.position;
  return {
    mode,
    position,
    x: normalizeOptionalCoord(partial.x !== undefined ? partial.x : base.x),
    y: normalizeOptionalCoord(partial.y !== undefined ? partial.y : base.y),
    opacity: clampUnit(partial.opacity ?? base.opacity, 0, 1),
    scale: Math.max(
      0.1,
      Number.isFinite(partial.scale ?? NaN) ? (partial.scale as number) : base.scale,
    ),
    angle: wrapDegrees(partial.angle ?? base.angle),
    text: typeof partial.text === 'string' && partial.text.length > 0 ? partial.text : base.text,
    fill: normalizeColor(partial.fill, base.fill),
    fontFamily:
      typeof partial.fontFamily === 'string' && partial.fontFamily.trim()
        ? partial.fontFamily.trim()
        : base.fontFamily,
    imageSrc: clampEmbeddedImageSrc(
      typeof partial.imageSrc === 'string' ? partial.imageSrc.trim() : base.imageSrc,
    ),
  };
}

export function isIdentityWatermark(watermark: WatermarkState | null | undefined): boolean {
  return normalizeWatermark(watermark).mode === 'none';
}

export function watermarksEqual(
  a: WatermarkState | null | undefined,
  b: WatermarkState | null | undefined,
): boolean {
  const left = normalizeWatermark(a);
  const right = normalizeWatermark(b);
  return (
    left.mode === right.mode &&
    left.position === right.position &&
    left.x === right.x &&
    left.y === right.y &&
    left.opacity === right.opacity &&
    left.scale === right.scale &&
    left.angle === right.angle &&
    left.text === right.text &&
    left.fill === right.fill &&
    left.fontFamily === right.fontFamily &&
    left.imageSrc === right.imageSrc
  );
}

/** Anchor top-left of a watermark box inside the output frame (preset only). */
export function resolveWatermarkOrigin(
  output: ImageSize,
  box: ImageSize,
  position: WatermarkPosition,
  marginRatio = 0.04,
): { readonly x: number; readonly y: number } {
  const marginX = Math.max(0, output.width * marginRatio);
  const marginY = Math.max(0, output.height * marginRatio);
  switch (position) {
    case 'top-left':
      return { x: marginX, y: marginY };
    case 'top-right':
      return { x: Math.max(marginX, output.width - box.width - marginX), y: marginY };
    case 'bottom-left':
      return { x: marginX, y: Math.max(marginY, output.height - box.height - marginY) };
    case 'bottom-right':
      return {
        x: Math.max(marginX, output.width - box.width - marginX),
        y: Math.max(marginY, output.height - box.height - marginY),
      };
    case 'center':
    default:
      return {
        x: Math.max(0, (output.width - box.width) / 2),
        y: Math.max(0, (output.height - box.height) / 2),
      };
  }
}

/**
 * Resolve watermark top-left: custom `x`/`y` when both finite, else position preset.
 * Clamps the box inside the output frame.
 */
export function resolveWatermarkPlacement(
  output: ImageSize,
  box: ImageSize,
  watermark: Pick<WatermarkState, 'position' | 'x' | 'y'>,
  marginRatio = 0.04,
): { readonly x: number; readonly y: number } {
  const maxX = Math.max(0, output.width - box.width);
  const maxY = Math.max(0, output.height - box.height);
  if (watermark.x !== null && watermark.y !== null) {
    return {
      x: Math.min(maxX, Math.max(0, watermark.x)),
      y: Math.min(maxY, Math.max(0, watermark.y)),
    };
  }
  const origin = resolveWatermarkOrigin(output, box, watermark.position, marginRatio);
  return {
    x: Math.min(maxX, Math.max(0, origin.x)),
    y: Math.min(maxY, Math.max(0, origin.y)),
  };
}

/** Snap to a preset corner/center and clear custom coordinates. */
export function watermarkWithPresetPosition(
  watermark: WatermarkState,
  position: WatermarkPosition,
): WatermarkState {
  return normalizeWatermark({
    ...watermark,
    position,
    x: null,
    y: null,
  });
}

export function createAnnotationId(): string {
  return `ann_${nanoid(12)}`;
}

export function createRedactionId(): string {
  return `redact_${nanoid(12)}`;
}

/** Stable folder id for annotation layer groups. */
export function createAnnotationGroupId(): string {
  return `grp_${nanoid(12)}`;
}

export function createInitialAnnotations(): readonly Annotation[] {
  return [];
}

export function normalizeAnnotationBlendMode(value: unknown): AnnotationBlendMode {
  return typeof value === 'string' && (ANNOTATION_BLEND_MODES as readonly string[]).includes(value)
    ? (value as AnnotationBlendMode)
    : 'normal';
}

/**
 * Normalize shared layer chrome fields.
 * Always emits opacity / visible / locked / blendMode; omits empty name/group fields.
 */
export function normalizeAnnotationLayerProps(
  partial: Partial<AnnotationLayerProps> | null | undefined,
): AnnotationLayerProps {
  const name = typeof partial?.name === 'string' ? partial.name.trim().slice(0, 120) : '';
  const groupId = typeof partial?.groupId === 'string' ? partial.groupId.trim() : '';
  const groupName =
    typeof partial?.groupName === 'string' ? partial.groupName.trim().slice(0, 120) : '';
  return {
    opacity: clampUnit(partial?.opacity ?? 1, 0, 1),
    visible: partial?.visible !== false,
    locked: partial?.locked === true,
    blendMode: normalizeAnnotationBlendMode(partial?.blendMode),
    ...(name ? { name } : {}),
    ...(groupId ? { groupId, ...(groupName ? { groupName } : { groupName: 'Group' }) } : {}),
  };
}

export function isAnnotationVisible(annotation: AnnotationLayerProps): boolean {
  return annotation.visible !== false;
}

export function isAnnotationLocked(annotation: AnnotationLayerProps): boolean {
  return annotation.locked === true;
}

export function resolveAnnotationBlendMode(annotation: AnnotationLayerProps): AnnotationBlendMode {
  return normalizeAnnotationBlendMode(annotation.blendMode);
}

/** Map annotation blend mode to Canvas 2D `globalCompositeOperation`. */
export function annotationBlendToCompositeOperation(
  blendMode: AnnotationBlendMode | undefined,
): string {
  const mode = normalizeAnnotationBlendMode(blendMode);
  return mode === 'normal' ? 'source-over' : mode;
}

export function annotationDisplayName(annotation: Annotation, fallback: string): string {
  const custom = typeof annotation.name === 'string' ? annotation.name.trim() : '';
  if (custom) {
    return custom;
  }
  if (annotation.kind === 'text') {
    const text = annotation.text.trim();
    if (text) {
      const firstLine = text.split('\n')[0] ?? text;
      return firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine;
    }
  }
  return fallback;
}

export function isTextAnnotation(value: Annotation): value is TextAnnotation {
  return value.kind === 'text';
}

export function isShapeAnnotation(value: Annotation): value is ShapeAnnotation {
  return SHAPE_KINDS.has(value.kind);
}

export function isPathAnnotation(value: Annotation): value is PathAnnotation {
  return value.kind === 'path';
}

export function isImageAnnotation(value: Annotation): value is ImageAnnotation {
  return value.kind === 'image';
}

function clampPositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function normalizeColor(value: string | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function normalizeTextAnnotation(
  partial: Partial<TextAnnotation> & Pick<TextAnnotation, 'id'>,
): TextAnnotation {
  const layer = normalizeAnnotationLayerProps(partial);
  return {
    id: partial.id,
    kind: 'text',
    x: Number.isFinite(partial.x) ? partial.x! : 0,
    y: Number.isFinite(partial.y) ? partial.y! : 0,
    text: normalizeTextContent(partial.text),
    fontSize: clampPositive(partial.fontSize ?? 32, 32),
    fill: normalizeColor(partial.fill, '#ffffff'),
    fontFamily:
      typeof partial.fontFamily === 'string' && partial.fontFamily.trim()
        ? partial.fontFamily.trim()
        : 'sans-serif',
    angle: Number.isFinite(partial.angle) ? partial.angle! : 0,
    fontStyle: partial.fontStyle === 'italic' ? 'italic' : 'normal',
    fontWeight: partial.fontWeight === 'bold' ? 'bold' : 'normal',
    underline: partial.underline === true,
    linethrough: partial.linethrough === true,
    textAlign: normalizeTextAlign(partial.textAlign),
    lineHeight: clampRange(partial.lineHeight ?? 1.2, 0.75, 3, 1.2),
    boxWidth: clampRange(partial.boxWidth ?? 0, 0, 8192, 0),
    backgroundColor: normalizeColor(partial.backgroundColor, 'transparent'),
    padding: clampRange(partial.padding ?? 0, 0, 512, 0),
    ...layer,
  };
}

function normalizeTextContent(value: string | undefined): string {
  if (typeof value !== 'string') {
    return 'Text';
  }
  return value.replace(/\r\n?/g, '\n');
}

function normalizeTextAlign(value: TextAlign | undefined): TextAlign {
  return value === 'center' || value === 'right' ? value : 'left';
}

function clampRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

/** Accepts legacy line/arrow payloads that omit `lineStart` / `lineEnd`. */
export type ShapeAnnotationInput =
  | Exclude<ShapeAnnotation, LineAnnotation>
  | (Omit<LineAnnotation, 'lineStart' | 'lineEnd'> & {
      readonly lineStart?: LineEndStyle | null;
      readonly lineEnd?: LineEndStyle | null;
    });

export function normalizeLineEndStyle(value: unknown, fallback: LineEndStyle): LineEndStyle {
  return typeof value === 'string' && (LINE_END_STYLES as readonly string[]).includes(value)
    ? (value as LineEndStyle)
    : fallback;
}

export function defaultLineEndsForKind(kind: 'line' | 'arrow'): {
  readonly lineStart: LineEndStyle;
  readonly lineEnd: LineEndStyle;
} {
  return kind === 'arrow'
    ? { lineStart: 'none', lineEnd: 'arrowSolid' }
    : { lineStart: 'none', lineEnd: 'none' };
}

export function normalizeShapeAnnotation(value: ShapeAnnotationInput): ShapeAnnotation {
  const stroke = normalizeColor(value.stroke, '#ff3b30');
  const strokeWidth = clampPositive(value.strokeWidth, 3);
  const fill = normalizeColor('fill' in value ? value.fill : undefined, 'transparent');
  const layer = normalizeAnnotationLayerProps(value);

  switch (value.kind) {
    case 'rect':
      return {
        id: value.id,
        kind: 'rect',
        x: Number.isFinite(value.x) ? value.x : 0,
        y: Number.isFinite(value.y) ? value.y : 0,
        width: clampPositive(value.width, 120),
        height: clampPositive(value.height, 80),
        stroke,
        strokeWidth,
        fill,
        angle: Number.isFinite(value.angle) ? value.angle : 0,
        ...layer,
      };
    case 'ellipse':
      return {
        id: value.id,
        kind: 'ellipse',
        x: Number.isFinite(value.x) ? value.x : 0,
        y: Number.isFinite(value.y) ? value.y : 0,
        width: clampPositive(value.width, 120),
        height: clampPositive(value.height, 80),
        stroke,
        strokeWidth,
        fill,
        angle: Number.isFinite(value.angle) ? value.angle : 0,
        ...layer,
      };
    case 'polygon': {
      const points = (value.points ?? [])
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({ x: p.x, y: p.y }));
      return {
        id: value.id,
        kind: 'polygon',
        points:
          points.length >= 3
            ? points
            : [
                { x: 0, y: 80 },
                { x: 60, y: 0 },
                { x: 120, y: 80 },
              ],
        stroke,
        strokeWidth,
        fill,
        ...layer,
      };
    }
    case 'line':
    case 'arrow': {
      const defaults = defaultLineEndsForKind(value.kind);
      return {
        id: value.id,
        kind: value.kind,
        x1: Number.isFinite(value.x1) ? value.x1 : 0,
        y1: Number.isFinite(value.y1) ? value.y1 : 0,
        x2: Number.isFinite(value.x2) ? value.x2 : 120,
        y2: Number.isFinite(value.y2) ? value.y2 : 0,
        stroke,
        strokeWidth,
        lineStart: normalizeLineEndStyle(value.lineStart, defaults.lineStart),
        lineEnd: normalizeLineEndStyle(value.lineEnd, defaults.lineEnd),
        ...layer,
      };
    }
  }
}

export function normalizePathAnnotation(
  partial: Partial<PathAnnotation> & Pick<PathAnnotation, 'id'>,
): PathAnnotation {
  const points = (partial.points ?? [])
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ x: p.x, y: p.y }));
  const layer = normalizeAnnotationLayerProps(partial);
  return {
    id: partial.id,
    kind: 'path',
    points: points.length >= 1 ? points : [{ x: 0, y: 0 }],
    stroke: normalizeColor(partial.stroke, '#ff3b30'),
    strokeWidth: clampPositive(partial.strokeWidth ?? 3, 3),
    closed: partial.closed === true,
    ...layer,
  };
}

export function normalizeImageAnnotation(
  partial: Partial<ImageAnnotation> & Pick<ImageAnnotation, 'id' | 'src'>,
): ImageAnnotation {
  const src = clampEmbeddedImageSrc(typeof partial.src === 'string' ? partial.src.trim() : '');
  const layer = normalizeAnnotationLayerProps(partial);
  return {
    id: partial.id,
    kind: 'image',
    src,
    x: Number.isFinite(partial.x) ? partial.x! : 0,
    y: Number.isFinite(partial.y) ? partial.y! : 0,
    width: clampPositive(partial.width ?? 120, 120),
    height: clampPositive(partial.height ?? 120, 120),
    angle: Number.isFinite(partial.angle) ? partial.angle! : 0,
    ...layer,
    opacity: layer.opacity ?? 1,
  };
}

export function normalizeAnnotation(value: Annotation): Annotation {
  switch (value.kind) {
    case 'text':
      return normalizeTextAnnotation(value);
    case 'path':
      return normalizePathAnnotation(value);
    case 'image':
      return normalizeImageAnnotation(value);
    default:
      return normalizeShapeAnnotation(value);
  }
}

export function normalizeAnnotations(
  list: readonly Annotation[] | null | undefined,
): readonly Annotation[] {
  if (!list || list.length === 0) {
    return createInitialAnnotations();
  }
  return list.map((item) => normalizeAnnotation(item));
}

export function annotationsEqual(
  a: readonly Annotation[] | null | undefined,
  b: readonly Annotation[] | null | undefined,
): boolean {
  const left = normalizeAnnotations(a);
  const right = normalizeAnnotations(b);
  if (left.length !== right.length) {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createDefaultTextAnnotation(output: ImageSize): TextAnnotation {
  const fontSize = Math.max(16, Math.round(Math.min(output.width, output.height) * 0.04));
  const boxWidth = defaultTextBoxWidth(output, fontSize);
  return normalizeTextAnnotation({
    id: createAnnotationId(),
    x: Math.max(0, (output.width - boxWidth) / 2),
    y: Math.max(0, output.height / 2 - fontSize * 0.6),
    text: 'Text',
    fontSize,
    boxWidth,
    fill: '#ffffff',
    fontFamily: 'sans-serif',
    angle: 0,
  });
}

/** Comfortable default layout width so left/center/right alignment is visible. */
export function defaultTextBoxWidth(output: ImageSize, fontSize: number): number {
  const fromFont = Math.max(120, Math.round(fontSize * 8));
  const fromCanvas = Math.round(output.width * 0.4);
  return Math.max(40, Math.min(fromFont, fromCanvas, Math.max(40, output.width - 16)));
}

export function createDefaultShapeAnnotation(
  kind: ShapeAnnotation['kind'],
  output: ImageSize,
  options?: { readonly polygonSides?: number },
): ShapeAnnotation {
  const w = Math.max(40, Math.round(output.width * 0.2));
  const h = Math.max(28, Math.round(output.height * 0.14));
  const x = Math.max(0, Math.round((output.width - w) / 2));
  const y = Math.max(0, Math.round((output.height - h) / 2));
  const stroke = '#ff3b30';
  const strokeWidth = Math.max(2, Math.round(Math.min(output.width, output.height) * 0.004));
  const sides = Math.min(12, Math.max(3, Math.round(options?.polygonSides ?? 3)));

  switch (kind) {
    case 'rect':
      return normalizeShapeAnnotation({
        id: createAnnotationId(),
        kind: 'rect',
        x,
        y,
        width: w,
        height: h,
        stroke,
        strokeWidth,
        fill: 'transparent',
        angle: 0,
      });
    case 'ellipse':
      return normalizeShapeAnnotation({
        id: createAnnotationId(),
        kind: 'ellipse',
        x,
        y,
        width: w,
        height: h,
        stroke,
        strokeWidth,
        fill: 'transparent',
        angle: 0,
      });
    case 'polygon': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      const points = Array.from({ length: sides }, (_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
        return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
      });
      return normalizeShapeAnnotation({
        id: createAnnotationId(),
        kind: 'polygon',
        points,
        stroke,
        strokeWidth,
        fill: 'transparent',
      });
    }
    case 'line':
    case 'arrow': {
      const ends = defaultLineEndsForKind(kind);
      return normalizeShapeAnnotation({
        id: createAnnotationId(),
        kind,
        x1: x,
        y1: y + h / 2,
        x2: x + w,
        y2: y + h / 2,
        stroke,
        strokeWidth,
        lineStart: ends.lineStart,
        lineEnd: ends.lineEnd,
      });
    }
  }
}

/**
 * Replace one annotation kind inside a global stack.
 * Other kinds keep their relative positions; kind order follows `replacements`.
 * New ids (not occupying an existing kind slot) append at the end.
 */
export function replaceAnnotationKindInStack(
  stack: readonly Annotation[],
  isKind: (item: Annotation) => boolean,
  replacements: readonly Annotation[],
): readonly Annotation[] {
  const queue = replacements.map((item) => normalizeAnnotation(item));
  const next: Annotation[] = [];
  let queueIndex = 0;
  for (const item of stack) {
    if (!isKind(item)) {
      next.push(normalizeAnnotation(item));
      continue;
    }
    if (queueIndex < queue.length) {
      next.push(queue[queueIndex]!);
      queueIndex += 1;
    }
  }
  while (queueIndex < queue.length) {
    next.push(queue[queueIndex]!);
    queueIndex += 1;
  }
  return normalizeAnnotations(next);
}

function replaceAnnotationKind(
  document: ReadonlyImageDocument,
  isKind: (item: Annotation) => boolean,
  replacements: readonly Annotation[],
): ReadonlyImageDocument {
  const annotations = replaceAnnotationKindInStack(document.annotations, isKind, replacements);
  if (annotationsEqual(document.annotations, annotations)) {
    return document;
  }
  return { ...document, annotations };
}

/** Replace the full annotation stack (global z-order). */
export function withAnnotations(
  document: ReadonlyImageDocument,
  annotations: readonly Annotation[],
): ReadonlyImageDocument {
  const next = normalizeAnnotations(annotations);
  if (annotationsEqual(document.annotations, next)) {
    return document;
  }
  return { ...document, annotations: next };
}

/** Replace all text annotations; keep other kinds and their global slots. */
export function withTextAnnotations(
  document: ReadonlyImageDocument,
  texts: readonly TextAnnotation[],
): ReadonlyImageDocument {
  return replaceAnnotationKind(document, isTextAnnotation, texts.map(normalizeTextAnnotation));
}

/** Replace all shape annotations; keep other kinds and their global slots. */
export function withShapeAnnotations(
  document: ReadonlyImageDocument,
  shapes: readonly ShapeAnnotation[],
): ReadonlyImageDocument {
  return replaceAnnotationKind(
    document,
    isShapeAnnotation,
    shapes.map((s) => normalizeShapeAnnotation(s)),
  );
}

/** Replace all path (pen) annotations; keep other kinds and their global slots. */
export function withPathAnnotations(
  document: ReadonlyImageDocument,
  paths: readonly PathAnnotation[],
): ReadonlyImageDocument {
  return replaceAnnotationKind(document, isPathAnnotation, paths.map(normalizePathAnnotation));
}

/** Replace all image-overlay annotations; keep other kinds and their global slots. */
export function withImageAnnotations(
  document: ReadonlyImageDocument,
  images: readonly ImageAnnotation[],
): ReadonlyImageDocument {
  return replaceAnnotationKind(document, isImageAnnotation, images.map(normalizeImageAnnotation));
}

/** Deep-clone an annotation with a fresh id (for Duplicate). */
export function duplicateAnnotation(annotation: Annotation): Annotation {
  const cloned = JSON.parse(JSON.stringify(annotation)) as Annotation;
  return normalizeAnnotation({ ...cloned, id: createAnnotationId() });
}

export function createDefaultPathAnnotation(
  output: ImageSize,
  style?: { readonly stroke?: string; readonly strokeWidth?: number },
): PathAnnotation {
  const cx = output.width / 2;
  const cy = output.height / 2;
  const r = Math.max(20, Math.round(Math.min(output.width, output.height) * 0.08));
  return normalizePathAnnotation({
    id: createAnnotationId(),
    points: [
      { x: cx - r, y: cy },
      { x: cx, y: cy - r },
      { x: cx + r, y: cy },
    ],
    stroke: style?.stroke ?? '#ff3b30',
    strokeWidth:
      style?.strokeWidth ?? Math.max(2, Math.round(Math.min(output.width, output.height) * 0.004)),
  });
}

export function createDefaultImageAnnotation(
  output: ImageSize,
  src: string,
  intrinsic?: ImageSize | null,
): ImageAnnotation {
  const maxEdge = Math.max(48, Math.round(Math.min(output.width, output.height) * 0.25));
  const natW =
    intrinsic && intrinsic.width > 0 && Number.isFinite(intrinsic.width)
      ? intrinsic.width
      : maxEdge;
  const natH =
    intrinsic && intrinsic.height > 0 && Number.isFinite(intrinsic.height)
      ? intrinsic.height
      : maxEdge;
  const fitScale = Math.min(maxEdge / natW, maxEdge / natH);
  const width = Math.max(1, Math.round(natW * fitScale));
  const height = Math.max(1, Math.round(natH * fitScale));
  return normalizeImageAnnotation({
    id: createAnnotationId(),
    src,
    x: Math.max(0, Math.round((output.width - width) / 2)),
    y: Math.max(0, Math.round((output.height - height) / 2)),
    width,
    height,
    opacity: 1,
    angle: 0,
  });
}

export function createImageDocument(input: {
  source: ImageSourceReference;
  sourceSize: ImageSize;
}): ImageDocument {
  const output = {
    width: input.sourceSize.width,
    height: input.sourceSize.height,
  };
  return {
    schemaVersion: 1,
    source: input.source,
    sourceSize: input.sourceSize,
    crop: null,
    transform: createInitialTransform(),
    adjustments: createInitialAdjustments(),
    effects: createInitialEffects(),
    filters: createInitialFilters(),
    focus: createInitialFocus(),
    redactions: createInitialRedactions(),
    cropMask: createInitialCropMask(),
    colorOverlay: createInitialColorOverlay(),
    fill: createInitialFill(),
    frame: createInitialFrame(),
    watermark: createInitialWatermark(),
    annotations: createInitialAnnotations(),
    designImage: createInitialDesignImage(output),
    output,
    pluginState: {},
  };
}

/** Effective content size after crop (source space, before rotation). */
export function getContentSize(document: ReadonlyImageDocument): ImageSize {
  if (document.crop) {
    return { width: document.crop.width, height: document.crop.height };
  }
  return document.sourceSize;
}

/** Content size after crop + rotation (matches export canvas before output scale). */
export function getOrientedContentSize(document: ReadonlyImageDocument): ImageSize {
  const content = getContentSize(document);
  const normalized = ((document.transform.rotationDegrees % 360) + 360) % 360;
  if (normalized === 90 || normalized === 270) {
    return { width: content.height, height: content.width };
  }
  return content;
}

export type ReadonlyImageDocument = Readonly<ImageDocument>;
