import {
  applyRedactionDrag,
  cursorForRedactionHandle,
  hitTestRedactions,
  redactionCornerHandles,
  type RedactionRegion,
} from 'fluxio-image-editor/core';
import { describe, expect, it } from 'vitest';

const OUTPUT = { width: 1000, height: 500 };

const REGION: RedactionRegion = { id: 'a', x: 0.2, y: 0.2, width: 0.2, height: 0.2 };

describe('redaction transform (move / resize)', () => {
  it('maps corners to output pixels', () => {
    expect(redactionCornerHandles(REGION, OUTPUT)).toEqual([
      { id: 'nw', x: 200, y: 100 },
      { id: 'ne', x: 400, y: 100 },
      { id: 'se', x: 400, y: 200 },
      { id: 'sw', x: 200, y: 200 },
    ]);
  });

  it('hits corners before body, and topmost region first', () => {
    const other: RedactionRegion = { id: 'b', x: 0.25, y: 0.25, width: 0.2, height: 0.2 };
    expect(hitTestRedactions([REGION], { x: 402, y: 102 }, OUTPUT, 8)).toEqual({
      id: 'a',
      handle: 'ne',
    });
    expect(hitTestRedactions([REGION], { x: 300, y: 150 }, OUTPUT, 8)).toEqual({
      id: 'a',
      handle: 'move',
    });
    expect(hitTestRedactions([REGION, other], { x: 300, y: 150 }, OUTPUT, 8)?.id).toBe('b');
    expect(hitTestRedactions([REGION], { x: 900, y: 400 }, OUTPUT, 8)).toBeNull();
  });

  it('moves without resizing and clamps inside the output box', () => {
    const moved = applyRedactionDrag(REGION, 'move', { x: 300, y: 150 }, { x: 400, y: 200 }, OUTPUT);
    expect(moved.id).toBe('a');
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.3);
    expect(moved.width).toBe(0.2);
    expect(moved.height).toBe(0.2);

    const clamped = applyRedactionDrag(
      REGION,
      'move',
      { x: 300, y: 150 },
      { x: 5000, y: 5000 },
      OUTPUT,
    );
    expect(clamped.x).toBeCloseTo(0.8);
    expect(clamped.y).toBeCloseTo(0.8);
    expect(clamped.width).toBe(0.2);
  });

  it('resizes from a corner and flips past the opposite edge', () => {
    const resized = applyRedactionDrag(REGION, 'se', { x: 400, y: 200 }, { x: 500, y: 250 }, OUTPUT);
    expect(resized.x).toBeCloseTo(0.2);
    expect(resized.width).toBeCloseTo(0.3);
    expect(resized.height).toBeCloseTo(0.3);

    const flipped = applyRedactionDrag(REGION, 'se', { x: 400, y: 200 }, { x: 100, y: 50 }, OUTPUT);
    expect(flipped.x).toBeCloseTo(0.1);
    expect(flipped.width).toBeCloseTo(0.1);
  });

  it('keeps the region id across drags', () => {
    expect(applyRedactionDrag(REGION, 'nw', { x: 200, y: 100 }, { x: 250, y: 120 }, OUTPUT).id).toBe(
      'a',
    );
  });

  it('maps handles to cursors', () => {
    expect(cursorForRedactionHandle('move')).toBe('move');
    expect(cursorForRedactionHandle('nw')).toBe('nwse-resize');
    expect(cursorForRedactionHandle('ne')).toBe('nesw-resize');
  });
});
