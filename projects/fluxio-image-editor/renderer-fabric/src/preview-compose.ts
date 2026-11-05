/**
 * Display-path preview sizing helpers (export stays full resolution).
 * Pure functions — no Fabric imports.
 */

/** Hard cap on the long edge of interactive preview bitmaps. */
export const MAX_PREVIEW_LONG_EDGE = 2048;

export interface PreviewOutputSize {
  readonly width: number;
  readonly height: number;
  /** Uniform scale from full document output → preview pixels (`<= 1`). */
  readonly scale: number;
}

/**
 * Resolve preview bitmap size from full output dimensions and an optional long-edge cap.
 */
export function resolvePreviewOutputSize(
  fullWidth: number,
  fullHeight: number,
  maxLongEdge?: number,
): PreviewOutputSize {
  const width = Math.max(1, Math.round(fullWidth));
  const height = Math.max(1, Math.round(fullHeight));
  if (maxLongEdge == null || maxLongEdge <= 0) {
    return { width, height, scale: 1 };
  }
  const long = Math.max(width, height);
  if (long <= maxLongEdge) {
    return { width, height, scale: 1 };
  }
  const scale = maxLongEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * Choose a preview long-edge budget from viewport zoom and canvas CSS size.
 * Fitted large images stay near the canvas pixel budget; zoom-in raises quality up to the cap.
 */
export function computePreviewMaxLongEdge(options: {
  readonly fullWidth: number;
  readonly fullHeight: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly zoom: number;
  readonly devicePixelRatio?: number;
  readonly maxLongEdge?: number;
}): number {
  const imageLong = Math.max(1, Math.max(options.fullWidth, options.fullHeight));
  const dpr =
    typeof options.devicePixelRatio === 'number' && options.devicePixelRatio > 0
      ? options.devicePixelRatio
      : 1;
  const zoom = Math.max(options.zoom, 0.0001);
  const needed = Math.ceil(imageLong * zoom * dpr);
  const cap = options.maxLongEdge ?? MAX_PREVIEW_LONG_EDGE;
  return Math.min(imageLong, Math.max(256, Math.min(cap, needed)));
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = globalThis.document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext('2d');
  if (!ctx) {
    throw new Error('2D context unavailable');
  }
  ctx.drawImage(source, 0, 0);
  return copy;
}

/**
 * Center-crop `source` into a square canvas (object-fit: cover).
 * Used for Pintura-style filter preset thumbnails.
 */
export function coverToSquare(source: HTMLCanvasElement, size: number): HTMLCanvasElement {
  return coverToSize(source, size, size);
}

/**
 * Center-crop / scale `source` into an exact width×height canvas (object-fit: cover).
 */
export function coverToSize(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const tw = Math.max(1, Math.round(width));
  const th = Math.max(1, Math.round(height));
  const out = globalThis.document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const ctx = out.getContext('2d');
  if (!ctx) {
    throw new Error('2D context unavailable');
  }
  const sw = Math.max(1, source.width);
  const sh = Math.max(1, source.height);
  const scale = Math.max(tw / sw, th / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (tw - dw) / 2, (th - dh) / 2, dw, dh);
  return out;
}
