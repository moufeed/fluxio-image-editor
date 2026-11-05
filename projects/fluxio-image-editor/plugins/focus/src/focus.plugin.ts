import type {
  EditorCommandContext,
  EditorCommandResult,
  FocusState,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import { focusEqual, isIdentityFocus, normalizeFocus } from 'fluxio-image-editor/core';

export const FOCUS_SET_COMMAND = 'focus.set';
export const FOCUS_RESET_COMMAND = 'focus.reset';

export interface FocusSetPayload {
  readonly focus: Partial<FocusState>;
}

const FOCUS_MODE_NAMES: Readonly<Record<FocusState['mode'], string>> = {
  none: 'Focus',
  radial: 'Radial focus',
  linear: 'Tilt-shift focus',
};

export class FocusPlugin implements ImageEditorPlugin {
  readonly id = 'focus';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'focus',
      label: 'Focus',
    });

    context.registerCommand({
      id: FOCUS_SET_COMMAND,
      execute: (payload: FocusSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyFocus(ctx.document, payload?.focus);
        return {
          document: next,
          label: isIdentityFocus(next.focus)
            ? 'Reset focus'
            : (FOCUS_MODE_NAMES[next.focus.mode] ?? 'Focus'),
        };
      },
    });

    context.registerCommand({
      id: FOCUS_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyFocus(ctx.document, null),
        label: 'Reset focus',
      }),
    });

    context.registerToolbarAction({
      id: 'focus.tool',
      label: 'Focus',
      icon: 'focus',
      position: 80,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'focus.tool': 'Focus',
        'focus.apply': 'Apply',
        'focus.cancel': 'Cancel',
        'focus.reset': 'Reset',
        'focus.mode': 'Mode',
        'focus.radial': 'Radial',
        'focus.linear': 'Tilt-Shift',
        'focus.blur': 'Blur',
        'focus.size': 'Size',
        'focus.feather': 'Feather',
        'focus.centerX': 'Position X',
        'focus.centerY': 'Position Y',
        'focus.angle': 'Angle',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'focus.tool': 'التركيز',
        'focus.apply': 'تطبيق',
        'focus.cancel': 'إلغاء',
        'focus.reset': 'إعادة تعيين',
        'focus.mode': 'الوضع',
        'focus.radial': 'شعاعي',
        'focus.linear': 'إمالة-إزاحة',
        'focus.blur': 'الضبابية',
        'focus.size': 'الحجم',
        'focus.feather': 'التدرج',
        'focus.centerX': 'الموضع أفقي',
        'focus.centerY': 'الموضع عمودي',
        'focus.angle': 'الزاوية',
      },
    });
  }
}

export function applyFocus(
  document: ReadonlyImageDocument,
  partial: Partial<FocusState> | null | undefined,
): ReadonlyImageDocument {
  const focus = normalizeFocus(partial);
  if (focusEqual(document.focus, focus)) {
    return document;
  }
  return {
    ...document,
    focus,
  };
}
