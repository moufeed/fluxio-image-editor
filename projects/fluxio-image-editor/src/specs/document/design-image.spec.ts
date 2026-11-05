import {
  createImageDocument,
  createInitialDesignImage,
  normalizeDesignImage,
  resolveDesignImage,
} from 'fluxio-image-editor/core';
import {
  applyDesignImageDrag,
  remapDesignImageForOrientationSwap,
  remapDesignImageForOutput,
} from 'fluxio-image-editor/core';
import {
  mergeDesignOntoDocument,
  normalizePersistedDocument,
  serializeDesignState,
  parseDesignState,
} from 'fluxio-image-editor/core';
import {
  setDesignImage,
  setDesignImageLock,
  resizeDocument,
  rotateDocument,
} from 'fluxio-image-editor/plugins/transform';

describe('designImage model', () => {
  it('defaults to fill + locked on createImageDocument', () => {
    const doc = createImageDocument({
      source: { kind: 'url', id: 't' },
      sourceSize: { width: 200, height: 100 },
    });
    expect(doc.designImage).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      angle: 0,
      locked: true,
      visible: true,
    });
  });

  it('normalizeDesignImage fills missing fields from output', () => {
    expect(normalizeDesignImage(null, { width: 80, height: 40 })).toEqual(
      createInitialDesignImage({ width: 80, height: 40 }),
    );
    expect(
      normalizeDesignImage({ x: 10, y: 20, width: 30, height: 40, locked: false }, {
        width: 100,
        height: 100,
      }),
    ).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      angle: 0,
      locked: false,
      visible: true,
    });
  });

  it('persists and restores designImage via design-state', () => {
    const live = createImageDocument({
      source: { kind: 'url', id: 'live' },
      sourceSize: { width: 100, height: 80 },
    });
    const edited = setDesignImage(live, {
      x: 12,
      y: 8,
      width: 60,
      height: 50,
      angle: 15,
      locked: false,
      visible: false,
    });
    const envelope = serializeDesignState(edited);
    const parsed = parseDesignState(envelope);
    expect(parsed.document.designImage).toEqual({
      x: 12,
      y: 8,
      width: 60,
      height: 50,
      angle: 15,
      locked: false,
      visible: false,
    });

    const merged = mergeDesignOntoDocument(parsed.document, live);
    expect(merged.designImage.locked).toBe(false);
    expect(merged.designImage.x).toBe(12);
    expect(merged.designImage.angle).toBe(15);
  });

  it('legacy documents without designImage normalize to fill+locked', () => {
    const raw = {
      schemaVersion: 1,
      source: { kind: 'url', id: 'legacy' },
      sourceSize: { width: 50, height: 40 },
      crop: null,
      transform: { rotationDegrees: 0, flipX: false, flipY: false },
      output: { width: 50, height: 40 },
    };
    const doc = normalizePersistedDocument(raw);
    expect(doc.designImage).toEqual(createInitialDesignImage({ width: 50, height: 40 }));
  });
});

describe('designImage transform helpers', () => {
  it('applyDesignImageDrag moves without clamping to output', () => {
    const start = normalizeDesignImage(
      { x: 0, y: 0, width: 100, height: 80, locked: false },
      { width: 100, height: 80 },
    );
    const moved = applyDesignImageDrag(
      start,
      'move',
      { x: 0, y: 0 },
      { x: 40, y: 20 },
      { width: 100, height: 80 },
    );
    expect(moved.x).toBe(40);
    expect(moved.y).toBe(20);
  });

  it('applyDesignImageDrag rotate updates angle', () => {
    const start = normalizeDesignImage(
      { x: 0, y: 0, width: 100, height: 100, angle: 0, locked: false },
      { width: 200, height: 200 },
    );
    // Center at (50,50). Start at east (100,50), move to south (50,100) → +90°.
    const rotated = applyDesignImageDrag(
      start,
      'rotate',
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { width: 200, height: 200 },
    );
    expect(rotated.angle).toBeCloseTo(90, 5);
  });

  it('remapDesignImageForOutput keeps custom placement', () => {
    const previous = normalizeDesignImage(
      { x: 5, y: 5, width: 40, height: 40, locked: false },
      { width: 100, height: 100 },
    );
    const next = remapDesignImageForOutput(
      previous,
      { width: 100, height: 100 },
      { width: 200, height: 150 },
    );
    expect(next.x).toBe(5);
    expect(next.width).toBe(40);
    expect(next.locked).toBe(false);
  });

  it('remapDesignImageForOrientationSwap fills when previously filling', () => {
    const previous = createInitialDesignImage({ width: 100, height: 50 });
    const next = remapDesignImageForOrientationSwap(
      previous,
      { width: 100, height: 50 },
      { width: 50, height: 100 },
    );
    expect(next).toEqual(createInitialDesignImage({ width: 50, height: 100 }));
  });
});

describe('transform plugin designImage commands', () => {
  const base = () =>
    createImageDocument({
      source: { kind: 'url', id: 't' },
      sourceSize: { width: 100, height: 80 },
    });

  it('setDesignImageLock toggles locked', () => {
    const unlocked = setDesignImageLock(base(), false);
    expect(unlocked.designImage.locked).toBe(false);
    expect(setDesignImageLock(unlocked, true).designImage.locked).toBe(true);
  });

  it('resize remaps fill designImage to new output', () => {
    const next = resizeDocument(base(), { width: 200, height: 160 });
    expect(resolveDesignImage(next)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 160,
      angle: 0,
      locked: true,
      visible: true,
    });
  });

  it('rotate orientation swap remaps fill designImage', () => {
    const next = rotateDocument(base(), 90);
    expect(next.output).toEqual({ width: 80, height: 100 });
    expect(resolveDesignImage(next)).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 100,
      angle: 0,
      locked: true,
      visible: true,
    });
  });
});
