import { clampZoom, zoomAtPoint } from 'fluxio-image-editor/core';

describe('zoom geometry', () => {
  it('keeps zoom-at-point stable under cursor', () => {
    const next = zoomAtPoint({ zoom: 1, panX: 0, panY: 0 }, 2, 50, 40);
    expect(next.zoom).toBe(2);
    expect(next.panX).toBe(-50);
    expect(next.panY).toBe(-40);
    expect(clampZoom(99, 0.1, 8)).toBe(8);
  });
});
