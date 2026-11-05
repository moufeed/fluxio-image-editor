import type { ImageSize, RedactionRegion } from '../models/image-document';

/** Move the whole rect, or drag one corner. */
export type RedactionHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export interface RedactionPoint {
  readonly x: number;
  readonly y: number;
}

/** Output-pixel rect for a normalized region. */
export interface RedactionRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Smallest region kept by `normalizeRedactions` (normalized units). */
const MIN_REGION_SIZE = 0.001;

export function redactionRect(region: RedactionRegion, output: ImageSize): RedactionRect {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  return {
    left: region.x * w,
    top: region.y * h,
    width: region.width * w,
    height: region.height * h,
  };
}

/** Corner anchors in output pixels, ordered nw, ne, se, sw. */
export function redactionCornerHandles(
  region: RedactionRegion,
  output: ImageSize,
): readonly { readonly id: RedactionHandle; readonly x: number; readonly y: number }[] {
  const rect = redactionRect(region, output);
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  return [
    { id: 'nw', x: rect.left, y: rect.top },
    { id: 'ne', x: right, y: rect.top },
    { id: 'se', x: right, y: bottom },
    { id: 'sw', x: rect.left, y: bottom },
  ];
}

/**
 * Topmost hit for a redact pointer press: corners win over body, and later
 * regions (drawn on top) win over earlier ones.
 */
export function hitTestRedactions(
  regions: readonly RedactionRegion[],
  point: RedactionPoint,
  output: ImageSize,
  handleHitSize: number,
): { readonly id: string; readonly handle: RedactionHandle } | null {
  const half = Math.max(handleHitSize, 4);

  for (let i = regions.length - 1; i >= 0; i--) {
    const region = regions[i]!;
    for (const corner of redactionCornerHandles(region, output)) {
      if (Math.abs(point.x - corner.x) <= half && Math.abs(point.y - corner.y) <= half) {
        return { id: region.id, handle: corner.id };
      }
    }
  }

  for (let i = regions.length - 1; i >= 0; i--) {
    const region = regions[i]!;
    const rect = redactionRect(region, output);
    if (
      point.x >= rect.left &&
      point.x <= rect.left + rect.width &&
      point.y >= rect.top &&
      point.y <= rect.top + rect.height
    ) {
      return { id: region.id, handle: 'move' };
    }
  }

  return null;
}

/** Apply a move / corner-resize drag, clamped to the output box. */
export function applyRedactionDrag(
  startRegion: RedactionRegion,
  handle: RedactionHandle,
  startPoint: RedactionPoint,
  currentPoint: RedactionPoint,
  output: ImageSize,
): RedactionRegion {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const dx = (currentPoint.x - startPoint.x) / w;
  const dy = (currentPoint.y - startPoint.y) / h;

  if (handle === 'move') {
    const maxX = Math.max(0, 1 - startRegion.width);
    const maxY = Math.max(0, 1 - startRegion.height);
    return {
      ...startRegion,
      x: clamp(startRegion.x + dx, 0, maxX),
      y: clamp(startRegion.y + dy, 0, maxY),
    };
  }

  let left = startRegion.x;
  let top = startRegion.y;
  let right = startRegion.x + startRegion.width;
  let bottom = startRegion.y + startRegion.height;

  if (handle === 'nw' || handle === 'sw') {
    left = clamp(left + dx, 0, 1);
  } else {
    right = clamp(right + dx, 0, 1);
  }
  if (handle === 'nw' || handle === 'ne') {
    top = clamp(top + dy, 0, 1);
  } else {
    bottom = clamp(bottom + dy, 0, 1);
  }

  // Dragging a corner past its opposite edge flips the rect rather than collapsing it.
  const x = Math.min(left, right);
  const y = Math.min(top, bottom);
  const width = Math.max(Math.abs(right - left), MIN_REGION_SIZE);
  const height = Math.max(Math.abs(bottom - top), MIN_REGION_SIZE);

  return {
    ...startRegion,
    x: Math.min(x, 1 - width),
    y: Math.min(y, 1 - height),
    width,
    height,
  };
}

export function cursorForRedactionHandle(handle: RedactionHandle): string {
  switch (handle) {
    case 'move':
      return 'move';
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    default:
      return 'crosshair';
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
