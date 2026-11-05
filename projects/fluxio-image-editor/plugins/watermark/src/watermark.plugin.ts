import type {
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ImageOverlayGalleryItem,
  ReadonlyImageDocument,
  WatermarkPluginConfig,
  WatermarkState,
} from 'fluxio-image-editor/core';
import {
  createInitialWatermark,
  isIdentityWatermark,
  normalizeWatermark,
  watermarksEqual,
} from 'fluxio-image-editor/core';

export const WATERMARK_SET_COMMAND = 'watermark.set';
export const WATERMARK_RESET_COMMAND = 'watermark.reset';

export interface WatermarkSetPayload {
  readonly watermark?: Partial<WatermarkState> | null;
}

/** Ordered so the gesture that drives the edit names the history entry. */
function describeWatermarkChange(before: WatermarkState, after: WatermarkState): string {
  if (before.mode !== after.mode) {
    return `Watermark: ${after.mode}`;
  }
  if (before.text !== after.text || before.imageSrc !== after.imageSrc) {
    return 'Edit watermark';
  }
  if (before.angle !== after.angle) {
    return 'Rotate watermark';
  }
  if (before.scale !== after.scale) {
    return 'Resize watermark';
  }
  if (before.x !== after.x || before.y !== after.y || before.position !== after.position) {
    return 'Move watermark';
  }
  return 'Restyle watermark';
}

export class WatermarkPlugin implements ImageEditorPlugin {
  readonly id = 'watermark';
  private readonly defaults: {
    readonly defaultText: string;
    readonly imageSrc: string;
    readonly gallery: readonly ImageOverlayGalleryItem[];
  };

  constructor(config: Partial<WatermarkPluginConfig> = {}) {
    this.defaults = {
      defaultText: config.defaultText?.trim() || 'Watermark',
      imageSrc: config.imageSrc?.trim() || '',
      gallery: config.gallery ?? [],
    };
  }

  getDefaults(): {
    readonly defaultText: string;
    readonly imageSrc: string;
    readonly gallery: readonly ImageOverlayGalleryItem[];
  } {
    return this.defaults;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'watermark',
      label: 'Watermark',
    });

    context.registerCommand({
      id: WATERMARK_SET_COMMAND,
      execute: (payload: WatermarkSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const previous = ctx.document.watermark;
        const next = applyWatermark(ctx.document, payload?.watermark);
        const label = isIdentityWatermark(next.watermark)
          ? 'Clear watermark'
          : describeWatermarkChange(previous, next.watermark);
        if (next === ctx.document) {
          return { document: next, label };
        }
        return {
          document: next,
          label,
          inversePayload: {
            commandId: WATERMARK_SET_COMMAND,
            payload: { watermark: previous },
          },
        };
      },
    });

    context.registerCommand({
      id: WATERMARK_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => {
        const previous = ctx.document.watermark;
        const next = applyWatermark(ctx.document, createInitialWatermark());
        const label = 'Clear watermark';
        if (next === ctx.document) {
          return { document: next, label };
        }
        return {
          document: next,
          label,
          inversePayload: {
            commandId: WATERMARK_SET_COMMAND,
            payload: { watermark: previous },
          },
        };
      },
    });

    context.registerToolbarAction({
      id: 'watermark.tool',
      label: 'Watermark',
      icon: 'watermark',
      position: 130,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'watermark.tool': 'Watermark',
        'watermark.apply': 'Done',
        'watermark.done': 'Done',
        'watermark.remove': 'Remove watermark',
        'watermark.cancel': 'Cancel',
        'watermark.reset': 'Reset',
        'watermark.hint':
          'Drag to place; corner handles scale, bottom handle rotates. Presets snap position.',
        'watermark.mode': 'Type',
        'watermark.mode.none': 'None',
        'watermark.mode.text': 'Text',
        'watermark.mode.image': 'Image',
        'watermark.text': 'Text',
        'watermark.fill': 'Color',
        'watermark.position': 'Position',
        'watermark.opacity': 'Opacity',
        'watermark.scale': 'Scale',
        'watermark.angle': 'Rotation',
        'watermark.gallery': 'Gallery',
        'watermark.default': 'Default',
        'watermark.upload': 'Upload image',
        'watermark.noGallery': 'No gallery — upload or set config.watermark.imageSrc',
        'watermark.position.center': 'Center',
        'watermark.position.top-left': 'Top left',
        'watermark.position.top-right': 'Top right',
        'watermark.position.bottom-left': 'Bottom left',
        'watermark.position.bottom-right': 'Bottom right',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'watermark.tool': 'علامة مائية',
        'watermark.apply': 'تم',
        'watermark.done': 'تم',
        'watermark.remove': 'إزالة العلامة المائية',
        'watermark.cancel': 'إلغاء',
        'watermark.reset': 'إعادة تعيين',
        'watermark.hint':
          'اسحب للوضع؛ مقابض الأركان تغيّر الحجم والمقبض السفلي يدوّر. الإعدادات المسبقة تثبّت الموضع.',
        'watermark.mode': 'النوع',
        'watermark.mode.none': 'بدون',
        'watermark.mode.text': 'نص',
        'watermark.mode.image': 'صورة',
        'watermark.text': 'النص',
        'watermark.fill': 'اللون',
        'watermark.position': 'الموضع',
        'watermark.opacity': 'الشفافية',
        'watermark.scale': 'الحجم',
        'watermark.angle': 'التدوير',
        'watermark.gallery': 'المعرض',
        'watermark.default': 'افتراضي',
        'watermark.upload': 'رفع صورة',
        'watermark.noGallery': 'لا يوجد معرض — ارفع صورة أو عيّن config.watermark.imageSrc',
        'watermark.position.center': 'الوسط',
        'watermark.position.top-left': 'أعلى اليسار',
        'watermark.position.top-right': 'أعلى اليمين',
        'watermark.position.bottom-left': 'أسفل اليسار',
        'watermark.position.bottom-right': 'أسفل اليمين',
      },
    });
  }
}

export function applyWatermark(
  document: ReadonlyImageDocument,
  partial?: Partial<WatermarkState> | null,
): ReadonlyImageDocument {
  const watermark = normalizeWatermark({
    ...document.watermark,
    ...partial,
  });
  if (watermarksEqual(document.watermark, watermark)) {
    return document;
  }
  return { ...document, watermark };
}
