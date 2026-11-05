import {
  createDefaultCrop,
  DEFAULT_ASPECT_RATIOS,
  remapDesignImageForOutput,
  resolveCropShape,
  resolveDesignImage,
  validateCrop,
  type AspectRatioPreset,
  type CropShape,
  type CropState,
  type EditorCommandContext,
  type EditorCommandResult,
  type ImageEditorPlugin,
  type ImageEditorPluginContext,
  type ImageSize,
  type ReadonlyImageDocument,
} from 'fluxio-image-editor/core';

export const CROP_SET_COMMAND = 'crop.set';
export const CROP_CLEAR_COMMAND = 'crop.clear';

export interface CropSetPayload {
  readonly crop: CropState;
  /**
   * When set, output is resized to this size after crop (`autoResize`).
   * Combined into one history entry with the crop.
   */
  readonly resizeTo?: ImageSize;
}

export interface CropPluginOptions {
  readonly aspectRatios?: readonly AspectRatioPreset[];
}

export class CropPlugin implements ImageEditorPlugin {
  readonly id = 'crop';
  readonly aspectRatios: readonly AspectRatioPreset[];

  constructor(options: CropPluginOptions = {}) {
    this.aspectRatios = options.aspectRatios ?? DEFAULT_ASPECT_RATIOS;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'crop',
      label: 'Crop',
    });

    context.registerCommand({
      id: CROP_SET_COMMAND,
      execute: (payload: CropSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const result = validateCrop(payload.crop, ctx.document.sourceSize);
        if (!result.valid || !result.crop) {
          throw new Error(result.reason ?? 'Invalid crop');
        }
        const resized = payload.resizeTo
          ? {
              width: Math.max(1, Math.round(payload.resizeTo.width)),
              height: Math.max(1, Math.round(payload.resizeTo.height)),
            }
          : undefined;
        return {
          document: applyCrop(ctx.document, result.crop, { resizeTo: resized }),
          label: resized ? 'Crop and resize' : 'Crop',
        };
      },
    });

    context.registerCommand({
      id: CROP_CLEAR_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyCrop(ctx.document, null),
        label: 'Clear crop',
      }),
    });

    context.registerToolbarAction({
      id: 'crop.tool',
      label: 'Crop',
      icon: 'crop',
      position: 10,
    });
    // Apply / Cancel are shown only in the crop panel while crop mode is active.
    context.registerLocale({
      locale: 'en',
      messages: {
        'crop.tool': 'Crop',
        'crop.apply': 'Apply crop',
        'crop.cancel': 'Cancel crop',
        'crop.free': 'Free',
        'crop.ellipse': 'Ellipse',
        'crop.aspect': 'Aspect',
        'crop.guides': 'Guides',
        'crop.guide.circle': 'Circle',
        'crop.guide.bleed': 'Bleed',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'crop.tool': 'قص',
        'crop.apply': 'تطبيق القص',
        'crop.cancel': 'إلغاء القص',
        'crop.free': 'حر',
        'crop.ellipse': 'بيضاوي',
        'crop.aspect': 'النسبة',
        'crop.guides': 'أدلة',
        'crop.guide.circle': 'دائرة',
        'crop.guide.bleed': 'هامش',
      },
    });
  }
}

export function applyCrop(
  document: ReadonlyImageDocument,
  crop: CropState | null,
  options?: { readonly resizeTo?: ImageSize },
): ReadonlyImageDocument {
  const nextCrop = crop
    ? { ...crop, shape: resolveCropShape(crop) }
    : null;
  const width = options?.resizeTo?.width ?? nextCrop?.width ?? document.sourceSize.width;
  const height = options?.resizeTo?.height ?? nextCrop?.height ?? document.sourceSize.height;
  const nextOutput = {
    width: Math.round(width),
    height: Math.round(height),
  };
  return {
    ...document,
    crop: nextCrop,
    designImage: remapDesignImageForOutput(
      resolveDesignImage(document),
      document.output,
      nextOutput,
    ),
    output: nextOutput,
  };
}

export function beginCropPreview(
  document: ReadonlyImageDocument,
  aspectRatio: number | null = null,
  shape: CropShape = 'rect',
): CropState {
  if (document.crop) {
    return {
      ...document.crop,
      shape: resolveCropShape(document.crop),
    };
  }
  return createDefaultCrop(document.sourceSize, aspectRatio, shape);
}
