import { describe, expect, it } from 'vitest';

import {
  applyFocusDrag,
  focusChromeLayout,
  hitTestFocusHandle,
} from 'fluxio-image-editor/core';
import { normalizeFocus } from 'fluxio-image-editor/core';

const output = { width: 400, height: 300 };

describe('focus-transform', () => {
  it('hits move inside radial circle and size on the rim handle', () => {
    const focus = normalizeFocus({ mode: 'radial', centerX: 0.5, centerY: 0.5, size: 0.3 });
    const layout = focusChromeLayout(focus, output);
    expect(hitTestFocusHandle(focus, { x: layout.cx, y: layout.cy }, output, 10)).toBe(
      'move',
    );
    expect(
      hitTestFocusHandle(focus, { x: layout.sizeHandle.x, y: layout.sizeHandle.y }, output, 10),
    ).toBe('size');
    expect(hitTestFocusHandle(focus, { x: 0, y: 0 }, output, 10)).toBeNull();
  });

  it('moves center and resizes radial focus', () => {
    const start = normalizeFocus({ mode: 'radial', centerX: 0.5, centerY: 0.5, size: 0.3 });
    const moved = applyFocusDrag(
      start,
      'move',
      { x: 200, y: 150 },
      { x: 240, y: 180 },
      output,
    );
    expect(moved.centerX).toBeCloseTo(0.6, 2);
    expect(moved.centerY).toBeCloseTo(0.6, 2);

    const sized = applyFocusDrag(
      start,
      'size',
      { x: 200, y: 150 },
      { x: 200 + focusChromeLayout(start, output).radius * 1.5, y: 150 },
      output,
    );
    expect(sized.size).toBeGreaterThan(start.size);
  });

  it('rotates linear focus band from the rotate handle', () => {
    const start = normalizeFocus({
      mode: 'linear',
      centerX: 0.5,
      centerY: 0.5,
      size: 0.3,
      angle: 0,
    });
    const layout = focusChromeLayout(start, output);
    expect(
      hitTestFocusHandle(
        start,
        { x: layout.rotateHandle!.x, y: layout.rotateHandle!.y },
        output,
        12,
      ),
    ).toBe('rotate');

    const rotated = applyFocusDrag(
      start,
      'rotate',
      layout.rotateHandle!,
      { x: layout.cx, y: layout.cy + 80 },
      output,
    );
    expect(rotated.angle).not.toBe(0);
  });
});
