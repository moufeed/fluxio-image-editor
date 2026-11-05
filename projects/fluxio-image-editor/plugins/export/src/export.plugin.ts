import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  PublicExportOptions,
  RasterExportOptions,
} from 'fluxio-image-editor/core';

export const EXPORT_PNG_ACTION = 'export.png';
export const EXPORT_JPEG_ACTION = 'export.jpeg';
export const EXPORT_WEBP_ACTION = 'export.webp';
export const EXPORT_DIALOG_ACTION = 'export.dialog';

/**
 * Export plugin registers UI/actions. Rasterization is performed by the session via the renderer port.
 */
export class ExportPlugin implements ImageEditorPlugin {
  readonly id = 'export';

  setup(context: ImageEditorPluginContext): void {
    context.registerToolbarAction({
      id: EXPORT_DIALOG_ACTION,
      label: 'Export',
      icon: 'export',
      surface: 'toolbar',
      position: 230,
    });
    // PNG / JPEG / WebP are chosen from the Export dropdown in the host shell.

    context.registerLocale({
      locale: 'en',
      messages: {
        'export.png': 'PNG',
        'export.jpeg': 'JPEG',
        'export.webp': 'WebP',
        'export.dialog': 'Export',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'export.png': 'PNG',
        'export.jpeg': 'JPEG',
        'export.webp': 'WebP',
        'export.dialog': 'تصدير',
      },
    });
  }
}

export function defaultPngExportOptions(): RasterExportOptions {
  return { format: 'png' };
}

export function defaultJpegExportOptions(quality = 0.92): PublicExportOptions {
  return { format: 'jpeg', quality, backgroundColor: '#ffffff', asFile: true };
}

export function defaultWebpExportOptions(quality = 0.92): PublicExportOptions {
  return { format: 'webp', quality, asFile: true };
}
