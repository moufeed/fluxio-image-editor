import { createImageDocument } from 'fluxio-image-editor/core';
import { applyAdjustments } from 'fluxio-image-editor/plugins/adjustments';

describe('applyAdjustments', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('applies adjustments and is idempotent for the same values', () => {
    const adjusted = applyAdjustments(base, {
      brightness: 0.2,
      contrast: -0.1,
      warmth: 0.4,
      blur: 0.25,
      exposure: 0.3,
      sharpen: 0.5,
    });
    expect(adjusted.adjustments.brightness).toBe(0.2);
    expect(adjusted.adjustments.contrast).toBe(-0.1);
    expect(adjusted.adjustments.warmth).toBe(0.4);
    expect(adjusted.adjustments.blur).toBe(0.25);
    expect(adjusted.adjustments.exposure).toBe(0.3);
    expect(adjusted.adjustments.sharpen).toBe(0.5);
    expect(applyAdjustments(adjusted, adjusted.adjustments)).toBe(adjusted);
  });
});
