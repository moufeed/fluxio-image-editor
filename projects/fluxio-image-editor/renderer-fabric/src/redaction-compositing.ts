import type { RedactionRegion } from 'fluxio-image-editor/core';
import { isIdentityRedactions } from 'fluxio-image-editor/core';

import { cloneCanvas } from './preview-compose';

/**
 * Scramble rectangular regions (Pintura-style: downscale mosaic + jitter + blur).
 * Applied to the photo stack so export cannot recover censored pixels by unblurring.
 */
export function applyRedactionsEffect(
  source: HTMLCanvasElement,
  regions: readonly RedactionRegion[] | null | undefined,
): HTMLCanvasElement {
  if (isIdentityRedactions(regions)) {
    return source;
  }
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return source;
  }

  for (const region of regions!) {
    const x = Math.floor(region.x * canvas.width);
    const y = Math.floor(region.y * canvas.height);
    const w = Math.max(1, Math.ceil(region.width * canvas.width));
    const h = Math.max(1, Math.ceil(region.height * canvas.height));
    if (x >= canvas.width || y >= canvas.height) {
      continue;
    }
    const rw = Math.min(w, canvas.width - x);
    const rh = Math.min(h, canvas.height - y);
    if (rw < 1 || rh < 1) {
      continue;
    }

    const patch = ctx.getImageData(x, y, rw, rh);
    scrambleImageData(patch);
    ctx.putImageData(patch, x, y);

    // Soft blur pass over the region to resist deconvolution.
    const blurred = document.createElement('canvas');
    blurred.width = rw;
    blurred.height = rh;
    const bctx = blurred.getContext('2d');
    if (!bctx) {
      continue;
    }
    bctx.putImageData(ctx.getImageData(x, y, rw, rh), 0, 0);
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.drawImage(blurred, x, y);
    ctx.restore();
  }

  return canvas;
}

function scrambleImageData(image: ImageData): void {
  const { data, width, height } = image;
  const block = Math.max(4, Math.round(Math.min(width, height) / 12));
  // Mosaic downscale into blocks.
  for (let by = 0; by < height; by += block) {
    for (let bx = 0; bx < width; bx += block) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      const bh = Math.min(block, height - by);
      const bw = Math.min(block, width - bx);
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const i = (y * width + x) * 4;
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
          a += data[i + 3]!;
          count++;
        }
      }
      if (count === 0) {
        continue;
      }
      // Deterministic jitter from block position (no Math.random — stable previews).
      const jitter = ((bx * 17 + by * 31) % 40) - 20;
      r = clampByte(r / count + jitter);
      g = clampByte(g / count + jitter * 0.6);
      b = clampByte(b / count - jitter * 0.4);
      a = Math.round(a / count);
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const i = (y * width + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }
  }
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
