import { filters, type FabricImage } from 'fabric';

import { isIdentityFocus, type FocusState } from 'fluxio-image-editor/core';

import { cloneCanvas } from './preview-compose';

type FabricFilterList = NonNullable<FabricImage['filters']>;

/**
 * Apply Fabric filters to a canvas (shared with the adapter pipeline).
 * Injected so focus compositing stays testable without circular imports.
 */
export type ApplyFabricFiltersFn = (
  source: HTMLCanvasElement,
  fabricFilters: FabricFilterList,
) => HTMLCanvasElement;

/**
 * Selective blur via alpha-mask compositing.
 * 1. Clone sharp canvas → apply Fabric Blur → blurred canvas
 * 2. Generate gradient mask (radial or linear)
 * 3. Composite: draw blurred with mask alpha over sharp
 */
export function applyFocusEffect(
  sharp: HTMLCanvasElement,
  focus: FocusState,
  applyFabricFilters: ApplyFabricFiltersFn,
): HTMLCanvasElement {
  if (isIdentityFocus(focus) || focus.blur <= 0) {
    return sharp;
  }

  const blurred = cloneCanvas(sharp);
  const blurFilters = [new filters.Blur({ blur: focus.blur })];
  const blurredResult = applyFabricFilters(blurred, blurFilters);

  const mask = generateFocusMask(sharp.width, sharp.height, focus);

  const result = cloneCanvas(sharp);
  const resultCtx = result.getContext('2d');
  if (!resultCtx) {
    return sharp;
  }

  const maskedBlur = cloneCanvas(blurredResult);
  const maskedCtx = maskedBlur.getContext('2d');
  if (!maskedCtx) {
    return sharp;
  }
  maskedCtx.globalCompositeOperation = 'destination-in';
  maskedCtx.drawImage(mask, 0, 0);
  maskedCtx.globalCompositeOperation = 'source-over';

  resultCtx.drawImage(maskedBlur, 0, 0);
  return result;
}

/**
 * Create an alpha-channel mask for the focus effect.
 * Transparent (alpha=0) = in-focus (sharp), Opaque (alpha=1) = out-of-focus (blurred).
 */
export function generateFocusMask(
  width: number,
  height: number,
  focus: FocusState,
): HTMLCanvasElement {
  const mask = globalThis.document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const ctx = mask.getContext('2d');
  if (!ctx) {
    return mask;
  }

  const cx = focus.centerX * width;
  const cy = focus.centerY * height;
  const diagonal = Math.sqrt(width * width + height * height);

  // Start fully opaque (blur everywhere), then punch out the sharp region.
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-out';

  if (focus.mode === 'radial') {
    const innerRadius = focus.size * diagonal * 0.5;
    const outerRadius = Math.max(innerRadius + focus.feather * diagonal * 0.5, 1);
    const innerStop = Math.min(1, innerRadius / outerRadius);
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
    radGrad.addColorStop(0, 'rgba(0,0,0,1)');
    radGrad.addColorStop(innerStop, 'rgba(0,0,0,1)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (focus.mode === 'linear') {
    const bandHalf = focus.size * diagonal * 0.25;
    const featherDist = focus.feather * diagonal * 0.25;
    const outer = Math.max(bandHalf + featherDist, 1);
    const extent = diagonal;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((focus.angle * Math.PI) / 180);

    const grad = ctx.createLinearGradient(0, -outer, 0, outer);
    const fade = featherDist <= 0 ? 0 : Math.min(0.5, featherDist / (2 * outer));
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(fade, 'rgba(0,0,0,1)');
    grad.addColorStop(1 - fade, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-extent, -outer, extent * 2, outer * 2);
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'source-over';
  return mask;
}
