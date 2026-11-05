import { createImageDocument } from 'fluxio-image-editor/core';
import { applyCrop } from 'fluxio-image-editor/plugins/crop';

describe('applyCrop', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('applies crop + auto-resize in one call', () => {
    const document = applyCrop(
      base,
      { x: 20, y: 10, width: 80, height: 40, aspectRatio: 2, shape: 'rect' },
      { resizeTo: { width: 180, height: 90 } },
    );
    expect(document.crop?.width).toBe(80);
    expect(document.output).toEqual({ width: 180, height: 90 });
  });

  it('applies elliptical crop without changing output sizing rules', () => {
    const document = applyCrop(base, {
      x: 10,
      y: 10,
      width: 60,
      height: 40,
      aspectRatio: null,
      shape: 'ellipse',
    });
    expect(document.crop?.shape).toBe('ellipse');
    expect(document.output).toEqual({ width: 60, height: 40 });
  });
});
