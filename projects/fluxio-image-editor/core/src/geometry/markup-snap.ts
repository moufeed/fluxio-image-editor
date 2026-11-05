import {
  normalizeDesignImage,
  type DesignImageState,
  type ImageSize,
} from '../models/image-document';
import {
  applyNumericBoundsToTransformable,
  boundsFromTransformable,
  unionBounds,
  type InteractiveBounds,
  type TransformableAnnotation,
} from './annotation-transform';
import { designImageBounds } from './design-image-transform';

/**
 * Markup snap / grid chrome (PV49 / NF02).
 * Coordinate space: **document/output pixels** (same as annotation transforms).
 * Preview-only — never baked into export / design-state.
 */

/** Axis-aligned guide line in document space. */
export interface MarkupGuide {
  readonly id: string;
  /** Vertical guide at `position` x, or horizontal guide at `position` y. */
  readonly axis: 'x' | 'y';
  readonly position: number;
}

/**
 * Host / runtime options for annotation snap + grid overlay
 * (Pintura `annotateGridSize` / `annotateSnapToContext` / snap threshold parity).
 */
export interface MarkupSnapConfig {
  /**
   * Grid cell size in document pixels. `0` disables the grid (draw + snap-to-grid).
   * Default: `0`.
   */
  readonly gridSize: number;
  /**
   * Max distance (document px) to start snapping. `0` disables all snapping.
   * Default: `0` (Pintura default — enable explicitly).
   */
  readonly snapThreshold: number;
  /**
   * Snap to output plate edges and center. Only active when `snapThreshold > 0`.
   * Default: `true`.
   */
  readonly snapToContext: boolean;
  /** Draw the grid overlay when `gridSize > 0`. Default: `true`. */
  readonly showGrid: boolean;
  /** Draw edge rulers (click to place guides). Default: `false`. */
  readonly showRulers: boolean;
  /** User / host guide lines. */
  readonly guides: readonly MarkupGuide[];
}

/** Live chrome pushed to the renderer (grid + guides; rulers are DOM). */
export interface MarkupSnapChrome {
  readonly gridSize: number;
  readonly showGrid: boolean;
  readonly guides: readonly MarkupGuide[];
  readonly output: ImageSize;
}

export const DEFAULT_MARKUP_SNAP_CONFIG: MarkupSnapConfig = {
  gridSize: 0,
  snapThreshold: 0,
  snapToContext: true,
  showGrid: true,
  showRulers: false,
  guides: [],
};

export function clampMarkupGridSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(512, Math.max(2, Math.round(value)));
}

export function clampMarkupSnapThreshold(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(64, Math.max(1, Math.round(value)));
}

export function resolveMarkupSnapConfig(
  partial?: Partial<MarkupSnapConfig> | null,
): MarkupSnapConfig {
  return {
    gridSize: clampMarkupGridSize(partial?.gridSize ?? DEFAULT_MARKUP_SNAP_CONFIG.gridSize),
    snapThreshold: clampMarkupSnapThreshold(
      partial?.snapThreshold ?? DEFAULT_MARKUP_SNAP_CONFIG.snapThreshold,
    ),
    snapToContext:
      partial?.snapToContext === undefined
        ? DEFAULT_MARKUP_SNAP_CONFIG.snapToContext
        : partial.snapToContext === true,
    showGrid:
      partial?.showGrid === undefined
        ? DEFAULT_MARKUP_SNAP_CONFIG.showGrid
        : partial.showGrid === true,
    showRulers:
      partial?.showRulers === undefined
        ? DEFAULT_MARKUP_SNAP_CONFIG.showRulers
        : partial.showRulers === true,
    guides: normalizeMarkupGuides(partial?.guides ?? DEFAULT_MARKUP_SNAP_CONFIG.guides),
  };
}

/** Structural equality for snap config (avoids no-op signal writes). */
export function markupSnapConfigEqual(
  a: MarkupSnapConfig | null | undefined,
  b: MarkupSnapConfig | null | undefined,
): boolean {
  const left = resolveMarkupSnapConfig(a);
  const right = resolveMarkupSnapConfig(b);
  if (
    left.gridSize !== right.gridSize ||
    left.snapThreshold !== right.snapThreshold ||
    left.snapToContext !== right.snapToContext ||
    left.showGrid !== right.showGrid ||
    left.showRulers !== right.showRulers ||
    left.guides.length !== right.guides.length
  ) {
    return false;
  }
  return left.guides.every((guide, index) => {
    const other = right.guides[index]!;
    return guide.id === other.id && guide.axis === other.axis && guide.position === other.position;
  });
}

export function markupSnapActive(config: MarkupSnapConfig | null | undefined): boolean {
  const resolved = resolveMarkupSnapConfig(config);
  return resolved.snapThreshold > 0;
}

export function markupGridVisible(config: MarkupSnapConfig | null | undefined): boolean {
  const resolved = resolveMarkupSnapConfig(config);
  return resolved.showGrid && resolved.gridSize > 0;
}

export function createMarkupGuideId(): string {
  return `guide-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeMarkupGuides(
  guides: readonly MarkupGuide[] | null | undefined,
): readonly MarkupGuide[] {
  if (!guides?.length) {
    return [];
  }
  const out: MarkupGuide[] = [];
  const seen = new Set<string>();
  for (const guide of guides) {
    if (!guide || (guide.axis !== 'x' && guide.axis !== 'y')) {
      continue;
    }
    if (!Number.isFinite(guide.position)) {
      continue;
    }
    const id = guide.id?.trim() || createMarkupGuideId();
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({ id, axis: guide.axis, position: guide.position });
  }
  return out;
}

/** Nearest target within threshold, or `null` when nothing is close enough. */
export function nearestSnapTarget(
  value: number,
  targets: readonly number[],
  threshold: number,
): number | null {
  if (!(threshold > 0) || targets.length === 0) {
    return null;
  }
  let best: number | null = null;
  let bestDist = threshold;
  for (const target of targets) {
    const dist = Math.abs(value - target);
    if (dist <= bestDist) {
      bestDist = dist;
      best = target;
    }
  }
  return best;
}

/** Snap a scalar to a regular grid. */
export function snapScalarToGrid(value: number, gridSize: number, threshold: number): number {
  if (!(gridSize > 0) || !(threshold > 0)) {
    return value;
  }
  const snapped = Math.round(value / gridSize) * gridSize;
  return Math.abs(snapped - value) <= threshold ? snapped : value;
}

/** Context snap lines: left/center/right or top/center/bottom of the output plate. */
export function contextSnapTargets(size: number): readonly number[] {
  if (!(size > 0)) {
    return [0];
  }
  return [0, size / 2, size];
}

export function collectAxisSnapTargets(
  axis: 'x' | 'y',
  output: ImageSize,
  config: MarkupSnapConfig,
): readonly number[] {
  const targets: number[] = [];
  if (config.snapToContext) {
    targets.push(...contextSnapTargets(axis === 'x' ? output.width : output.height));
  }
  if (config.gridSize > 0) {
    const extent = axis === 'x' ? output.width : output.height;
    const step = config.gridSize;
    for (let v = 0; v <= extent + 0.5; v += step) {
      targets.push(v);
    }
  }
  for (const guide of config.guides) {
    if (guide.axis === axis) {
      targets.push(guide.position);
    }
  }
  return targets;
}

export function snapScalarToTargets(
  value: number,
  targets: readonly number[],
  threshold: number,
): number {
  const hit = nearestSnapTarget(value, targets, threshold);
  return hit == null ? value : hit;
}

export interface MarkupSnapPointResult {
  readonly x: number;
  readonly y: number;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
}

/** Snap a document-space point (create / place). */
export function snapMarkupPoint(
  point: { readonly x: number; readonly y: number },
  output: ImageSize,
  config: MarkupSnapConfig | null | undefined,
  options?: { readonly enabled?: boolean },
): MarkupSnapPointResult {
  const resolved = resolveMarkupSnapConfig(config);
  if (options?.enabled === false || !markupSnapActive(resolved)) {
    return { x: point.x, y: point.y, snappedX: false, snappedY: false };
  }
  const xTargets = collectAxisSnapTargets('x', output, resolved);
  const yTargets = collectAxisSnapTargets('y', output, resolved);
  const x = snapScalarToTargets(point.x, xTargets, resolved.snapThreshold);
  const y = snapScalarToTargets(point.y, yTargets, resolved.snapThreshold);
  return {
    x,
    y,
    snappedX: x !== point.x,
    snappedY: y !== point.y,
  };
}

export interface MarkupSnapBoundsResult {
  readonly bounds: InteractiveBounds;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
}

/**
 * Snap AABB edges / center while moving (preserve size).
 * Picks the strongest single delta per axis among left / center / right (or top / mid / bottom).
 */
export function snapMarkupBoundsMove(
  bounds: InteractiveBounds,
  output: ImageSize,
  config: MarkupSnapConfig | null | undefined,
  options?: { readonly enabled?: boolean },
): MarkupSnapBoundsResult {
  const resolved = resolveMarkupSnapConfig(config);
  if (options?.enabled === false || !markupSnapActive(resolved)) {
    return { bounds, snappedX: false, snappedY: false };
  }

  const xTargets = collectAxisSnapTargets('x', output, resolved);
  const yTargets = collectAxisSnapTargets('y', output, resolved);
  const threshold = resolved.snapThreshold;

  const left = bounds.x;
  const right = bounds.x + bounds.width;
  const cx = bounds.x + bounds.width / 2;
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;
  const cy = bounds.y + bounds.height / 2;

  const dx = bestAxisDelta([left, cx, right], xTargets, threshold);
  const dy = bestAxisDelta([top, cy, bottom], yTargets, threshold);

  if (dx === 0 && dy === 0) {
    return { bounds, snappedX: false, snappedY: false };
  }

  return {
    bounds: {
      ...bounds,
      x: bounds.x + dx,
      y: bounds.y + dy,
    },
    snappedX: dx !== 0,
    snappedY: dy !== 0,
  };
}

/**
 * Snap the moving edge(s) of a resize. Corner handles may snap both axes;
 * edge handles snap one axis. Size is adjusted from the opposite edge.
 */
export function snapMarkupBoundsResize(
  bounds: InteractiveBounds,
  handle: string,
  output: ImageSize,
  config: MarkupSnapConfig | null | undefined,
  options?: { readonly enabled?: boolean; readonly minSize?: number },
): MarkupSnapBoundsResult {
  const resolved = resolveMarkupSnapConfig(config);
  if (
    options?.enabled === false ||
    !markupSnapActive(resolved) ||
    handle === 'move' ||
    handle === 'rotate'
  ) {
    return { bounds, snappedX: false, snappedY: false };
  }

  const minSize = options?.minSize ?? 1;
  const xTargets = collectAxisSnapTargets('x', output, resolved);
  const yTargets = collectAxisSnapTargets('y', output, resolved);
  const threshold = resolved.snapThreshold;

  let x = bounds.x;
  let y = bounds.y;
  let width = bounds.width;
  let height = bounds.height;
  let snappedX = false;
  let snappedY = false;

  const snapLeft = handle.includes('w');
  const snapRight = handle.includes('e');
  const snapTop = handle.includes('n');
  const snapBottom = handle.includes('s');

  if (snapLeft) {
    const next = snapScalarToTargets(x, xTargets, threshold);
    if (next !== x) {
      const right = x + width;
      width = Math.max(minSize, right - next);
      x = right - width;
      snappedX = true;
    }
  } else if (snapRight) {
    const right = x + width;
    const next = snapScalarToTargets(right, xTargets, threshold);
    if (next !== right) {
      width = Math.max(minSize, next - x);
      snappedX = true;
    }
  }

  if (snapTop) {
    const next = snapScalarToTargets(y, yTargets, threshold);
    if (next !== y) {
      const bottom = y + height;
      height = Math.max(minSize, bottom - next);
      y = bottom - height;
      snappedY = true;
    }
  } else if (snapBottom) {
    const bottom = y + height;
    const next = snapScalarToTargets(bottom, yTargets, threshold);
    if (next !== bottom) {
      height = Math.max(minSize, next - y);
      snappedY = true;
    }
  }

  return {
    bounds: { x, y, width, height },
    snappedX,
    snappedY,
  };
}

function bestAxisDelta(
  candidates: readonly number[],
  targets: readonly number[],
  threshold: number,
): number {
  let bestDelta = 0;
  let bestDist = threshold;
  for (const value of candidates) {
    const hit = nearestSnapTarget(value, targets, threshold);
    if (hit == null) {
      continue;
    }
    const dist = Math.abs(hit - value);
    if (dist < bestDist || (dist === bestDist && Math.abs(hit - value) < Math.abs(bestDelta))) {
      bestDist = dist;
      bestDelta = hit - value;
    }
  }
  return bestDelta;
}

/**
 * Post-process unlocked base-photo placement with markup snap (rulers plugin).
 * Move / corner resize snap; rotate unchanged.
 */
export function applyMarkupSnapToDesignImage(
  designImage: DesignImageState,
  handle: string,
  output: ImageSize,
  config: MarkupSnapConfig | null | undefined,
  options?: { readonly enabled?: boolean },
): DesignImageState {
  if (handle === 'rotate') {
    return designImage;
  }
  const resolved = resolveMarkupSnapConfig(config);
  if (options?.enabled === false || !markupSnapActive(resolved)) {
    return designImage;
  }

  const bounds = designImageBounds(designImage);
  if (handle === 'move') {
    const snapped = snapMarkupBoundsMove(bounds, output, resolved, options);
    if (!snapped.snappedX && !snapped.snappedY) {
      return designImage;
    }
    return normalizeDesignImage(
      {
        ...designImage,
        x: snapped.bounds.x,
        y: snapped.bounds.y,
      },
      output,
    );
  }

  const snapped = snapMarkupBoundsResize(bounds, handle, output, resolved, options);
  if (!snapped.snappedX && !snapped.snappedY) {
    return designImage;
  }
  return normalizeDesignImage(
    {
      ...designImage,
      x: snapped.bounds.x,
      y: snapped.bounds.y,
      width: snapped.bounds.width,
      height: snapped.bounds.height,
    },
    output,
  );
}

/**
 * Post-process a group drag result with markup snap.
 * Move: snap union AABB, then offset all members.
 * Resize (single): snap moving edges. Multi-resize / rotate: unchanged.
 */
export function applyMarkupSnapToGroupDrag(
  next: readonly TransformableAnnotation[],
  handle: string,
  output: ImageSize,
  config: MarkupSnapConfig | null | undefined,
  options?: { readonly enabled?: boolean },
): readonly TransformableAnnotation[] {
  if (next.length === 0 || handle === 'rotate') {
    return next;
  }
  const resolved = resolveMarkupSnapConfig(config);
  if (options?.enabled === false || !markupSnapActive(resolved)) {
    return next;
  }

  if (handle === 'move') {
    const group = unionBounds(next.map(boundsFromTransformable));
    if (!group) {
      return next;
    }
    const snapped = snapMarkupBoundsMove(group, output, resolved, options);
    if (!snapped.snappedX && !snapped.snappedY) {
      return next;
    }
    const dx = snapped.bounds.x - group.x;
    const dy = snapped.bounds.y - group.y;
    if (dx === 0 && dy === 0) {
      return next;
    }
    return next.map((ann) => {
      const b = boundsFromTransformable(ann);
      return applyNumericBoundsToTransformable(ann, { ...b, x: b.x + dx, y: b.y + dy }, output);
    });
  }

  if (next.length !== 1) {
    return next;
  }
  const ann = next[0]!;
  const bounds = boundsFromTransformable(ann);
  const snapped = snapMarkupBoundsResize(bounds, handle, output, resolved, options);
  if (!snapped.snappedX && !snapped.snappedY) {
    return next;
  }
  return [applyNumericBoundsToTransformable(ann, snapped.bounds, output)];
}
