import {
  createAnnotationId,
  defaultLineEndsForKind,
  normalizeShapeAnnotation,
  normalizeTextAnnotation,
  type Annotation,
  type ImageSize,
  type TemplatePlaceholder,
} from 'fluxio-image-editor/core';

/**
 * Turn normalized template placeholders into document annotations for `output`.
 * Unknown / invalid entries are skipped.
 */
export function materializeTemplatePlaceholders(
  placeholders: readonly TemplatePlaceholder[] | null | undefined,
  output: ImageSize,
): readonly Annotation[] {
  if (!placeholders?.length) {
    return [];
  }
  const width = Math.max(1, Math.round(output.width));
  const height = Math.max(1, Math.round(output.height));
  const minEdge = Math.min(width, height);
  const out: Annotation[] = [];

  for (const item of placeholders) {
    if (!item || typeof item !== 'object' || !('kind' in item)) {
      continue;
    }
    switch (item.kind) {
      case 'text': {
        const fontSize = resolveScaled(item.fontSize, minEdge, 0.05, 16);
        const boxWidth =
          item.boxWidth === undefined
            ? 0
            : Math.max(0, Math.round(clamp01(item.boxWidth) * width));
        out.push(
          normalizeTextAnnotation({
            id: createAnnotationId(),
            x: scaleAxis(item.x, width),
            y: scaleAxis(item.y, height),
            text: typeof item.text === 'string' ? item.text : 'Text',
            fontSize,
            fill: item.fill,
            fontFamily: item.fontFamily,
            fontWeight: item.fontWeight,
            fontStyle: item.fontStyle,
            textAlign: item.textAlign,
            boxWidth,
            backgroundColor: item.backgroundColor,
            padding: resolveScaled(item.padding, minEdge, 0, 0),
            angle: Number.isFinite(item.angle) ? item.angle! : 0,
            underline: item.underline === true,
            linethrough: item.linethrough === true,
          }),
        );
        break;
      }
      case 'rect':
      case 'ellipse': {
        out.push(
          normalizeShapeAnnotation({
            id: createAnnotationId(),
            kind: item.kind,
            x: scaleAxis(item.x, width),
            y: scaleAxis(item.y, height),
            width: Math.max(1, scaleAxis(item.width, width)),
            height: Math.max(1, scaleAxis(item.height, height)),
            stroke: item.stroke ?? '#ff3b30',
            strokeWidth: resolveScaled(item.strokeWidth, minEdge, 0.004, 2),
            fill: item.fill ?? 'transparent',
            angle: Number.isFinite(item.angle) ? item.angle! : 0,
          }),
        );
        break;
      }
      case 'line':
      case 'arrow': {
        const ends = defaultLineEndsForKind(item.kind);
        out.push(
          normalizeShapeAnnotation({
            id: createAnnotationId(),
            kind: item.kind,
            x1: scaleAxis(item.x1, width),
            y1: scaleAxis(item.y1, height),
            x2: scaleAxis(item.x2, width),
            y2: scaleAxis(item.y2, height),
            stroke: item.stroke ?? '#ff3b30',
            strokeWidth: resolveScaled(item.strokeWidth, minEdge, 0.004, 2),
            lineStart: item.lineStart ?? ends.lineStart,
            lineEnd: item.lineEnd ?? ends.lineEnd,
          }),
        );
        break;
      }
      default:
        break;
    }
  }

  return out;
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

/**
 * Fractions of `basis` when `0 <= value < 1`; absolute pixels when `value >= 1`.
 */
function resolveScaled(
  value: number | undefined,
  basis: number,
  fallbackFraction: number,
  fallbackAbsolute: number,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    if (fallbackFraction > 0) {
      return Math.max(1, Math.round(basis * fallbackFraction));
    }
    return Math.max(0, fallbackAbsolute);
  }
  if (value >= 1) {
    return Math.max(0, Math.round(value));
  }
  if (value <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(value * basis));
}
