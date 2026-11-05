import { normalizeFrame, type FrameState, type ImageSize } from '../models/image-document';

/** Interactive frame chrome: edge midpoints adjust thickness. */
export type FrameHandle = 'n' | 's' | 'e' | 'w';

export interface FramePoint {
  readonly x: number;
  readonly y: number;
}

export interface FrameChromeLayout {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly thicknessPx: number;
  readonly edgeHandles: readonly {
    readonly id: FrameHandle;
    readonly x: number;
    readonly y: number;
  }[];
}

/** Styles that support symmetric edge-drag thickness chrome. */
export function isFrameEdgeInteractive(frame: FrameState): boolean {
  return (
    frame.style === 'solid' ||
    frame.style === 'double' ||
    frame.style === 'rounded' ||
    frame.style === 'gradient'
  );
}

/** Inner frame band layout in output pixels. */
export function frameChromeLayout(frame: FrameState, output: ImageSize): FrameChromeLayout {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const thicknessPx = Math.max(1, Math.round(Math.min(w, h) * Math.max(0.005, frame.thickness)));
  const left = thicknessPx;
  const top = thicknessPx;
  const right = w - thicknessPx;
  const bottom = h - thicknessPx;
  const midX = w / 2;
  const midY = h / 2;
  return {
    left,
    top,
    right,
    bottom,
    thicknessPx,
    edgeHandles: [
      { id: 'n', x: midX, y: top },
      { id: 's', x: midX, y: bottom },
      { id: 'e', x: right, y: midY },
      { id: 'w', x: left, y: midY },
    ],
  };
}

/** Hit-test frame edge handles in output pixels. */
export function hitTestFrameHandle(
  frame: FrameState,
  point: FramePoint,
  output: ImageSize,
  handleHitSize: number,
): FrameHandle | null {
  if (!isFrameEdgeInteractive(frame)) {
    return null;
  }
  const half = Math.max(handleHitSize, 4);
  const layout = frameChromeLayout(frame, output);
  for (const edge of layout.edgeHandles) {
    if (Math.abs(point.x - edge.x) <= half && Math.abs(point.y - edge.y) <= half) {
      return edge.id;
    }
  }
  return null;
}

/**
 * Map edge drag to thickness (distance from nearest outer canvas edge / min side).
 * Preview-only; callers commit via `frame.set`.
 */
export function applyFrameDrag(
  startFrame: FrameState,
  handle: FrameHandle,
  currentPoint: FramePoint,
  output: ImageSize,
): FrameState {
  const w = Math.max(1, output.width);
  const h = Math.max(1, output.height);
  const minSide = Math.min(w, h);
  let dist: number;
  switch (handle) {
    case 'n':
      dist = currentPoint.y;
      break;
    case 's':
      dist = h - currentPoint.y;
      break;
    case 'e':
      dist = w - currentPoint.x;
      break;
    case 'w':
      dist = currentPoint.x;
      break;
  }
  const thickness = Math.max(0.005, Math.min(0.25, dist / minSide));
  return normalizeFrame({ ...startFrame, thickness });
}
