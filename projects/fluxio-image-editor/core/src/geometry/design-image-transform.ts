import {
  normalizeDesignImage,
  type DesignImageState,
  type ImageSize,
} from '../models/image-document';
import {
  hitTestBoundsHandle,
  rotationDeltaDegrees,
  ANNOTATION_ROTATE_HANDLE_OFFSET,
  type AnnotationHandle,
  type AnnotationPoint2D,
  type InteractiveBounds,
  MIN_INTERACTIVE_ANNOTATION_SIZE,
} from './annotation-transform';

/**
 * Coordinate space: **document/output pixels** (same as annotation-transform).
 * Placement may extend outside the output plate; compose clips to output.
 */

export function designImageBounds(designImage: DesignImageState): InteractiveBounds {
  return {
    x: designImage.x,
    y: designImage.y,
    width: designImage.width,
    height: designImage.height,
  };
}

/** Map a scene point into the design-image's unrotated local AABB space. */
function toDesignImageLocalPoint(
  designImage: DesignImageState,
  point: AnnotationPoint2D,
): AnnotationPoint2D {
  const angle = designImage.angle || 0;
  if (Math.abs(angle) <= 0.001) {
    return point;
  }
  const cx = designImage.x + designImage.width / 2;
  const cy = designImage.y + designImage.height / 2;
  const rad = (-angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - cx;
  const dy = point.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function hitTestDesignImageHandle(
  designImage: DesignImageState,
  point: AnnotationPoint2D,
  handleHitSize: number,
  rotateOffset: number = ANNOTATION_ROTATE_HANDLE_OFFSET,
): AnnotationHandle | null {
  return hitTestBoundsHandle(
    designImageBounds(designImage),
    toDesignImageLocalPoint(designImage, point),
    handleHitSize,
    rotateOffset,
  );
}

/** True when the point is inside the design-image rect (body, not only handles). */
export function hitTestDesignImageBody(
  designImage: DesignImageState,
  point: AnnotationPoint2D,
): boolean {
  const bounds = designImageBounds(designImage);
  const local = toDesignImageLocalPoint(designImage, point);
  return (
    local.x >= bounds.x &&
    local.x <= bounds.x + bounds.width &&
    local.y >= bounds.y &&
    local.y <= bounds.y + bounds.height
  );
}

function normalizeAngleDegrees(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  let next = angle % 360;
  if (next < 0) {
    next += 360;
  }
  return Math.round(next * 1000) / 1000;
}

export function applyDesignImageDrag(
  start: DesignImageState,
  handle: AnnotationHandle,
  startPoint: AnnotationPoint2D,
  currentPoint: AnnotationPoint2D,
  output: ImageSize,
): DesignImageState {
  if (handle === 'rotate') {
    const center = {
      x: start.x + start.width / 2,
      y: start.y + start.height / 2,
    };
    const delta = rotationDeltaDegrees(center, startPoint, currentPoint);
    return normalizeDesignImage(
      {
        ...start,
        angle: normalizeAngleDegrees(start.angle + delta),
      },
      output,
    );
  }

  const minSize = Math.max(MIN_INTERACTIVE_ANNOTATION_SIZE, 8);
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;

  if (handle === 'move') {
    return normalizeDesignImage(
      {
        ...start,
        x: start.x + dx,
        y: start.y + dy,
      },
      output,
    );
  }

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

  const width = Math.max(minSize, right - left);
  const height = Math.max(minSize, bottom - top);

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

  return normalizeDesignImage(
    {
      ...start,
      x: left,
      y: top,
      width,
      height,
    },
    output,
  );
}

/** When output size changes (resize), keep placement; fill if it previously filled. */
export function remapDesignImageForOutput(
  previous: DesignImageState,
  previousOutput: ImageSize,
  nextOutput: ImageSize,
): DesignImageState {
  const filled =
    previous.x === 0 &&
    previous.y === 0 &&
    previous.width === previousOutput.width &&
    previous.height === previousOutput.height &&
    previous.angle === 0;
  if (filled) {
    return normalizeDesignImage(
      { ...createFill(nextOutput), angle: 0, locked: previous.locked },
      nextOutput,
    );
  }
  return normalizeDesignImage(previous, nextOutput);
}

/** When orientation swap rotates output w/h, remap a fill placement; otherwise swap axes. */
export function remapDesignImageForOrientationSwap(
  previous: DesignImageState,
  previousOutput: ImageSize,
  nextOutput: ImageSize,
): DesignImageState {
  const filled =
    previous.x === 0 &&
    previous.y === 0 &&
    previous.width === previousOutput.width &&
    previous.height === previousOutput.height &&
    previous.angle === 0;
  if (filled) {
    return normalizeDesignImage(
      { ...createFill(nextOutput), angle: 0, locked: previous.locked },
      nextOutput,
    );
  }
  return normalizeDesignImage(
    {
      x: previous.y,
      y: previous.x,
      width: previous.height,
      height: previous.width,
      angle: previous.angle,
      locked: previous.locked,
    },
    nextOutput,
  );
}

function createFill(output: ImageSize): Pick<DesignImageState, 'x' | 'y' | 'width' | 'height'> {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.round(output.width)),
    height: Math.max(1, Math.round(output.height)),
  };
}
