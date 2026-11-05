import type {
  ImageAnnotation,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ImageOverlayGalleryItem,
  ImageOverlayPluginConfig,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import {
  annotationsEqual,
  isImageAnnotation,
  normalizeImageAnnotation,
  registerAnnotationCommands,
  registerAnnotationsToolbarAction,
  withImageAnnotations,
} from 'fluxio-image-editor/core';

export const IMAGE_OVERLAY_SET_COMMAND = 'image-overlay.set';
export const IMAGE_OVERLAY_RESET_COMMAND = 'image-overlay.reset';

export interface ImageOverlaySetPayload {
  readonly images: readonly ImageAnnotation[];
}

export class ImageOverlayPlugin implements ImageEditorPlugin {
  readonly id = 'image-overlay';
  private readonly gallery: readonly ImageOverlayGalleryItem[];

  constructor(config: Partial<ImageOverlayPluginConfig> = {}) {
    this.gallery = config.gallery ?? [];
  }

  /** Host gallery items available to the shell UI. */
  getGallery(): readonly ImageOverlayGalleryItem[] {
    return this.gallery;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'image-overlay',
      label: 'Overlay',
    });

    registerAnnotationCommands(context, {
      setCommandId: IMAGE_OVERLAY_SET_COMMAND,
      resetCommandId: IMAGE_OVERLAY_RESET_COMMAND,
      kindLabel: 'Image overlay',
      itemLabel: 'overlay',
      payloadKey: 'images',
      extractItems: (payload) => (payload as ImageOverlaySetPayload)?.images ?? [],
      applyToDocument: applyImageAnnotations,
      isKind: isImageAnnotation,
    });

    registerAnnotationsToolbarAction(context, {
      id: 'image-overlay.tool',
      label: 'Overlay',
      icon: 'image-overlay',
      position: 124,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'image-overlay.tool': 'Overlay',
        'image-overlay.done': 'Done',
        'image-overlay.apply': 'Apply',
        'image-overlay.cancel': 'Cancel',
        'image-overlay.reset': 'Reset',
        'image-overlay.gallery': 'Gallery',
        'image-overlay.upload': 'Upload',
        'image-overlay.dropHint': 'Drop an image here, or click to browse',
        'image-overlay.opacity': 'Opacity',
        'image-overlay.delete': 'Delete',
        'image-overlay.item': 'Image {n}',
        'image-overlay.empty': 'Pick a gallery image or upload one',
        'image-overlay.noGallery': 'No gallery items configured',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'image-overlay.tool': 'تراكب',
        'image-overlay.done': 'تم',
        'image-overlay.apply': 'تطبيق',
        'image-overlay.cancel': 'إلغاء',
        'image-overlay.reset': 'إعادة تعيين',
        'image-overlay.gallery': 'المعرض',
        'image-overlay.upload': 'رفع',
        'image-overlay.dropHint': 'أسقط صورة هنا، أو انقر للتصفح',
        'image-overlay.opacity': 'الشفافية',
        'image-overlay.delete': 'حذف',
        'image-overlay.item': 'صورة {n}',
        'image-overlay.empty': 'اختر صورة من المعرض أو ارفع واحدة',
        'image-overlay.noGallery': 'لا توجد عناصر في المعرض',
      },
    });
  }
}

export function applyImageAnnotations(
  document: ReadonlyImageDocument,
  images: readonly ImageAnnotation[],
): ReadonlyImageDocument {
  const normalized = images.map((item) => normalizeImageAnnotation(item));
  const next = withImageAnnotations(document, normalized);
  if (annotationsEqual(document.annotations, next.annotations)) {
    return document;
  }
  return next;
}
