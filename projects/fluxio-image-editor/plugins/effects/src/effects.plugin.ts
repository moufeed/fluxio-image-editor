import type {
  EditorCommandContext,
  EditorCommandResult,
  EffectsState,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import {
  describeStateChange,
  effectsEqual,
  isIdentityEffects,
  normalizeEffects,
} from 'fluxio-image-editor/core';

export const EFFECTS_SET_COMMAND = 'effects.set';
export const EFFECTS_RESET_COMMAND = 'effects.reset';

export interface EffectsSetPayload {
  readonly effects: Partial<EffectsState>;
}

const EFFECT_LABELS: Readonly<Record<keyof EffectsState, string>> = {
  threshold: 'Threshold',
  posterize: 'Posterize',
  pixelate: 'Pixelate',
  noise: 'Noise',
};

export class EffectsPlugin implements ImageEditorPlugin {
  readonly id = 'effects';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'effects',
      label: 'Effects',
    });

    context.registerCommand({
      id: EFFECTS_SET_COMMAND,
      execute: (payload: EffectsSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyEffects(ctx.document, payload?.effects);
        return {
          document: next,
          label: isIdentityEffects(next.effects)
            ? 'Reset effects'
            : describeStateChange(ctx.document.effects, next.effects, EFFECT_LABELS, 'Effects'),
        };
      },
    });

    context.registerCommand({
      id: EFFECTS_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyEffects(ctx.document, null),
        label: 'Reset effects',
      }),
    });

    context.registerToolbarAction({
      id: 'effects.tool',
      label: 'Effects',
      icon: 'effects',
      position: 60,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'effects.tool': 'Effects',
        'effects.apply': 'Apply',
        'effects.cancel': 'Cancel',
        'effects.reset': 'Reset',
        'effects.threshold': 'Threshold',
        'effects.posterize': 'Posterize',
        'effects.pixelate': 'Pixelate',
        'effects.noise': 'Noise',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'effects.tool': 'تأثيرات',
        'effects.apply': 'تطبيق',
        'effects.cancel': 'إلغاء',
        'effects.reset': 'إعادة تعيين',
        'effects.threshold': 'العتبة',
        'effects.posterize': 'تبسيط الألوان',
        'effects.pixelate': 'بكسلة',
        'effects.noise': 'ضوضاء',
      },
    });
  }
}

export function applyEffects(
  document: ReadonlyImageDocument,
  partial: Partial<EffectsState> | null | undefined,
): ReadonlyImageDocument {
  const effects = normalizeEffects(partial);
  if (effectsEqual(document.effects, effects)) {
    return document;
  }
  return {
    ...document,
    effects,
  };
}
