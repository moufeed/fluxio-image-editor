import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
} from 'fluxio-image-editor/core';

export const COMPARE_ORIGINAL_ACTION = 'compare.original';

export interface ComparePluginOptions {
  /** When false, skip registering the toolbar action (shell may still call setCompareOriginal). */
  readonly registerAction?: boolean;
}

/**
 * Live original comparison (Phase 4.8.5).
 * Registers chrome action id + locales; hold/toggle UI lives in the host shell.
 * View mode is Core-owned via `EditorSession.setCompareOriginal`.
 */
export class ComparePlugin implements ImageEditorPlugin {
  readonly id = 'compare';

  constructor(private readonly options: ComparePluginOptions = {}) {}

  setup(context: ImageEditorPluginContext): void {
    if (this.options.registerAction !== false) {
      context.registerToolbarAction({
        id: COMPARE_ORIGINAL_ACTION,
        label: 'Compare',
        icon: 'compare',
        surface: 'toolbar',
        position: 200,
      });
    }

    context.registerLocale({
      locale: 'en',
      messages: {
        'compare.original': 'Compare',
        'toolbar.compare': 'Compare',
        'toolbar.compareHint': 'Hold to view original; click to pin',
        'status.comparing': 'Original',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'compare.original': 'مقارنة',
        'toolbar.compare': 'مقارنة',
        'toolbar.compareHint': 'اضغط مع الاستمرار لعرض الأصل؛ انقر للتثبيت',
        'status.comparing': 'الأصل',
      },
    });
  }
}
