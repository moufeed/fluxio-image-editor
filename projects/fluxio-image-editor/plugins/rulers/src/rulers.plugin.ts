import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  RulersPluginConfig,
} from 'fluxio-image-editor/core';
import { resolveMarkupSnapConfig } from 'fluxio-image-editor/core';

export const RULERS_TOOL_ACTION = 'rulers.tool';

export type RulersPluginOptions = RulersPluginConfig;

/**
 * Canvas rulers, snap grid, and guide lines (PV49 / NF02).
 * Registers tool + locales; shell owns chrome, snap during annotation drag,
 * and the controls panel.
 */
export class RulersPlugin implements ImageEditorPlugin {
  readonly id = 'rulers';

  readonly initialConfig: ReturnType<typeof resolveMarkupSnapConfig>;

  constructor(private readonly options: RulersPluginOptions = {}) {
    this.initialConfig = resolveMarkupSnapConfig(options);
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'rulers',
      label: 'Rulers',
    });

    context.registerToolbarAction({
      id: RULERS_TOOL_ACTION,
      label: 'Rulers',
      icon: 'rulers',
      position: 215,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'rulers.tool': 'Rulers',
        'toolbar.rulers': 'Rulers',
        'rulers.grid': 'Grid',
        'rulers.gridSize': 'Grid size',
        'rulers.snap': 'Snap',
        'rulers.snapThreshold': 'Snap distance',
        'rulers.snapToContext': 'Snap to edges',
        'rulers.showGrid': 'Show grid',
        'rulers.showRulers': 'Show rulers',
        'rulers.guides': 'Guides',
        'rulers.addVertical': 'Add vertical guide',
        'rulers.addHorizontal': 'Add horizontal guide',
        'rulers.clearGuides': 'Clear guides',
        'rulers.hint':
          'Enable Snap to edges (or pick a snap distance), then drag text/shapes — or an unlocked base photo — near the image edge. Hold Ctrl/Cmd to temporarily disable snap.',
        'rulers.off': 'Off',
        'rulers.reset': 'Reset',
        'rulers.cancel': 'Cancel',
        'rulers.done': 'Done',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'rulers.tool': 'المساطر',
        'toolbar.rulers': 'المساطر',
        'rulers.grid': 'الشبكة',
        'rulers.gridSize': 'حجم الشبكة',
        'rulers.snap': 'الالتقاط',
        'rulers.snapThreshold': 'مسافة الالتقاط',
        'rulers.snapToContext': 'التقاط إلى الحواف',
        'rulers.showGrid': 'إظهار الشبكة',
        'rulers.showRulers': 'إظهار المساطر',
        'rulers.guides': 'الأدلة',
        'rulers.addVertical': 'إضافة دليل عمودي',
        'rulers.addHorizontal': 'إضافة دليل أفقي',
        'rulers.clearGuides': 'مسح الأدلة',
        'rulers.hint':
          'فعّل التقاط الحواف (أو اختر مسافة التقاط)، ثم اسحب النص/الأشكال — أو الصورة الأساسية غير المقفلة — قرب حافة الصورة. Ctrl/Cmd يعطّل الالتقاط مؤقتًا.',
        'rulers.off': 'إيقاف',
        'rulers.reset': 'إعادة تعيين',
        'rulers.cancel': 'إلغاء',
        'rulers.done': 'تم',
      },
    });
  }
}
