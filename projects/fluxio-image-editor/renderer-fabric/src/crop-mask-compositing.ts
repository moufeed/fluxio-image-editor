import {
  isIdentityCropMask,
  type CropMaskShapeId,
  type CropMaskState,
} from 'fluxio-image-editor/core';

/**
 * Clip a composed canvas to the crop-mask shape (transparent outside).
 * CSP-safe Canvas 2D compositing — no WebGL.
 *
 * @param options.outsideOpacity When set (0–1), keeps the outside visible at that
 *   alpha for **live preview only**. Omit / `0` for a hard cut (Apply / export).
 */
export function applyCropMaskEffect(
  source: HTMLCanvasElement,
  cropMask: CropMaskState,
  options?: { readonly outsideOpacity?: number },
): HTMLCanvasElement {
  if (isIdentityCropMask(cropMask)) {
    return source;
  }

  const outsideOpacity = clamp01(options?.outsideOpacity ?? 0);
  const width = source.width;
  const height = source.height;
  const result = cloneCanvas(source);
  const ctx = result.getContext('2d');
  if (!ctx) {
    return source;
  }

  const mask = generateCropMaskCanvas(width, height, cropMask);

  if (outsideOpacity <= 0.001) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return result;
  }

  // Preview: faded full image + full-opacity mask cutout on top.
  const cutout = cloneCanvas(source);
  const cutoutCtx = cutout.getContext('2d');
  if (!cutoutCtx) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return result;
  }
  cutoutCtx.globalCompositeOperation = 'destination-in';
  cutoutCtx.drawImage(mask, 0, 0);
  cutoutCtx.globalCompositeOperation = 'source-over';

  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = outsideOpacity;
  ctx.drawImage(source, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(cutout, 0, 0);
  return result;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * Build an opaque alpha mask for the given crop-mask state.
 * Opaque = keep pixel; transparent = discard.
 */
export function generateCropMaskCanvas(
  width: number,
  height: number,
  cropMask: CropMaskState,
): HTMLCanvasElement {
  const mask = globalThis.document.createElement('canvas');
  mask.width = Math.max(1, Math.round(width));
  mask.height = Math.max(1, Math.round(height));
  const ctx = mask.getContext('2d');
  if (!ctx) {
    return mask;
  }

  const w = mask.width;
  const h = mask.height;
  const insetX = cropMask.inset * w * 0.5;
  const insetY = cropMask.inset * h * 0.5;
  const boxW = Math.max(1, w - insetX * 2);
  const boxH = Math.max(1, h - insetY * 2);
  const cx = cropMask.centerX * w;
  const cy = cropMask.centerY * h;

  ctx.save();
  ctx.translate(cx, cy);
  if (cropMask.angle !== 0) {
    ctx.rotate((cropMask.angle * Math.PI) / 180);
  }
  ctx.translate(-boxW / 2, -boxH / 2);
  ctx.fillStyle = '#000';
  traceCropMaskPath(ctx, boxW, boxH, cropMask.shape, cropMask.cornerRadius, cropMask.customPath);
  ctx.fill();
  ctx.restore();

  if (cropMask.feather > 0) {
    return featherMask(mask, cropMask.feather);
  }
  return mask;
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }
  return canvas;
}

/** Soften mask edges by blurring alpha (approximate feather). */
function featherMask(mask: HTMLCanvasElement, feather: number): HTMLCanvasElement {
  const blurPx = Math.max(0.5, feather * Math.min(mask.width, mask.height) * 0.08);
  const padded = globalThis.document.createElement('canvas');
  padded.width = mask.width;
  padded.height = mask.height;
  const ctx = padded.getContext('2d');
  if (!ctx) {
    return mask;
  }
  ctx.filter = `blur(${blurPx.toFixed(2)}px)`;
  ctx.drawImage(mask, 0, 0);
  ctx.filter = 'none';
  return padded;
}

export function traceCropMaskPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shape: CropMaskShapeId,
  cornerRadius: number,
  customPath?: string,
): void {
  ctx.beginPath();
  switch (shape) {
    case 'custom': {
      const path = typeof customPath === 'string' ? customPath.trim() : '';
      if (!path) {
        break;
      }
      ctx.save();
      ctx.scale(width, height);
      try {
        const path2d = new Path2D(path);
        ctx.fill(path2d);
      } catch {
        // Invalid host path — leave empty (transparent outside = full clear).
      }
      ctx.restore();
      // Path already filled; keep an empty path so outer fill is a no-op.
      ctx.beginPath();
      break;
    }
    case 'circle': {
      const r = Math.min(width, height) / 2;
      ctx.ellipse(width / 2, height / 2, r, r, 0, 0, Math.PI * 2);
      break;
    }
    case 'rounded-rect': {
      const r = Math.min(width, height) * 0.5 * Math.max(0, Math.min(1, cornerRadius));
      roundRectPath(ctx, 0, 0, width, height, r);
      break;
    }
    case 'triangle':
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width, height / 2);
      ctx.lineTo(width / 2, height);
      ctx.lineTo(0, height / 2);
      ctx.closePath();
      break;
    case 'hexagon':
      regularPolygonPath(ctx, width / 2, height / 2, Math.min(width, height) / 2, 6, -Math.PI / 2);
      break;
    case 'star':
      starPath(ctx, width / 2, height / 2, Math.min(width, height) / 2, 5, 0.45);
      break;
    case 'heart':
      heartPath(ctx, width, height);
      break;
    case 'none':
    default:
      ctx.rect(0, 0, width, height);
      break;
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function regularPolygonPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number,
): void {
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function starPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  points: number,
  innerRatio: number,
): void {
  const inner = outer * innerRatio;
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/** Heart inscribed in the given box (0,0)–(width,height). */
function heartPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const top = height * 0.12;
  const bottom = height * 0.96;
  const midY = height * 0.38;
  ctx.moveTo(width / 2, bottom);
  ctx.bezierCurveTo(width * 0.05, height * 0.72, width * 0.02, midY, width * 0.25, top + height * 0.08);
  ctx.bezierCurveTo(width * 0.4, top - height * 0.05, width * 0.5, top + height * 0.1, width / 2, midY);
  ctx.bezierCurveTo(width * 0.5, top + height * 0.1, width * 0.6, top - height * 0.05, width * 0.75, top + height * 0.08);
  ctx.bezierCurveTo(width * 0.98, midY, width * 0.95, height * 0.72, width / 2, bottom);
  ctx.closePath();
}
