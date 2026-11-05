import type {
  EditorCommandContext,
  EditorCommandResult,
  FramePluginConfig,
  FrameState,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ImageOverlayGalleryItem,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import { frameEqual, isIdentityFrame, normalizeFrame } from 'fluxio-image-editor/core';

export const FRAME_SET_COMMAND = 'frame.set';
export const FRAME_RESET_COMMAND = 'frame.reset';

export interface FrameSetPayload {
  readonly frame: Partial<FrameState>;
}

export type FramePluginOptions = Partial<FramePluginConfig>;

const FRAME_STYLE_NAMES: Readonly<Record<FrameState['style'], string>> = {
  none: 'None',
  solid: 'Solid',
  double: 'Double',
  rounded: 'Rounded',
  gradient: 'Gradient',
  polaroid: 'Polaroid',
  film: 'Film',
  image: 'Image',
};

export class FramePlugin implements ImageEditorPlugin {
  readonly id = 'frame';
  private readonly gallery: readonly ImageOverlayGalleryItem[];

  constructor(options: FramePluginOptions = {}) {
    this.gallery = options.gallery ?? [];
  }

  getGallery(): readonly ImageOverlayGalleryItem[] {
    return this.gallery;
  }

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'frame',
      label: 'Frame',
    });

    context.registerCommand({
      id: FRAME_SET_COMMAND,
      execute: (payload: FrameSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyFrame(ctx.document, payload?.frame);
        return {
          document: next,
          label: isIdentityFrame(next.frame)
            ? 'Clear frame'
            : `Frame: ${FRAME_STYLE_NAMES[next.frame.style] ?? next.frame.style}`,
        };
      },
    });

    context.registerCommand({
      id: FRAME_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyFrame(ctx.document, null),
        label: 'Clear frame',
      }),
    });

    context.registerToolbarAction({
      id: 'frame.tool',
      label: 'Frame',
      icon: 'frame',
      position: 100,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'frame.tool': 'Frame',
        'frame.apply': 'Apply',
        'frame.cancel': 'Cancel',
        'frame.reset': 'Clear',
        'frame.style': 'Style',
        'frame.none': 'None',
        'frame.solid': 'Solid',
        'frame.double': 'Double',
        'frame.rounded': 'Rounded',
        'frame.gradient': 'Gradient',
        'frame.polaroid': 'Polaroid',
        'frame.film': 'Film',
        'frame.image': 'Image',
        'frame.gallery': 'Gallery',
        'frame.thickness': 'Thickness',
        'frame.opacity': 'Opacity',
        'frame.cornerRadius': 'Corners',
        'frame.color': 'Color',
        'frame.color2': 'Accent',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'frame.tool': 'إطار',
        'frame.apply': 'تطبيق',
        'frame.cancel': 'إلغاء',
        'frame.reset': 'مسح',
        'frame.style': 'النمط',
        'frame.none': 'بدون',
        'frame.solid': 'صلب',
        'frame.double': 'مزدوج',
        'frame.rounded': 'مستدير',
        'frame.gradient': 'تدرج',
        'frame.polaroid': 'بولارويد',
        'frame.film': 'فيلم',
        'frame.image': 'صورة',
        'frame.gallery': 'المعرض',
        'frame.thickness': 'السماكة',
        'frame.opacity': 'الشفافية',
        'frame.cornerRadius': 'الزوايا',
        'frame.color': 'اللون',
        'frame.color2': 'لون ثانٍ',
      },
    });
  }
}

export function applyFrame(
  document: ReadonlyImageDocument,
  partial: Partial<FrameState> | null | undefined,
): ReadonlyImageDocument {
  const frame = normalizeFrame(partial);
  if (frameEqual(document.frame, frame)) {
    return document;
  }
  return {
    ...document,
    frame,
  };
}
