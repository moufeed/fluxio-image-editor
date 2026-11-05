import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
} from 'fluxio-image-editor/core';

export const PERSISTENCE_EXPORT_ACTION = 'persistence.export';
export const PERSISTENCE_LOAD_ACTION = 'persistence.load';

/**
 * Optional persistence plugin — durable design-state locales / action ids.
 * Export UI lives in the shell Export menu (with PNG/JPEG); schema is Core-owned.
 */
export class PersistencePlugin implements ImageEditorPlugin {
  readonly id = 'persistence';

  setup(context: ImageEditorPluginContext): void {
    context.registerLocale({
      locale: 'en',
      messages: {
        'persistence.export': 'Save design',
        'persistence.load': 'Load design',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'persistence.export': 'حفظ التصميم',
        'persistence.load': 'تحميل التصميم',
      },
    });
  }
}
