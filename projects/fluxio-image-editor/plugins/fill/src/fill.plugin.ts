import {
  DEFAULT_FILL_COLORS,
  fillEqual,
  isIdentityFill,
  normalizeFill,
  type EditorCommandContext,
  type EditorCommandResult,
  type FillPluginConfig,
  type FillState,
  type ImageEditorPlugin,
  type ImageEditorPluginContext,
  type ImageOverlayGalleryItem,
  type ReadonlyImageDocument,
} from 'fluxio-image-editor/core';

export const FILL_SET_COMMAND = 'fill.set';
export const FILL_RESET_COMMAND = 'fill.reset';

export interface FillSetPayload {
  readonly fill: Partial<FillState>;
}

export type FillPluginOptions = Partial<FillPluginConfig>;

const FILL_MODE_NAMES: Readonly<Record<FillState['mode'], string>> = {
  none: 'Background',
  solid: 'Solid background',
  image: 'Image background',
};

/**
 * Fill transparent pixels behind the photo (PV25 / Pintura Fill).
 * Distinct from `color-overlay` (wash on top of the image).
 */
export class FillPlugin implements ImageEditorPlugin {
  readonly id = 'fill';

  constructor(private readonly options: FillPluginOptions = {}) {}

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'fill',
      label: 'Background',
    });

    context.registerCommand({
      id: FILL_SET_COMMAND,
      execute: (payload: FillSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyFill(ctx.document, payload?.fill);
        return {
          document: next,
          label: isIdentityFill(next.fill)
            ? 'Clear background'
            : (FILL_MODE_NAMES[next.fill.mode] ?? 'Background'),
        };
      },
    });

    context.registerCommand({
      id: FILL_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyFill(ctx.document, null),
        label: 'Clear background',
      }),
    });

    context.registerToolbarAction({
      id: 'fill.tool',
      label: 'Background',
      icon: 'fill',
      position: 93,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'fill.tool': 'Background',
        'fill.apply': 'Apply',
        'fill.cancel': 'Cancel',
        'fill.reset': 'Clear',
        'fill.mode': 'Mode',
        'fill.none': 'None',
        'fill.solid': 'Solid',
        'fill.image': 'Image',
        'fill.color': 'Color',
        'fill.opacity': 'Opacity',
        'fill.colors': 'Colors',
        'fill.gallery': 'Images',
        'fill.upload': 'Upload image',
        'fill.dropHint': 'Drop an image here, or click to browse',
        'fill.empty': 'Choose a gallery image or upload one',
        'fill.hint': 'Fills transparent areas behind the photo',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'fill.tool': 'الخلفية',
        'fill.apply': 'تطبيق',
        'fill.cancel': 'إلغاء',
        'fill.reset': 'مسح',
        'fill.mode': 'الوضع',
        'fill.none': 'بدون',
        'fill.solid': 'صلب',
        'fill.image': 'صورة',
        'fill.color': 'اللون',
        'fill.opacity': 'الشفافية',
        'fill.colors': 'ألوان',
        'fill.gallery': 'صور',
        'fill.upload': 'رفع صورة',
        'fill.dropHint': 'أسقط صورة هنا، أو انقر للاختيار',
        'fill.empty': 'اختر صورة من المعرض أو ارفع واحدة',
        'fill.hint': 'يملأ المناطق الشفافة خلف الصورة',
      },
    });
  }

  /** Effective solid swatches (host override or built-ins). */
  resolveColors(): readonly string[] {
    const colors = this.options.colors;
    return colors && colors.length > 0 ? colors : DEFAULT_FILL_COLORS;
  }

  resolveGallery(): readonly ImageOverlayGalleryItem[] {
    return this.options.gallery ?? [];
  }
}

export function applyFill(
  document: ReadonlyImageDocument,
  partial: Partial<FillState> | null | undefined,
): ReadonlyImageDocument {
  let fill = normalizeFill(partial);
  // Empty image mode is draft-only — persist as cleared fill.
  if (fill.mode === 'image' && !fill.imageSrc) {
    fill = normalizeFill(null);
  }
  if (fillEqual(document.fill, fill)) {
    return document;
  }
  return {
    ...document,
    fill,
  };
}
