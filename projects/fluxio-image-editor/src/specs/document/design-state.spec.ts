import {
  DESIGN_STATE_KIND,
  DESIGN_STATE_MAX_ANNOTATIONS,
  DESIGN_STATE_MAX_NESTING_DEPTH,
  DESIGN_STATE_MAX_SERIALIZED_BYTES,
  DESIGN_STATE_SCHEMA_VERSION,
  ImageEditorError,
  parseDesignState,
} from 'fluxio-image-editor/core';

function baseEnvelope(overrides?: {
  readonly annotations?: unknown[];
  readonly pluginState?: unknown;
}): Record<string, unknown> {
  return {
    kind: DESIGN_STATE_KIND,
    schemaVersion: DESIGN_STATE_SCHEMA_VERSION,
    exportedAt: '2020-01-01T00:00:00.000Z',
    document: {
      sourceSize: { width: 100, height: 80 },
      annotations: overrides?.annotations ?? [],
      pluginState: overrides?.pluginState ?? {},
    },
  };
}

describe('parseDesignState bounds', () => {
  it('accepts a minimal valid envelope', () => {
    const parsed = parseDesignState(baseEnvelope());
    expect(parsed.kind).toBe(DESIGN_STATE_KIND);
    expect(parsed.document.sourceSize).toEqual({ width: 100, height: 80 });
    expect(parsed.document.annotations).toEqual([]);
  });

  it('rejects payloads larger than the serialized size cap', () => {
    const huge = 'x'.repeat(DESIGN_STATE_MAX_SERIALIZED_BYTES + 1);
    expect(() => parseDesignState(huge)).toThrow(ImageEditorError);
    try {
      parseDesignState(huge);
    } catch (error) {
      expect(error).toBeInstanceOf(ImageEditorError);
      expect((error as ImageEditorError).code).toBe('DESIGN_STATE_INVALID');
      expect((error as ImageEditorError).message).toMatch(/serialized size/i);
    }
  });

  it('rejects nesting deeper than the depth cap', () => {
    let nested: unknown = 'leaf';
    for (let i = 0; i < DESIGN_STATE_MAX_NESTING_DEPTH + 2; i++) {
      nested = { child: nested };
    }
    expect(() => parseDesignState(baseEnvelope({ pluginState: nested }))).toThrow(
      ImageEditorError,
    );
    try {
      parseDesignState(baseEnvelope({ pluginState: nested }));
    } catch (error) {
      expect((error as ImageEditorError).code).toBe('DESIGN_STATE_INVALID');
      expect((error as ImageEditorError).message).toMatch(/nesting depth/i);
    }
  });

  it('accepts nesting at the depth cap', () => {
    // Envelope root is depth 0; document → pluginState → N children.
    // Cap is 10 total steps from the envelope root.
    let nested: unknown = 'leaf';
    // depth path: root(0) → document(1) → pluginState(2) → … → leaf
    // remaining object levels under pluginState: MAX - 2
    for (let i = 0; i < DESIGN_STATE_MAX_NESTING_DEPTH - 2; i++) {
      nested = { child: nested };
    }
    expect(() => parseDesignState(baseEnvelope({ pluginState: nested }))).not.toThrow();
  });

  it('rejects more annotations than the count cap', () => {
    const annotations = Array.from({ length: DESIGN_STATE_MAX_ANNOTATIONS + 1 }, (_, i) => ({
      id: `t${i}`,
      kind: 'text',
      text: 'x',
    }));
    expect(() => parseDesignState(baseEnvelope({ annotations }))).toThrow(ImageEditorError);
    try {
      parseDesignState(baseEnvelope({ annotations }));
    } catch (error) {
      expect((error as ImageEditorError).code).toBe('DESIGN_STATE_INVALID');
      expect((error as ImageEditorError).message).toMatch(/annotations/i);
    }
  });

  it('accepts annotation count at the cap', () => {
    const annotations = Array.from({ length: DESIGN_STATE_MAX_ANNOTATIONS }, (_, i) => ({
      id: `t${i}`,
      kind: 'text',
      text: 'x',
    }));
    const parsed = parseDesignState(baseEnvelope({ annotations }));
    expect(parsed.document.annotations.length).toBe(DESIGN_STATE_MAX_ANNOTATIONS);
  });
});
