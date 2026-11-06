import { ImageEditorError } from '../models/errors';

export interface CreateBlankImageOptions {
  readonly width: number;
  readonly height: number;
  /** CSS color fill. Default `#ffffff`. Use `transparent` for an alpha PNG. */
  readonly fill?: string;
  /** Resulting file name. Default `untitled.png`. */
  readonly fileName?: string;
}

const DEFAULT_FILL = '#ffffff';
const DEFAULT_NAME = 'untitled.png';

/**
 * Synthesize a PNG raster for “New blank” documents.
 * Uses a DOM canvas (or OffscreenCanvas when available).
 */
export async function createBlankImageBlob(options: CreateBlankImageOptions): Promise<File> {
  const width = Math.round(options.width);
  const height = Math.round(options.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new ImageEditorError(
      'IMAGE_LOAD_FAILED',
      `Invalid blank size ${options.width}×${options.height}`,
    );
  }
  if (width > 16384 || height > 16384) {
    throw new ImageEditorError(
      'IMAGE_LOAD_FAILED',
      `Blank size ${width}×${height} exceeds the 16384px limit`,
    );
  }

  const fill = options.fill ?? DEFAULT_FILL;
  const fileName = options.fileName ?? DEFAULT_NAME;
  const blob = await paintBlankPng(width, height, fill);
  return new File([blob], fileName, { type: 'image/png' });
}

async function paintBlankPng(width: number, height: number, fill: string): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ImageEditorError('IMAGE_LOAD_FAILED', 'OffscreenCanvas 2D context unavailable');
    }
    if (fill !== 'transparent') {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);
    }
    return canvas.convertToBlob({ type: 'image/png' });
  }

  if (typeof document === 'undefined') {
    throw new ImageEditorError('IMAGE_LOAD_FAILED', 'No canvas environment for blank image');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ImageEditorError('IMAGE_LOAD_FAILED', 'Canvas 2D context unavailable');
  }
  if (fill !== 'transparent') {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new ImageEditorError('IMAGE_LOAD_FAILED', 'Failed to encode blank PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}
