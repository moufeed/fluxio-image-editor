import { clampZoom, zoomAtPoint } from './zoom';
import type { ViewportState } from '../models/viewport-state';

export interface PinchPoint {
  readonly x: number;
  readonly y: number;
}

export interface PinchViewportResult {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly fitMode: 'manual';
}

/** Midpoint between two viewport-local points. */
export function pinchMidpoint(a: PinchPoint, b: PinchPoint): PinchPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Euclidean distance between two viewport-local points. */
export function pinchDistance(a: PinchPoint, b: PinchPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Apply a two-finger pinch/pan step: zoom around the previous midpoint, then
 * pan by the midpoint movement so content tracks both fingers.
 */
export function applyPinchViewport(
  viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
  prevA: PinchPoint,
  prevB: PinchPoint,
  nextA: PinchPoint,
  nextB: PinchPoint,
  minZoom: number,
  maxZoom: number,
): PinchViewportResult {
  const prevMid = pinchMidpoint(prevA, prevB);
  const nextMid = pinchMidpoint(nextA, nextB);
  const prevDist = pinchDistance(prevA, prevB);
  const nextDist = pinchDistance(nextA, nextB);
  const scale = prevDist > Number.EPSILON ? nextDist / prevDist : 1;
  const nextZoom = clampZoom(viewport.zoom * scale, minZoom, maxZoom);
  const zoomed = zoomAtPoint(viewport, nextZoom, prevMid.x, prevMid.y);
  return {
    zoom: zoomed.zoom,
    panX: zoomed.panX + (nextMid.x - prevMid.x),
    panY: zoomed.panY + (nextMid.y - prevMid.y),
    fitMode: 'manual',
  };
}
