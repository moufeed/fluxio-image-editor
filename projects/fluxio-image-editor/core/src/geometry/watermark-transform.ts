import type { ImageSize, WatermarkState } from '../models/image-document';
import { normalizeWatermark, resolveWatermarkPlacement } from '../models/image-document';
import {
  applyBoundsDrag,
  containBounds,
  hitTestBoundsHandle,
  rotationDeltaDegrees,
  ANNOTATION_ROTATE_HANDLE_OFFSET,
  type AnnotationHandle,
  type AnnotationPoint2D,
  type InteractiveBounds,
  MIN_INTERACTIVE_ANNOTATION_SIZE,
} from './annotation-transform';

/**
 * Coordinate space: **document/output pixels** (same as annotation-transform).
 */

export const WATERMARK_INTERACTION_ID = '__fluxio_watermark__';

/** Estimate rendered watermark AABB (text uses glyph-width heuristic). */
export function estimateWatermarkBounds(
  watermark: WatermarkState,
  output: ImageSize,
  imageNatural: ImageSize | null = null,
): InteractiveBounds | null {
  if (watermark.mode === 'none') {
    return null;
  }

  const box = estimateWatermarkBox(watermark, output, imageNatural);
  if (!box) {
    return null;
  }
  const origin = resolveWatermarkPlacement(output, box, watermark);
  return { x: origin.x, y: origin.y, width: box.width, height: box.height };
}

export function estimateWatermarkBox(
  watermark: WatermarkState,
  output: ImageSize,
  imageNatural: ImageSize | null = null,
): ImageSize | null {
  if (watermark.mode === 'none') {
    return null;
  }

  const minEdge = Math.min(output.width, output.height);

  if (watermark.mode === 'text') {
    const fontSize = Math.max(10, Math.round(minEdge * 0.06 * watermark.scale));
    const text = watermark.text.length > 0 ? watermark.text : 'W';
    return {
      width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, text.length * fontSize * 0.55),
      height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, fontSize * 1.2),
    };
  }

  if (watermark.mode === 'image') {
    if (!watermark.imageSrc) {
      return null;
    }
    const natW = imageNatural?.width && imageNatural.width > 0 ? imageNatural.width : 128;
    const natH = imageNatural?.height && imageNatural.height > 0 ? imageNatural.height : 128;
    const maxEdge = Math.max(24, minEdge * 0.35 * watermark.scale);
    const fit = Math.min(maxEdge / natW, maxEdge / natH);
    return {
      width: Math.max(1, Math.round(natW * fit)),
      height: Math.max(1, Math.round(natH * fit)),
    };
  }

  return null;
}

export function hitTestWatermarkHandle(
  bounds: InteractiveBounds,
  point: AnnotationPoint2D,
  handleHitSize: number,
  rotateOffset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): AnnotationHandle | null {
  return hitTestBoundsHandle(bounds, point, handleHitSize, rotateOffset);
}

/**
 * Apply move / aspect-preserving corner scale / rotation to a single watermark.
 * Resize updates `scale` proportionally and writes absolute `x`/`y`.
 * Rotation spins around the mark centre and leaves placement untouched, so a
 * preset position keeps snapping.
 */
export function applyWatermarkDrag(
  start: WatermarkState,
  startBounds: InteractiveBounds,
  handle: AnnotationHandle,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
  output: ImageSize,
): WatermarkState {
  if (handle === 'rotate') {
    const center = {
      x: startBounds.x + startBounds.width / 2,
      y: startBounds.y + startBounds.height / 2,
    };
    return normalizeWatermark({
      ...start,
      angle: start.angle + rotationDeltaDegrees(center, startPoint, currentPoint),
    });
  }

  if (handle === 'move') {
    const next = applyBoundsDrag(startBounds, handle, startPoint, currentPoint, output, {
      preserveAspect: true,
      minSize: MIN_INTERACTIVE_ANNOTATION_SIZE,
    });
    const contained = containBounds(next, output, MIN_INTERACTIVE_ANNOTATION_SIZE, true);
    return normalizeWatermark({
      ...start,
      x: contained.x,
      y: contained.y,
    });
  }

  const next = applyBoundsDrag(startBounds, handle, startPoint, currentPoint, output, {
    preserveAspect: true,
    minSize: MIN_INTERACTIVE_ANNOTATION_SIZE,
  });
  const contained = containBounds(next, output, MIN_INTERACTIVE_ANNOTATION_SIZE, true);
  const scaleFactor =
    startBounds.width > 0 ? contained.width / startBounds.width : 1;
  const scale = Math.max(0.1, start.scale * scaleFactor);

  return normalizeWatermark({
    ...start,
    x: contained.x,
    y: contained.y,
    scale,
  });
}
