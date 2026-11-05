import {
  applyMarkupSnapToDesignImage,
  applyMarkupSnapToGroupDrag,
  nearestSnapTarget,
  normalizeDesignImage,
  normalizeTextAnnotation,
  resolveMarkupSnapConfig,
  snapMarkupBoundsMove,
  snapMarkupPoint,
  snapScalarToGrid,
  type InteractiveBounds,
} from 'fluxio-image-editor/core';

describe('markup snap geometry (PV49)', () => {
  const output = { width: 200, height: 100 };

  it('resolves defaults with snap and grid off', () => {
    const config = resolveMarkupSnapConfig(null);
    expect(config.gridSize).toBe(0);
    expect(config.snapThreshold).toBe(0);
    expect(config.snapToContext).toBe(true);
  });

  it('snaps scalars to grid within threshold', () => {
    expect(snapScalarToGrid(23, 16, 8)).toBe(16);
    expect(snapScalarToGrid(30, 16, 1)).toBe(30);
  });

  it('finds nearest snap target within threshold', () => {
    expect(nearestSnapTarget(48, [0, 50, 100], 4)).toBe(50);
    expect(nearestSnapTarget(48, [0, 50, 100], 1)).toBeNull();
  });

  it('snaps points to context edges and center', () => {
    const config = resolveMarkupSnapConfig({
      snapThreshold: 8,
      snapToContext: true,
      gridSize: 0,
    });
    const nearLeft = snapMarkupPoint({ x: 3, y: 40 }, output, config);
    expect(nearLeft.x).toBe(0);
    expect(nearLeft.snappedX).toBe(true);

    const nearCenter = snapMarkupPoint({ x: 102, y: 52 }, output, config);
    expect(nearCenter.x).toBe(100);
    expect(nearCenter.y).toBe(50);
  });

  it('snaps moving bounds to context / guides', () => {
    const bounds: InteractiveBounds = { x: 96, y: 10, width: 40, height: 20 };
    const snapped = snapMarkupBoundsMove(
      bounds,
      output,
      resolveMarkupSnapConfig({
        snapThreshold: 8,
        snapToContext: true,
        guides: [{ id: 'g1', axis: 'y', position: 12 }],
      }),
    );
    expect(snapped.bounds.x).toBe(100);
    expect(snapped.bounds.y).toBe(12);
  });

  it('applies move snap to a group of transformables', () => {
    const moved = normalizeTextAnnotation({
      id: 't1',
      x: 3,
      y: 3,
      text: 'A',
      fontSize: 16,
      boxWidth: 40,
      fill: '#ffffff',
      fontFamily: 'sans-serif',
      angle: 0,
    });
    const next = applyMarkupSnapToGroupDrag(
      [moved],
      'move',
      output,
      resolveMarkupSnapConfig({ snapThreshold: 8, snapToContext: true }),
    );
    expect(next[0]?.kind).toBe('text');
    if (next[0]?.kind === 'text') {
      expect(next[0].x).toBe(0);
      expect(next[0].y).toBe(0);
    }
  });

  it('ignores snap when disabled', () => {
    const point = snapMarkupPoint(
      { x: 2, y: 2 },
      output,
      resolveMarkupSnapConfig({ snapThreshold: 8 }),
      { enabled: false },
    );
    expect(point.x).toBe(2);
    expect(point.y).toBe(2);
  });

  it('snaps unlocked design-image moves to context edges', () => {
    const designImage = normalizeDesignImage(
      { x: 3, y: 4, width: 40, height: 20, locked: false },
      output,
    );
    const snapped = applyMarkupSnapToDesignImage(
      designImage,
      'move',
      output,
      resolveMarkupSnapConfig({ snapThreshold: 8, snapToContext: true }),
    );
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(0);
  });
});
