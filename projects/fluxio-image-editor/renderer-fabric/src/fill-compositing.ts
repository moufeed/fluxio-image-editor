import { isIdentityFill, type FillState } from 'fluxio-image-editor/core';

/**
 * Paint behind transparent pixels of a composed photo stack (PV25 / Pintura Fill).
 * Uses `destination-over` so opaque content stays unchanged.
 */
export function applyFillEffect(
  source: HTMLCanvasElement,
  fill: FillState,
  resolveImage?: (src: string) => HTMLImageElement | HTMLCanvasElement | null,
): HTMLCanvasElement {
  if (isIdentityFill(fill)) {
    return source;
  }

  const result = cloneCanvas(source);
  const ctx = result.getContext('2d');
  if (!ctx) {
    return source;
  }

  const width = result.width;
  const height = result.height;
  const opacity = Math.max(0, Math.min(1, fill.opacity));
  if (opacity <= 0) {
    return source;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = opacity;

  if (fill.mode === 'image' && fill.imageSrc) {
    const img = resolveImage?.(fill.imageSrc) ?? null;
    if (img) {
      drawCoverImage(ctx, img, width, height);
    } else {
      ctx.fillStyle = fill.color;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (fill.mode === 'solid') {
    ctx.fillStyle = fill.color;
    ctx.fillRect(0, 0, width, height);
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

/** Cover-fit draw (like CSS background-size: cover). */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const iw = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
  const ih = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;
  if (!(iw > 0) || !(ih > 0)) {
    return;
  }
  const scale = Math.max(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
