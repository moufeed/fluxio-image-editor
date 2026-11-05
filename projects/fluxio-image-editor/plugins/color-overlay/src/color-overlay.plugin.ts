import type {
  ColorOverlayState,
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import {
  colorOverlayEqual,
  isIdentityColorOverlay,
  normalizeColorOverlay,
} from 'fluxio-image-editor/core';

export const COLOR_OVERLAY_SET_COMMAND = 'color-overlay.set';
export const COLOR_OVERLAY_RESET_COMMAND = 'color-overlay.reset';

export interface ColorOverlaySetPayload {
  readonly colorOverlay: Partial<ColorOverlayState>;
}

const OVERLAY_MODE_NAMES: Readonly<Record<ColorOverlayState['mode'], string>> = {
  none: 'Fill',
  solid: 'Solid fill',
  linear: 'Linear gradient',
  radial: 'Radial gradient',
  angular: 'Angular gradient',
};

export class ColorOverlayPlugin implements ImageEditorPlugin {
  readonly id = 'color-overlay';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'color-overlay',
      label: 'Fill',
    });

    context.registerCommand({
      id: COLOR_OVERLAY_SET_COMMAND,
      execute: (
        payload: ColorOverlaySetPayload,
        ctx: EditorCommandContext,
      ): EditorCommandResult => {
        const next = applyColorOverlay(ctx.document, payload?.colorOverlay);
        return {
          document: next,
          label: isIdentityColorOverlay(next.colorOverlay)
            ? 'Clear fill'
            : (OVERLAY_MODE_NAMES[next.colorOverlay.mode] ?? 'Fill'),
        };
      },
    });

    context.registerCommand({
      id: COLOR_OVERLAY_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyColorOverlay(ctx.document, null),
        label: 'Clear fill',
      }),
    });

    context.registerToolbarAction({
      id: 'color-overlay.tool',
      label: 'Fill',
      icon: 'color-overlay',
      position: 95,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'color-overlay.tool': 'Fill',
        'color-overlay.apply': 'Apply',
        'color-overlay.cancel': 'Cancel',
        'color-overlay.reset': 'Clear',
        'color-overlay.mode': 'Mode',
        'color-overlay.none': 'None',
        'color-overlay.solid': 'Solid',
        'color-overlay.linear': 'Linear',
        'color-overlay.radial': 'Radial',
        'color-overlay.angular': 'Angular',
        'color-overlay.color': 'Color',
        'color-overlay.color2': 'Accent',
        'color-overlay.opacity': 'Opacity',
        'color-overlay.angle': 'Angle',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'color-overlay.tool': 'تعبئة',
        'color-overlay.apply': 'تطبيق',
        'color-overlay.cancel': 'إلغاء',
        'color-overlay.reset': 'مسح',
        'color-overlay.mode': 'الوضع',
        'color-overlay.none': 'بدون',
        'color-overlay.solid': 'صلب',
        'color-overlay.linear': 'خطي',
        'color-overlay.radial': 'دائري',
        'color-overlay.angular': 'زاوي',
        'color-overlay.color': 'اللون',
        'color-overlay.color2': 'لون ثانٍ',
        'color-overlay.opacity': 'الشفافية',
        'color-overlay.angle': 'الزاوية',
      },
    });
  }
}

export function applyColorOverlay(
  document: ReadonlyImageDocument,
  partial: Partial<ColorOverlayState> | null | undefined,
): ReadonlyImageDocument {
  const colorOverlay = normalizeColorOverlay(partial);
  if (colorOverlayEqual(document.colorOverlay, colorOverlay)) {
    return document;
  }
  return {
    ...document,
    colorOverlay,
  };
}
