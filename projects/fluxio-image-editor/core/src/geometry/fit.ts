import type { ImageSize } from '../models/image-document';
import type { ViewportState } from '../models/viewport-state';

export interface FitResult {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface ContainFitOptions {
  /** Cap zoom so small images are not upscaled past this factor (e.g. 1 = actual size). */
  readonly maxZoom?: number;
}

/**
 * Fit the full image (or cropped content) inside the viewport and center it.
 * Rotation of 90/270 swaps effective bounds for fit calculation.
 */
export function computeContainFit(
  imageSize: ImageSize,
  viewport: Pick<ViewportState, 'width' | 'height'>,
  rotationDegrees = 0,
  options: ContainFitOptions = {},
): FitResult {
  const width = Math.max(viewport.width, 1);
  const height = Math.max(viewport.height, 1);
  const { contentWidth, contentHeight } = orientedContentSize(imageSize, rotationDegrees);

  let zoom = Math.min(width / contentWidth, height / contentHeight);
  if (options.maxZoom != null) {
    zoom = Math.min(zoom, options.maxZoom);
  }
  const pan = computeCenteredPan(imageSize, { ...viewport, zoom }, rotationDegrees);
  return { zoom, panX: pan.panX, panY: pan.panY };
}

/**
 * Center content in the viewport at the current zoom (keep zoom, fix pan only).
 */
export function computeCenteredPan(
  imageSize: ImageSize,
  viewport: Pick<ViewportState, 'width' | 'height' | 'zoom'>,
  rotationDegrees = 0,
): { readonly panX: number; readonly panY: number } {
  const width = Math.max(viewport.width, 1);
  const height = Math.max(viewport.height, 1);
  const zoom = Math.max(viewport.zoom, Number.EPSILON);
  const { contentWidth, contentHeight } = orientedContentSize(imageSize, rotationDegrees);
  return {
    panX: (width - contentWidth * zoom) / 2,
    panY: (height - contentHeight * zoom) / 2,
  };
}

/** True when viewport pan already matches centered pan (within `epsilon` CSS pixels). */
export function isViewportCentered(
  viewport: Pick<ViewportState, 'width' | 'height' | 'zoom' | 'panX' | 'panY'>,
  imageSize: ImageSize,
  rotationDegrees = 0,
  epsilon = 0.5,
): boolean {
  const centered = computeCenteredPan(imageSize, viewport, rotationDegrees);
  return (
    Math.abs(viewport.panX - centered.panX) <= epsilon &&
    Math.abs(viewport.panY - centered.panY) <= epsilon
  );
}

function orientedContentSize(
  imageSize: ImageSize,
  rotationDegrees: number,
): { contentWidth: number; contentHeight: number } {
  const normalized = ((rotationDegrees % 360) + 360) % 360;
  const swapped = normalized === 90 || normalized === 270;
  return {
    contentWidth: swapped ? imageSize.height : imageSize.width,
    contentHeight: swapped ? imageSize.width : imageSize.height,
  };
}
