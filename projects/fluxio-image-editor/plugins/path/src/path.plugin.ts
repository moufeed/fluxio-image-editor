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

export const PATH_SET_COMMAND = 'path.set';
export const PATH_RESET_COMMAND = 'path.reset';

export interface PathSetPayload {
  readonly paths: readonly PathAnnotation[];
}

/**
 * Click-to-place polyline path tool (Pintura / Photoshop Pen-style).
 * Shares `kind: 'path'` annotations with freehand Draw; interaction is click vertices.
 */
export class PathPlugin implements ImageEditorPlugin {
  readonly id = 'path';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'path',
      label: 'Path',
    });

    registerAnnotationCommands(context, {
      setCommandId: PATH_SET_COMMAND,
      resetCommandId: PATH_RESET_COMMAND,
      kindLabel: 'Path',
      itemLabel: 'path',
      payloadKey: 'paths',
      extractItems: (payload) => (payload as PathSetPayload)?.paths ?? [],
      applyToDocument: applyPathToolAnnotations,
      isKind: isPathAnnotation,
    });

    registerAnnotationsToolbarAction(context, {
      id: 'path.tool',
      label: 'Path',
      icon: 'path',
      position: 123,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'path.tool': 'Path',
        'path.apply': 'Done',
        'path.done': 'Done',
        'path.clear': 'Clear paths',
        'path.cancel': 'Cancel',
        'path.reset': 'Reset',
        'path.stroke': 'Color',
        'path.strokeWidth': 'Width',
        'path.delete': 'Delete path',
        'path.pathItem': 'Path {n}',
        'path.pathItemClosed': 'Path {n} (closed)',
        'path.finish': 'Finish path',
        'path.close': 'Close path',
        'path.empty':
          'Click to place points. Double-click or Finish to end. Click near the first point to close.',
        'path.hint':
          'Click empty canvas to add vertices. Double-click finishes. Drag a path to move or resize it.',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'path.tool': 'مسار',
        'path.apply': 'تم',
        'path.done': 'تم',
        'path.clear': 'مسح المسارات',
        'path.cancel': 'إلغاء',
        'path.reset': 'إعادة تعيين',
        'path.stroke': 'اللون',
        'path.strokeWidth': 'السُمك',
        'path.delete': 'حذف المسار',
        'path.pathItem': 'مسار {n}',
        'path.pathItemClosed': 'مسار {n} (مغلق)',
        'path.finish': 'إنهاء المسار',
        'path.close': 'إغلاق المسار',
        'path.empty':
          'انقر لوضع نقاط. انقر مرتين أو إنهاء للإكمال. انقر قرب النقطة الأولى للإغلاق.',
        'path.hint':
          'انقر على مساحة فارغة لإضافة نقاط. النقر المزدوج يُنهي. اسحب مساراً لنقله أو تغيير حجمه.',
      },
    });
  }
}

export function applyPathToolAnnotations(
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
