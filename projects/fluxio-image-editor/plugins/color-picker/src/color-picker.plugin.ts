import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ColorPickerPluginConfig,
} from 'fluxio-image-editor/core';

export type ColorPickerPluginOptions = Partial<ColorPickerPluginConfig>;

/**
 * Canvas eyedropper — samples composed document pixels into color fields.
 * Shell owns interaction; this plugin registers the tool id + locales.
 * Entry UX is the eyedropper on `fluxio-color-alpha-field` (no toolbar chrome).
 */
export class ColorPickerPlugin implements ImageEditorPlugin {
  readonly id = 'color-picker';

  constructor(_options: ColorPickerPluginOptions = {}) {
    void _options;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'color-picker',
      label: 'Color picker',
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'color-picker.sample': 'Sample color from image',
        'color-picker.cancel': 'Cancel eyedropper',
        'color-picker.hint': 'Click the image to sample a color',
        'color-picker.tainted': 'Cannot sample this image (CORS)',
        'color-picker.osFallback': 'Sampling from screen instead…',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'color-picker.sample': 'أخذ لون من الصورة',
        'color-picker.cancel': 'إلغاء القطارة',
        'color-picker.hint': 'انقر على الصورة لأخذ لون',
        'color-picker.tainted': 'تعذر أخذ اللون من هذه الصورة (CORS)',
        'color-picker.osFallback': 'جارٍ أخذ اللون من الشاشة…',
      },
    });
  }
}
