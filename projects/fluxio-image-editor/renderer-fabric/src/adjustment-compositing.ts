import { cloneCanvas } from './preview-compose';

/**
 * Apply midtone gamma curve. Slider ∈ [-1, 1] maps to power `2^(-slider)`
 * (positive brightens midtones, negative darkens). Identity at 0.
 */
export function applyGammaCanvas(
  source: HTMLCanvasElement,
  gammaSlider: number,
): HTMLCanvasElement {
  if (!Number.isFinite(gammaSlider) || Math.abs(gammaSlider) < 1e-6) {
    return source;
  }
  const gamma = Math.pow(2, -gammaSlider);
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return source;
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, gamma));
  }
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]!]!;
    data[i + 1] = lut[data[i + 1]!]!;
    data[i + 2] = lut[data[i + 2]!]!;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Darken edges with a radial overlay. `amount` ∈ [0, 1]. */
export function applyVignetteCanvas(source: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  if (!Number.isFinite(amount) || amount <= 0) {
    return source;
  }
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return source;
  }
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.hypot(cx, cy);
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.92, amount * 0.9).toFixed(3)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}
