import {
  createAnnotationId,
  normalizeDesignImage,
  normalizeImageAnnotation,
  normalizeShapeAnnotation,
  type Annotation,
  type DesignImageState,
  type ImageSize,
  type TemplateImageSlot,
  type TemplatePreset,
} from 'fluxio-image-editor/core';

const DEFAULT_PLACEHOLDER_FILL = 'rgba(120, 120, 128, 0.22)';
const DEFAULT_PLACEHOLDER_STROKE = 'rgba(120, 120, 128, 0.55)';

/** True when the preset defines a multi-slot collage (≥ 2 slots). */
export function templateHasSlots(preset: TemplatePreset | null | undefined): boolean {
  return Array.isArray(preset?.slots) && preset!.slots!.length >= 2;
}

/** Aspect lock for framing the primary (first) collage slot, else null. */
export function resolvePrimarySlotAspectRatio(
  preset: TemplatePreset | null | undefined,
): number | null {
  if (!templateHasSlots(preset)) {
    return null;
  }
  const slot = preset!.slots![0];
  const w = Number.isFinite(slot.width) ? slot.width : 0;
  const h = Number.isFinite(slot.height) ? slot.height : 0;
  if (w <= 0 || h <= 0) {
    return null;
  }
  return w / h;
}

/**
 * Place the document photo into the first slot (output pixels).
 * Photo fills the slot rectangle (stretch); unlock so the host can nudge it.
 */
export function designImageForPrimarySlot(
  slots: readonly TemplateImageSlot[],
  output: ImageSize,
): DesignImageState | null {
  if (slots.length === 0) {
    return null;
  }
  const rect = slotToPixels(slots[0], output);
  if (!rect) {
    return null;
  }
  return normalizeDesignImage(
    {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      angle: 0,
      locked: false,
    },
    output,
  );
}

/**
 * Materialize secondary collage slots as image overlays or placeholder rects.
 * First slot is handled via {@link designImageForPrimarySlot}, not annotations.
 * Canvas gutters between slots stay transparent (no full-bleed background layer,
 * which would cover the primary photo).
 */
export function materializeTemplateSlots(
  slots: readonly TemplateImageSlot[] | null | undefined,
  output: ImageSize,
): readonly Annotation[] {
  if (!slots?.length) {
    return [];
  }
  const width = Math.max(1, Math.round(output.width));
  const height = Math.max(1, Math.round(output.height));
  const minEdge = Math.min(width, height);
  const out: Annotation[] = [];

  // Skip index 0 — primary photo uses designImage.
  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    const rect = slotToPixels(slot, { width, height });
    if (!rect) {
      continue;
    }

    const src = typeof slot.src === 'string' ? slot.src.trim() : '';
    if (src) {
      out.push(
        normalizeImageAnnotation({
          id: createAnnotationId(),
          src,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          opacity: 1,
          angle: 0,
        }),
      );
      continue;
    }

    out.push(
      normalizeShapeAnnotation({
        id: createAnnotationId(),
        kind: 'rect',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fill: slot.placeholderFill ?? DEFAULT_PLACEHOLDER_FILL,
        stroke: slot.placeholderStroke ?? DEFAULT_PLACEHOLDER_STROKE,
        strokeWidth: Math.max(1, Math.round(minEdge * 0.003)),
        angle: 0,
      }),
    );
  }

  return out;
}

function slotToPixels(
  slot: TemplateImageSlot,
  output: ImageSize,
): { x: number; y: number; width: number; height: number } | null {
  if (!slot || typeof slot !== 'object') {
    return null;
  }
  const x = scaleAxis(slot.x, output.width);
  const y = scaleAxis(slot.y, output.height);
  const width = Math.max(1, scaleAxis(slot.width, output.width));
  const height = Math.max(1, scaleAxis(slot.height, output.height));
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  return { x, y, width, height };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function scaleAxis(fraction: number, size: number): number {
  return Math.round(clamp01(fraction) * size);
}
