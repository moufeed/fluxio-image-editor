import {
  createImageDocument,
  createInitialCropMask,
  cropMaskEqual,
  isIdentityCropMask,
  normalizeCropMask,
} from 'fluxio-image-editor/core';
import { applyCropMask } from 'fluxio-image-editor/plugins/crop-mask';

describe('crop mask model', () => {
  it('creates identity crop mask by default', () => {
    const mask = createInitialCropMask();
    expect(mask).toEqual({
      shape: 'none',
      centerX: 0.5,
      centerY: 0.5,
      inset: 0,
      cornerRadius: 0.2,
      feather: 0,
      angle: 0,
      customPath: '',
    });
    expect(isIdentityCropMask(mask)).toBe(true);
  });

  it('normalizes and clamps crop mask values', () => {
    expect(
      normalizeCropMask({
        shape: 'star',
        centerX: 2,
        centerY: -1,
        inset: 2,
        cornerRadius: -1,
        feather: 1.5,
        angle: 400,
      }),
    ).toEqual({
      shape: 'star',
      centerX: 1,
      centerY: 0,
      inset: 0.45,
      cornerRadius: 0,
      feather: 1,
      angle: 180,
      customPath: '',
    });
    expect(normalizeCropMask({ shape: 'not-a-shape' as 'circle' }).shape).toBe('none');
  });

  it('compares crop mask states and applies document updates', () => {
    const base = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 100, height: 80 },
    });
    expect(isIdentityCropMask(base.cropMask)).toBe(true);

    const next = applyCropMask(base, { shape: 'heart', inset: 0.1, angle: 15 });
    expect(next.cropMask.shape).toBe('heart');
    expect(next.cropMask.inset).toBe(0.1);
    expect(next.cropMask.angle).toBe(15);
    expect(cropMaskEqual(next.cropMask, next.cropMask)).toBe(true);
    expect(applyCropMask(next, next.cropMask)).toBe(next);
    expect(applyCropMask(next, null).cropMask.shape).toBe('none');
  });
});
