import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
} from 'fluxio-image-editor/core';

export const LAYERS_PANEL_ACTION = 'layers.panel';
export const LAYERS_PANEL_ID = 'layers';

/**
 * Global annotation layers panel.
 * Registers chrome action + panel id + locales; list UI lives in the host shell
 * and is deferred until the Layers tab opens (tree-shakeable when omitted).
 *
 * Owns UX for visibility, lock, blend, rename, flat folders, and synthetic
 * base/adjustments/filters rows. Persisted layer props live on `Annotation`.
 */
export class LayersPlugin implements ImageEditorPlugin {
  readonly id = 'layers';

  setup(context: ImageEditorPluginContext): void {
    context.registerPanel({
      id: LAYERS_PANEL_ID,
      label: 'Layers',
    });

    context.registerToolbarAction({
      id: LAYERS_PANEL_ACTION,
      label: 'Layers',
      icon: 'layers',
      surface: 'toolbar',
      position: 220,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'layers.panel': 'Layers',
        'toolbar.layersPanel': 'Layers',
        'layers.aria': 'Annotation layers',
        'layers.close': 'Close layers',
        'layers.empty': 'No annotation layers yet',
        'layers.duplicate': 'Duplicate',
        'layers.delete': 'Delete',
        'layers.arrange': 'Arrange',
        'layers.bringToFront': 'Bring to front',
        'layers.bringForward': 'Bring forward',
        'layers.sendBackward': 'Send backward',
        'layers.sendToBack': 'Send to back',
        'layers.opacity': 'Opacity',
        'layers.blend': 'Blend',
        'layers.visible': 'Toggle visibility',
        'layers.locked': 'Toggle lock',
        'layers.rename': 'Rename',
        'layers.group': 'Group',
        'layers.ungroup': 'Ungroup',
        'layers.collapse': 'Collapse group',
        'layers.expand': 'Expand group',
        'layers.groupDefault': 'Group',
        'layers.baseImage': 'Base image',
        'layers.adjustments': 'Adjustments',
        'layers.filters': 'Filters',
        'layers.openTool': 'Open tool',
        'layers.reset': 'Reset',
        'layers.kind.text': 'Text',
        'layers.kind.rect': 'Rectangle',
        'layers.kind.ellipse': 'Ellipse',
        'layers.kind.polygon': 'Polygon',
        'layers.kind.line': 'Line',
        'layers.kind.arrow': 'Arrow',
        'layers.kind.path': 'Path',
        'layers.kind.image': 'Image',
        'layers.blend.normal': 'Normal',
        'layers.blend.multiply': 'Multiply',
        'layers.blend.screen': 'Screen',
        'layers.blend.overlay': 'Overlay',
        'layers.blend.darken': 'Darken',
        'layers.blend.lighten': 'Lighten',
        'layers.blend.color-dodge': 'Color dodge',
        'layers.blend.color-burn': 'Color burn',
        'layers.blend.hard-light': 'Hard light',
        'layers.blend.soft-light': 'Soft light',
        'layers.blend.difference': 'Difference',
        'layers.blend.exclusion': 'Exclusion',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'layers.panel': 'الطبقات',
        'toolbar.layersPanel': 'الطبقات',
        'layers.aria': 'طبقات التعليقات',
        'layers.close': 'إغلاق الطبقات',
        'layers.empty': 'لا توجد طبقات تعليقات بعد',
        'layers.duplicate': 'تكرار',
        'layers.delete': 'حذف',
        'layers.arrange': 'ترتيب',
        'layers.bringToFront': 'إحضار إلى الأمام',
        'layers.bringForward': 'تقديم',
        'layers.sendBackward': 'تأخير',
        'layers.sendToBack': 'إرسال إلى الخلف',
        'layers.opacity': 'التعتيم',
        'layers.blend': 'المزج',
        'layers.visible': 'تبديل الرؤية',
        'layers.locked': 'تبديل القفل',
        'layers.rename': 'إعادة تسمية',
        'layers.group': 'تجميع',
        'layers.ungroup': 'إلغاء التجميع',
        'layers.collapse': 'طي المجموعة',
        'layers.expand': 'توسيع المجموعة',
        'layers.groupDefault': 'مجموعة',
        'layers.baseImage': 'الصورة الأساسية',
        'layers.adjustments': 'التعديلات',
        'layers.filters': 'المرشحات',
        'layers.openTool': 'فتح الأداة',
        'layers.reset': 'إعادة تعيين',
        'layers.kind.text': 'نص',
        'layers.kind.rect': 'مستطيل',
        'layers.kind.ellipse': 'قطع ناقص',
        'layers.kind.polygon': 'مضلع',
        'layers.kind.line': 'خط',
        'layers.kind.arrow': 'سهم',
        'layers.kind.path': 'مسار',
        'layers.kind.image': 'صورة',
        'layers.blend.normal': 'عادي',
        'layers.blend.multiply': 'ضرب',
        'layers.blend.screen': 'شاشة',
        'layers.blend.overlay': 'تراكب',
        'layers.blend.darken': 'تغميق',
        'layers.blend.lighten': 'تفتيح',
        'layers.blend.color-dodge': 'تجنب اللون',
        'layers.blend.color-burn': 'حرق اللون',
        'layers.blend.hard-light': 'ضوء قاسٍ',
        'layers.blend.soft-light': 'ضوء ناعم',
        'layers.blend.difference': 'فرق',
        'layers.blend.exclusion': 'استبعاد',
      },
    });
  }
}
