import { createImageDocument } from 'fluxio-image-editor/core';
import { applyEffects } from 'fluxio-image-editor/plugins/effects';

describe('applyEffects', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('applies effects and is idempotent for the same values', () => {
    const withEffects = applyEffects(base, { pixelate: 0.4, noise: 0.2 });
    expect(withEffects.effects.pixelate).toBe(0.4);
    expect(withEffects.effects.noise).toBe(0.2);
    expect(applyEffects(withEffects, withEffects.effects)).toBe(withEffects);
  });
});
