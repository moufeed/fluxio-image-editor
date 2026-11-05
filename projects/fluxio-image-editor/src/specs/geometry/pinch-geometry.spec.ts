import { applyPinchViewport, pinchDistance, pinchMidpoint } from 'fluxio-image-editor/core';

describe('pinch geometry (PV36)', () => {
  it('computes midpoint and distance', () => {
    expect(pinchMidpoint({ x: 0, y: 0 }, { x: 100, y: 50 })).toEqual({ x: 50, y: 25 });
    expect(pinchDistance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50);
  });

  it('zooms around previous midpoint and pans with midpoint motion', () => {
    const next = applyPinchViewport(
      { zoom: 1, panX: 0, panY: 0 },
      { x: 40, y: 40 },
      { x: 60, y: 40 },
      { x: 30, y: 50 },
      { x: 70, y: 50 },
      0.05,
      8,
    );
    // Distance 20 → 40 ⇒ 2× zoom around mid (50,40), then mid moves to (50,50).
    expect(next.zoom).toBe(2);
    expect(next.panX).toBe(-50);
    expect(next.panY).toBe(-30);
    expect(next.fitMode).toBe('manual');
  });

  it('clamps zoom to min/max', () => {
    const next = applyPinchViewport(
      { zoom: 1, panX: 0, panY: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      0.05,
      2,
    );
    expect(next.zoom).toBe(2);
  });
});
