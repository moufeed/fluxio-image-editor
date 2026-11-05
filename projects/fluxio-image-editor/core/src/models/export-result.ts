import type { RasterExportOptions } from '../ports/rendering-engine.port';

export type RasterExportFormat = RasterExportOptions['format'];

export interface ImageEditorExportResult {
  readonly blob: Blob;
  readonly file?: File;
  readonly format: RasterExportFormat;
  readonly width: number;
  readonly height: number;
  readonly fileName: string;
}

export interface PublicExportOptions extends RasterExportOptions {
  readonly fileName?: string;
  readonly asFile?: boolean;
  /** Flatten alpha onto this CSS color for JPEG (default white). */
  readonly backgroundColor?: string;
  /**
   * Abort export if the raster encode exceeds this many milliseconds.
   * Defaults to {@link DEFAULT_EXPORT_TIMEOUT_MS}. Pass `0` to disable.
   */
  readonly timeoutMs?: number;
}

export const MAX_EXPORT_DIMENSION = 8192;

/** Default wall-clock budget for `exportRaster` (huge rasters can hang the tab). */
export const DEFAULT_EXPORT_TIMEOUT_MS = 60_000;

/**
 * Race `promise` against a wall-clock timeout.
 * Does not cancel the underlying work — callers still observe the timeout failure.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  createTimeoutError: () => Error,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(createTimeoutError());
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Resolve final export pixel size from document output + optional resize options.
 * When both width and height are set, those exact dimensions are used (cover-fit in renderer).
 */
export function resolveExportDimensions(
  sourceWidth: number,
  sourceHeight: number,
  options: Pick<RasterExportOptions, 'width' | 'height' | 'multiplier'> = {},
): { readonly width: number; readonly height: number } {
  const srcW = Math.max(1, Math.round(sourceWidth));
  const srcH = Math.max(1, Math.round(sourceHeight));
  const targetW =
    typeof options.width === 'number' && Number.isFinite(options.width) && options.width > 0
      ? Math.round(options.width)
      : null;
  const targetH =
    typeof options.height === 'number' && Number.isFinite(options.height) && options.height > 0
      ? Math.round(options.height)
      : null;

  if (targetW != null && targetH != null) {
    return { width: targetW, height: targetH };
  }
  if (targetW != null) {
    const scale = targetW / srcW;
    return { width: targetW, height: Math.max(1, Math.round(srcH * scale)) };
  }
  if (targetH != null) {
    const scale = targetH / srcH;
    return { width: Math.max(1, Math.round(srcW * scale)), height: targetH };
  }
  const multiplier =
    typeof options.multiplier === 'number' &&
    Number.isFinite(options.multiplier) &&
    options.multiplier > 0
      ? options.multiplier
      : 1;
  return {
    width: Math.max(1, Math.round(srcW * multiplier)),
    height: Math.max(1, Math.round(srcH * multiplier)),
  };
}

export function mimeTypeForExportFormat(format: RasterExportFormat): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

export function fileExtensionForExportFormat(format: RasterExportFormat): string {
  switch (format) {
    case 'jpeg':
      return 'jpg';
    case 'webp':
      return 'webp';
    default:
      return 'png';
  }
}

export function normalizeExportFormat(format: string | undefined): RasterExportFormat {
  if (format === 'jpeg' || format === 'jpg') {
    return 'jpeg';
  }
  if (format === 'webp') {
    return 'webp';
  }
  return 'png';
}
