import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  PathAnnotation,
  ReadonlyImageDocument,
} from 'fluxio-image-editor/core';
import {
  annotationsEqual,
  isPathAnnotation,
  normalizePathAnnotation,
  registerAnnotationCommands,
  registerAnnotationsToolbarAction,
  withPathAnnotations,
} from 'fluxio-image-editor/core';

export const DRAWING_SET_COMMAND = 'drawing.set';
export const DRAWING_RESET_COMMAND = 'drawing.reset';

export interface DrawingSetPayload {
  readonly paths: readonly PathAnnotation[];
}

export class DrawingPlugin implements ImageEditorPlugin {
  readonly id = 'drawing';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'drawing',
      label: 'Draw',
    });

    registerAnnotationCommands(context, {
      setCommandId: DRAWING_SET_COMMAND,
      resetCommandId: DRAWING_RESET_COMMAND,
      kindLabel: 'Drawing',
      itemLabel: 'stroke',
      payloadKey: 'paths',
      extractItems: (payload) => (payload as DrawingSetPayload)?.paths ?? [],
      applyToDocument: applyPathAnnotations,
      isKind: isPathAnnotation,
    });

    registerAnnotationsToolbarAction(context, {
      id: 'drawing.tool',
      label: 'Draw',
      icon: 'drawing',
      position: 122,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'drawing.tool': 'Draw',
        'drawing.apply': 'Done',
        'drawing.done': 'Done',
        'drawing.clear': 'Clear drawing',
        'drawing.cancel': 'Cancel',
        'drawing.reset': 'Reset',
        'drawing.stroke': 'Color',
        'drawing.strokeWidth': 'Width',
        'drawing.delete': 'Delete stroke',
        'drawing.strokeItem': 'Stroke {n}',
        'drawing.empty': 'Draw freely on the image — each stroke is saved; Done exits',
        'drawing.hint':
          'Drag empty canvas to freehand-draw. Click a stroke to select, move, resize, or rotate it.',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'drawing.tool': 'رسم',
        'drawing.apply': 'تم',
        'drawing.done': 'تم',
        'drawing.clear': 'مسح الرسم',
        'drawing.cancel': 'إلغاء',
        'drawing.reset': 'إعادة تعيين',
        'drawing.stroke': 'اللون',
        'drawing.strokeWidth': 'السُمك',
        'drawing.delete': 'حذف الخط',
        'drawing.strokeItem': 'خط {n}',
        'drawing.empty': 'ارسم بحرية على الصورة — كل خط يُحفظ؛ تم للخروج',
        'drawing.hint':
          'اسحب على مساحة فارغة للرسم الحر. انقر خطاً لتحديده ونقله وتغيير حجمه أو تدويره.',
      },
    });
  }
}

export function applyPathAnnotations(
  document: ReadonlyImageDocument,
  paths: readonly PathAnnotation[],
): ReadonlyImageDocument {
  const normalized = paths.map((item) => normalizePathAnnotation(item));
  const next = withPathAnnotations(document, normalized);
  if (annotationsEqual(document.annotations, next.annotations)) {
    return document;
  }
  return next;
}
