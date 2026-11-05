import {
  DEFAULT_ZOOM_PRESETS,
  type ImageEditorPlugin,
  type ImageEditorPluginContext,
  type ViewportPluginConfig,
  type ZoomPreset,
} from 'fluxio-image-editor/core';

export const VIEWPORT_FIT_ACTION = 'viewport.fit';
export const VIEWPORT_ZOOM_IN_ACTION = 'viewport.zoomIn';
export const VIEWPORT_ZOOM_OUT_ACTION = 'viewport.zoomOut';

export const DEFAULT_ZOOM_STEP_FACTOR = 1.1;

/**
 * Viewport contributions: fit toolbar action + zoom control metadata.
 * Zoom/pan math, wheel, and pinch handling live in EditorSession (not document history).
 * Zoom − / % / + UI is rendered by the host shell.
 *
 * Zoom presets / step factor come from `config.viewport` (see
 * `resolveZoomPresets` / `resolveZoomStepFactor`), not plugin constructor args.
 */
export class ViewportPlugin implements ImageEditorPlugin {
  readonly id = 'viewport';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'viewport',
      label: 'Viewport',
    });

    context.registerToolbarAction({
      id: VIEWPORT_FIT_ACTION,
      label: 'Fit',
      icon: 'fit',
      surface: 'utilibar',
      position: 40,
    });
    // Zoom in/out remain registered for hosts that list them in visibleActions,
    // but the default shell renders them as the compact [− % +] control.
    context.registerToolbarAction({
      id: VIEWPORT_ZOOM_IN_ACTION,
      label: 'Zoom in',
      icon: 'zoom-in',
      surface: 'toolbar',
    });
    context.registerToolbarAction({
      id: VIEWPORT_ZOOM_OUT_ACTION,
      label: 'Zoom out',
      icon: 'zoom-out',
      surface: 'toolbar',
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'viewport.fit': 'Fit',
        'viewport.fitSize': 'Fit size',
        'viewport.center': 'Center image',
        'viewport.actualSize': 'Actual size',
        'viewport.zoomIn': 'Zoom in',
        'viewport.zoomOut': 'Zoom out',
        'viewport.zoomPercent': 'Zoom percentage',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'viewport.fit': 'ملاءمة',
        'viewport.fitSize': 'ملاءمة الحجم',
        'viewport.center': 'توسيط الصورة',
        'viewport.actualSize': 'الحجم الفعلي',
        'viewport.zoomIn': 'تكبير',
        'viewport.zoomOut': 'تصغير',
        'viewport.zoomPercent': 'نسبة التكبير',
      },
    });
  }
}

export function resolveZoomPresets(
  options?: Partial<ViewportPluginConfig>,
): readonly ZoomPreset[] {
  return options?.zoomPresets ?? DEFAULT_ZOOM_PRESETS;
}

export function resolveZoomStepFactor(options?: Partial<ViewportPluginConfig>): number {
  return options?.zoomStepFactor ?? DEFAULT_ZOOM_STEP_FACTOR;
}
