import type { ViewportState } from '../models/viewport-state';

export interface ZoomAtPointResult {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly fitMode: 'manual';
}

/**
 * Zoom around a viewport-local point so content under the cursor stays stable.
 */
export function zoomAtPoint(
  viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
  nextZoom: number,
  pointX: number,
  pointY: number,
): ZoomAtPointResult {
  const prev = Math.max(viewport.zoom, Number.EPSILON);
  const zoom = Math.max(nextZoom, Number.EPSILON);
  const scale = zoom / prev;
  return {
    zoom,
    panX: pointX - (pointX - viewport.panX) * scale,
    panY: pointY - (pointY - viewport.panY) * scale,
    fitMode: 'manual',
  };
}

export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  return Math.min(Math.max(zoom, minZoom), maxZoom);
}
