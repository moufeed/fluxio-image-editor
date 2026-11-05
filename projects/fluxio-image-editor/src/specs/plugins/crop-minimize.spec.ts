import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CROP_CONFIG,
  resolveCropConfig,
  resolveCropMinimizeToolbar,
} from 'fluxio-image-editor/core';

describe('PV37 crop minimizeToolbar', () => {
  it('defaults to auto', () => {
    expect(DEFAULT_CROP_CONFIG.minimizeToolbar).toBe('auto');
    expect(resolveCropConfig().minimizeToolbar).toBe('auto');
    expect(resolveCropConfig({}).minimizeToolbar).toBe('auto');
  });

  it('accepts always / never and rejects unknown values', () => {
    expect(resolveCropMinimizeToolbar('always')).toBe('always');
    expect(resolveCropMinimizeToolbar('never')).toBe('never');
    expect(resolveCropMinimizeToolbar('auto')).toBe('auto');
    expect(resolveCropMinimizeToolbar(null)).toBe('auto');
    expect(resolveCropMinimizeToolbar(undefined)).toBe('auto');
    expect(resolveCropMinimizeToolbar('bogus' as 'auto')).toBe('auto');
    expect(resolveCropConfig({ minimizeToolbar: 'always' }).minimizeToolbar).toBe('always');
    expect(resolveCropConfig({ minimizeToolbar: 'never' }).minimizeToolbar).toBe('never');
  });
});
