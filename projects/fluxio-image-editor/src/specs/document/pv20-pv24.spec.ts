import {
  createImageDocument,
  createRedactionId,
  normalizeAdjustments,
  normalizeRedactions,
} from 'fluxio-image-editor/core';
import { applyAdjustments } from 'fluxio-image-editor/plugins/adjustments';
import { applyRedactions } from 'fluxio-image-editor/plugins/redact';

describe('PV20 finetune extras + PV24 redactions', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('normalizes gamma / vignette / clarity', () => {
    expect(
      normalizeAdjustments({ gamma: 2, vignette: -1, clarity: 3 }),
    ).toEqual({
      ...normalizeAdjustments(null),
      gamma: 1,
      vignette: 0,
      clarity: 1,
    });
  });

  it('applies adjustment extras via command helper', () => {
    const next = applyAdjustments(base, { gamma: 0.25, vignette: 0.4, clarity: 0.5 });
    expect(next.adjustments.gamma).toBe(0.25);
    expect(next.adjustments.vignette).toBe(0.4);
    expect(next.adjustments.clarity).toBe(0.5);
  });

  it('stores and clears redaction regions', () => {
    const region = {
      id: createRedactionId(),
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.25,
    };
    const withRedact = applyRedactions(base, [region]);
    expect(withRedact.redactions).toEqual(normalizeRedactions([region]));
    expect(applyRedactions(withRedact, []).redactions).toEqual([]);
  });
});
