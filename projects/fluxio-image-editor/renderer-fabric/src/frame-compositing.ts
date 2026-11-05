import {
  isIdentityFrame,
  type FrameState,
  type FrameStyleId,
} from 'fluxio-image-editor/core';

/**
 * Draw a decorative frame / border onto a composed canvas (inward overlay).
 * Does not change canvas dimensions.
 */
export function applyFrameEffect(
  source: HTMLCanvasElement,
  frame: FrameState,
  resolveImage?: (src: string) => HTMLImageElement | null,
): HTMLCanvasElement {
  if (isIdentityFrame(frame)) {
    return source;
  }

  const result = cloneCanvas(source);
  const ctx = result.getContext('2d');
  if (!ctx) {
    return source;
  }

  const width = result.width;
  const height = result.height;
  const thickness = Math.max(
    1,
    Math.round(Math.min(width, height) * Math.max(0.005, frame.thickness)),
  );

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, frame.opacity));
  if (frame.style === 'image') {
    const src = typeof frame.imageSrc === 'string' ? frame.imageSrc.trim() : '';
    const img = src && resolveImage ? resolveImage(src) : null;
    if (img) {
      ctx.drawImage(img, 0, 0, width, height);
    }
  } else {
    drawFrameStyle(ctx, width, height, thickness, frame);
  }
  ctx.restore();
  return result;
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

function drawFrameStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness: number,
  frame: FrameState,
): void {
  const style: FrameStyleId = frame.style;
  switch (style) {
    case 'solid':
      drawEdgeRects(ctx, width, height, thickness, frame.color);
      break;
    case 'double': {
      drawEdgeRects(ctx, width, height, thickness, frame.color);
      const gap = Math.max(1, Math.round(thickness * 0.45));
      const inner = Math.max(1, Math.round(thickness * 0.35));
      drawEdgeRects(ctx, width, height, inner, frame.color2, thickness + gap);
      break;
    }
    case 'rounded':
      drawRoundedBorder(ctx, width, height, thickness, frame.color, frame.cornerRadius);
      break;
    case 'gradient':
      drawGradientBorder(ctx, width, height, thickness, frame.color, frame.color2);
      break;
    case 'polaroid':
      drawPolaroid(ctx, width, height, thickness, frame.color);
      break;
    case 'film':
      drawFilmStrip(ctx, width, height, thickness, frame.color);
      break;
    case 'none':
    default:
      break;
  }
}

function drawEdgeRects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness: number,
  color: string,
  inset = 0,
): void {
  const t = thickness;
  const i = inset;
  ctx.fillStyle = color;
  // top
  ctx.fillRect(i, i, width - i * 2, t);
  // bottom
  ctx.fillRect(i, height - i - t, width - i * 2, t);
  // left
  ctx.fillRect(i, i + t, t, height - i * 2 - t * 2);
  // right
  ctx.fillRect(width - i - t, i + t, t, height - i * 2 - t * 2);
}

function drawRoundedBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness: number,
  color: string,
  cornerRadius: number,
): void {
  const radius = Math.min(width, height) * 0.5 * Math.max(0, Math.min(1, cornerRadius));
  ctx.fillStyle = color;
  ctx.beginPath();
  roundRectPath(ctx, 0, 0, width, height, radius);
  roundRectPath(
    ctx,
    thickness,
    thickness,
    Math.max(1, width - thickness * 2),
    Math.max(1, height - thickness * 2),
    Math.max(0, radius - thickness),
  );
  ctx.fill('evenodd');
}

function drawGradientBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness: number,
  color: string,
  color2: string,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.rect(thickness, thickness, Math.max(1, width - thickness * 2), Math.max(1, height - thickness * 2));
  ctx.fill('evenodd');
}

function drawPolaroid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness: number,
  color: string,
): void {
  const side = thickness;
  const top = thickness;
  const bottom = Math.max(thickness * 2.5, Math.round(height * 0.12));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.rect(side, top, Math.max(1, width - side * 2), Math.max(1, height - top - bottom));
  ctx.fill('evenodd');
}

function drawFilmStrip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness: number,
  color: string,
): void {
  const strip = Math.max(thickness, Math.round(Math.min(width, height) * 0.08));
  ctx.fillStyle = color || '#111111';
  ctx.fillRect(0, 0, strip, height);
  ctx.fillRect(width - strip, 0, strip, height);

  const holeW = Math.max(2, Math.round(strip * 0.45));
  const holeH = Math.max(3, Math.round(holeW * 1.4));
  const gap = holeH * 1.6;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let y = gap * 0.5; y < height - holeH; y += gap) {
    const xLeft = (strip - holeW) / 2;
    const xRight = width - strip + (strip - holeW) / 2;
    ctx.fillRect(xLeft, y, holeW, holeH);
    ctx.fillRect(xRight, y, holeW, holeH);
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
