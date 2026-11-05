import {
  describeAnnotationChange,
  describeStateChange,
  normalizePathAnnotation,
  normalizeTextAnnotation,
  type Annotation,
  type AnnotationPoint,
  type TextAnnotation,
} from 'fluxio-image-editor/core';

function text(id: string, overrides: Partial<TextAnnotation> = {}) {
  return normalizeTextAnnotation({ id, x: 10, y: 20, text: 'Hello', ...overrides });
}

function stroke(id: string, points: readonly AnnotationPoint[]) {
  return normalizePathAnnotation({ id, points });
}

const DRAWING = { kind: 'Drawing', item: 'stroke' };

describe('describeAnnotationChange', () => {
  it('names additions and deletions with a count', () => {
    const a = text('a');
    const b = text('b');
    expect(describeAnnotationChange([], [a], DRAWING)).toBe('Add stroke');
    expect(describeAnnotationChange([a], [a, b], DRAWING)).toBe('Add stroke');
    expect(describeAnnotationChange([], [a, b], DRAWING)).toBe('Add 2 strokes');
    expect(describeAnnotationChange([a, b], [a], DRAWING)).toBe('Delete stroke');
  });

  it('falls back to the tool noun when everything is removed', () => {
    expect(describeAnnotationChange([text('a')], [], DRAWING)).toBe('Clear drawing');
  });

  it('names the gesture behind an in-place edit', () => {
    const before = text('a');
    expect(describeAnnotationChange([before], [text('a', { x: 40 })], DRAWING)).toBe('Move stroke');
    expect(describeAnnotationChange([before], [text('a', { angle: 30 })], DRAWING)).toBe(
      'Rotate stroke',
    );
    expect(describeAnnotationChange([before], [text('a', { fontSize: 64 })], DRAWING)).toBe(
      'Resize stroke',
    );
    expect(describeAnnotationChange([before], [text('a', { fill: '#ff0000' })], DRAWING)).toBe(
      'Restyle stroke',
    );
    expect(describeAnnotationChange([before], [text('a', { visible: false })], DRAWING)).toBe(
      'Hide stroke',
    );
    expect(describeAnnotationChange([before], [text('a', { name: 'Title' })], DRAWING)).toBe(
      'Rename stroke',
    );
  });

  it('separates dragging a path from reshaping it', () => {
    const before = stroke('p', [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    const moved = stroke('p', [
      { x: 5, y: 5 },
      { x: 15, y: 15 },
    ]);
    const reshaped = stroke('p', [
      { x: 0, y: 0 },
      { x: 30, y: 4 },
    ]);
    expect(describeAnnotationChange([before], [moved], DRAWING)).toBe('Move stroke');
    expect(describeAnnotationChange([before], [reshaped], DRAWING)).toBe('Reshape stroke');
  });

  it('derives the noun from the annotation kind when no item label is given', () => {
    const before: readonly Annotation[] = [text('a')];
    expect(describeAnnotationChange(before, [text('a', { x: 99 })])).toBe('Move text');
    expect(describeAnnotationChange([], [stroke('p', [{ x: 1, y: 1 }])])).toBe('Add stroke');
  });

  it('keeps the tool noun when nothing changed', () => {
    expect(describeAnnotationChange([text('a')], [text('a')], DRAWING)).toBe('Drawing');
  });
});

describe('describeStateChange', () => {
  interface Sliders {
    readonly brightness: number;
    readonly contrast: number;
    readonly hue: number;
  }
  const labels: Partial<Record<keyof Sliders, string>> = {
    brightness: 'Brightness',
    contrast: 'Contrast',
    hue: 'Hue',
  };
  const base: Sliders = { brightness: 0, contrast: 0, hue: 0 };

  it('names the single field that changed', () => {
    expect(describeStateChange(base, { ...base, contrast: 10 }, labels, 'Adjust')).toBe('Contrast');
  });

  it('summarizes multiple changes', () => {
    expect(describeStateChange(base, { ...base, brightness: 5, hue: 20 }, labels, 'Adjust')).toBe(
      'Brightness + 1 more',
    );
  });

  it('falls back when no tracked field moved', () => {
    expect(describeStateChange(base, { ...base }, labels, 'Adjust')).toBe('Adjust');
  });
});
