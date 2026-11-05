import type { CropState } from '../models/image-document';

/** Default bleed inset when the guide is enabled without an explicit fraction. */
export const DEFAULT_CROP_BLEED_INSET = 0.05;

/** Maximum bleed inset (fraction of crop width/height per edge). */
export const MAX_CROP_BLEED_INSET = 0.45;

/**
 * Preview-only crop chrome (Pintura overlay crop guides parity).
 * Does not affect apply / export / document JSON.
 */
export interface CropGuidesConfig {
  /**
   * Inscribed profile-picture circle inside the crop AABB
   * (outline + dim outside the circle within the crop).
   */
  readonly profileCircle?: boolean;
  /**
   * Bleed margin as a fraction of crop width/height per edge (`0` = off).
   * Typical print bleed ≈ `0.05`.
   */
  readonly bleed?: number;
}

export interface CropGuideCircleLayout {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

export interface CropGuideBleedLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CropGuideLayout {
  readonly profileCircle: CropGuideCircleLayout | null;
  readonly bleed: CropGuideBleedLayout | null;
}

export function clampCropBleedInset(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(MAX_CROP_BLEED_INSET, value);
}

export function resolveCropGuides(
  partial?: Partial<CropGuidesConfig> | null,
): Required<CropGuidesConfig> {
  return {
    profileCircle: partial?.profileCircle === true,
    bleed: clampCropBleedInset(partial?.bleed ?? 0),
  };
}

export function cropGuidesActive(guides: CropGuidesConfig | null | undefined): boolean {
  const resolved = resolveCropGuides(guides);
  return resolved.profileCircle || resolved.bleed > 0;
}

/**
 * Pure layout for crop guide overlays in source/document pixels.
 * Profile circle is the largest inscribed circle in the crop AABB.
 * Bleed is an inset rect using the same fraction on width and height.
 */
export function layoutCropGuides(
  crop: Pick<CropState, 'x' | 'y' | 'width' | 'height'>,
  guides: CropGuidesConfig | null | undefined,
): CropGuideLayout {
  const resolved = resolveCropGuides(guides);
  const width = Math.max(0, crop.width);
  const height = Math.max(0, crop.height);

  let profileCircle: CropGuideCircleLayout | null = null;
  if (resolved.profileCircle && width > 0 && height > 0) {
    const r = Math.min(width, height) / 2;
    profileCircle = {
      cx: crop.x + width / 2,
      cy: crop.y + height / 2,
      r,
    };
  }

  let bleed: CropGuideBleedLayout | null = null;
  if (resolved.bleed > 0 && width > 0 && height > 0) {
    const insetX = width * resolved.bleed;
    const insetY = height * resolved.bleed;
    const nextWidth = Math.max(0, width - insetX * 2);
    const nextHeight = Math.max(0, height - insetY * 2);
    if (nextWidth > 0.5 && nextHeight > 0.5) {
      bleed = {
        x: crop.x + insetX,
        y: crop.y + insetY,
        width: nextWidth,
        height: nextHeight,
      };
    }
  }

  return { profileCircle, bleed };
}

/** SVG path for an even-odd hole: crop AABB with inscribed circle removed. */
export function cropProfileCircleMaskPath(
  crop: Pick<CropState, 'x' | 'y' | 'width' | 'height'>,
  circle: CropGuideCircleLayout,
): string {
  const { x, y, width, height } = crop;
  const { cx, cy, r } = circle;
  return [
    `M ${x} ${y}`,
    `H ${x + width}`,
    `V ${y + height}`,
    `H ${x}`,
    'Z',
    `M ${cx} ${cy}`,
    `m ${-r},0`,
    `a ${r},${r} 0 1,0 ${r * 2},0`,
    `a ${r},${r} 0 1,0 ${-r * 2},0`,
    'Z',
  ].join(' ');
}
