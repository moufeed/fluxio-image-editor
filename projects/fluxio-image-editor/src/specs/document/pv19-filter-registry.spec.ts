import {
  DEFAULT_FILTER_PRESETS,
  normalizeColorMatrix,
  normalizeFilters,
  resolveFilterLabel,
  resolveFilterPresetIds,
  resolveHostFilterMatrix,
  type FilterColorMatrix,
} from 'fluxio-image-editor/core';
import { describe, expect, it } from 'vitest';

/** Blue-channel emphasize matrix (Pintura filter docs example shape). */
const BLUE_MATRIX = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0,
] as const satisfies FilterColorMatrix;

describe('PV19 host filter registry', () => {
  it('normalizes custom preset ids and rejects unsafe ids', () => {
    expect(normalizeFilters({ preset: 'blue' }).preset).toBe('blue');
    expect(normalizeFilters('chrome').preset).toBe('chrome');
    expect(normalizeFilters({ preset: 'bad id' }).preset).toBe('none');
    expect(normalizeFilters({ preset: '' }).preset).toBe('none');
    expect(normalizeFilters({ preset: '1startsWithDigit' }).preset).toBe('none');
  });

  it('resolves preset lists: defaults, merge host keys, explicit order', () => {
    expect(resolveFilterPresetIds(null)).toEqual([...DEFAULT_FILTER_PRESETS]);

    expect(
      resolveFilterPresetIds({
        filterFunctions: { blue: BLUE_MATRIX, sepia: BLUE_MATRIX },
      }),
    ).toEqual([...DEFAULT_FILTER_PRESETS, 'blue']);

    expect(
      resolveFilterPresetIds({
        presets: ['none', 'blue', 'sepia', 'blue'],
        filterFunctions: { blue: BLUE_MATRIX },
      }),
    ).toEqual(['none', 'blue', 'sepia']);
  });

  it('normalizes color matrices from arrays and factories', () => {
    expect(normalizeColorMatrix(BLUE_MATRIX)).toEqual([...BLUE_MATRIX]);
    expect(normalizeColorMatrix(() => [...BLUE_MATRIX])).toEqual([...BLUE_MATRIX]);
    expect(normalizeColorMatrix([1, 2, 3])).toBeNull();
    expect(normalizeColorMatrix(() => { throw new Error('boom'); })).toBeNull();
  });

  it('resolves host matrices including built-in overrides', () => {
    const functions = {
      blue: () => BLUE_MATRIX,
      sepia: BLUE_MATRIX,
    };
    expect(resolveHostFilterMatrix('blue', functions)).toEqual([...BLUE_MATRIX]);
    expect(resolveHostFilterMatrix('sepia', functions)).toEqual([...BLUE_MATRIX]);
    expect(resolveHostFilterMatrix('grayscale', functions)).toBeNull();
    expect(resolveHostFilterMatrix('none', functions)).toBeNull();
  });

  it('resolves host labels with id fallback', () => {
    expect(resolveFilterLabel('blue', { blue: 'Blue cast' })).toBe('Blue cast');
    expect(resolveFilterLabel('blue', {})).toBe('blue');
  });
});
