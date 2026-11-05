import {
  createImageDocument,
  createInitialFocus,
  focusEqual,
  isIdentityFocus,
  normalizeFocus,
} from 'fluxio-image-editor/core';
import { applyFocus } from 'fluxio-image-editor/plugins/focus';

describe('Focus model', () => {
  it('creates identity focus by default', () => {
    const focus = createInitialFocus();
    expect(focus).toEqual({
      mode: 'none',
      centerX: 0.5,
      centerY: 0.5,
      blur: 0.5,
      size: 0.3,
      feather: 0.4,
      angle: 0,
    });
    expect(isIdentityFocus(focus)).toBe(true);
    expect(isIdentityFocus(null)).toBe(true);
  });

  it('normalizes and clamps focus values', () => {
    expect(
      normalizeFocus({
        mode: 'radial',
        centerX: 2,
        centerY: -1,
        blur: 1.5,
        size: -0.2,
        feather: 0.8,
        angle: 200,
      }),
    ).toEqual({
      mode: 'radial',
      centerX: 1,
      centerY: 0,
      blur: 1,
      size: 0,
      feather: 0.8,
      angle: 180,
    });
    expect(normalizeFocus({ mode: 'nope' as 'radial' }).mode).toBe('none');
    expect(normalizeFocus(null)).toEqual(createInitialFocus());
  });

  it('compares focus states and applies document updates', () => {
    const base = createImageDocument({
      source: { kind: 'url', id: '1', url: 'x' },
      sourceSize: { width: 100, height: 80 },
    });
    expect(isIdentityFocus(base.focus)).toBe(true);

    const next = applyFocus(base, { mode: 'linear', blur: 0.7, angle: 45 });
    expect(next.focus.mode).toBe('linear');
    expect(next.focus.blur).toBe(0.7);
    expect(next.focus.angle).toBe(45);
    expect(focusEqual(next.focus, next.focus)).toBe(true);
    expect(applyFocus(next, next.focus)).toBe(next);
    expect(applyFocus(next, null).focus.mode).toBe('none');
  });
});
