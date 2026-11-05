import { describe, expect, it } from 'vitest';

import {
  MAX_PREVIEW_LONG_EDGE,
  computePreviewMaxLongEdge,
  resolvePreviewOutputSize,
} from '../../../renderer-fabric/src/preview-compose';

describe('resolvePreviewOutputSize', () => {
  it('keeps full size when under the cap', () => {
    expect(resolvePreviewOutputSize(800, 600, 2048)).toEqual({
      width: 800,
      height: 600,
      scale: 1,
    });
  });

  it('downscales large output uniformly', () => {
    const result = resolvePreviewOutputSize(7952, 5304, 2048);
    expect(result.scale).toBeCloseTo(2048 / 7952, 6);
    expect(result.width).toBe(2048);
    expect(result.height).toBe(Math.round(5304 * (2048 / 7952)));
  });

  it('returns full size when maxLongEdge is omitted', () => {
    expect(resolvePreviewOutputSize(7952, 5304)).toEqual({
      width: 7952,
      height: 5304,
      scale: 1,
    });
  });
});

describe('computePreviewMaxLongEdge', () => {
  it('uses canvas×dpr budget when the image is fitted (zoom ≈ canvas/image)', () => {
    const fullWidth = 7952;
    const fullHeight = 5304;
    const canvasWidth = 1000;
    const canvasHeight = 700;
    const zoom = canvasWidth / fullWidth;
    const edge = computePreviewMaxLongEdge({
      fullWidth,
      fullHeight,
      canvasWidth,
      canvasHeight,
      zoom,
      devicePixelRatio: 1,
    });
    expect(edge).toBeLessThan(fullWidth);
    expect(edge).toBeLessThanOrEqual(MAX_PREVIEW_LONG_EDGE);
    expect(edge).toBeGreaterThanOrEqual(256);
  });

  it('never exceeds the image long edge or the hard cap', () => {
    const edge = computePreviewMaxLongEdge({
      fullWidth: 4000,
      fullHeight: 3000,
      canvasWidth: 2000,
      canvasHeight: 1500,
      zoom: 4,
      devicePixelRatio: 2,
      maxLongEdge: 2048,
    });
    expect(edge).toBe(2048);
  });
});
