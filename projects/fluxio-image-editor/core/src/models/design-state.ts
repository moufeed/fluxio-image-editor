import { normalizeCrop } from '../geometry/crop';
import { ImageEditorError } from './errors';
import {
  type createInitialAdjustments,
  createInitialAnnotations,
  type createInitialCropMask,
  type createInitialColorOverlay,
  type createInitialFill,
  type createInitialEffects,
  type createInitialFilters,
  type createInitialFocus,
  type createInitialFrame,
  createInitialTransform,
  type createInitialWatermark,
  normalizeAdjustments,
  normalizeAnnotation,
  normalizeCropMask,
  normalizeColorOverlay,
  normalizeFill,
  normalizeDesignImage,
  normalizeEffects,
  normalizeFilters,
  normalizeFocus,
  normalizeFrame,
  normalizeRedactions,
  normalizeWatermark,
  type Annotation,
  type CropState,
  type DesignImageState,
  type FilterPresetId,
  type ImageDocument,
  type ImageSize,
  type ImageSourceReference,
  type OutputState,
  type ReadonlyImageDocument,
  type TransformState,
} from './image-document';

/** Discriminator for durable design JSON (not raster export). */
export const DESIGN_STATE_KIND = 'fluxio-image-editor-design' as const;

/** Current envelope schema. Migrations are deferred — only this version is accepted. */
export const DESIGN_STATE_SCHEMA_VERSION = 1 as const;

/** Max annotations accepted when parsing design state / persisted documents. */
export const DESIGN_STATE_MAX_ANNOTATIONS = 1000;

/** Max UTF-16 code units of the serialized payload accepted by `parseDesignState`. */
export const DESIGN_STATE_MAX_SERIALIZED_BYTES = 5 * 1024 * 1024;

/** Max object/array nesting depth accepted by `parseDesignState`. */
export const DESIGN_STATE_MAX_NESTING_DEPTH = 10;

export type DesignStateSchemaVersion = typeof DESIGN_STATE_SCHEMA_VERSION;

/**
 * Versioned, renderer-neutral design envelope.
 * Pixel source is referenced, not embedded — hosts re-bind the image on load.
 */
export interface DesignStateEnvelope {
  readonly kind: typeof DESIGN_STATE_KIND;
  readonly schemaVersion: DesignStateSchemaVersion;
  readonly exportedAt: string;
  readonly document: ImageDocument;
}

export interface LoadDesignStateOptions {
  /**
   * When false (default), reject envelopes whose `sourceSize` differs from the
   * currently loaded image. Crop/annotation coordinates are in source pixels.
   */
  readonly allowSourceMismatch?: boolean;
}

/** Build a JSON-safe envelope from the committed document. */
export function serializeDesignState(
  document: ReadonlyImageDocument,
  options?: { readonly exportedAt?: string },
): DesignStateEnvelope {
  const cloned = clonePlain(document);
  return {
    kind: DESIGN_STATE_KIND,
    schemaVersion: DESIGN_STATE_SCHEMA_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    document: normalizePersistedDocument(cloned),
  };
}

/**
 * Parse and validate a design envelope.
 * Unsupported `schemaVersion` values are rejected (migrations not implemented).
 * Rejects oversized payloads, excessive nesting, and annotation floods.
 */
export function parseDesignState(input: unknown): DesignStateEnvelope {
  assertSerializedSize(input);

  const raw = coerceObject(input);
  if (!raw) {
    throw new ImageEditorError('DESIGN_STATE_INVALID', 'Design state must be a JSON object');
  }

  assertNestingDepth(raw, DESIGN_STATE_MAX_NESTING_DEPTH);

  if (raw['kind'] !== DESIGN_STATE_KIND) {
    throw new ImageEditorError('DESIGN_STATE_INVALID', `Expected kind "${DESIGN_STATE_KIND}"`);
  }

  const version = raw['schemaVersion'];
  if (version !== DESIGN_STATE_SCHEMA_VERSION) {
    throw new ImageEditorError(
      'DESIGN_STATE_UNSUPPORTED_VERSION',
      `Unsupported design schemaVersion ${String(version)}; only ${DESIGN_STATE_SCHEMA_VERSION} is supported (migrations deferred)`,
    );
  }

  const documentRaw = raw['document'];
  if (!documentRaw || typeof documentRaw !== 'object' || Array.isArray(documentRaw)) {
    throw new ImageEditorError('DESIGN_STATE_INVALID', 'Design state is missing document');
  }

  const exportedAt =
    typeof raw['exportedAt'] === 'string' && raw['exportedAt'].trim()
      ? raw['exportedAt'].trim()
      : new Date(0).toISOString();

  return {
    kind: DESIGN_STATE_KIND,
    schemaVersion: DESIGN_STATE_SCHEMA_VERSION,
    exportedAt,
    document: normalizePersistedDocument(documentRaw),
  };
}

/**
 * Normalize a persisted document payload into a plain ImageDocument.
 * Invalid fields fall back to identity defaults; crop is clamped to sourceSize.
 */
export function normalizePersistedDocument(raw: unknown): ImageDocument {
  const obj = coerceObject(raw);
  if (!obj) {
    throw new ImageEditorError('DESIGN_STATE_INVALID', 'Document payload is invalid');
  }

  const sourceSize = normalizeImageSize(obj['sourceSize'], { width: 1, height: 1 });
  const source = normalizeSourceReference(obj['source'], sourceSize);
  const transform = normalizeTransform(obj['transform']);
  const adjustments = normalizeAdjustments(
    isRecord(obj['adjustments'])
      ? (obj['adjustments'] as Partial<ReturnType<typeof createInitialAdjustments>>)
      : null,
  );
  const effects = normalizeEffects(
    isRecord(obj['effects'])
      ? (obj['effects'] as Partial<ReturnType<typeof createInitialEffects>>)
      : null,
  );
  const filtersRaw = obj['filters'];
  const filters = normalizeFilters(
    isRecord(filtersRaw)
      ? (filtersRaw as Partial<ReturnType<typeof createInitialFilters>>)
      : typeof filtersRaw === 'string'
        ? (filtersRaw as FilterPresetId)
        : null,
  );
  const focus = normalizeFocus(
    isRecord(obj['focus'])
      ? (obj['focus'] as Partial<ReturnType<typeof createInitialFocus>>)
      : null,
  );
  const redactions = normalizeRedactions(
    Array.isArray(obj['redactions']) ? obj['redactions'] : null,
  );
  const cropMask = normalizeCropMask(
    isRecord(obj['cropMask'])
      ? (obj['cropMask'] as Partial<ReturnType<typeof createInitialCropMask>>)
      : null,
  );
  const colorOverlay = normalizeColorOverlay(
    isRecord(obj['colorOverlay'])
      ? (obj['colorOverlay'] as Partial<ReturnType<typeof createInitialColorOverlay>>)
      : null,
  );
  const fill = normalizeFill(
    isRecord(obj['fill']) ? (obj['fill'] as Partial<ReturnType<typeof createInitialFill>>) : null,
  );
  const frame = normalizeFrame(
    isRecord(obj['frame'])
      ? (obj['frame'] as Partial<ReturnType<typeof createInitialFrame>>)
      : null,
  );
  const watermark = normalizeWatermark(
    isRecord(obj['watermark'])
      ? (obj['watermark'] as Partial<ReturnType<typeof createInitialWatermark>>)
      : null,
  );
  const annotations = parseAnnotations(obj['annotations']);
  const output = normalizeOutput(obj['output'], sourceSize);
  const crop = parseCrop(obj['crop'], sourceSize);
  const designImage = normalizeDesignImage(
    isRecord(obj['designImage']) ? (obj['designImage'] as Partial<DesignImageState>) : null,
    output,
  );
  const pluginState = sanitizePluginState(obj['pluginState']);

  return {
    schemaVersion: 1,
    source,
    sourceSize,
    crop,
    transform,
    adjustments,
    effects,
    filters,
    focus,
    redactions,
    cropMask,
    colorOverlay,
    fill,
    frame,
    watermark,
    annotations,
    designImage,
    output,
    pluginState,
  };
}

/**
 * Apply persisted edit state onto a live document, keeping the live pixel source.
 */
export function mergeDesignOntoDocument(
  persisted: ReadonlyImageDocument,
  live: ReadonlyImageDocument,
): ImageDocument {
  const sourceSize = live.sourceSize;
  const crop = persisted.crop == null ? null : normalizeCrop(persisted.crop, sourceSize);
  const output = normalizeOutput(persisted.output, sourceSize);
  return {
    schemaVersion: 1,
    source: live.source,
    sourceSize,
    crop,
    transform: normalizeTransform(persisted.transform),
    adjustments: normalizeAdjustments(persisted.adjustments),
    effects: normalizeEffects(persisted.effects),
    filters: normalizeFilters(persisted.filters),
    focus: normalizeFocus(persisted.focus),
    redactions: normalizeRedactions(persisted.redactions),
    cropMask: normalizeCropMask(persisted.cropMask),
    colorOverlay: normalizeColorOverlay(persisted.colorOverlay),
    fill: normalizeFill(persisted.fill),
    frame: normalizeFrame(persisted.frame),
    watermark: normalizeWatermark(persisted.watermark),
    annotations: normalizeAnnotationsLoose(persisted.annotations),
    designImage: normalizeDesignImage(persisted.designImage, output),
    output,
    pluginState: sanitizePluginState(persisted.pluginState),
  };
}

function parseCrop(raw: unknown, sourceSize: ImageSize): CropState | null {
  if (raw == null) {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  const ratioRaw = raw['aspectRatio'];
  let aspectRatio: number | null = ratioRaw == null || ratioRaw === false ? null : Number(ratioRaw);
  if (aspectRatio != null && !Number.isFinite(aspectRatio)) {
    aspectRatio = null;
  }
  const candidate: CropState = {
    x: Number(raw['x']),
    y: Number(raw['y']),
    width: Number(raw['width']),
    height: Number(raw['height']),
    aspectRatio,
    shape: raw['shape'] === 'ellipse' ? 'ellipse' : 'rect',
  };
  if (
    !Number.isFinite(candidate.x) ||
    !Number.isFinite(candidate.y) ||
    !Number.isFinite(candidate.width) ||
    !Number.isFinite(candidate.height)
  ) {
    return null;
  }
  return normalizeCrop(candidate, sourceSize);
}

function parseAnnotations(raw: unknown): readonly Annotation[] {
  if (!Array.isArray(raw)) {
    return createInitialAnnotations();
  }
  if (raw.length > DESIGN_STATE_MAX_ANNOTATIONS) {
    throw new ImageEditorError(
      'DESIGN_STATE_INVALID',
      `Design state has ${raw.length} annotations; max is ${DESIGN_STATE_MAX_ANNOTATIONS}`,
    );
  }
  const out: Annotation[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item['kind'] !== 'string') {
      continue;
    }
    const id =
      typeof item['id'] === 'string' && item['id'].trim() ? item['id'].trim() : `ann_${out.length}`;
    try {
      out.push(normalizeAnnotation({ ...(item as object), id } as Annotation));
    } catch {
      // Skip malformed annotation entries.
    }
  }
  return out;
}

function normalizeAnnotationsLoose(value: readonly Annotation[]): readonly Annotation[] {
  return value.map((item) => normalizeAnnotation(item));
}

function normalizeTransform(raw: unknown): TransformState {
  const base = createInitialTransform();
  if (!isRecord(raw)) {
    return base;
  }
  const degrees = Number(raw['rotationDegrees']);
  return {
    rotationDegrees: Number.isFinite(degrees) ? degrees : base.rotationDegrees,
    flipX: !!raw['flipX'],
    flipY: !!raw['flipY'],
  };
}

function normalizeOutput(raw: unknown, fallback: ImageSize): OutputState {
  if (!isRecord(raw)) {
    return { width: fallback.width, height: fallback.height };
  }
  const width = Math.round(Number(raw['width']));
  const height = Math.round(Number(raw['height']));
  return {
    width: Number.isFinite(width) && width >= 1 ? width : fallback.width,
    height: Number.isFinite(height) && height >= 1 ? height : fallback.height,
  };
}

function normalizeImageSize(raw: unknown, fallback: ImageSize): ImageSize {
  if (!isRecord(raw)) {
    return fallback;
  }
  const width = Math.round(Number(raw['width']));
  const height = Math.round(Number(raw['height']));
  return {
    width: Number.isFinite(width) && width >= 1 ? width : fallback.width,
    height: Number.isFinite(height) && height >= 1 ? height : fallback.height,
  };
}

function normalizeSourceReference(raw: unknown, sourceSize: ImageSize): ImageSourceReference {
  if (!isRecord(raw)) {
    return {
      kind: 'url',
      id: `persisted_${sourceSize.width}x${sourceSize.height}`,
    };
  }
  const kindRaw = raw['kind'];
  const kind =
    kindRaw === 'url' || kindRaw === 'blob-url' || kindRaw === 'file' || kindRaw === 'element'
      ? kindRaw
      : 'url';
  const id =
    typeof raw['id'] === 'string' && raw['id'].trim()
      ? raw['id'].trim()
      : `persisted_${sourceSize.width}x${sourceSize.height}`;
  return {
    kind,
    id,
    url: typeof raw['url'] === 'string' ? raw['url'] : undefined,
    name: typeof raw['name'] === 'string' ? raw['name'] : undefined,
    mimeType: typeof raw['mimeType'] === 'string' ? raw['mimeType'] : undefined,
  };
}

function sanitizePluginState(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertSerializedSize(input: unknown): void {
  let size: number;
  if (typeof input === 'string') {
    size = input.length;
  } else {
    try {
      size = JSON.stringify(input)?.length ?? 0;
    } catch {
      throw new ImageEditorError('DESIGN_STATE_INVALID', 'Design state is not JSON-serializable');
    }
  }
  if (size > DESIGN_STATE_MAX_SERIALIZED_BYTES) {
    throw new ImageEditorError(
      'DESIGN_STATE_INVALID',
      `Design state exceeds max serialized size of ${DESIGN_STATE_MAX_SERIALIZED_BYTES} bytes`,
    );
  }
}

function assertNestingDepth(value: unknown, maxDepth: number, depth = 0): void {
  if (depth > maxDepth) {
    throw new ImageEditorError(
      'DESIGN_STATE_INVALID',
      `Design state exceeds max nesting depth of ${maxDepth}`,
    );
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNestingDepth(item, maxDepth, depth + 1);
    }
    return;
  }
  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      assertNestingDepth(value[key], maxDepth, depth + 1);
    }
  }
}

function coerceObject(input: unknown): Record<string, unknown> | null {
  if (typeof input === 'string') {
    try {
      const parsed: unknown = JSON.parse(input);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(input) ? input : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
