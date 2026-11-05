import { computeCenteredPan, computeContainFit, isViewportCentered } from 'fluxio-image-editor/core';

describe('computeContainFit', () => {
  it('fits and centers a landscape image in a square viewport', () => {
    const result = computeContainFit({ width: 200, height: 100 }, { width: 400, height: 400 });
    expect(result.zoom).toBe(2);
    expect(result.panX).toBe(0);
    expect(result.panY).toBe(100);
  });

  it('swaps bounds for 90 degree rotation', () => {
    const result = computeContainFit(
      { width: 200, height: 100 },
      { width: 400, height: 400 },
      90,
    );
    expect(result.zoom).toBe(2);
    expect(result.panX).toBe(100);
    expect(result.panY).toBe(0);
  });

  it('respects maxZoom so small outputs are not upscaled', () => {
    const result = computeContainFit(
      { width: 50, height: 50 },
      { width: 400, height: 400 },
      0,
      { maxZoom: 1 },
    );
    expect(result.zoom).toBe(1);
    expect(result.panX).toBe(175);
    expect(result.panY).toBe(175);
  });
});

describe('computeCenteredPan / isViewportCentered', () => {
  it('centers at the current zoom without changing scale', () => {
    const pan = computeCenteredPan(
      { width: 200, height: 100 },
      { width: 400, height: 400, zoom: 1 },
    );
    expect(pan.panX).toBe(100);
    expect(pan.panY).toBe(150);
  });

  it('reports centered when pan matches computeCenteredPan', () => {
    const viewport = { width: 400, height: 400, zoom: 1, panX: 100, panY: 150 };
    expect(isViewportCentered(viewport, { width: 200, height: 100 })).toBe(true);
    expect(
      isViewportCentered({ ...viewport, panX: 140 }, { width: 200, height: 100 }),
    ).toBe(false);
  });
});
