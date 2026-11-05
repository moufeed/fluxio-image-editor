import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ImageOverlayGalleryItem,
  StickersPluginConfig,
} from 'fluxio-image-editor/core';
import { registerAnnotationsToolbarAction } from 'fluxio-image-editor/core';

export const STICKERS_TOOL_ACTION = 'stickers.tool';

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Built-in demo/host-friendly sticker presets (CSP-safe data URLs). */
export const DEFAULT_STICKER_GALLERY: readonly ImageOverlayGalleryItem[] = [
  {
    id: 'star',
    label: 'Star',
    src: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#f5c518" d="M32 6l7.2 14.6 16.1 2.3-11.6 11.3 2.7 16-14.4-7.6L17.6 50l2.7-16L8.7 22.9l16.1-2.3z"/></svg>',
    ),
  },
  {
    id: 'heart',
    label: 'Heart',
    src: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#e74c3c" d="M32 54S8 38 8 22a12 12 0 0 1 22-6 12 12 0 0 1 22 6c0 16-24 32-24 32z"/></svg>',
    ),
  },
  {
    id: 'check',
    label: 'Check',
    src: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle fill="#2ecc71" cx="32" cy="32" r="26"/><path fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M18 33l9 9 19-20"/></svg>',
    ),
  },
  {
    id: 'emoji',
    label: 'Smile',
    src: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle fill="#f1c40f" cx="32" cy="32" r="26"/><circle fill="#2c3e50" cx="22" cy="26" r="3.5"/><circle fill="#2c3e50" cx="42" cy="26" r="3.5"/><path fill="none" stroke="#2c3e50" stroke-width="3.5" stroke-linecap="round" d="M20 38c4 8 20 8 24 0"/></svg>',
    ),
  },
];

export type StickersPluginOptions = Partial<StickersPluginConfig>;

/**
 * Stickers / icons (Phase 4.8.3).
 * Places preset gallery items as image annotations; canvas interaction reuses Overlay (UX-I1).
 * Commits go through `image-overlay.set` (shared annotation store).
 */
export class StickersPlugin implements ImageEditorPlugin {
  readonly id = 'stickers';
  private readonly gallery: readonly ImageOverlayGalleryItem[];
  private readonly allowUpload: boolean;

  constructor(options: StickersPluginOptions = {}) {
    this.gallery =
      options.gallery && options.gallery.length > 0
        ? options.gallery
        : DEFAULT_STICKER_GALLERY;
    this.allowUpload = options.allowUpload === true;
  }

  getGallery(): readonly ImageOverlayGalleryItem[] {
    return this.gallery;
  }

  getAllowUpload(): boolean {
    return this.allowUpload;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'stickers',
      label: 'Stickers',
    });

    registerAnnotationsToolbarAction(context, {
      id: STICKERS_TOOL_ACTION,
      label: 'Stickers',
      icon: 'stickers',
      position: 125,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'stickers.tool': 'Stickers',
        'stickers.done': 'Done',
        'stickers.cancel': 'Cancel',
        'stickers.reset': 'Clear',
        'stickers.gallery': 'Stickers',
        'stickers.upload': 'Upload',
        'stickers.dropHint': 'Drop an image here, or click to browse',
        'stickers.opacity': 'Opacity',
        'stickers.delete': 'Delete',
        'stickers.item': 'Sticker {n}',
        'stickers.empty': 'Pick a sticker to place on the image',
        'stickers.noGallery': 'No stickers configured',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'stickers.tool': 'ملصقات',
        'stickers.done': 'تم',
        'stickers.cancel': 'إلغاء',
        'stickers.reset': 'مسح',
        'stickers.gallery': 'ملصقات',
        'stickers.upload': 'رفع',
        'stickers.dropHint': 'أسقط صورة هنا، أو انقر للتصفح',
        'stickers.opacity': 'الشفافية',
        'stickers.delete': 'حذف',
        'stickers.item': 'ملصق {n}',
        'stickers.empty': 'اختر ملصقاً لوضعه على الصورة',
        'stickers.noGallery': 'لا توجد ملصقات مُعدّة',
      },
    });
  }
}
