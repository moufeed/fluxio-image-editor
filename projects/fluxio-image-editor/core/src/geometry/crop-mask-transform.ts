import { normalizeCropMask, type CropMaskState, type ImageSize } from '../models/image-document';
import { ROTATE_HANDLE_OFFSET } from './annotation-transform';

/** Interactive crop-mask chrome: body move, edge inset, or rotate. */
export type CropMaskHandle = 'move' | 'inset' | 'rotate';

export interface CropMaskPoint {
  readonly x: number;
  readonly y: number;
}

/** Output-space AABB of the inset mask box (unrotated extents for chrome). */
export interface CropMaskChromeLayout {
  readonly cx: number;
  readonly cy: number;
  readonly boxW: number;
  readonly boxH: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly edgeHandles: readonly {
    readonly id: 'n' | 's' | 'e' | 'w';
    readonly x: number;
    readonly y: number;
  }[];
  readonly rotateHandle: CropMaskPoint;
}

/** Matches `generateCropMaskCanvas` box sizing (center + inset). */
export function cropMaskChromeLayout(
  cropMask: CropMaskState,
  output: ImageSize,
  rotateOffset: number = ROTATE_HANDLE_OFFSET,
): CropMaskChromeLayout {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const insetX = cropMask.inset * w * 0.5;
  const insetY = cropMask.inset * h * 0.5;
  const boxW = Math.max(1, w - insetX * 2);
  const boxH = Math.max(1, h - insetY * 2);
  const cx = cropMask.centerX * w;
  const cy = cropMask.centerY * h;
  const left = cx - boxW / 2;
  const top = cy - boxH / 2;
  const right = cx + boxW / 2;
  const bottom = cy + boxH / 2;
  const midX = cx;
  const midY = cy;

  const edgeHandles = [
    { id: 'n' as const, x: midX, y: top },
    { id: 's' as const, x: midX, y: bottom },
    { id: 'e' as const, x: right, y: midY },
    { id: 'w' as const, x: left, y: midY },
  ];

  // Place rotate handle in unrotated space above the box, then rotate around center.
  const localRotate = { x: 0, y: -boxH / 2 - rotateOffset };
  const rad = (cropMask.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotateHandle = {
    x: cx + localRotate.x * cos - localRotate.y * sin,
    y: cy + localRotate.x * sin + localRotate.y * cos,
  };

  return {
    cx,
    cy,
    boxW,
    boxH,
    left,
    top,
    right,
    bottom,
    edgeHandles: edgeHandles.map((edge) => {
      const lx = edge.x - cx;
      const ly = edge.y - cy;
      return {
        id: edge.id,
        x: cx + lx * cos - ly * sin,
        y: cy + lx * sin + ly * cos,
      };
    }),
    rotateHandle,
  };
}

/**
 * Hit-test crop-mask handles in output pixels.
 * Edge midpoints → `inset`; top knob → `rotate`; body → `move`.
 */
export function hitTestCropMaskHandle(
  cropMask: CropMaskState,
  point: CropMaskPoint,
  output: ImageSize,
  handleHitSize: number,
  rotateOffset: number = ROTATE_HANDLE_OFFSET,
): CropMaskHandle | null {
  if (cropMask.shape === 'none') {
    return null;
  }
  const half = Math.max(handleHitSize, 4);
  const layout = cropMaskChromeLayout(cropMask, output, rotateOffset);

  if (
    Math.abs(point.x - layout.rotateHandle.x) <= half &&
    Math.abs(point.y - layout.rotateHandle.y) <= half
  ) {
    return 'rotate';
  }

  for (const edge of layout.edgeHandles) {
    if (Math.abs(point.x - edge.x) <= half && Math.abs(point.y - edge.y) <= half) {
      return 'inset';
    }
  }

  // Body hit in rotated local space (same AABB as the outline).
  const rad = (cropMask.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - layout.cx;
  const dy = point.y - layout.cy;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  if (Math.abs(localX) <= layout.boxW / 2 && Math.abs(localY) <= layout.boxH / 2) {
    return 'move';
  }

  return null;
}

/**
 * Apply one pointer-drag sample against the crop-mask at gesture start.
 * Preview-only; callers commit via crop-mask.set once.
 */
export function applyCropMaskDrag(
  startMask: CropMaskState,
  handle: CropMaskHandle,
  startPoint: CropMaskPoint,
  currentPoint: CropMaskPoint,
  output: ImageSize,
): CropMaskState {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const startCx = startMask.centerX * w;
  const startCy = startMask.centerY * h;

  if (handle === 'move') {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    return normalizeCropMask({
      ...startMask,
      centerX: startMask.centerX + dx / w,
      centerY: startMask.centerY + dy / h,
    });
  }

  if (handle === 'rotate') {
    const angle =
      (Math.atan2(currentPoint.y - startCy, currentPoint.x - startCx) * 180) / Math.PI + 90;
    return normalizeCropMask({ ...startMask, angle });
  }

  // inset: distance from mask center → box half-size → inset factor.
  const dx = Math.abs(currentPoint.x - startCx);
  const dy = Math.abs(currentPoint.y - startCy);
  let inset: number;
  if (dx * h >= dy * w) {
    // boxW = w * (1 - inset) ⇒ inset = 1 - 2*dx/w
    inset = 1 - (2 * dx) / w;
  } else {
    inset = 1 - (2 * dy) / h;
  }
  return normalizeCropMask({ ...startMask, inset });
}

export function cursorForCropMaskHandle(handle: CropMaskHandle): string {
  switch (handle) {
    case 'move':
      return 'move';
    case 'inset':
      return 'nwse-resize';
    case 'rotate':
      return 'grab';
    default:
      return 'default';
  }
}
