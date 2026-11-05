import {
  applyCropDrag,
  createDefaultCrop,
  hitTestCropHandle,
  MIN_CROP_SIZE,
  nudgeCrop,
  resizeCropEdge,
  validateCrop,
  type ImageSize,
} from 'fluxio-image-editor/core';

describe('crop geometry', () => {
  const sourceSize: ImageSize = { width: 200, height: 100 };

  it('validates crop minimum size and bounds', () => {
    const invalid = validateCrop(
      { x: 0, y: 0, width: 2, height: 2, aspectRatio: null },
      sourceSize,
    );
    expect(invalid.valid).toBe(false);

    const valid = validateCrop(
      { x: 10, y: 10, width: MIN_CROP_SIZE, height: MIN_CROP_SIZE, aspectRatio: 1 },
      sourceSize,
    );
    expect(valid.valid).toBe(true);
  });

  it('creates centered default crop', () => {
    const crop = createDefaultCrop(sourceSize, 1);
    expect(crop.width).toBeCloseTo(crop.height, 5);
    expect(crop.x).toBeGreaterThan(0);
  });

  it('hit-tests crop handles and move body', () => {
    const crop = { x: 40, y: 20, width: 80, height: 40, aspectRatio: null };
    expect(hitTestCropHandle(crop, { x: 40, y: 20 }, 6)).toBe('nw');
    expect(hitTestCropHandle(crop, { x: 120, y: 40 }, 6)).toBe('e');
    expect(hitTestCropHandle(crop, { x: 80, y: 40 }, 6)).toBe('move');
    expect(hitTestCropHandle(crop, { x: 10, y: 10 }, 6)).toBeNull();
  });

  it('moves and resizes crop during drag without leaving image bounds', () => {
    const start = { x: 40, y: 20, width: 80, height: 40, aspectRatio: null };
    const moved = applyCropDrag(start, 'move', { x: 50, y: 30 }, { x: 70, y: 45 }, sourceSize);
    expect(moved.x).toBe(60);
    expect(moved.y).toBe(35);
    expect(moved.width).toBe(80);

    const resized = applyCropDrag(start, 'se', { x: 120, y: 60 }, { x: 140, y: 80 }, sourceSize);
    expect(resized.width).toBeGreaterThan(start.width);
    expect(resized.height).toBeGreaterThan(start.height);
    expect(resized.x + resized.width).toBeLessThanOrEqual(sourceSize.width + 0.5);
    expect(resized.y + resized.height).toBeLessThanOrEqual(sourceSize.height + 0.5);
  });

  it('keeps locked aspect ratio while resizing from a corner', () => {
    const start = { x: 40, y: 20, width: 80, height: 40, aspectRatio: 2 };
    const resized = applyCropDrag(start, 'se', { x: 120, y: 60 }, { x: 150, y: 100 }, sourceSize);
    expect(resized.width / resized.height).toBeCloseTo(2, 5);
  });

  it('preserves elliptical shape through default crop and drag', () => {
    const start = createDefaultCrop(sourceSize, null, 'ellipse');
    expect(start.shape).toBe('ellipse');
    const moved = applyCropDrag(start, 'move', { x: 50, y: 30 }, { x: 60, y: 40 }, sourceSize);
    expect(moved.shape).toBe('ellipse');
  });

  it('nudges and edge-resizes crop from keyboard helpers (PV38)', () => {
    const start = { x: 40, y: 20, width: 80, height: 40, aspectRatio: null };
    const moved = nudgeCrop(start, 10, -5, sourceSize);
    expect(moved.x).toBe(50);
    expect(moved.y).toBe(15);

    const grown = resizeCropEdge(start, 'e', 10, sourceSize);
    expect(grown.width).toBeGreaterThan(start.width);
    const fromNorth = resizeCropEdge(start, 'n', 8, sourceSize);
    expect(fromNorth.y).toBeLessThan(start.y);
  });
});
