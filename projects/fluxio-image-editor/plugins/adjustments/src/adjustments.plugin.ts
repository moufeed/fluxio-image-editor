import type {
  AdjustmentsState,
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import {
  adjustmentsEqual,
  describeStateChange,
  isIdentityAdjustments,
  normalizeAdjustments,
} from 'fluxio-image-editor/core';

export const ADJUSTMENTS_SET_COMMAND = 'adjustments.set';
export const ADJUSTMENTS_RESET_COMMAND = 'adjustments.reset';

export interface AdjustmentsSetPayload {
  readonly adjustments: Partial<AdjustmentsState>;
}

const ADJUSTMENT_LABELS: Readonly<Record<keyof AdjustmentsState, string>> = {
  brightness: 'Brightness',
  contrast: 'Contrast',
  hue: 'Hue',
  saturation: 'Saturation',
  value: 'Value',
  warmth: 'Warmth',
  blur: 'Blur',
  exposure: 'Exposure',
  sharpen: 'Sharpen',
  gamma: 'Gamma',
  vignette: 'Vignette',
  clarity: 'Clarity',
};

export class AdjustmentsPlugin implements ImageEditorPlugin {
  readonly id = 'adjustments';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'adjustments',
      label: 'Finetune',
    });

    context.registerCommand({
      id: ADJUSTMENTS_SET_COMMAND,
      execute: (payload: AdjustmentsSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyAdjustments(ctx.document, payload?.adjustments);
        return {
          document: next,
          label: isIdentityAdjustments(next.adjustments)
            ? 'Reset adjustments'
            : describeStateChange(
                ctx.document.adjustments,
                next.adjustments,
                ADJUSTMENT_LABELS,
                'Adjust',
              ),
        };
      },
    });

    context.registerCommand({
      id: ADJUSTMENTS_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyAdjustments(ctx.document, null),
        label: 'Reset adjustments',
      }),
    });

    context.registerToolbarAction({
      id: 'adjustments.tool',
      label: 'Finetune',
      icon: 'adjustments',
      position: 50,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'adjustments.tool': 'Finetune',
        'adjustments.apply': 'Apply',
        'adjustments.cancel': 'Cancel',
        'adjustments.reset': 'Reset',
        'adjustments.brightness': 'Brightness',
        'adjustments.contrast': 'Contrast',
        'adjustments.hue': 'Hue',
        'adjustments.saturation': 'Saturation',
        'adjustments.value': 'Value',
        'adjustments.warmth': 'Warmth',
        'adjustments.blur': 'Blur',
        'adjustments.exposure': 'Exposure',
        'adjustments.sharpen': 'Sharpen',
        'adjustments.gamma': 'Gamma',
        'adjustments.vignette': 'Vignette',
        'adjustments.clarity': 'Clarity',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'adjustments.tool': 'ضبط دقيق',
        'adjustments.apply': 'تطبيق',
        'adjustments.cancel': 'إلغاء',
        'adjustments.reset': 'إعادة تعيين',
        'adjustments.brightness': 'السطوع',
        'adjustments.contrast': 'التباين',
        'adjustments.hue': 'الصبغة',
        'adjustments.saturation': 'التشبع',
        'adjustments.value': 'القيمة',
        'adjustments.warmth': 'الدفء',
        'adjustments.blur': 'الضبابية',
        'adjustments.exposure': 'التعريض',
        'adjustments.sharpen': 'الحدة',
        'adjustments.gamma': 'غاما',
        'adjustments.vignette': 'التظليل الحافي',
        'adjustments.clarity': 'الوضوح',
      },
    });
  }
}

export function applyAdjustments(
  document: ReadonlyImageDocument,
  partial: Partial<AdjustmentsState> | null | undefined,
): ReadonlyImageDocument {
  const adjustments = normalizeAdjustments(partial);
  if (adjustmentsEqual(document.adjustments, adjustments)) {
    return document;
  }
  return {
    ...document,
    adjustments,
  };
}
