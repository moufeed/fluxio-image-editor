import type {
  BatchExportPluginConfig,
  BatchExportPreset,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  RasterExportFormat,
} from 'fluxio-image-editor/core';

export const BATCH_EXPORT_DIALOG_ACTION = 'batch-export.dialog';

function preset(
  partial: Omit<BatchExportPreset, 'format'> & { readonly format?: RasterExportFormat },
): BatchExportPreset {
  return {
    format: 'png',
    ...partial,
  };
}

/** Resolve optional per-preset aspect lock for export-only reframe. */
export function resolveBatchExportAspectRatio(preset: BatchExportPreset): number | null {
  if (typeof preset.ratio === 'number' && Number.isFinite(preset.ratio) && preset.ratio > 0) {
    return preset.ratio;
  }
  return null;
}

/** Built-in multi-format / multi-size export presets. */
export const DEFAULT_BATCH_EXPORT_PRESETS: readonly BatchExportPreset[] = [
  preset({
    id: 'original-png',
    label: 'Original (PNG)',
    category: 'Original',
    format: 'png',
    fileNameSuffix: '',
  }),
  preset({
    id: 'original-jpeg',
    label: 'Original (JPEG)',
    category: 'Original',
    format: 'jpeg',
    quality: 0.92,
    fileNameSuffix: '',
  }),
  preset({
    id: 'original-webp',
    label: 'Original (WebP)',
    category: 'Original',
    format: 'webp',
    quality: 0.92,
    fileNameSuffix: '',
  }),
  preset({
    id: 'thumb-720',
    label: 'Thumbnail 1280×720',
    category: 'Web',
    format: 'jpeg',
    width: 1280,
    height: 720,
    ratio: 16 / 9,
    quality: 0.85,
    fileNameSuffix: '-thumb',
  }),
  preset({
    id: 'web-hero',
    label: 'Web Hero 1920×1080',
    category: 'Web',
    format: 'jpeg',
    width: 1920,
    height: 1080,
    ratio: 16 / 9,
    quality: 0.9,
    fileNameSuffix: '-hero',
  }),
  preset({
    id: 'ig-post',
    label: 'Instagram Post',
    category: 'Social',
    format: 'jpeg',
    width: 1080,
    height: 1080,
    ratio: 1,
    quality: 0.9,
    fileNameSuffix: '-ig-post',
  }),
  preset({
    id: 'ig-story',
    label: 'Instagram Story',
    category: 'Social',
    format: 'jpeg',
    width: 1080,
    height: 1920,
    ratio: 9 / 16,
    quality: 0.9,
    fileNameSuffix: '-ig-story',
  }),
  preset({
    id: 'fb-cover',
    label: 'Facebook Cover',
    category: 'Social',
    format: 'jpeg',
    width: 820,
    height: 312,
    ratio: 820 / 312,
    quality: 0.9,
    fileNameSuffix: '-fb-cover',
  }),
  preset({
    id: 'x-post',
    label: 'X / Twitter Post',
    category: 'Social',
    format: 'jpeg',
    width: 1200,
    height: 675,
    ratio: 16 / 9,
    quality: 0.9,
    fileNameSuffix: '-x-post',
  }),
  preset({
    id: 'yt-thumb',
    label: 'YouTube Thumbnail',
    category: 'Social',
    format: 'jpeg',
    width: 1280,
    height: 720,
    ratio: 16 / 9,
    quality: 0.9,
    fileNameSuffix: '-yt-thumb',
  }),
];

export type BatchExportPluginOptions = Partial<BatchExportPluginConfig>;

/**
 * Batch export (Tier 2).
 * Orchestrates multiple `session.export()` passes with format/size presets.
 */
export class BatchExportPlugin implements ImageEditorPlugin {
  readonly id = 'batch-export';
  private readonly presets: readonly BatchExportPreset[];

  constructor(options: BatchExportPluginOptions = {}) {
    this.presets =
      options.presets && options.presets.length > 0
        ? options.presets
        : DEFAULT_BATCH_EXPORT_PRESETS;
  }

  getPresets(): readonly BatchExportPreset[] {
    return this.presets;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerToolbarAction({
      id: BATCH_EXPORT_DIALOG_ACTION,
      label: 'Batch export',
      icon: 'batch-export',
      surface: 'toolbar',
      position: 231,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'batch-export.dialog': 'Batch export',
        'batch-export.dialogTitle': 'Batch export',
        'batch-export.dialogHint':
          'Export the current image in multiple formats and sizes at once. Sized presets reframe from the source to their aspect, then resize.',
        'batch-export.presets': 'Presets',
        'batch-export.selectAll': 'Select all',
        'batch-export.selectNone': 'Clear',
        'batch-export.fileName': 'Base file name',
        'batch-export.quality': 'Quality',
        'batch-export.confirm': 'Export selected',
        'batch-export.cancel': 'Cancel',
        'batch-export.empty': 'Select at least one preset',
        'batch-export.busy': 'Exporting…',
        'batch-export.progressOf': 'of',
        'batch-export.sizeLabel': 'Original size',
        'batch-export.aspectLabel': 'Aspect crop',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'batch-export.dialog': 'تصدير متعدد',
        'batch-export.dialogTitle': 'تصدير متعدد',
        'batch-export.dialogHint':
          'صدّر الصورة الحالية بعدة صيغ وأحجام دفعة واحدة. الإعدادات ذات المقاس تعيد التأطير من المصدر حسب النسبة ثم تغيّر الحجم.',
        'batch-export.presets': 'الإعدادات المسبقة',
        'batch-export.selectAll': 'تحديد الكل',
        'batch-export.selectNone': 'مسح',
        'batch-export.fileName': 'اسم الملف الأساسي',
        'batch-export.quality': 'الجودة',
        'batch-export.confirm': 'تصدير المحدد',
        'batch-export.cancel': 'إلغاء',
        'batch-export.empty': 'حدد إعداداً مسبقاً واحداً على الأقل',
        'batch-export.busy': 'جارٍ التصدير…',
        'batch-export.progressOf': 'من',
        'batch-export.sizeLabel': 'الحجم الأصلي',
        'batch-export.aspectLabel': 'قص بنسبة',
      },
    });
  }
}
