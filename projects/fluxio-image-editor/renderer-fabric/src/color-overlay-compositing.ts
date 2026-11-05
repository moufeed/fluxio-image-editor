import {
  isIdentityColorOverlay,
  type ColorOverlayState,
} from 'fluxio-image-editor/core';

/**
 * Draw a full-canvas solid or gradient color wash onto a composed canvas.
 * Does not change canvas dimensions.
 */
export function applyColorOverlayEffect(
  source: HTMLCanvasElement,
  overlay: ColorOverlayState,
): HTMLCanvasElement {
  if (isIdentityColorOverlay(overlay)) {
    return source;
  }

  const result = cloneCanvas(source);
  const ctx = result.getContext('2d');
  if (!ctx) {
    return source;
  }

  const width = result.width;
  const height = result.height;
  const opacity = Math.max(0, Math.min(1, overlay.opacity));
  if (opacity <= 0) {
    return source;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = createOverlayFill(ctx, width, height, overlay);
  ctx.fillRect(0, 0, width, height);
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

function createOverlayFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: ColorOverlayState,
): string | CanvasGradient {
  switch (overlay.mode) {
    case 'solid':
      return overlay.color;
    case 'linear':
      return createLinearFill(ctx, width, height, overlay);
    case 'radial':
      return createRadialFill(ctx, width, height, overlay);
    case 'angular':
      return createAngularFill(ctx, width, height, overlay);
    case 'none':
    default:
      return overlay.color;
  }
}

function createLinearFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: ColorOverlayState,
): CanvasGradient {
  const rad = (overlay.angle * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.hypot(width, height) / 2;
  const gradient = ctx.createLinearGradient(
    cx - Math.cos(rad) * len,
    cy - Math.sin(rad) * len,
    cx + Math.cos(rad) * len,
    cy + Math.sin(rad) * len,
  );
  gradient.addColorStop(0, overlay.color);
  gradient.addColorStop(1, overlay.color2);
  return gradient;
}

function createRadialFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: ColorOverlayState,
): CanvasGradient {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.hypot(width, height) / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, radius));
  gradient.addColorStop(0, overlay.color);
  gradient.addColorStop(1, overlay.color2);
  return gradient;
}

function createAngularFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: ColorOverlayState,
): string | CanvasGradient {
  const cx = width / 2;
  const cy = height / 2;
  const startAngle = (overlay.angle * Math.PI) / 180;
  if (typeof ctx.createConicGradient === 'function') {
    const gradient = ctx.createConicGradient(startAngle, cx, cy);
    gradient.addColorStop(0, overlay.color);
    gradient.addColorStop(0.5, overlay.color2);
    gradient.addColorStop(1, overlay.color);
    return gradient;
  }
  // Fallback when conic gradients are unavailable.
  return createLinearFill(ctx, width, height, overlay);
}
