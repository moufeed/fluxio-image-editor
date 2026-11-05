import { nanoid } from 'nanoid';

import { readJpegExifOrientation } from '../assets/exif-orientation';
import { ImageEditorError } from '../models/errors';
import type { ImageEditorSource, NormalizedImageAsset } from '../models/source';

/** Per-load id — no module counter (safe with multiple editor instances). */
function createAssetId(): string {
  return `asset_${nanoid(12)}`;
}

export async function normalizeSource(source: ImageEditorSource): Promise<NormalizedImageAsset> {
  if (typeof source === 'string') {
    return loadFromUrl(source, 'url', false);
  }

  if (source instanceof HTMLImageElement) {
    const url = source.currentSrc || source.src;
    if (!url) {
      throw new ImageEditorError('IMAGE_LOAD_FAILED', 'HTMLImageElement has no src');
    }
    const size = await probeImage(url);
    return {
      id: createAssetId(),
      objectUrl: url,
      naturalWidth: size.width,
      naturalHeight: size.height,
      revokeOnDestroy: false,
      name: source.alt || undefined,
      exifOrientation: 1,
      sourceKind: 'element',
    };
  }

  if (source instanceof Blob || source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    try {
      const size = await probeImage(objectUrl);
      const orientation = await resolveOrientation(source);
      // Browser Image decode already applies EXIF orientation for display sizes.
      return {
        id: createAssetId(),
        objectUrl,
        naturalWidth: size.width,
        naturalHeight: size.height,
        mimeType: source.type || undefined,
        name: source instanceof File ? source.name : undefined,
        revokeOnDestroy: true,
        exifOrientation: orientation,
        sourceKind: source instanceof File ? 'file' : 'blob-url',
      };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  return loadFromUrl(source.url, 'url', false, source.name);
}

async function loadFromUrl(
  url: string,
  sourceKind: NormalizedImageAsset['sourceKind'],
  revokeOnDestroy: boolean,
  name?: string,
): Promise<NormalizedImageAsset> {
  const size = await probeImage(url);
  let orientation = 1;
  try {
    // Anonymous CORS only — never attach credentials or host secrets.
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (response.ok) {
      const blob = await response.blob();
      orientation = await resolveOrientation(blob);
    }
  } catch {
    // CORS or network failure: proceed without EXIF; renderer still loads via img/canvas.
    orientation = 1;
  }
  return {
    id: createAssetId(),
    objectUrl: url,
    naturalWidth: size.width,
    naturalHeight: size.height,
    name,
    revokeOnDestroy,
    exifOrientation: orientation,
    sourceKind,
  };
}

async function resolveOrientation(blob: Blob): Promise<number> {
  if (!blob.type.includes('jpeg') && !blob.type.includes('jpg') && blob.type !== '') {
    // Unknown type — attempt JPEG parse anyway for camera uploads without mime.
    if (blob.type && !blob.type.startsWith('image/')) {
      return 1;
    }
  }
  if (blob.type.startsWith('image/') && !blob.type.includes('jpeg') && !blob.type.includes('jpg')) {
    return 1;
  }
  try {
    return await readJpegExifOrientation(blob);
  } catch {
    return 1;
  }
}

/**
 * Probe natural size with `crossOrigin: 'anonymous'`.
 * Does not silently retry via public proxies and never attaches auth secrets.
 */
function probeImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      void classifyLoadFailure(url).then(reject, reject);
    };
    image.src = url;
  });
}

/**
 * Best-effort classification: prefer IMAGE_LOAD_FAILED; use CORS_FAILED when fetch
 * fails in a way consistent with a blocked cross-origin response.
 */
async function classifyLoadFailure(url: string): Promise<ImageEditorError> {
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return new ImageEditorError('IMAGE_LOAD_FAILED', `Failed to load image: ${url}`, {
      source: url,
    });
  }

  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) {
      return new ImageEditorError(
        'IMAGE_LOAD_FAILED',
        `Failed to load image (${response.status}): ${url}`,
        { source: url },
      );
    }
    return new ImageEditorError('IMAGE_LOAD_FAILED', `Failed to decode image: ${url}`, {
      source: url,
    });
  } catch (cause) {
    // Fetch TypeError often means network or CORS opaque failure — report as CORS when remote.
    const isRemote = /^https?:\/\//i.test(url);
    if (isRemote) {
      return new ImageEditorError(
        'CORS_FAILED',
        `Cross-origin or network failure loading image: ${url}`,
        { cause, source: url },
      );
    }
    return new ImageEditorError('IMAGE_LOAD_FAILED', `Failed to load image: ${url}`, {
      cause,
      source: url,
    });
  }
}

export function revokeAsset(asset: NormalizedImageAsset | null | undefined): void {
  if (asset?.revokeOnDestroy) {
    URL.revokeObjectURL(asset.objectUrl);
  }
}
