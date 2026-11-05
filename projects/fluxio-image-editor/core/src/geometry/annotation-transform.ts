import type {
  EllipseAnnotation,
  ImageAnnotation,
  ImageSize,
  LineAnnotation,
  PathAnnotation,
  PolygonAnnotation,
  RectAnnotation,
  ShapeAnnotation,
  TextAnnotation,
} from '../models/image-document';
import { isCssColorTransparent } from '../models/color';
import {
  createAnnotationId,
  defaultTextBoxWidth,
  normalizeImageAnnotation,
  normalizePathAnnotation,
  normalizeShapeAnnotation,
  normalizeTextAnnotation,
} from '../models/image-document';

/**
 * Coordinate space for all helpers in this module: **document/output pixels**
 * (composed post-crop/post-transform image space). Not source pixels, not CSS,
 * not Fabric viewport space.
 */

export const MIN_IMAGE_ANNOTATION_SIZE = 16;
export const MIN_INTERACTIVE_ANNOTATION_SIZE = 16;
/**
 * Soft contain: keep at least this fraction of the AABB overlapping the output
 * so overlays/shapes can hang off-canvas without vanishing.
 */
export const SOFT_CONTAIN_MIN_OVERLAP_RATIO = 0.2;
/** Soft contain size cap relative to the larger output edge. */
export const SOFT_CONTAIN_MAX_SIZE_FACTOR = 4;

/** How aggressively {@link containBounds} keeps geometry inside the output plate. */
export type AnnotationContainMode = 'strict' | 'soft';
/** Regular polygon side count (triangle … dodecagon). */
export const MIN_POLYGON_SIDES = 3;
export const MAX_POLYGON_SIDES = 12;
/** Distance above the top edge (output px) for the rotation handle. */
/**
 * Preferred on-screen distance from selection edge to rotate knob.
 * Renderer converts via `/ zoom` so the gap stays constant while zooming.
 */
export const ROTATE_HANDLE_OFFSET = 40;

/** Tighter gap for annotation chrome (shapes / emoji / text) — small items. */
export const ANNOTATION_ROTATE_HANDLE_OFFSET = 24;

export function clampPolygonSides(sides: number): number {
  if (!Number.isFinite(sides)) {
    return MIN_POLYGON_SIDES;
  }
  return Math.min(MAX_POLYGON_SIDES, Math.max(MIN_POLYGON_SIDES, Math.round(sides)));
}

/** Regular n-gon inscribed in `bounds`, first vertex at top center. */
export function regularPolygonPointsInBounds(
  bounds: InteractiveBounds,
  sides: number,
): AnnotationPoint2D[] {
  const n = clampPolygonSides(sides);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rx = Math.max(0, bounds.width / 2);
  const ry = Math.max(0, bounds.height / 2);
  const points: AnnotationPoint2D[] = [];
  for (let i = 0; i < n; i += 1) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    points.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }
  return points;
}

/** Corner resize + body move + rotate for annotation interaction (UX-I0 / UX-I5). */
export type ImageAnnotationHandle = 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'rotate';
export type AnnotationHandle = ImageAnnotationHandle;

export interface ImageAnnotationPoint {
  readonly x: number;
  readonly y: number;
}

export type AnnotationPoint2D = ImageAnnotationPoint;

/** AABB used for chrome / hit-test / drag math. */
export interface InteractiveBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type TransformableAnnotation =
  | ImageAnnotation
  | TextAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | PolygonAnnotation
  | LineAnnotation
  | PathAnnotation;

export type AnnotationCreateKind = 'text' | 'rect' | 'ellipse' | 'polygon' | 'line' | 'arrow';

/**
 * Offset a new overlay so it does not share the exact same top-left as an
 * existing image annotation. Step is in output pixels.
 */
export function cascadePlaceImageAnnotation(
  candidate: ImageAnnotation,
  existing: readonly ImageAnnotation[],
  output: ImageSize,
  stepPx = 24,
): ImageAnnotation {
  const placed = cascadePlaceBounds(candidate, existing, output, stepPx);
  return containImageAnnotation(normalizeImageAnnotation({ ...candidate, ...placed }), output);
}

/** Cascade any AABB-backed annotation so new items do not stack exactly. */
export function cascadePlaceBounds(
  candidate: InteractiveBounds,
  existing: readonly InteractiveBounds[],
  output: ImageSize,
  stepPx = 24,
): InteractiveBounds {
  const step = Math.max(8, Math.round(stepPx));
  let next = { ...candidate };
  let guard = 0;

  while (
    existing.some(
      (item) =>
        Math.round(item.x) === Math.round(next.x) && Math.round(item.y) === Math.round(next.y),
    ) &&
    guard < 48
  ) {
    let x = next.x + step;
    let y = next.y + step;
    if (x + next.width > output.width) {
      x = Math.max(0, output.width - next.width);
    }
    if (y + next.height > output.height) {
      y = Math.max(0, output.height - next.height);
    }
    if (x === next.x && y === next.y) {
      x = Math.max(0, next.x - step);
      y = Math.max(0, next.y - step);
    }
    next = { ...next, x, y };
    guard += 1;
  }

  return containBounds(next, output, MIN_INTERACTIVE_ANNOTATION_SIZE, true);
}

/**
 * Soft-contain an image overlay/sticker: may overhang the output plate, but
 * keeps a minimum overlap so it stays selectable. Export still clips to output.
 */
export function containImageAnnotation(
  annotation: ImageAnnotation,
  output: ImageSize,
): ImageAnnotation {
  const bounds = containBounds(annotation, output, MIN_IMAGE_ANNOTATION_SIZE, true, 'soft');
  return normalizeImageAnnotation({
    ...annotation,
    ...bounds,
  });
}

/**
 * Keep annotation geometry usable relative to the output AABB.
 *
 * - `strict` (default): fully inside — used by text, path, watermark.
 * - `soft`: may overhang; keeps a minimum overlap so the object stays grabable.
 *   Used by image overlays/stickers and shapes. Export still clips to output.
 */
export function containBounds(
  bounds: InteractiveBounds,
  output: ImageSize,
  minSize = MIN_INTERACTIVE_ANNOTATION_SIZE,
  preserveAspect = false,
  mode: AnnotationContainMode = 'strict',
): InteractiveBounds {
  if (mode === 'soft') {
    return softContainBounds(bounds, output, minSize, preserveAspect);
  }

  const maxW = Math.max(minSize, output.width);
  const maxH = Math.max(minSize, output.height);
  let width = clamp(bounds.width, minSize, maxW);
  let height = clamp(bounds.height, minSize, maxH);

  if (preserveAspect) {
    const aspect = bounds.width > 0 && bounds.height > 0 ? bounds.width / bounds.height : 1;
    if (width / height > aspect) {
      width = height * aspect;
    } else {
      height = width / aspect;
    }
    width = clamp(width, minSize, maxW);
    height = clamp(height, minSize, maxH);
  }

  const x = clamp(bounds.x, 0, Math.max(0, output.width - width));
  const y = clamp(bounds.y, 0, Math.max(0, output.height - height));

  return { x, y, width, height };
}

function softContainBounds(
  bounds: InteractiveBounds,
  output: ImageSize,
  minSize: number,
  preserveAspect: boolean,
): InteractiveBounds {
  const maxDim = Math.max(
    minSize,
    Math.max(output.width, output.height) * SOFT_CONTAIN_MAX_SIZE_FACTOR,
  );
  let width = clamp(bounds.width, minSize, maxDim);
  let height = clamp(bounds.height, minSize, maxDim);

  if (preserveAspect) {
    const aspect = bounds.width > 0 && bounds.height > 0 ? bounds.width / bounds.height : 1;
    if (width / height > aspect) {
      width = height * aspect;
    } else {
      height = width / aspect;
    }
    width = clamp(width, minSize, maxDim);
    height = clamp(height, minSize, maxDim);
  }

  return {
    ...softClampOrigin(bounds.x, bounds.y, width, height, output),
    width,
    height,
  };
}

/** Clamp origin so at least a strip of the box stays over the output plate. */
function softClampOrigin(
  x: number,
  y: number,
  width: number,
  height: number,
  output: ImageSize,
): { readonly x: number; readonly y: number } {
  const overlapX = Math.max(8, Math.min(width, output.width) * SOFT_CONTAIN_MIN_OVERLAP_RATIO);
  const overlapY = Math.max(8, Math.min(height, output.height) * SOFT_CONTAIN_MIN_OVERLAP_RATIO);
  return {
    x: clamp(x, overlapX - width, output.width - overlapX),
    y: clamp(y, overlapY - height, output.height - overlapY),
  };
}

/**
 * Emoji plugin places glyphs as text with a color-emoji font stack.
 * Detect that without depending on the emoji plugin package.
 */
export function isEmojiTextAnnotation(text: TextAnnotation): boolean {
  const family = text.fontFamily ?? '';
  return /Segoe UI Emoji|Apple Color Emoji|Noto Color Emoji|Twemoji Mozilla/i.test(family);
}

function allowsSoftOverhang(annotation: TransformableAnnotation): boolean {
  if (annotation.kind === 'text') {
    return isEmojiTextAnnotation(annotation);
  }
  return (
    annotation.kind === 'image' ||
    annotation.kind === 'rect' ||
    annotation.kind === 'ellipse' ||
    annotation.kind === 'polygon' ||
    annotation.kind === 'line' ||
    annotation.kind === 'arrow'
  );
}

/**
 * Hit-test a single image annotation (AABB, ignoring angle for UX-I1).
 * `handleHitSize` is half-extent in **output pixels**.
 */
export function hitTestImageAnnotationHandle(
  annotation: InteractiveBounds,
  point: ImageAnnotationPoint,
  handleHitSize: number,
  rotateOffset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): ImageAnnotationHandle | null {
  return hitTestBoundsHandle(annotation, point, handleHitSize, rotateOffset);
}

/** Rotation-handle anchor (bottom-center, offset downward). */
export function rotateHandlePoint(
  bounds: InteractiveBounds,
  offset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): AnnotationPoint2D {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height + offset,
  };
}

export function hitTestBoundsHandle(
  bounds: InteractiveBounds,
  point: AnnotationPoint2D,
  handleHitSize: number,
  rotateOffset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): AnnotationHandle | null {
  const half = Math.max(handleHitSize, 4);
  const left = bounds.x;
  const right = bounds.x + bounds.width;
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;

  const rotate = rotateHandlePoint(bounds, rotateOffset);
  if (Math.abs(point.x - rotate.x) <= half && Math.abs(point.y - rotate.y) <= half) {
    return 'rotate';
  }

  const corners: readonly {
    readonly handle: AnnotationHandle;
    readonly x: number;
    readonly y: number;
  }[] = [
    { handle: 'nw', x: left, y: top },
    { handle: 'ne', x: right, y: top },
    { handle: 'se', x: right, y: bottom },
    { handle: 'sw', x: left, y: bottom },
  ];

  for (const corner of corners) {
    if (Math.abs(point.x - corner.x) <= half && Math.abs(point.y - corner.y) <= half) {
      return corner.handle;
    }
  }

  if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
    return 'move';
  }

  return null;
}

/** Inflate AABB for thin strokes (paths / lines) so hit-testing is practical. */
export function inflateBounds(bounds: InteractiveBounds, pad: number): InteractiveBounds {
  const p = Math.max(0, pad);
  return {
    x: bounds.x - p,
    y: bounds.y - p,
    width: bounds.width + p * 2,
    height: bounds.height + p * 2,
  };
}

/**
 * Bounds used for pointer hit-testing (may be larger than chrome AABB for
 * thin geometry). Chrome / resize still use `boundsFromTransformable`.
 */
export function interactionBoundsFromTransformable(
  annotation: TransformableAnnotation,
): InteractiveBounds {
  const bounds = boundsFromTransformable(annotation);
  if (annotation.kind === 'path' || annotation.kind === 'line' || annotation.kind === 'arrow') {
    const strokePad = 'strokeWidth' in annotation ? Math.max(4, annotation.strokeWidth / 2 + 4) : 4;
    const pad = Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE / 2, strokePad);
    return inflateBounds(bounds, pad);
  }
  return bounds;
}

/**
 * Top-most hit among image annotations (last array entry wins when overlapping).
 * When selection is set, those annotation handles are preferred first.
 */
export function hitTestImageAnnotations(
  images: readonly (InteractiveBounds & { readonly id: string })[],
  point: ImageAnnotationPoint,
  handleHitSize: number,
  selectedId: string | readonly string[] | null = null,
  rotateOffset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): { readonly id: string; readonly handle: ImageAnnotationHandle } | null {
  return hitTestInteractiveAnnotations(images, point, handleHitSize, selectedId, rotateOffset);
}

export function normalizeSelectedAnnotationIds(
  selected: string | readonly string[] | null | undefined,
): readonly string[] {
  if (selected == null) {
    return [];
  }
  if (typeof selected === 'string') {
    return selected ? [selected] : [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of selected) {
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Toggle `id` within a selection set (Phase 4.8.1 additive multi-select).
 * Returns a new array; primary (last) is the toggled id when added.
 */
export function toggleAnnotationSelection(
  current: readonly string[],
  id: string,
): readonly string[] {
  if (current.includes(id)) {
    return current.filter((item) => item !== id);
  }
  return [...current.filter((item) => item !== id), id];
}

/** Axis-aligned union of bounds, or null when empty. */
export function unionBounds(items: readonly InteractiveBounds[]): InteractiveBounds | null {
  if (items.length === 0) {
    return null;
  }
  let minX = items[0]!.x;
  let minY = items[0]!.y;
  let maxX = items[0]!.x + items[0]!.width;
  let maxY = items[0]!.y + items[0]!.height;
  for (let i = 1; i < items.length; i += 1) {
    const item = items[i]!;
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxX - minX),
    height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxY - minY),
  };
}

export function hitTestInteractiveAnnotations(
  items: readonly (InteractiveBounds & { readonly id: string })[],
  point: AnnotationPoint2D,
  handleHitSize: number,
  selectedId: string | readonly string[] | null = null,
  rotateOffset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): { readonly id: string; readonly handle: AnnotationHandle } | null {
  const selectedIds = normalizeSelectedAnnotationIds(selectedId);
  const selectedSet = new Set(selectedIds);

  // Prefer selected annotations (top-most among selection first).
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i]!;
    if (!selectedSet.has(item.id)) {
      continue;
    }
    const handle = hitTestBoundsHandle(item, point, handleHitSize, rotateOffset);
    if (handle) {
      return { id: item.id, handle };
    }
  }

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i]!;
    if (selectedSet.has(item.id)) {
      continue;
    }
    const handle = hitTestBoundsHandle(item, point, handleHitSize, rotateOffset);
    if (handle) {
      return { id: item.id, handle };
    }
  }

  return null;
}

/**
 * Apply one pointer-drag sample against the annotation at gesture start.
 * Corner handles preserve aspect ratio. Preview-only until the caller commits.
 */
export function applyImageAnnotationDrag(
  start: ImageAnnotation,
  handle: ImageAnnotationHandle,
  startPoint: ImageAnnotationPoint,
  currentPoint: ImageAnnotationPoint,
  output: ImageSize,
): ImageAnnotation {
  const next = applyBoundsDrag(start, handle, startPoint, currentPoint, output, {
    preserveAspect: true,
    minSize: MIN_IMAGE_ANNOTATION_SIZE,
    containMode: 'soft',
  });
  return normalizeImageAnnotation({ ...start, ...next });
}

export function applyBoundsDrag(
  start: InteractiveBounds,
  handle: AnnotationHandle,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
  output: ImageSize,
  options: {
    readonly preserveAspect?: boolean;
    readonly minSize?: number;
    readonly containMode?: AnnotationContainMode;
  } = {},
): InteractiveBounds {
  if (handle === 'rotate') {
    return start;
  }

  const preserveAspect = options.preserveAspect ?? false;
  const minSize = options.minSize ?? MIN_INTERACTIVE_ANNOTATION_SIZE;
  const containMode = options.containMode ?? 'strict';
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;

  if (handle === 'move') {
    return containBounds(
      {
        ...start,
        x: start.x + dx,
        y: start.y + dy,
      },
      output,
      minSize,
      preserveAspect,
      containMode,
    );
  }

  const aspect = start.width > 0 && start.height > 0 ? start.width / start.height : 1;
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  switch (handle) {
    case 'nw':
      left = start.x + dx;
      top = start.y + dy;
      break;
    case 'ne':
      right = start.x + start.width + dx;
      top = start.y + dy;
      break;
    case 'se':
      right = start.x + start.width + dx;
      bottom = start.y + start.height + dy;
      break;
    case 'sw':
      left = start.x + dx;
      bottom = start.y + start.height + dy;
      break;
  }

  let width = Math.max(minSize, right - left);
  let height = Math.max(minSize, bottom - top);

  if (preserveAspect) {
    if (Math.abs(dx) * aspect >= Math.abs(dy)) {
      height = width / aspect;
    } else {
      width = height * aspect;
    }
    width = Math.max(minSize, width);
    height = Math.max(minSize, height);
  }

  switch (handle) {
    case 'nw':
      left = right - width;
      top = bottom - height;
      break;
    case 'ne':
      top = bottom - height;
      break;
    case 'sw':
      left = right - width;
      break;
    case 'se':
      break;
  }

  return containBounds(
    {
      x: left,
      y: top,
      width,
      height,
    },
    output,
    minSize,
    preserveAspect,
    containMode,
  );
}

export function cursorForImageAnnotationHandle(handle: ImageAnnotationHandle): string {
  return cursorForAnnotationHandle(handle);
}

export function cursorForAnnotationHandle(handle: AnnotationHandle): string {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'rotate':
      return 'grab';
    case 'move':
    default:
      return 'move';
  }
}

/** Approximate multi-line text AABB from content + fontSize (no canvas measure). */
export function boundsFromText(text: TextAnnotation): InteractiveBounds {
  const fontSize = Math.max(8, text.fontSize);
  const lines = text.text.length > 0 ? text.text.split('\n') : [''];
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const pad = !isCssColorTransparent(text.backgroundColor) ? text.padding : 0;
  const naturalContent = Math.max(1, longest) * fontSize * 0.55;
  const contentWidth = Math.max(naturalContent, text.boxWidth > 0 ? text.boxWidth : 0);
  const width = Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, contentWidth + pad * 2);
  const height = Math.max(
    MIN_INTERACTIVE_ANNOTATION_SIZE,
    lines.length * fontSize * text.lineHeight + pad * 2,
  );
  return { x: text.x, y: text.y, width, height };
}

export function boundsFromShape(shape: ShapeAnnotation): InteractiveBounds {
  switch (shape.kind) {
    case 'rect':
    case 'ellipse':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
    case 'polygon': {
      const xs = shape.points.map((p) => p.x);
      const ys = shape.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxX - minX),
        height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxY - minY),
      };
    }
    case 'line':
    case 'arrow': {
      const minX = Math.min(shape.x1, shape.x2);
      const maxX = Math.max(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      const maxY = Math.max(shape.y1, shape.y2);
      return {
        x: minX,
        y: minY,
        width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxX - minX),
        height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxY - minY),
      };
    }
  }
}

export function boundsFromPath(path: PathAnnotation): InteractiveBounds {
  const xs = path.points.map((p) => p.x);
  const ys = path.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxX - minX),
    height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxY - minY),
  };
}

export function boundsFromTransformable(annotation: TransformableAnnotation): InteractiveBounds {
  switch (annotation.kind) {
    case 'image':
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
    case 'text':
      return boundsFromText(annotation);
    case 'path':
      return boundsFromPath(annotation);
    default:
      return boundsFromShape(annotation);
  }
}

export function applyBoundsToText(
  start: TextAnnotation,
  nextBounds: InteractiveBounds,
  output: ImageSize,
): TextAnnotation {
  const containMode: AnnotationContainMode = isEmojiTextAnnotation(start) ? 'soft' : 'strict';
  const contained = containBounds(
    nextBounds,
    output,
    MIN_INTERACTIVE_ANNOTATION_SIZE,
    true,
    containMode,
  );
  const lineCount = Math.max(1, start.text.length > 0 ? start.text.split('\n').length : 1);
  const pad = !isCssColorTransparent(start.backgroundColor) ? start.padding : 0;
  const lineHeight = start.lineHeight > 0 ? start.lineHeight : 1.2;
  const fontSize = Math.max(8, Math.round((contained.height - pad * 2) / (lineCount * lineHeight)));
  const boxWidth = Math.max(8, Math.round(contained.width - pad * 2));
  return normalizeTextAnnotation({
    ...start,
    x: contained.x,
    y: contained.y,
    fontSize,
    boxWidth,
  });
}

export function applyBoundsToShape(
  start: ShapeAnnotation,
  nextBounds: InteractiveBounds,
  output: ImageSize,
): ShapeAnnotation {
  const contained = containBounds(
    nextBounds,
    output,
    MIN_INTERACTIVE_ANNOTATION_SIZE,
    false,
    'soft',
  );

  switch (start.kind) {
    case 'rect':
    case 'ellipse':
      return normalizeShapeAnnotation({
        ...start,
        x: contained.x,
        y: contained.y,
        width: contained.width,
        height: contained.height,
      });
    case 'polygon': {
      const startBounds = boundsFromShape(start);
      const sx = startBounds.width > 0 ? contained.width / startBounds.width : 1;
      const sy = startBounds.height > 0 ? contained.height / startBounds.height : 1;
      const points = start.points.map((p) => ({
        x: contained.x + (p.x - startBounds.x) * sx,
        y: contained.y + (p.y - startBounds.y) * sy,
      }));
      return normalizeShapeAnnotation({ ...start, points });
    }
    case 'line':
    case 'arrow': {
      const startBounds = boundsFromShape(start);
      const sx = startBounds.width > 0 ? contained.width / startBounds.width : 1;
      const sy = startBounds.height > 0 ? contained.height / startBounds.height : 1;
      return normalizeShapeAnnotation({
        ...start,
        x1: contained.x + (start.x1 - startBounds.x) * sx,
        y1: contained.y + (start.y1 - startBounds.y) * sy,
        x2: contained.x + (start.x2 - startBounds.x) * sx,
        y2: contained.y + (start.y2 - startBounds.y) * sy,
      });
    }
  }
}

/** Uniformly scale path points into `nextBounds` (stroke width unchanged). */
export function applyBoundsToPath(
  start: PathAnnotation,
  nextBounds: InteractiveBounds,
  output: ImageSize,
): PathAnnotation {
  const contained = containBounds(nextBounds, output, MIN_INTERACTIVE_ANNOTATION_SIZE, true);
  const startBounds = boundsFromPath(start);
  const sx = startBounds.width > 0 ? contained.width / startBounds.width : 1;
  const sy = startBounds.height > 0 ? contained.height / startBounds.height : 1;
  const points = start.points.map((p) => ({
    x: contained.x + (p.x - startBounds.x) * sx,
    y: contained.y + (p.y - startBounds.y) * sy,
  }));
  return normalizePathAnnotation({ ...start, points });
}

function normalizeAngleDegrees(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  let next = angle % 360;
  if (next > 180) {
    next -= 360;
  } else if (next <= -180) {
    next += 360;
  }
  return next;
}

function rotatePointAround(
  point: AnnotationPoint2D,
  cx: number,
  cy: number,
  degrees: number,
): AnnotationPoint2D {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - cx;
  const dy = point.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/** Signed angle swept by a pointer drag around `center`, in degrees. */
export function rotationDeltaDegrees(
  center: AnnotationPoint2D,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
): number {
  const a0 = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
  const a1 = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
  return ((a1 - a0) * 180) / Math.PI;
}

/**
 * Rotate a transformable annotation. Types with an `angle` field update that
 * field; path / polygon / line / arrow bake the rotation into geometry.
 */
export function rotateTransformable(
  start: TransformableAnnotation,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
  output: ImageSize,
  pivot?: AnnotationPoint2D,
): TransformableAnnotation {
  const bounds = boundsFromTransformable(start);
  const center = pivot ?? {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const delta = rotationDeltaDegrees(center, startPoint, currentPoint);

  if (
    start.kind === 'image' ||
    start.kind === 'text' ||
    start.kind === 'rect' ||
    start.kind === 'ellipse'
  ) {
    const ownCenter = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const nextCenter = rotatePointAround(ownCenter, center.x, center.y, delta);
    const nextAngle = normalizeAngleDegrees(start.angle + delta);
    if (start.kind === 'image') {
      return normalizeImageAnnotation({
        ...start,
        x: nextCenter.x - bounds.width / 2,
        y: nextCenter.y - bounds.height / 2,
        angle: nextAngle,
      });
    }
    if (start.kind === 'text') {
      return normalizeTextAnnotation({
        ...start,
        x: nextCenter.x - bounds.width / 2,
        y: nextCenter.y - bounds.height / 2,
        angle: nextAngle,
      });
    }
    return normalizeShapeAnnotation({
      ...start,
      x: nextCenter.x - bounds.width / 2,
      y: nextCenter.y - bounds.height / 2,
      angle: nextAngle,
    });
  }

  if (start.kind === 'path') {
    const points = start.points.map((p) => rotatePointAround(p, center.x, center.y, delta));
    return containPathInOutput(normalizePathAnnotation({ ...start, points }), output);
  }

  if (start.kind === 'polygon') {
    const points = start.points.map((p) => rotatePointAround(p, center.x, center.y, delta));
    return normalizeShapeAnnotation({ ...start, points });
  }

  return normalizeShapeAnnotation({
    ...start,
    x1: rotatePointAround({ x: start.x1, y: start.y1 }, center.x, center.y, delta).x,
    y1: rotatePointAround({ x: start.x1, y: start.y1 }, center.x, center.y, delta).y,
    x2: rotatePointAround({ x: start.x2, y: start.y2 }, center.x, center.y, delta).x,
    y2: rotatePointAround({ x: start.x2, y: start.y2 }, center.x, center.y, delta).y,
  });
}

function containPathInOutput(path: PathAnnotation, output: ImageSize): PathAnnotation {
  const bounds = boundsFromPath(path);
  const contained = containBounds(bounds, output, MIN_INTERACTIVE_ANNOTATION_SIZE, true);
  if (
    Math.abs(contained.x - bounds.x) < 0.01 &&
    Math.abs(contained.y - bounds.y) < 0.01 &&
    Math.abs(contained.width - bounds.width) < 0.01 &&
    Math.abs(contained.height - bounds.height) < 0.01
  ) {
    return path;
  }
  return applyBoundsToPath(path, contained, output);
}

export function applyTransformableDrag(
  start: TransformableAnnotation,
  handle: AnnotationHandle,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
  output: ImageSize,
): TransformableAnnotation {
  if (handle === 'rotate') {
    return rotateTransformable(start, startPoint, currentPoint, output);
  }

  if (start.kind === 'image') {
    return applyImageAnnotationDrag(start, handle, startPoint, currentPoint, output);
  }

  const startBounds = boundsFromTransformable(start);
  const preserveAspect = start.kind === 'text' || start.kind === 'path';
  const nextBounds = applyBoundsDrag(startBounds, handle, startPoint, currentPoint, output, {
    preserveAspect,
    minSize: MIN_INTERACTIVE_ANNOTATION_SIZE,
    containMode: allowsSoftOverhang(start) ? 'soft' : 'strict',
  });

  if (start.kind === 'text') {
    return applyBoundsToText(start, nextBounds, output);
  }
  if (start.kind === 'path') {
    return applyBoundsToPath(start, nextBounds, output);
  }
  return applyBoundsToShape(start, nextBounds, output);
}

/**
 * Phase 4.8.1: joint move/resize for a multi-selection.
 * Coordinate space: document/output pixels. Preview-only until the caller commits.
 * Group resize preserves the union aspect ratio and scales members relatively.
 */
export function applyGroupTransformableDrag(
  starts: readonly TransformableAnnotation[],
  handle: AnnotationHandle,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
  output: ImageSize,
): readonly TransformableAnnotation[] {
  if (starts.length === 0) {
    return starts;
  }
  if (starts.length === 1) {
    return [applyTransformableDrag(starts[0]!, handle, startPoint, currentPoint, output)];
  }

  const startBoundsList = starts.map(boundsFromTransformable);
  const group0 = unionBounds(startBoundsList);
  if (!group0) {
    return starts;
  }

  if (handle === 'rotate') {
    const pivot = {
      x: group0.x + group0.width / 2,
      y: group0.y + group0.height / 2,
    };
    return starts.map((ann) => rotateTransformable(ann, startPoint, currentPoint, output, pivot));
  }

  if (handle === 'move') {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const rawX = group0.x + dx;
    const rawY = group0.y + dy;
    const soft = starts.every(allowsSoftOverhang);
    const origin = soft
      ? softClampOrigin(rawX, rawY, group0.width, group0.height, output)
      : {
          x: clamp(rawX, 0, Math.max(0, output.width - group0.width)),
          y: clamp(rawY, 0, Math.max(0, output.height - group0.height)),
        };
    const adx = origin.x - group0.x;
    const ady = origin.y - group0.y;
    // Same delta for every member — no per-item contain (preserves relatives).
    return starts.map((ann) => offsetTransformable(ann, adx, ady));
  }

  const group1 = applyBoundsDrag(group0, handle, startPoint, currentPoint, output, {
    preserveAspect: true,
    minSize: MIN_INTERACTIVE_ANNOTATION_SIZE,
    containMode: starts.every(allowsSoftOverhang) ? 'soft' : 'strict',
  });
  const sx = group0.width > 0 ? group1.width / group0.width : 1;
  const sy = group0.height > 0 ? group1.height / group0.height : 1;

  return starts.map((ann, index) => {
    const b = startBoundsList[index]!;
    const nextBounds: InteractiveBounds = {
      x: group1.x + (b.x - group0.x) * sx,
      y: group1.y + (b.y - group0.y) * sy,
      width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, b.width * sx),
      height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, b.height * sy),
    };
    return applyNumericBoundsToTransformable(ann, nextBounds, output);
  });
}

/** Place a default text annotation at a document-space click. */
export function placeTextAnnotationAt(
  point: AnnotationPoint2D,
  output: ImageSize,
  existing: readonly TextAnnotation[] = [],
): TextAnnotation {
  const fontSize = Math.max(16, Math.round(Math.min(output.width, output.height) * 0.04));
  const boxWidth = defaultTextBoxWidth(output, fontSize);
  const candidate = normalizeTextAnnotation({
    id: createAnnotationId(),
    x: point.x,
    y: point.y,
    text: 'Text',
    fontSize,
    boxWidth,
    fill: '#ffffff',
    fontFamily: 'sans-serif',
    angle: 0,
  });
  const cascaded = cascadePlaceBounds(
    boundsFromText(candidate),
    existing.map(boundsFromText),
    output,
  );
  return normalizeTextAnnotation({ ...candidate, x: cascaded.x, y: cascaded.y });
}

/**
 * True when a pointer drag is large enough to start drawing a shape
 * (Pintura-style: click clears selection; drag draws).
 */
export function isShapeCreateDragMeaningful(
  start: AnnotationPoint2D,
  current: AnnotationPoint2D,
): boolean {
  return (
    Math.abs(current.x - start.x) >= MIN_INTERACTIVE_ANNOTATION_SIZE ||
    Math.abs(current.y - start.y) >= MIN_INTERACTIVE_ANNOTATION_SIZE
  );
}

/**
 * Build a shape from a click-drag rectangle in document space.
 * Callers should only invoke this after {@link isShapeCreateDragMeaningful}.
 */
export function createShapeFromDrag(
  kind: Exclude<AnnotationCreateKind, 'text'>,
  start: AnnotationPoint2D,
  current: AnnotationPoint2D,
  output: ImageSize,
  options?: { readonly polygonSides?: number },
): ShapeAnnotation {
  const minX = Math.min(start.x, current.x);
  const maxX = Math.max(start.x, current.x);
  const minY = Math.min(start.y, current.y);
  const maxY = Math.max(start.y, current.y);
  const width = Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxX - minX);
  const height = Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, maxY - minY);
  const stroke = '#ff3b30';
  const strokeWidth = Math.max(2, Math.round(Math.min(output.width, output.height) * 0.004));
  const id = createAnnotationId();

  const bounds = containBounds(
    { x: minX, y: minY, width, height },
    output,
    MIN_INTERACTIVE_ANNOTATION_SIZE,
    false,
    'soft',
  );

  switch (kind) {
    case 'rect':
      return normalizeShapeAnnotation({
        id,
        kind: 'rect',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        stroke,
        strokeWidth,
        fill: 'transparent',
        angle: 0,
      });
    case 'ellipse':
      return normalizeShapeAnnotation({
        id,
        kind: 'ellipse',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        stroke,
        strokeWidth,
        fill: 'transparent',
        angle: 0,
      });
    case 'polygon':
      return normalizeShapeAnnotation({
        id,
        kind: 'polygon',
        points: regularPolygonPointsInBounds(bounds, options?.polygonSides ?? MIN_POLYGON_SIDES),
        stroke,
        strokeWidth,
        fill: 'transparent',
      });
    case 'line':
    case 'arrow': {
      const ends =
        kind === 'arrow'
          ? { lineStart: 'none' as const, lineEnd: 'arrowSolid' as const }
          : { lineStart: 'none' as const, lineEnd: 'none' as const };
      const containedLine = containBounds(
        {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, Math.abs(current.x - start.x)),
          height: Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, Math.abs(current.y - start.y)),
        },
        output,
        MIN_INTERACTIVE_ANNOTATION_SIZE,
        false,
        'soft',
      );
      // Keep true endpoints when the drag is meaningful; clamp via bounds origin shift.
      const shiftX = containedLine.x - Math.min(start.x, current.x);
      const shiftY = containedLine.y - Math.min(start.y, current.y);
      return normalizeShapeAnnotation({
        id,
        kind,
        x1: start.x + shiftX,
        y1: start.y + shiftY,
        x2: current.x + shiftX,
        y2: current.y + shiftY,
        stroke,
        strokeWidth,
        ...ends,
      });
    }
  }
}

/** UX-I4: arrow-key nudge in document pixels. */
export const ANNOTATION_NUDGE_STEP = 1;
/** UX-I4: Shift+arrow larger nudge. */
export const ANNOTATION_NUDGE_STEP_LARGE = 10;

export type AnnotationOrderAction = 'forward' | 'backward' | 'front' | 'back';

/**
 * Move a transformable annotation by `(dx, dy)` document pixels and keep it
 * inside the output frame.
 */
export function nudgeTransformable(
  annotation: TransformableAnnotation,
  dx: number,
  dy: number,
  output: ImageSize,
): TransformableAnnotation {
  const start = boundsFromTransformable(annotation);
  const nextBounds: InteractiveBounds = {
    x: start.x + dx,
    y: start.y + dy,
    width: start.width,
    height: start.height,
  };
  return applyNumericBoundsToTransformable(annotation, nextBounds, output);
}

/** Translate without containment (Phase 4.8.1 group move). */
function offsetTransformable(
  annotation: TransformableAnnotation,
  dx: number,
  dy: number,
): TransformableAnnotation {
  if (annotation.kind === 'image') {
    return normalizeImageAnnotation({
      ...annotation,
      x: annotation.x + dx,
      y: annotation.y + dy,
    });
  }
  if (annotation.kind === 'text') {
    return normalizeTextAnnotation({
      ...annotation,
      x: annotation.x + dx,
      y: annotation.y + dy,
    });
  }
  if (annotation.kind === 'path') {
    return normalizePathAnnotation({
      ...annotation,
      points: annotation.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    });
  }
  switch (annotation.kind) {
    case 'rect':
    case 'ellipse':
      return normalizeShapeAnnotation({
        ...annotation,
        x: annotation.x + dx,
        y: annotation.y + dy,
      });
    case 'polygon':
      return normalizeShapeAnnotation({
        ...annotation,
        points: annotation.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      });
    case 'line':
    case 'arrow':
      return normalizeShapeAnnotation({
        ...annotation,
        x1: annotation.x1 + dx,
        y1: annotation.y1 + dy,
        x2: annotation.x2 + dx,
        y2: annotation.y2 + dy,
      });
  }
}

/**
 * Apply explicit numeric AABB to a transformable annotation (inspector fields).
 * Images/text/paths preserve aspect when both width and height change from start.
 */
export function applyNumericBoundsToTransformable(
  annotation: TransformableAnnotation,
  nextBounds: InteractiveBounds,
  output: ImageSize,
): TransformableAnnotation {
  if (annotation.kind === 'image') {
    const contained = containBounds(nextBounds, output, MIN_IMAGE_ANNOTATION_SIZE, true, 'soft');
    return normalizeImageAnnotation({
      ...annotation,
      ...contained,
    });
  }
  if (annotation.kind === 'text') {
    return applyBoundsToText(annotation, nextBounds, output);
  }
  if (annotation.kind === 'path') {
    return applyBoundsToPath(annotation, nextBounds, output);
  }
  return applyBoundsToShape(annotation, nextBounds, output);
}

/**
 * Whether `action` would change the global stack position of `id`.
 * Later array entries draw on top (and win hit-tests).
 */
export function canReorderAnnotationById(
  list: readonly { readonly id: string }[],
  id: string,
  action: AnnotationOrderAction,
): boolean {
  const index = list.findIndex((item) => item.id === id);
  if (index < 0 || list.length < 2) {
    return false;
  }
  switch (action) {
    case 'forward':
    case 'front':
      return index < list.length - 1;
    case 'backward':
    case 'back':
      return index > 0;
  }
}

/**
 * Reorder by id in a unified stack. Later entries draw on top (and win hit-tests).
 * `forward` / `front` move toward the end; `backward` / `back` toward the start.
 * Returns the same reference when the action is a no-op.
 */
export function reorderAnnotationById<T extends { readonly id: string }>(
  list: readonly T[],
  id: string,
  action: AnnotationOrderAction,
): readonly T[] {
  if (!canReorderAnnotationById(list, id, action)) {
    return list;
  }

  const index = list.findIndex((item) => item.id === id);
  const next = list.slice();
  const [item] = next.splice(index, 1);
  if (!item) {
    return list;
  }

  switch (action) {
    case 'forward':
      next.splice(index + 1, 0, item);
      break;
    case 'backward':
      next.splice(index - 1, 0, item);
      break;
    case 'front':
      next.push(item);
      break;
    case 'back':
      next.unshift(item);
      break;
  }

  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
