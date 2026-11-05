import {
  createImageDocument,
  mergeDesignOntoDocument,
  normalizeAdjustments,
  normalizeColorOverlay,
  normalizeCropMask,
  normalizeEffects,
  normalizeFilters,
  normalizeFocus,
  normalizeFrame,
  normalizeImageAnnotation,
  parseDesignState,
  serializeDesignState,
  type ImageDocument,
  type ReadonlyImageDocument,
} from 'fluxio-image-editor/core';

function baseDoc(): ImageDocument {
  return createImageDocument({
    source: { kind: 'url', id: 'round-trip' },
    sourceSize: { width: 200, height: 150 },
  });
}

function roundTrip(doc: ReadonlyImageDocument): ReadonlyImageDocument {
  const envelope = serializeDesignState(doc);
  const parsed = parseDesignState(envelope);
  return mergeDesignOntoDocument(parsed.document, baseDoc());
}

describe('design-state plugin field round-trip (PS02)', () => {
  it('persists and restores frame', () => {
    const frame = normalizeFrame({
      style: 'solid',
      thickness: 0.08,
      color: '#ff0000',
      color2: '#00ff00',
      opacity: 0.75,
      cornerRadius: 0.2,
    });
    const merged = roundTrip({ ...baseDoc(), frame });
    expect(merged.frame).toEqual(frame);
  });

  it('persists and restores focus', () => {
    const focus = normalizeFocus({
      mode: 'radial',
      centerX: 0.35,
      centerY: 0.6,
      blur: 0.7,
      size: 0.4,
      feather: 0.25,
      angle: 12,
    });
    const merged = roundTrip({ ...baseDoc(), focus });
    expect(merged.focus).toEqual(focus);
  });

  it('persists and restores cropMask', () => {
    const cropMask = normalizeCropMask({
      shape: 'star',
      centerX: 0.4,
      centerY: 0.55,
      inset: 0.1,
      cornerRadius: 0.3,
      feather: 0.15,
      angle: 20,
    });
    const merged = roundTrip({ ...baseDoc(), cropMask });
    expect(merged.cropMask).toEqual(cropMask);
  });

  it('persists and restores filters', () => {
    const filters = normalizeFilters({ preset: 'vintage' });
    const merged = roundTrip({ ...baseDoc(), filters });
    expect(merged.filters).toEqual(filters);
  });

  it('persists and restores adjustments', () => {
    const adjustments = normalizeAdjustments({
      brightness: 0.2,
      contrast: -0.1,
      hue: 0.05,
      saturation: 0.3,
      value: -0.2,
      warmth: 0.15,
      blur: 0.1,
      exposure: 0.25,
      sharpen: 0.4,
    });
    const merged = roundTrip({ ...baseDoc(), adjustments });
    expect(merged.adjustments).toEqual(adjustments);
  });

  it('persists and restores effects', () => {
    const effects = normalizeEffects({
      threshold: 0.3,
      posterize: 0.4,
      pixelate: 0.2,
      noise: 0.15,
    });
    const merged = roundTrip({ ...baseDoc(), effects });
    expect(merged.effects).toEqual(effects);
  });

  it('persists and restores colorOverlay', () => {
    const colorOverlay = normalizeColorOverlay({
      mode: 'solid',
      color: '#112233',
      color2: '#445566',
      opacity: 0.55,
      angle: 90,
    });
    const merged = roundTrip({ ...baseDoc(), colorOverlay });
    expect(merged.colorOverlay).toEqual(colorOverlay);
  });

  it('persists and restores image annotation data URLs', () => {
    const annotation = normalizeImageAnnotation({
      id: 'ov-1',
      src: 'data:image/png;base64,iVBORw0KGgo=',
      x: 10,
      y: 20,
      width: 80,
      height: 60,
      opacity: 0.9,
      angle: 15,
    });
    const merged = roundTrip({ ...baseDoc(), annotations: [annotation] });
    expect(merged.annotations).toEqual([annotation]);
  });

  it('persists frame + focus + cropMask + filters together', () => {
    const doc: ImageDocument = {
      ...baseDoc(),
      frame: normalizeFrame({ style: 'solid', thickness: 0.06, color: '#abcdef' }),
      focus: normalizeFocus({ mode: 'linear', size: 0.5, angle: -30 }),
      cropMask: normalizeCropMask({ shape: 'circle', inset: 0.05 }),
      filters: normalizeFilters({ preset: 'polaroid' }),
    };
    const merged = roundTrip(doc);
    expect(merged.frame).toEqual(doc.frame);
    expect(merged.focus).toEqual(doc.focus);
    expect(merged.cropMask).toEqual(doc.cropMask);
    expect(merged.filters).toEqual(doc.filters);
  });
});
