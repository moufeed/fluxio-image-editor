import {
  normalizeFocus,
  type FocusState,
  type ImageSize,
} from '../models/image-document';
import { ROTATE_HANDLE_OFFSET } from './annotation-transform';

/** Interactive focus chrome: body move, size, or linear-band rotate. */
export type FocusHandle = 'move' | 'size' | 'rotate';

export interface FocusPoint {
  readonly x: number;
  readonly y: number;
}

/** Output-space geometry derived from focus state (matches focus compositing). */
export interface FocusChromeLayout {
  readonly cx: number;
  readonly cy: number;
  readonly diagonal: number;
  /** Radial inner radius, or linear band half-width. */
  readonly radius: number;
  readonly sizeHandle: FocusPoint;
  readonly rotateHandle: FocusPoint | null;
}

export function focusChromeLayout(
  focus: FocusState,
  output: ImageSize,
  rotateGap: number = ROTATE_HANDLE_OFFSET,
): FocusChromeLayout {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const cx = focus.centerX * w;
  const cy = focus.centerY * h;
  const diagonal = Math.sqrt(w * w + h * h);
  const radius =
    focus.mode === 'linear'
      ? Math.max(8, focus.size * diagonal * 0.25)
      : Math.max(8, focus.size * diagonal * 0.5);

  if (focus.mode === 'linear') {
    const rad = (focus.angle * Math.PI) / 180;
    // Band is horizontal in local space after rotate(angle); size along local Y.
    const sizeHandle = {
      x: cx + Math.sin(rad) * radius,
      y: cy - Math.cos(rad) * radius,
    };
    const rotateOffset = Math.max(radius + rotateGap, rotateGap + 12);
    const rotateHandle = {
      x: cx + Math.cos(rad) * rotateOffset,
      y: cy + Math.sin(rad) * rotateOffset,
    };
    return { cx, cy, diagonal, radius, sizeHandle, rotateHandle };
  }

  return {
    cx,
    cy,
    diagonal,
    radius,
    sizeHandle: { x: cx + radius, y: cy },
    rotateHandle: null,
  };
}

/**
 * Hit-test focus handles in output pixels.
 * `handleHitSize` is the half-extent of each handle in output pixels.
 */
export function hitTestFocusHandle(
  focus: FocusState,
  point: FocusPoint,
  output: ImageSize,
  handleHitSize: number,
  rotateGap: number = ROTATE_HANDLE_OFFSET,
): FocusHandle | null {
  if (focus.mode === 'none') {
    return null;
  }
  const half = Math.max(handleHitSize, 4);
  const layout = focusChromeLayout(focus, output, rotateGap);

  if (layout.rotateHandle) {
    if (
      Math.abs(point.x - layout.rotateHandle.x) <= half &&
      Math.abs(point.y - layout.rotateHandle.y) <= half
    ) {
      return 'rotate';
    }
  }

  if (
    Math.abs(point.x - layout.sizeHandle.x) <= half &&
    Math.abs(point.y - layout.sizeHandle.y) <= half
  ) {
    return 'size';
  }

  const dx = point.x - layout.cx;
  const dy = point.y - layout.cy;
  if (focus.mode === 'radial') {
    if (dx * dx + dy * dy <= layout.radius * layout.radius) {
      return 'move';
    }
    return null;
  }

  // Linear: hit the rotated band strip (local |y| <= radius, |x| within extent).
  const rad = (focus.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  const extent = layout.diagonal * 0.6;
  if (Math.abs(localY) <= layout.radius && Math.abs(localX) <= extent) {
    return 'move';
  }
  return null;
}

/**
 * Apply one pointer-drag sample against the focus state at gesture start.
 * Preview-only; callers commit via focus.set once.
 */
export function applyFocusDrag(
  startFocus: FocusState,
  handle: FocusHandle,
  startPoint: FocusPoint,
  currentPoint: FocusPoint,
  output: ImageSize,
): FocusState {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const diagonal = Math.sqrt(w * w + h * h);

  if (handle === 'move') {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    return normalizeFocus({
      ...startFocus,
      centerX: startFocus.centerX + dx / w,
      centerY: startFocus.centerY + dy / h,
    });
  }

  if (handle === 'size') {
    const cx = startFocus.centerX * w;
    const cy = startFocus.centerY * h;
    const dist = Math.hypot(currentPoint.x - cx, currentPoint.y - cy);
    if (startFocus.mode === 'linear') {
      const size = dist / Math.max(diagonal * 0.25, 1);
      return normalizeFocus({ ...startFocus, size });
    }
    const size = dist / Math.max(diagonal * 0.5, 1);
    return normalizeFocus({ ...startFocus, size });
  }

  // rotate (linear only)
  const cx = startFocus.centerX * w;
  const cy = startFocus.centerY * h;
  const angle =
    (Math.atan2(currentPoint.y - cy, currentPoint.x - cx) * 180) / Math.PI;
  return normalizeFocus({ ...startFocus, angle });
}

export function cursorForFocusHandle(handle: FocusHandle): string {
  switch (handle) {
    case 'move':
      return 'move';
    case 'size':
      return 'nwse-resize';
    case 'rotate':
      return 'grab';
    default:
      return 'default';
  }
}
