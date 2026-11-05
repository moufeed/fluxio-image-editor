import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
  TextAnnotation,
} from 'fluxio-image-editor/core';
import {
  annotationsEqual,
  isTextAnnotation,
  normalizeTextAnnotation,
  registerAnnotationCommands,
  registerAnnotationsToolbarAction,
  withTextAnnotations,
} from 'fluxio-image-editor/core';

export const TEXT_SET_COMMAND = 'text.set';
export const TEXT_RESET_COMMAND = 'text.reset';

export interface TextSetPayload {
  readonly texts: readonly TextAnnotation[];
}

export class TextPlugin implements ImageEditorPlugin {
  readonly id = 'text';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'text',
      label: 'Text',
    });

    registerAnnotationCommands(context, {
      setCommandId: TEXT_SET_COMMAND,
      resetCommandId: TEXT_RESET_COMMAND,
      kindLabel: 'Text',
      itemLabel: 'text',
      payloadKey: 'texts',
      extractItems: (payload) => (payload as TextSetPayload)?.texts ?? [],
      applyToDocument: applyTextAnnotations,
      isKind: isTextAnnotation,
    });

    registerAnnotationsToolbarAction(context, {
      id: 'text.tool',
      label: 'Text',
      icon: 'text',
      position: 120,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'text.empty': 'Click the canvas to place text, or use Add text',
        'text.content': 'Content',
        'text.fontSize': 'Size',
        'text.fontFamily': 'Font',
        'text.lineHeight': 'Line height',
        'text.style': 'Style',
        'text.bold': 'Bold',
        'text.italic': 'Italic',
        'text.underline': 'Underline',
        'text.strikethrough': 'Strikethrough',
        'text.align': 'Alignment',
        'text.align.left': 'Align left',
        'text.align.center': 'Align center',
        'text.align.right': 'Align right',
        'text.background': 'Background',
        'text.padding': 'Padding',
        'text.fill': 'Color',
        'text.delete': 'Delete',
        'text.add': 'Add text',
        'text.done': 'Done',
        'text.apply': 'Apply',
        'text.cancel': 'Cancel',
        'text.reset': 'Reset',
        'text.tool': 'Text',
        'toolbar.annotations': 'Annotate',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'text.tool': 'نص',
        'toolbar.annotations': 'تعليق',
        'text.done': 'تم',
        'text.apply': 'تطبيق',
        'text.cancel': 'إلغاء',
        'text.reset': 'إعادة تعيين',
        'text.add': 'إضافة نص',
        'text.content': 'المحتوى',
        'text.fontSize': 'الحجم',
        'text.fontFamily': 'الخط',
        'text.lineHeight': 'ارتفاع السطر',
        'text.style': 'النمط',
        'text.bold': 'عريض',
        'text.italic': 'مائل',
        'text.underline': 'تسطير',
        'text.strikethrough': 'يتوسطه خط',
        'text.align': 'المحاذاة',
        'text.align.left': 'محاذاة لليسار',
        'text.align.center': 'توسيط',
        'text.align.right': 'محاذاة لليمين',
        'text.background': 'الخلفية',
        'text.padding': 'التباعد',
        'text.fill': 'اللون',
        'text.delete': 'حذف',
        'text.empty': 'لا توجد تعليقات نصية — انقر على اللوحة للوضع',
      },
    });
  }
}

export function applyTextAnnotations(
  document: ReadonlyImageDocument,
  texts: readonly TextAnnotation[],
): ReadonlyImageDocument {
  const normalized = texts.map((item) => normalizeTextAnnotation(item));
  const next = withTextAnnotations(document, normalized);
  if (annotationsEqual(document.annotations, next.annotations)) {
    return document;
  }
  return next;
}
