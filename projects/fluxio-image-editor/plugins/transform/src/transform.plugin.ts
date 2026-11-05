import type {
  DesignImageState,
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
  RotatePluginConfig,
} from 'fluxio-image-editor/core';
import {
  normalizeDesignImage,
  remapDesignImageForOrientationSwap,
  remapDesignImageForOutput,
  resolveDesignImage,
} from 'fluxio-image-editor/core';

export const TRANSFORM_ROTATE_COMMAND = 'transform.rotate';
export const TRANSFORM_SET_ROTATION_COMMAND = 'transform.setRotation';
export const TRANSFORM_FLIP_H_COMMAND = 'transform.flipHorizontal';
export const TRANSFORM_FLIP_V_COMMAND = 'transform.flipVertical';
export const TRANSFORM_RESIZE_COMMAND = 'transform.resize';
export const TRANSFORM_SET_DESIGN_IMAGE_COMMAND = 'transform.setDesignImage';
export const TRANSFORM_SET_DESIGN_IMAGE_LOCK_COMMAND = 'transform.setDesignImageLock';

export interface RotateCommandPayload {
  readonly degrees?: number;
}

export interface SetRotationPayload {
  readonly degrees: number;
}

export interface ResizeCommandPayload {
  readonly width: number;
  readonly height: number;
  readonly lockAspectRatio?: boolean;
}

export interface SetDesignImagePayload {
  readonly designImage: Partial<DesignImageState>;
}

export interface SetDesignImageLockPayload {
  readonly locked: boolean;
}

export type TransformPluginOptions = Partial<RotatePluginConfig>;

export class TransformPlugin implements ImageEditorPlugin {
  readonly id = 'transform';

  constructor(private readonly options: TransformPluginOptions = {}) {}

  setup(context: ImageEditorPluginContext): void {
    const increment = this.options.incrementDegrees ?? 90;

    context.registerTool({
      id: 'transform',
      label: 'Transform',
    });

    context.registerCommand({
      id: TRANSFORM_ROTATE_COMMAND,
      execute: (payload: RotateCommandPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const degrees = payload?.degrees ?? increment;
        return {
          document: rotateDocument(ctx.document, degrees),
          label: `Rotate ${degrees}°`,
        };
      },
    });

    context.registerCommand({
      id: TRANSFORM_SET_ROTATION_COMMAND,
      execute: (payload: SetRotationPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const previous = ctx.document.transform.rotationDegrees;
        const degrees = normalizeDegrees(payload.degrees);
        const orientationChanged = isRotatedSwap(previous) !== isRotatedSwap(degrees);
        const previousOutput = ctx.document.output;
        const nextOutput = orientationChanged
          ? { width: previousOutput.height, height: previousOutput.width }
          : previousOutput;
        const designImage = orientationChanged
          ? remapDesignImageForOrientationSwap(
              resolveDesignImage(ctx.document),
              previousOutput,
              nextOutput,
            )
          : resolveDesignImage(ctx.document);
        return {
          document: {
            ...ctx.document,
            transform: {
              ...ctx.document.transform,
              rotationDegrees: degrees,
            },
            designImage,
            output: nextOutput,
          },
          label: `Rotate to ${degrees}°`,
        };
      },
    });

    context.registerCommand({
      id: TRANSFORM_FLIP_H_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: flipDocument(ctx.document, 'horizontal'),
        label: 'Flip horizontal',
      }),
    });

    context.registerCommand({
      id: TRANSFORM_FLIP_V_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: flipDocument(ctx.document, 'vertical'),
        label: 'Flip vertical',
      }),
    });

    context.registerCommand({
      id: TRANSFORM_RESIZE_COMMAND,
      execute: (payload: ResizeCommandPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = resizeDocument(ctx.document, payload);
        return {
          document: next,
          label: `Resize ${next.output.width}×${next.output.height}`,
        };
      },
    });

    context.registerCommand({
      id: TRANSFORM_SET_DESIGN_IMAGE_COMMAND,
      execute: (payload: SetDesignImagePayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = setDesignImage(ctx.document, payload.designImage);
        return {
          document: next,
          label: 'Move image',
        };
      },
    });

    context.registerCommand({
      id: TRANSFORM_SET_DESIGN_IMAGE_LOCK_COMMAND,
      execute: (
        payload: SetDesignImageLockPayload,
        ctx: EditorCommandContext,
      ): EditorCommandResult => {
        const next = setDesignImageLock(ctx.document, payload.locked);
        return {
          document: next,
          label: payload.locked ? 'Lock image' : 'Unlock image',
        };
      },
    });

    context.registerToolbarAction({
      id: 'transform.rotate-tool',
      label: 'Rotate',
      icon: 'rotate',
      position: 20,
    });
    context.registerToolbarAction({
      id: 'transform.resize-tool',
      label: 'Resize',
      icon: 'resize',
      position: 30,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'transform.rotate': 'Rotate',
        'transform.flipH': 'Flip H',
        'transform.flipV': 'Flip V',
        'transform.resize': 'Resize',
        'transform.done': 'Done',
        'transform.lockImage': 'Lock image',
        'transform.unlockImage': 'Unlock image',
        'transform.imageLocked': 'Image locked',
        'transform.imageUnlocked': 'Image unlocked',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'transform.rotate': 'تدوير',
        'transform.flipH': 'قلب أفقي',
        'transform.flipV': 'قلب عمودي',
        'transform.resize': 'تغيير الحجم',
        'transform.done': 'تم',
        'transform.lockImage': 'قفل الصورة',
        'transform.unlockImage': 'فتح قفل الصورة',
        'transform.imageLocked': 'الصورة مقفلة',
        'transform.imageUnlocked': 'الصورة غير مقفلة',
      },
    });
  }
}

export function rotateDocument(
  document: ReadonlyImageDocument,
  degrees: number,
): ReadonlyImageDocument {
  const previous = document.transform.rotationDegrees;
  const next = normalizeDegrees(previous + degrees);
  const orientationChanged = isRotatedSwap(previous) !== isRotatedSwap(next);
  const previousOutput = document.output;
  const nextOutput = orientationChanged
    ? { width: previousOutput.height, height: previousOutput.width }
    : previousOutput;
  const designImage = orientationChanged
    ? remapDesignImageForOrientationSwap(
        resolveDesignImage(document),
        previousOutput,
        nextOutput,
      )
    : resolveDesignImage(document);
  return {
    ...document,
    transform: {
      ...document.transform,
      rotationDegrees: next,
    },
    designImage,
    output: nextOutput,
  };
}

function isRotatedSwap(degrees: number): boolean {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized === 90 || normalized === 270;
}

export function flipDocument(
  document: ReadonlyImageDocument,
  axis: 'horizontal' | 'vertical',
): ReadonlyImageDocument {
  return {
    ...document,
    transform: {
      ...document.transform,
      flipX: axis === 'horizontal' ? !document.transform.flipX : document.transform.flipX,
      flipY: axis === 'vertical' ? !document.transform.flipY : document.transform.flipY,
    },
  };
}

export function resizeDocument(
  document: ReadonlyImageDocument,
  payload: ResizeCommandPayload,
): ReadonlyImageDocument {
  let width = Math.max(1, Math.round(payload.width));
  let height = Math.max(1, Math.round(payload.height));

  if (payload.lockAspectRatio) {
    const current = document.output;
    const ratio = current.width / Math.max(current.height, 1);
    const widthChanged = width !== current.width;
    const heightChanged = height !== current.height;

    if (widthChanged && !heightChanged) {
      height = Math.max(1, Math.round(width / ratio));
    } else if (heightChanged && !widthChanged) {
      width = Math.max(1, Math.round(height * ratio));
    } else if (widthChanged && heightChanged) {
      // Both edited: keep width, derive height from locked ratio.
      height = Math.max(1, Math.round(width / ratio));
    }
  }

  const nextOutput = { width, height };
  return {
    ...document,
    designImage: remapDesignImageForOutput(
      resolveDesignImage(document),
      document.output,
      nextOutput,
    ),
    output: nextOutput,
  };
}

export function setDesignImage(
  document: ReadonlyImageDocument,
  partial: Partial<DesignImageState>,
): ReadonlyImageDocument {
  return {
    ...document,
    designImage: normalizeDesignImage(
      { ...resolveDesignImage(document), ...partial },
      document.output,
    ),
  };
}

export function setDesignImageLock(
  document: ReadonlyImageDocument,
  locked: boolean,
): ReadonlyImageDocument {
  return setDesignImage(document, { locked });
}

export function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}
