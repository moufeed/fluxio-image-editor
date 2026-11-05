import {
  createImageDocument,
  createInitialAdjustments,
  createInitialEffects,
  isIdentityAdjustments,
  isIdentityEffects,
  isIdentityFilters,
  normalizeAdjustments,
  normalizeEffects,
  normalizeFilters,
} from 'fluxio-image-editor/core';

describe('finetune state normalize / identity', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('normalizes adjustments without mutating identity', () => {
    expect(isIdentityAdjustments(base.adjustments)).toBe(true);
    expect(normalizeAdjustments({ brightness: 2, blur: -1, sharpen: 3, exposure: -2 })).toEqual({
      ...createInitialAdjustments(),
      brightness: 1,
      blur: 0,
      sharpen: 1,
      exposure: -1,
    });
  });

  it('normalizes effects and filter presets', () => {
    expect(isIdentityEffects(base.effects)).toBe(true);
    expect(isIdentityFilters(base.filters)).toBe(true);
    expect(normalizeEffects({ threshold: 2, noise: -1 })).toEqual({
      ...createInitialEffects(),
      threshold: 1,
      noise: 0,
    });
    expect(normalizeFilters({ preset: 'sepia' }).preset).toBe('sepia');
    expect(normalizeFilters('vintage').preset).toBe('vintage');
  });
});
