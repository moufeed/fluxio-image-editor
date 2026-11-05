import { allHarmonyColors, harmonyColors, hslToRgb, rgbToHsl } from 'fluxio-image-editor/core';

describe('color harmony helpers', () => {
  it('round-trips rgb ↔ hsl for primary red', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0, a: 1 });
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(1, 5);
    expect(hsl.l).toBeCloseTo(0.5, 5);
    const rgb = hslToRgb(hsl);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('returns complementary and analogous swatches', () => {
    const base = { r: 40, g: 120, b: 200, a: 1 };
    expect(harmonyColors(base, 'complementary')).toHaveLength(1);
    expect(harmonyColors(base, 'analogous')).toHaveLength(2);
    expect(allHarmonyColors(base).length).toBeGreaterThan(0);
  });
});
