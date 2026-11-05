import type { CropShape, CropState, ImageSize } from '../models/image-document';
import { resolveCropShape } from '../models/image-document';

export const MIN_CROP_SIZE = 8;

/** Interactive crop handle ids (corners, edges, or move body). */
export type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface CropPoint {
  readonly x: number;
  readonly y: number;
}

export interface CropValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly crop?: CropState;
}

export function validateCrop(crop: CropState, sourceSize: ImageSize): CropValidationResult {
  if (!Number.isFinite(crop.x) || !Number.isFinite(crop.y)) {
    return { valid: false, reason: 'Crop origin is invalid' };
  }
  if (crop.width < MIN_CROP_SIZE || crop.height < MIN_CROP_SIZE) {
    return { valid: false, reason: `Crop must be at least ${MIN_CROP_SIZE}px` };
  }
  if (crop.x < 0 || crop.y < 0) {
    return { valid: false, reason: 'Crop is outside the image' };
  }
  if (
    crop.x + crop.width > sourceSize.width + 0.5 ||
    crop.y + crop.height > sourceSize.height + 0.5
  ) {
    return { valid: false, reason: 'Crop exceeds image bounds' };
  }
  return { valid: true, crop: normalizeCrop(crop, sourceSize) };
}

export function normalizeCrop(crop: CropState, sourceSize: ImageSize): CropState {
  const shape = resolveCropShape(crop);
  const x = clamp(crop.x, 0, Math.max(sourceSize.width - MIN_CROP_SIZE, 0));
  const y = clamp(crop.y, 0, Math.max(sourceSize.height - MIN_CROP_SIZE, 0));
  const maxW = sourceSize.width - x;
  const maxH = sourceSize.height - y;
  let width = clamp(crop.width, MIN_CROP_SIZE, maxW);
  let height = clamp(crop.height, MIN_CROP_SIZE, maxH);

  if (crop.aspectRatio && crop.aspectRatio > 0) {
    const ratio = crop.aspectRatio;
    if (width / height > ratio) {
      width = height * ratio;
    } else {
      height = width / ratio;
    }
    width = clamp(width, MIN_CROP_SIZE, maxW);
    height = clamp(height, MIN_CROP_SIZE, maxH);
  }

  return {
    x,
    y,
    width,
    height,
    aspectRatio: crop.aspectRatio,
    shape,
  };
}

export function createDefaultCrop(
  sourceSize: ImageSize,
  aspectRatio: number | null = null,
  shape: CropShape = 'rect',
): CropState {
  const margin = 0.1;
  let width = sourceSize.width * (1 - margin * 2);
  let height = sourceSize.height * (1 - margin * 2);

  if (aspectRatio && aspectRatio > 0) {
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  width = Math.max(width, MIN_CROP_SIZE);
  height = Math.max(height, MIN_CROP_SIZE);

  return normalizeCrop(
    {
      x: (sourceSize.width - width) / 2,
      y: (sourceSize.height - height) / 2,
      width,
      height,
      aspectRatio,
      shape,
    },
    sourceSize,
  );
}

/**
 * Largest centered crop that fits `sourceSize` at the given aspect (no inset margin).
 * Used for export-only reframes (batch-export per-preset aspect) without mutating history.
 */
export function createMaxFitCrop(
  sourceSize: ImageSize,
  aspectRatio: number | null = null,
  shape: CropShape = 'rect',
): CropState {
  let width = sourceSize.width;
  let height = sourceSize.height;

  if (aspectRatio && aspectRatio > 0) {
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  width = Math.max(width, MIN_CROP_SIZE);
  height = Math.max(height, MIN_CROP_SIZE);

  return normalizeCrop(
    {
      x: (sourceSize.width - width) / 2,
      y: (sourceSize.height - height) / 2,
      width,
      height,
      aspectRatio,
      shape,
    },
    sourceSize,
  );
}

/**
 * Hit-test crop handles in source-image coordinates.
 * `handleHitSize` is the half-extent of each handle in image pixels.
 * Move hit uses the AABB for both rect and ellipse (handles stay on the box).
 */
export function hitTestCropHandle(
  crop: CropState,
  point: CropPoint,
  handleHitSize: number,
): CropHandle | null {
  const half = Math.max(handleHitSize, 4);
  const left = crop.x;
  const right = crop.x + crop.width;
  const top = crop.y;
  const bottom = crop.y + crop.height;
  const midX = crop.x + crop.width / 2;
  const midY = crop.y + crop.height / 2;

  const anchors: readonly {
    readonly handle: CropHandle;
    readonly x: number;
    readonly y: number;
  }[] = [
    { handle: 'nw', x: left, y: top },
    { handle: 'ne', x: right, y: top },
    { handle: 'se', x: right, y: bottom },
    { handle: 'sw', x: left, y: bottom },
    { handle: 'n', x: midX, y: top },
    { handle: 'e', x: right, y: midY },
    { handle: 's', x: midX, y: bottom },
    { handle: 'w', x: left, y: midY },
  ];

  for (const anchor of anchors) {
    if (Math.abs(point.x - anchor.x) <= half && Math.abs(point.y - anchor.y) <= half) {
      return anchor.handle;
    }
  }

  if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
    return 'move';
  }

  return null;
}

/**
 * Apply one pointer-drag sample against the crop rect that existed at gesture start.
 * Preview-only; callers commit via crop.set once.
 */
export function applyCropDrag(
  startCrop: CropState,
  handle: CropHandle,
  startPoint: CropPoint,
  currentPoint: CropPoint,
  sourceSize: ImageSize,
): CropState {
  const shape = resolveCropShape(startCrop);
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  let left = startCrop.x;
  let top = startCrop.y;
  let right = startCrop.x + startCrop.width;
  let bottom = startCrop.y + startCrop.height;
  const ratio = startCrop.aspectRatio && startCrop.aspectRatio > 0 ? startCrop.aspectRatio : null;

  if (handle === 'move') {
    const width = startCrop.width;
    const height = startCrop.height;
    const maxX = Math.max(sourceSize.width - width, 0);
    const maxY = Math.max(sourceSize.height - height, 0);
    return {
      x: clamp(startCrop.x + dx, 0, maxX),
      y: clamp(startCrop.y + dy, 0, maxY),
      width,
      height,
      aspectRatio: startCrop.aspectRatio,
      shape,
    };
  }

  if (handle.includes('n')) {
    top = startCrop.y + dy;
  }
  if (handle.includes('s')) {
    bottom = startCrop.y + startCrop.height + dy;
  }
  if (handle.includes('w')) {
    left = startCrop.x + dx;
  }
  if (handle.includes('e')) {
    right = startCrop.x + startCrop.width + dx;
  }

  if (ratio) {
    const fixedBottom = handle.includes('n');
    const isCorner = handle.length === 2;

    if (isCorner) {
      const widthFromEdges = Math.abs(right - left);
      const heightFromRatio = widthFromEdges / ratio;
      if (fixedBottom) {
        top = bottom - heightFromRatio;
      } else {
        bottom = top + heightFromRatio;
      }
    } else if (handle === 'n' || handle === 's') {
      const height = Math.abs(bottom - top);
      const width = height * ratio;
      const midX = startCrop.x + startCrop.width / 2;
      left = midX - width / 2;
      right = midX + width / 2;
    } else if (handle === 'e' || handle === 'w') {
      const width = Math.abs(right - left);
      const height = width / ratio;
      const midY = startCrop.y + startCrop.height / 2;
      top = midY - height / 2;
      bottom = midY + height / 2;
    }
  }

  if (right < left) {
    const swap = left;
    left = right;
    right = swap;
  }
  if (bottom < top) {
    const swap = top;
    top = bottom;
    bottom = swap;
  }

  return normalizeCrop(
    {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      aspectRatio: startCrop.aspectRatio,
      shape,
    },
    sourceSize,
  );
}

/** Arrow-key move of the crop rect in source pixels (PV38). */
export function nudgeCrop(
  crop: CropState,
  dx: number,
  dy: number,
  sourceSize: ImageSize,
): CropState {
  return applyCropDrag(crop, 'move', { x: 0, y: 0 }, { x: dx, y: dy }, sourceSize);
}

/**
 * Alt+Arrow resize: move the matching edge outward/inward by `delta` source pixels.
 * Up → north edge, Down → south, Left → west, Right → east.
 */
export function resizeCropEdge(
  crop: CropState,
  edge: 'n' | 's' | 'e' | 'w',
  delta: number,
  sourceSize: ImageSize,
): CropState {
  const origin = { x: 0, y: 0 };
  switch (edge) {
    case 'n':
      return applyCropDrag(crop, 'n', origin, { x: 0, y: -delta }, sourceSize);
    case 's':
      return applyCropDrag(crop, 's', origin, { x: 0, y: delta }, sourceSize);
    case 'w':
      return applyCropDrag(crop, 'w', origin, { x: -delta, y: 0 }, sourceSize);
    case 'e':
      return applyCropDrag(crop, 'e', origin, { x: delta, y: 0 }, sourceSize);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
