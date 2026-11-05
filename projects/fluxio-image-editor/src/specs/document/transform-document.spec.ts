import { createImageDocument } from 'fluxio-image-editor/core';
import { applyCrop } from 'fluxio-image-editor/plugins/crop';
import {
  flipDocument,
  resizeDocument,
  rotateDocument,
} from 'fluxio-image-editor/plugins/transform';

describe('transform document helpers', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('applies crop → rotate → flip → resize in order', () => {
    let document = applyCrop(base, {
      x: 20,
      y: 10,
      width: 80,
      height: 40,
      aspectRatio: 2,
    });
    document = rotateDocument(document, 90);
    document = flipDocument(document, 'horizontal');
    document = resizeDocument(document, { width: 160, height: 80, lockAspectRatio: true });

    expect(document.crop?.width).toBe(80);
    expect(document.transform.rotationDegrees).toBe(90);
    expect(document.transform.flipX).toBe(true);
    // After 90° rotate, output was swapped to 40×80; locked resize from width 160 → 160×320
    expect(document.output.width).toBe(160);
    expect(document.output.height).toBe(320);
  });

  it('locked resize follows the dimension the user changed', () => {
    const start = applyCrop(base, {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      aspectRatio: 2,
    });
    const byWidth = resizeDocument(start, { width: 200, height: 50, lockAspectRatio: true });
    expect(byWidth.output).toEqual({ width: 200, height: 100 });

    const byHeight = resizeDocument(start, { width: 100, height: 25, lockAspectRatio: true });
    expect(byHeight.output).toEqual({ width: 50, height: 25 });
  });
});
