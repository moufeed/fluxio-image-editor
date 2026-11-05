import {
  applyBoundsDrag,
  applyGroupTransformableDrag,
  applyNumericBoundsToTransformable,
  applyTransformableDrag,
  applyWatermarkDrag,
  ANNOTATION_NUDGE_STEP_LARGE,
  boundsFromPath,
  boundsFromShape,
  boundsFromText,
  canReorderAnnotationById,
  cascadePlaceBounds,
  cascadePlaceImageAnnotation,
  containImageAnnotation,
  createDefaultImageAnnotation,
  createDefaultPathAnnotation,
  createDefaultShapeAnnotation,
  createDefaultTextAnnotation,
  createImageDocument,
  createShapeFromDrag,
  duplicateAnnotation,
  estimateWatermarkBounds,
  hitTestBoundsHandle,
  hitTestImageAnnotationHandle,
  hitTestImageAnnotations,
  hitTestInteractiveAnnotations,
  interactionBoundsFromTransformable,
  isImageAnnotation,
  isShapeCreateDragMeaningful,
  isTextAnnotation,
  MIN_IMAGE_ANNOTATION_SIZE,
  normalizePathAnnotation,
  normalizeTextAnnotation,
  normalizeWatermark,
  nudgeTransformable,
  placeTextAnnotationAt,
  reorderAnnotationById,
  replaceAnnotationKindInStack,
  rotateHandlePoint,
  rotateTransformable,
  serializeDesignState,
  toggleAnnotationSelection,
  unionBounds,
  watermarkWithPresetPosition,
  withImageAnnotations,
  withPathAnnotations,
  withTextAnnotations,
  type ImageAnnotation,
  type PathAnnotation,
} from 'fluxio-image-editor/core';

function imageAt(
  partial: Partial<ImageAnnotation> & Pick<ImageAnnotation, 'id' | 'src'>,
): ImageAnnotation {
  return {
    kind: 'image',
    x: 40,
    y: 40,
    width: 80,
    height: 40,
    opacity: 1,
    angle: 0,
    ...partial,
  };
}

describe('UX-I0 / UX-I1 annotation transform geometry', () => {
  const output = { width: 400, height: 300 };

  it('cascades placement so two overlays do not share the same top-left', () => {
    const first = createDefaultImageAnnotation(output, 'a.png', { width: 100, height: 50 });
    const second = cascadePlaceImageAnnotation(
      createDefaultImageAnnotation(output, 'b.png', { width: 100, height: 50 }),
      [first],
      output,
    );
    expect(second.x !== first.x || second.y !== first.y).toBe(true);
  });

  it('hit-tests corners before body and prefers the selected annotation', () => {
    const a = imageAt({ id: 'a', src: 'a.png', x: 10, y: 10, width: 100, height: 50 });
    const b = imageAt({ id: 'b', src: 'b.png', x: 20, y: 20, width: 100, height: 50 });
    expect(hitTestImageAnnotationHandle(a, { x: 10, y: 10 }, 6)).toBe('nw');
    expect(hitTestImageAnnotationHandle(a, { x: 60, y: 35 }, 6)).toBe('move');
    expect(hitTestImageAnnotations([a, b], { x: 60, y: 40 }, 6, null)?.id).toBe('b');
    expect(hitTestImageAnnotations([a, b], { x: 10, y: 10 }, 6, 'a')?.id).toBe('a');
  });

  it('moves and aspect-preserves resize; soft-contains so overlays may overhang', () => {
    const start = imageAt({ id: 'a', src: 'a.png', x: 100, y: 80, width: 80, height: 40 });
    const moved = applyTransformableDrag(
      start,
      'move',
      { x: 120, y: 90 },
      { x: 140, y: 110 },
      output,
    );
    expect(moved.kind).toBe('image');
    if (moved.kind !== 'image') {
      return;
    }
    expect(moved.x).toBe(120);
    expect(moved.y).toBe(100);
    expect(moved.width / moved.height).toBeCloseTo(2, 5);

    const resized = applyTransformableDrag(
      start,
      'se',
      { x: 180, y: 120 },
      { x: 220, y: 140 },
      output,
    );
    expect(resized.kind).toBe('image');
    if (resized.kind !== 'image') {
      return;
    }
    expect(resized.width / resized.height).toBeCloseTo(2, 5);
    expect(resized.width).toBeGreaterThan(start.width);
    expect(resized.width).toBeGreaterThanOrEqual(MIN_IMAGE_ANNOTATION_SIZE);

    const overhang = applyTransformableDrag(
      start,
      'move',
      { x: 120, y: 90 },
      { x: -40, y: -30 },
      output,
    );
    expect(overhang.kind).toBe('image');
    if (overhang.kind !== 'image') {
      return;
    }
    expect(overhang.x).toBeLessThan(0);
    expect(overhang.y).toBeLessThan(0);
    expect(overhang.x + overhang.width).toBeGreaterThanOrEqual(8);
    expect(overhang.y + overhang.height).toBeGreaterThanOrEqual(8);

    const contained = containImageAnnotation(
      imageAt({ id: 'a', src: 'a.png', x: 500, y: -20, width: 80, height: 40 }),
      output,
    );
    // Soft: keep ~20% overlap; allow negative y and past-right clamping.
    expect(contained.y).toBe(-20);
    expect(contained.x + contained.width).toBeGreaterThanOrEqual(8);
    expect(contained.x).toBeLessThan(output.width);
  });

  it('omits selection from design-state persistence', () => {
    const annotation = createDefaultImageAnnotation(output, 'data:image/png;base64,aa');
    const document = {
      ...createImageDocument({
        source: { kind: 'url', id: 's', url: 'about:blank' },
        sourceSize: output,
      }),
      annotations: [annotation],
      output,
    };
    const envelope = serializeDesignState(document);
    const json = JSON.stringify(envelope);
    expect(json).not.toContain('selectedImageId');
    expect(json).not.toContain('selectedImageIds');
    expect(json).not.toContain('"selection"');
    expect(envelope.document.annotations).toHaveLength(1);
  });
});

describe('UX-I2 text & shapes transform geometry', () => {
  const output = { width: 400, height: 300 };

  it('places text at a click and cascades against existing texts', () => {
    const first = placeTextAnnotationAt({ x: 40, y: 40 }, output);
    const second = placeTextAnnotationAt({ x: 40, y: 40 }, output, [first]);
    expect(second.x !== first.x || second.y !== first.y).toBe(true);
    expect(second.kind).toBe('text');
  });

  it('moves text and scales fontSize on resize', () => {
    const text = createDefaultTextAnnotation(output);
    const startBounds = boundsFromText(text);
    const moved = applyTransformableDrag(
      text,
      'move',
      { x: startBounds.x + 4, y: startBounds.y + 4 },
      { x: startBounds.x + 24, y: startBounds.y + 18 },
      output,
    );
    expect(moved.kind).toBe('text');
    if (moved.kind !== 'text') {
      return;
    }
    expect(moved.x).toBeGreaterThan(text.x);
    expect(moved.y).toBeGreaterThan(text.y);

    const resized = applyTransformableDrag(
      text,
      'se',
      { x: startBounds.x + startBounds.width, y: startBounds.y + startBounds.height },
      {
        x: startBounds.x + startBounds.width + 40,
        y: startBounds.y + startBounds.height + 24,
      },
      output,
    );
    expect(resized.kind).toBe('text');
    if (resized.kind !== 'text') {
      return;
    }
    expect(resized.fontSize).toBeGreaterThan(text.fontSize);
  });

  it('allows emoji text annotations to overhang with soft contain', () => {
    const emoji = normalizeTextAnnotation({
      id: 'emoji-1',
      text: '🔥',
      fontSize: 48,
      fill: '#000000',
      fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", sans-serif',
      x: 100,
      y: 80,
    });
    const moved = applyTransformableDrag(
      emoji,
      'move',
      { x: 120, y: 100 },
      { x: -40, y: -30 },
      output,
    );
    expect(moved.kind).toBe('text');
    if (moved.kind !== 'text') {
      return;
    }
    expect(moved.x).toBeLessThan(0);
    expect(moved.y).toBeLessThan(0);
    expect(moved.x + boundsFromText(moved).width).toBeGreaterThanOrEqual(8);
  });

  it('creates and free-aspect resizes rect shapes; hit-tests via bounds', () => {
    const shape = createShapeFromDrag('rect', { x: 50, y: 60 }, { x: 150, y: 140 }, output);
    expect(shape.kind).toBe('rect');
    if (shape.kind !== 'rect') {
      return;
    }
    expect(shape.width).toBeGreaterThanOrEqual(16);
    expect(shape.height).toBeGreaterThanOrEqual(16);

    const bounds = boundsFromShape(shape);
    const hit = hitTestInteractiveAnnotations(
      [{ id: shape.id, ...bounds }],
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      6,
      null,
    );
    expect(hit?.handle).toBe('move');

    const resized = applyTransformableDrag(
      shape,
      'se',
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width + 50, y: bounds.y + bounds.height + 10 },
      output,
    );
    expect(resized.kind).toBe('rect');
    if (resized.kind !== 'rect') {
      return;
    }
    expect(resized.width).toBeGreaterThan(shape.width);
    expect(resized.height / resized.width).not.toBeCloseTo(shape.height / shape.width, 1);
  });

  it('allows shapes to overhang the output with soft contain', () => {
    const shape = createShapeFromDrag('rect', { x: 50, y: 60 }, { x: 150, y: 140 }, output);
    expect(shape.kind).toBe('rect');
    if (shape.kind !== 'rect') {
      return;
    }
    const moved = applyTransformableDrag(
      shape,
      'move',
      { x: 100, y: 100 },
      { x: -80, y: -60 },
      output,
    );
    expect(moved.kind).toBe('rect');
    if (moved.kind !== 'rect') {
      return;
    }
    expect(moved.x).toBeLessThan(0);
    expect(moved.y).toBeLessThan(0);
    expect(moved.x + moved.width).toBeGreaterThanOrEqual(8);
    expect(moved.y + moved.height).toBeGreaterThanOrEqual(8);
  });

  it('builds regular polygons with the requested side count', () => {
    const hex = createShapeFromDrag('polygon', { x: 40, y: 40 }, { x: 140, y: 140 }, output, {
      polygonSides: 6,
    });
    expect(hex.kind).toBe('polygon');
    if (hex.kind !== 'polygon') {
      return;
    }
    expect(hex.points).toHaveLength(6);

    const pent = createShapeFromDrag('polygon', { x: 10, y: 10 }, { x: 90, y: 80 }, output, {
      polygonSides: 5,
    });
    expect(pent.kind).toBe('polygon');
    if (pent.kind !== 'polygon') {
      return;
    }
    expect(pent.points).toHaveLength(5);
  });

  it('treats tiny shape clicks as non-meaningful (Pintura click-to-deselect)', () => {
    expect(isShapeCreateDragMeaningful({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(false);
    expect(isShapeCreateDragMeaningful({ x: 10, y: 10 }, { x: 20, y: 12 })).toBe(false);
    expect(isShapeCreateDragMeaningful({ x: 10, y: 10 }, { x: 40, y: 10 })).toBe(true);
    expect(isShapeCreateDragMeaningful({ x: 10, y: 10 }, { x: 12, y: 40 })).toBe(true);

    const shape = createShapeFromDrag('rect', { x: 50, y: 60 }, { x: 70, y: 90 }, output);
    expect(shape.kind).toBe('rect');
    if (shape.kind !== 'rect') {
      return;
    }
    expect(shape.width).toBeLessThan(output.width * 0.15);
    expect(shape.height).toBeLessThan(output.height * 0.12);
  });

  it('cascades shape bounds and builds line from drag', () => {
    const a = createDefaultShapeAnnotation('ellipse', output);
    const aBounds = boundsFromShape(a);
    const bBounds = cascadePlaceBounds(aBounds, [aBounds], output);
    expect(bBounds.x !== aBounds.x || bBounds.y !== aBounds.y).toBe(true);

    const line = createShapeFromDrag('line', { x: 10, y: 20 }, { x: 110, y: 80 }, output);
    expect(line.kind).toBe('line');
    if (line.kind !== 'line') {
      return;
    }
    expect(line.x2).toBeGreaterThan(line.x1);

    const free = applyBoundsDrag(
      { x: 10, y: 10, width: 40, height: 20 },
      'se',
      { x: 50, y: 30 },
      { x: 90, y: 40 },
      output,
      { preserveAspect: false },
    );
    expect(free.width).toBeGreaterThan(40);
  });
});

describe('UX-I3 watermark transform geometry', () => {
  const output = { width: 400, height: 300 };

  it('uses custom x/y over presets and clears them with preset shortcuts', () => {
    const custom = normalizeWatermark({
      mode: 'text',
      text: 'Mark',
      position: 'bottom-right',
      x: 40,
      y: 50,
      scale: 1,
    });
    const bounds = estimateWatermarkBounds(custom, output);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(40);
    expect(bounds!.y).toBe(50);

    const snapped = watermarkWithPresetPosition(custom, 'top-left');
    expect(snapped.x).toBeNull();
    expect(snapped.y).toBeNull();
    expect(snapped.position).toBe('top-left');
    const presetBounds = estimateWatermarkBounds(snapped, output)!;
    expect(presetBounds.x).toBeLessThan(40);
    expect(presetBounds.y).toBeLessThan(50);
  });

  it('moves and scales watermark while writing absolute placement', () => {
    const start = normalizeWatermark({
      mode: 'text',
      text: 'WM',
      position: 'center',
      x: 100,
      y: 80,
      scale: 1,
    });
    const startBounds = estimateWatermarkBounds(start, output)!;
    const moved = applyWatermarkDrag(
      start,
      startBounds,
      'move',
      { x: 120, y: 90 },
      { x: 150, y: 110 },
      output,
    );
    expect(moved.x).toBe(startBounds.x + 30);
    expect(moved.y).toBe(startBounds.y + 20);
    expect(moved.scale).toBeCloseTo(1, 5);

    const resized = applyWatermarkDrag(
      start,
      startBounds,
      'se',
      {
        x: startBounds.x + startBounds.width,
        y: startBounds.y + startBounds.height,
      },
      {
        x: startBounds.x + startBounds.width + 40,
        y: startBounds.y + startBounds.height + 40,
      },
      output,
    );
    expect(resized.scale).toBeGreaterThan(1);
    expect(resized.x).not.toBeNull();
    expect(resized.y).not.toBeNull();
  });

  it('rotates watermark around its centre without moving or resizing it', () => {
    const start = normalizeWatermark({
      mode: 'text',
      text: 'WM',
      position: 'center',
      scale: 1,
      angle: 350,
    });
    const startBounds = estimateWatermarkBounds(start, output)!;
    const center = {
      x: startBounds.x + startBounds.width / 2,
      y: startBounds.y + startBounds.height / 2,
    };
    const rotated = applyWatermarkDrag(
      start,
      startBounds,
      'rotate',
      { x: center.x, y: center.y + 100 },
      { x: center.x - 100, y: center.y },
      output,
    );

    // 350° + 90° wraps back into [0, 360).
    expect(rotated.angle).toBeCloseTo(80, 5);
    expect(rotated.scale).toBeCloseTo(1, 5);
    expect(rotated.x).toBeNull();
    expect(rotated.y).toBeNull();
    expect(rotated.position).toBe('center');
  });
});

describe('UX-I4 nudge / numeric / z-order geometry', () => {
  const output = { width: 400, height: 300 };

  it('nudges transformable annotations by document pixels with soft contain for images', () => {
    const start = imageAt({ id: 'a', src: 'a.png', x: 10, y: 10, width: 80, height: 40 });
    const nudged = nudgeTransformable(start, ANNOTATION_NUDGE_STEP_LARGE, 0, output);
    expect(nudged.kind).toBe('image');
    if (nudged.kind !== 'image') {
      return;
    }
    expect(nudged.x).toBe(20);
    expect(nudged.y).toBe(10);

    const overhang = nudgeTransformable(start, -100, -100, output);
    expect(overhang.kind).toBe('image');
    if (overhang.kind !== 'image') {
      return;
    }
    expect(overhang.x).toBeLessThan(0);
    expect(overhang.y).toBeLessThan(0);
    expect(overhang.x + overhang.width).toBeGreaterThanOrEqual(8);
    expect(overhang.y + overhang.height).toBeGreaterThanOrEqual(8);
  });

  it('applies numeric AABB and reorders so later entries are on top', () => {
    const start = imageAt({ id: 'a', src: 'a.png', x: 40, y: 50, width: 80, height: 40 });
    const next = applyNumericBoundsToTransformable(
      start,
      { x: 60, y: 70, width: 100, height: 50 },
      output,
    );
    expect(next.kind).toBe('image');
    if (next.kind !== 'image') {
      return;
    }
    expect(next.x).toBe(60);
    expect(next.y).toBe(70);
    expect(next.width / next.height).toBeCloseTo(2, 5);

    const list = [
      imageAt({ id: 'a', src: 'a.png' }),
      imageAt({ id: 'b', src: 'b.png' }),
      imageAt({ id: 'c', src: 'c.png' }),
    ];
    expect(reorderAnnotationById(list, 'a', 'forward').map((item) => item.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(reorderAnnotationById(list, 'a', 'front').map((item) => item.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(reorderAnnotationById(list, 'c', 'backward').map((item) => item.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(reorderAnnotationById(list, 'c', 'back').map((item) => item.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(canReorderAnnotationById(list, 'a', 'back')).toBe(false);
    expect(canReorderAnnotationById(list, 'a', 'front')).toBe(true);
    expect(canReorderAnnotationById(list, 'c', 'front')).toBe(false);
    expect(reorderAnnotationById(list, 'c', 'front')).toBe(list);
  });

  it('preserves cross-kind interleaving when replacing one kind', () => {
    const text = createDefaultTextAnnotation({ width: 200, height: 200 });
    const image = createDefaultImageAnnotation(
      { width: 200, height: 200 },
      'data:image/png;base64,x',
    );
    const stack = [text, image];
    const movedText = { ...text, x: text.x + 5 };
    const next = replaceAnnotationKindInStack(stack, isTextAnnotation, [movedText]);
    expect(next.map((item) => item.id)).toEqual([text.id, image.id]);
    expect(isTextAnnotation(next[0]!) && next[0].x).toBe(movedText.x);
    expect(isImageAnnotation(next[1]!)).toBe(true);
  });

  it('duplicates annotations with a fresh id', () => {
    const image = createDefaultImageAnnotation(
      { width: 120, height: 80 },
      'data:image/png;base64,x',
    );
    const copy = duplicateAnnotation(image);
    expect(copy.id).not.toBe(image.id);
    expect(copy.kind).toBe('image');
    if (copy.kind === 'image') {
      expect(copy.src).toBe(image.src);
    }
  });
});

describe('Global annotation stack document helpers', () => {
  it('keeps image above text when updating text props via withTextAnnotations', () => {
    const output = { width: 200, height: 150 };
    const text = createDefaultTextAnnotation(output);
    const image = createDefaultImageAnnotation(output, 'data:image/png;base64,x');
    let doc = createImageDocument({
      source: { kind: 'url', id: 's', url: 'about:blank' },
      sourceSize: output,
    });
    doc = {
      ...doc,
      annotations: [text, image],
      output,
    };
    const updated = withTextAnnotations(doc, [{ ...text, text: 'Hello' }]);
    expect(updated.annotations.map((item) => item.id)).toEqual([text.id, image.id]);
    expect(isTextAnnotation(updated.annotations[0]!) && updated.annotations[0].text).toBe('Hello');

    const reordered = withImageAnnotations(
      {
        ...updated,
        annotations: [image, text],
      },
      [image],
    );
    expect(reordered.annotations.map((item) => item.kind)).toEqual(['image', 'text']);
  });
});

describe('multi-select / group transform geometry', () => {
  const output = { width: 400, height: 300 };

  it('unions bounds and toggles selection order with primary last', () => {
    const a = imageAt({ id: 'a', src: 'a.png', x: 10, y: 20, width: 40, height: 30 });
    const b = imageAt({ id: 'b', src: 'b.png', x: 80, y: 90, width: 50, height: 40 });
    const union = unionBounds([a, b]);
    expect(union).toEqual({ x: 10, y: 20, width: 120, height: 110 });
    expect(toggleAnnotationSelection(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleAnnotationSelection(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('prefers any selected annotation during hit-test', () => {
    const a = imageAt({ id: 'a', src: 'a.png', x: 10, y: 10, width: 100, height: 50 });
    const b = imageAt({ id: 'b', src: 'b.png', x: 20, y: 20, width: 100, height: 50 });
    expect(hitTestInteractiveAnnotations([a, b], { x: 30, y: 30 }, 6, ['a', 'b'])?.id).toBe('b');
    expect(hitTestInteractiveAnnotations([a, b], { x: 10, y: 10 }, 6, ['a'])?.id).toBe('a');
  });

  it('group-moves and group-resizes with one relative layout and containment', () => {
    const a = imageAt({ id: 'a', src: 'a.png', x: 40, y: 40, width: 40, height: 20 });
    const b = imageAt({ id: 'b', src: 'b.png', x: 100, y: 60, width: 40, height: 20 });
    const moved = applyGroupTransformableDrag(
      [a, b],
      'move',
      { x: 50, y: 50 },
      { x: 70, y: 65 },
      output,
    );
    expect(moved).toHaveLength(2);
    expect(moved[0]!.kind).toBe('image');
    expect(moved[1]!.kind).toBe('image');
    if (moved[0]!.kind !== 'image' || moved[1]!.kind !== 'image') {
      return;
    }
    expect(moved[0].x).toBe(60);
    expect(moved[0].y).toBe(55);
    expect(moved[1].x - moved[0].x).toBe(b.x - a.x);
    expect(moved[1].y - moved[0].y).toBe(b.y - a.y);

    const resized = applyGroupTransformableDrag(
      [a, b],
      'se',
      { x: 140, y: 80 },
      { x: 180, y: 100 },
      output,
    );
    expect(resized[0]!.kind).toBe('image');
    expect(resized[1]!.kind).toBe('image');
    if (resized[0]!.kind !== 'image' || resized[1]!.kind !== 'image') {
      return;
    }
    expect(resized[0].width).toBeGreaterThan(a.width);
    expect(resized[1].width / resized[0].width).toBeCloseTo(b.width / a.width, 5);
  });
});

describe('UX-I5 path transform and rotation', () => {
  const output = { width: 400, height: 300 };

  function pathAt(partial: Partial<PathAnnotation> & Pick<PathAnnotation, 'id'>): PathAnnotation {
    return normalizePathAnnotation({
      points: [
        { x: 40, y: 40 },
        { x: 80, y: 100 },
        { x: 120, y: 50 },
      ],
      stroke: '#ff0000',
      strokeWidth: 4,
      ...partial,
    });
  }

  it('hit-tests the rotate handle below the bottom edge', () => {
    const a = imageAt({ id: 'a', src: 'a.png', x: 10, y: 40, width: 100, height: 50 });
    const rotate = rotateHandlePoint(a);
    expect(rotate.y).toBeGreaterThan(a.y + a.height);
    expect(hitTestBoundsHandle(a, rotate, 8)).toBe('rotate');
    expect(hitTestImageAnnotationHandle(a, { x: 10, y: 40 }, 6)).toBe('nw');
  });

  it('rotates image angle and undoes via start baseline semantics', () => {
    const start = imageAt({ id: 'a', src: 'a.png', x: 100, y: 80, width: 80, height: 40 });
    const center = { x: 140, y: 100 };
    const startPoint = { x: center.x, y: center.y - 40 };
    const currentPoint = { x: center.x + 40, y: center.y };
    const rotated = applyTransformableDrag(start, 'rotate', startPoint, currentPoint, output);
    expect(rotated.kind).toBe('image');
    if (rotated.kind !== 'image') {
      return;
    }
    expect(Math.abs(rotated.angle)).toBeGreaterThan(40);
    expect(Math.abs(rotated.angle)).toBeLessThan(100);
  });

  it('moves and uniformly scales a drawing path as one object', () => {
    const start = pathAt({ id: 'stroke-1' });
    const startBounds = boundsFromPath(start);
    const moved = applyTransformableDrag(
      start,
      'move',
      { x: 80, y: 45 },
      { x: 100, y: 60 },
      output,
    );
    expect(moved.kind).toBe('path');
    if (moved.kind !== 'path') {
      return;
    }
    const movedBounds = boundsFromPath(moved);
    expect(movedBounds.x).toBeCloseTo(startBounds.x + 20, 5);
    expect(movedBounds.y).toBeCloseTo(startBounds.y + 15, 5);
    expect(moved.points).toHaveLength(3);

    const resized = applyTransformableDrag(
      start,
      'se',
      { x: startBounds.x + startBounds.width, y: startBounds.y + startBounds.height },
      {
        x: startBounds.x + startBounds.width + 40,
        y: startBounds.y + startBounds.height + 20,
      },
      output,
    );
    expect(resized.kind).toBe('path');
    if (resized.kind !== 'path') {
      return;
    }
    const resizedBounds = boundsFromPath(resized);
    expect(resizedBounds.width).toBeGreaterThan(startBounds.width);
    expect(resizedBounds.height).toBeGreaterThan(startBounds.height);
  });

  it('inflates path hit bounds for thin strokes', () => {
    const path = pathAt({ id: 'thin', strokeWidth: 2 });
    const chrome = boundsFromPath(path);
    const hit = interactionBoundsFromTransformable(path);
    expect(hit.width).toBeGreaterThan(chrome.width);
    expect(hit.height).toBeGreaterThan(chrome.height);
  });

  it('rotates path points around the AABB center', () => {
    const start = pathAt({ id: 'stroke-2' });
    const bounds = boundsFromPath(start);
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const startPoint = { x: center.x, y: center.y - 30 };
    const currentPoint = { x: center.x + 30, y: center.y };
    const rotated = rotateTransformable(start, startPoint, currentPoint, output);
    expect(rotated.kind).toBe('path');
    if (rotated.kind !== 'path') {
      return;
    }
    expect(rotated.points[0]!.x).not.toBeCloseTo(start.points[0]!.x, 1);
  });

  it('persists path geometry through design-state round-trip', () => {
    const path = pathAt({ id: 'persist-path' });
    const moved = applyTransformableDrag(path, 'move', { x: 0, y: 0 }, { x: 12, y: 8 }, output);
    const doc = withPathAnnotations(
      createImageDocument({
        source: { kind: 'url', id: 's', url: 'about:blank' },
        sourceSize: output,
      }),
      [moved as PathAnnotation],
    );
    const envelope = serializeDesignState(doc);
    expect(envelope.document.annotations.some((item) => item.kind === 'path')).toBe(true);
    const saved = envelope.document.annotations.find((item) => item.kind === 'path');
    expect(saved && saved.kind === 'path' ? saved.points.length : 0).toBe(3);
  });

  it('creates a default path that supports nudge', () => {
    const path = createDefaultPathAnnotation(output);
    const nudged = nudgeTransformable(path, 5, -3, output);
    expect(nudged.kind).toBe('path');
    if (nudged.kind !== 'path') {
      return;
    }
    const before = boundsFromPath(path);
    const after = boundsFromPath(nudged);
    expect(after.x).toBeCloseTo(before.x + 5, 5);
    expect(after.y).toBeCloseTo(before.y - 3, 5);
  });
});
