import type {
  CropMaskGalleryItem,
  CropMaskPluginConfig,
  CropMaskState,
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import { cropMaskEqual, isIdentityCropMask, normalizeCropMask } from 'fluxio-image-editor/core';

export const CROP_MASK_SET_COMMAND = 'crop-mask.set';
export const CROP_MASK_RESET_COMMAND = 'crop-mask.reset';

export interface CropMaskSetPayload {
  readonly cropMask: Partial<CropMaskState>;
}

export type CropMaskPluginOptions = Partial<CropMaskPluginConfig>;

const MASK_SHAPE_NAMES: Readonly<Record<CropMaskState['shape'], string>> = {
  none: 'Crop mask',
  circle: 'Circle mask',
  'rounded-rect': 'Rounded mask',
  triangle: 'Triangle mask',
  diamond: 'Diamond mask',
  hexagon: 'Hexagon mask',
  star: 'Star mask',
  heart: 'Heart mask',
  custom: 'Custom mask',
};

export class CropMaskPlugin implements ImageEditorPlugin {
  readonly id = 'crop-mask';
  private readonly gallery: readonly CropMaskGalleryItem[];

  constructor(options: CropMaskPluginOptions = {}) {
    this.gallery = options.gallery ?? [];
  }

  getGallery(): readonly CropMaskGalleryItem[] {
    return this.gallery;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'crop-mask',
      label: 'Mask',
    });

    context.registerCommand({
      id: CROP_MASK_SET_COMMAND,
      execute: (payload: CropMaskSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyCropMask(ctx.document, payload?.cropMask);
        return {
          document: next,
          label: isIdentityCropMask(next.cropMask)
            ? 'Clear mask'
            : (MASK_SHAPE_NAMES[next.cropMask.shape] ?? 'Crop mask'),
        };
      },
    });

    context.registerCommand({
      id: CROP_MASK_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyCropMask(ctx.document, null),
        label: 'Clear mask',
      }),
    });

    context.registerToolbarAction({
      id: 'crop-mask.tool',
      label: 'Mask',
      icon: 'crop-mask',
      position: 90,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'crop-mask.tool': 'Mask',
        'crop-mask.apply': 'Apply',
        'crop-mask.cancel': 'Cancel',
        'crop-mask.reset': 'Clear',
        'crop-mask.shape': 'Shape',
        'crop-mask.none': 'None',
        'crop-mask.circle': 'Circle',
        'crop-mask.rounded-rect': 'Rounded',
        'crop-mask.triangle': 'Triangle',
        'crop-mask.diamond': 'Diamond',
        'crop-mask.hexagon': 'Hexagon',
        'crop-mask.star': 'Star',
        'crop-mask.heart': 'Heart',
        'crop-mask.custom': 'Custom',
        'crop-mask.gallery': 'Gallery',
        'crop-mask.inset': 'Inset',
        'crop-mask.cornerRadius': 'Corners',
        'crop-mask.feather': 'Feather',
        'crop-mask.angle': 'Angle',
        'crop-mask.opacity': 'Opacity',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'crop-mask.tool': 'قناع',
        'crop-mask.apply': 'تطبيق',
        'crop-mask.cancel': 'إلغاء',
        'crop-mask.reset': 'مسح',
        'crop-mask.shape': 'الشكل',
        'crop-mask.none': 'بدون',
        'crop-mask.circle': 'دائرة',
        'crop-mask.rounded-rect': 'مستطيل مستدير',
        'crop-mask.triangle': 'مثلث',
        'crop-mask.diamond': 'معين',
        'crop-mask.hexagon': 'سداسي',
        'crop-mask.star': 'نجمة',
        'crop-mask.heart': 'قلب',
        'crop-mask.custom': 'مخصص',
        'crop-mask.gallery': 'المعرض',
        'crop-mask.inset': 'الحافة',
        'crop-mask.cornerRadius': 'الزوايا',
        'crop-mask.feather': 'التدرج',
        'crop-mask.angle': 'الزاوية',
        'crop-mask.opacity': 'الشفافية',
      },
    });
  }
}

export function applyCropMask(
  document: ReadonlyImageDocument,
  partial: Partial<CropMaskState> | null | undefined,
): ReadonlyImageDocument {
  const cropMask = normalizeCropMask(partial);
  if (cropMaskEqual(document.cropMask, cropMask)) {
    return document;
  }
  return {
    ...document,
    cropMask,
  };
}
