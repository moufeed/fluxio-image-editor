import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CROP_BLEED_INSET,
  clampCropBleedInset,
  cropGuidesActive,
  cropProfileCircleMaskPath,
  layoutCropGuides,
  resolveCropGuides,
} from 'fluxio-image-editor/core';

describe('PV04 crop guides', () => {
  it('resolves defaults and clamps bleed', () => {
    expect(resolveCropGuides(null)).toEqual({ profileCircle: false, bleed: 0 });
    expect(resolveCropGuides({ profileCircle: true, bleed: 0.05 })).toEqual({
      profileCircle: true,
      bleed: 0.05,
    });
    expect(clampCropBleedInset(-1)).toBe(0);
    expect(clampCropBleedInset(1)).toBe(0.45);
    expect(cropGuidesActive({ profileCircle: true })).toBe(true);
    expect(cropGuidesActive({ bleed: DEFAULT_CROP_BLEED_INSET })).toBe(true);
    expect(cropGuidesActive({})).toBe(false);
  });

  it('layouts an inscribed profile circle', () => {
    const layout = layoutCropGuides(
      { x: 10, y: 20, width: 200, height: 100 },
      { profileCircle: true },
    );
    expect(layout.profileCircle).toEqual({ cx: 110, cy: 70, r: 50 });
    expect(layout.bleed).toBeNull();
  });

  it('layouts a bleed inset rect', () => {
    const layout = layoutCropGuides(
      { x: 0, y: 0, width: 200, height: 100 },
      { bleed: 0.1 },
    );
    expect(layout.bleed).toEqual({ x: 20, y: 10, width: 160, height: 80 });
    expect(layout.profileCircle).toBeNull();
  });

  it('builds an even-odd profile mask path', () => {
    const circle = { cx: 50, cy: 50, r: 40 };
    const path = cropProfileCircleMaskPath({ x: 0, y: 0, width: 100, height: 100 }, circle);
    expect(path).toContain('M 0 0');
    expect(path).toContain('a 40,40 0 1,0');
    expect(path.split('Z').length).toBeGreaterThan(2);
  });
});
