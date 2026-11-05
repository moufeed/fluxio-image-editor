import { describe, expect, it } from 'vitest';

import {
  applyCropMaskDrag,
  cropMaskChromeLayout,
  hitTestCropMaskHandle,
  normalizeCropMask,
} from 'fluxio-image-editor/core';

const output = { width: 400, height: 300 };

describe('crop-mask-transform', () => {
  it('hits inset on edge handles, rotate on the knob, and move on the body', () => {
    const mask = normalizeCropMask({ shape: 'circle', inset: 0.1, angle: 0 });
    const layout = cropMaskChromeLayout(mask, output);
    const edge = layout.edgeHandles[0]!;
    expect(hitTestCropMaskHandle(mask, { x: edge.x, y: edge.y }, output, 12)).toBe('inset');
    expect(
      hitTestCropMaskHandle(
        mask,
        { x: layout.rotateHandle.x, y: layout.rotateHandle.y },
        output,
        12,
      ),
    ).toBe('rotate');
    expect(hitTestCropMaskHandle(mask, { x: layout.cx, y: layout.cy }, output, 12)).toBe('move');
    expect(hitTestCropMaskHandle(mask, { x: 0, y: 0 }, output, 12)).toBeNull();
  });

  it('updates inset from edge drag, angle from rotate, and center from move', () => {
    const start = normalizeCropMask({ shape: 'rounded-rect', inset: 0.1, angle: 0 });
    const layout = cropMaskChromeLayout(start, output);
    const nextInset = applyCropMaskDrag(
      start,
      'inset',
      { x: layout.right, y: layout.cy },
      { x: layout.cx + 50, y: layout.cy },
      output,
    );
    expect(nextInset.inset).toBeGreaterThan(start.inset);

    const nextAngle = applyCropMaskDrag(
      start,
      'rotate',
      layout.rotateHandle,
      { x: layout.cx + 80, y: layout.cy },
      output,
    );
    expect(nextAngle.angle).not.toBe(0);

    const nextMove = applyCropMaskDrag(
      start,
      'move',
      { x: layout.cx, y: layout.cy },
      { x: layout.cx + 40, y: layout.cy + 30 },
      output,
    );
    expect(nextMove.centerX).toBeCloseTo(0.6, 2);
    expect(nextMove.centerY).toBeCloseTo(0.6, 2);
  });

  it('ignores identity / none masks', () => {
    const none = normalizeCropMask({ shape: 'none' });
    expect(hitTestCropMaskHandle(none, { x: 200, y: 150 }, output, 12)).toBeNull();
  });
});
