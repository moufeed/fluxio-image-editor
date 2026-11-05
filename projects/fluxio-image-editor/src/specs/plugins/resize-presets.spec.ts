import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RESIZE_SIZE_PRESETS,
  matchResizeSizePreset,
  normalizeResizeSizePresets,
  resolveResizeConfig,
} from 'fluxio-image-editor/core';

describe('PV08 resize size presets', () => {
  it('defaults to built-in web size chips', () => {
    expect(resolveResizeConfig().sizePresets).toEqual(DEFAULT_RESIZE_SIZE_PRESETS);
    expect(resolveResizeConfig({}).sizePresets?.length).toBeGreaterThan(0);
  });

  it('allows hosts to hide presets with an empty list', () => {
    expect(resolveResizeConfig({ sizePresets: [] }).sizePresets).toEqual([]);
  });

  it('normalizes host presets and drops invalid / duplicate ids', () => {
    const presets = normalizeResizeSizePresets([
      { id: 'a', label: 'A', width: 100.4, height: 50.6 },
      { id: 'a', label: 'dup', width: 200, height: 100 },
      { id: 'b', label: '  ', width: 0, height: 10 },
      { id: '', label: 'empty', width: 10, height: 10 },
      { id: 'c', label: 'C', width: 320, height: 240 },
    ]);
    expect(presets).toEqual([
      { id: 'a', label: 'A', labelKey: undefined, width: 100, height: 51 },
      { id: 'c', label: 'C', labelKey: undefined, width: 320, height: 240 },
    ]);
  });

  it('matches exact dimensions to a preset', () => {
    const presets = DEFAULT_RESIZE_SIZE_PRESETS;
    expect(matchResizeSizePreset(presets, 1920, 1080)?.id).toBe('1920x1080');
    expect(matchResizeSizePreset(presets, 1920, 1081)).toBeNull();
  });
});
