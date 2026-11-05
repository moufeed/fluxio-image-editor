import {
  colorOverlayEqual,
  createImageDocument,
  createInitialColorOverlay,
  isIdentityColorOverlay,
  normalizeColorOverlay,
} from 'fluxio-image-editor/core';
import { applyColorOverlay } from 'fluxio-image-editor/plugins/color-overlay';

describe('color overlay model', () => {
  it('creates identity overlay by default', () => {
    const overlay = createInitialColorOverlay();
    expect(overlay.mode).toBe('none');
    expect(isIdentityColorOverlay(overlay)).toBe(true);
  });

  it('normalizes and clamps overlay values', () => {
    expect(
      normalizeColorOverlay({
        mode: 'linear',
        opacity: 1.5,
        angle: 450,
        color: '#ff0000',
        color2: '',
      }),
    ).toEqual({
      mode: 'linear',
      color: '#ff0000',
      color2: '#ff6b35',
      opacity: 1,
      angle: 90,
    });
    expect(normalizeColorOverlay({ mode: 'nope' as 'solid' }).mode).toBe('none');
  });

  it('compares overlay states and applies document updates', () => {
    const base = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 100, height: 80 },
    });
    expect(isIdentityColorOverlay(base.colorOverlay)).toBe(true);

    const next = applyColorOverlay(base, {
      mode: 'solid',
      color: '#112233',
      opacity: 0.35,
    });
    expect(next.colorOverlay.mode).toBe('solid');
    expect(next.colorOverlay.color).toBe('#112233');
    expect(next.colorOverlay.opacity).toBe(0.35);
    expect(colorOverlayEqual(next.colorOverlay, next.colorOverlay)).toBe(true);
    expect(applyColorOverlay(next, next.colorOverlay)).toBe(next);
  });
});
