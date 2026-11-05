import {
  createInitialWatermark,
  normalizeWatermark,
  watermarksEqual,
} from 'fluxio-image-editor/core';

describe('watermarksEqual', () => {
  it('compares normalized fields without JSON serialization', () => {
    const a = normalizeWatermark({
      mode: 'text',
      text: 'Hello',
      opacity: 0.5,
      position: 'center',
    });
    const b = normalizeWatermark({
      mode: 'text',
      text: 'Hello',
      opacity: 0.5,
      position: 'center',
    });
    expect(watermarksEqual(a, b)).toBe(true);
    expect(watermarksEqual(a, { ...b, text: 'Other' })).toBe(false);
    expect(watermarksEqual(a, { ...b, fill: '#ff0000' })).toBe(false);
    expect(watermarksEqual(null, createInitialWatermark())).toBe(true);
    expect(
      watermarksEqual(
        normalizeWatermark({ mode: 'image', imageSrc: 'a.png' }),
        normalizeWatermark({ mode: 'image', imageSrc: 'b.png' }),
      ),
    ).toBe(false);
  });
});
