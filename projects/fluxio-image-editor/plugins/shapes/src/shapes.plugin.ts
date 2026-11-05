import type {
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
  ShapeAnnotation,
} from 'fluxio-image-editor/core';
import {
  annotationsEqual,
  isShapeAnnotation,
  normalizeShapeAnnotation,
  registerAnnotationCommands,
  registerAnnotationsToolbarAction,
  withShapeAnnotations,
} from 'fluxio-image-editor/core';

export const SHAPES_SET_COMMAND = 'shapes.set';
export const SHAPES_RESET_COMMAND = 'shapes.reset';

export interface ShapesSetPayload {
  readonly shapes: readonly ShapeAnnotation[];
}

export class ShapesPlugin implements ImageEditorPlugin {
  readonly id = 'shapes';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'shapes',
      label: 'Shapes',
    });

    registerAnnotationCommands(context, {
      setCommandId: SHAPES_SET_COMMAND,
      resetCommandId: SHAPES_RESET_COMMAND,
      kindLabel: 'Shapes',
      itemLabel: 'shape',
      payloadKey: 'shapes',
      extractItems: (payload) => (payload as ShapesSetPayload)?.shapes ?? [],
      applyToDocument: applyShapeAnnotations,
      isKind: isShapeAnnotation,
    });

    registerAnnotationsToolbarAction(context, {
      id: 'shapes.tool',
      label: 'Shapes',
      icon: 'shapes',
      position: 121,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'shapes.tool': 'Shapes',
        'shapes.done': 'Done',
        'shapes.apply': 'Apply',
        'shapes.cancel': 'Cancel',
        'shapes.reset': 'Reset',
        'shapes.add': 'Add shape',
        'shapes.kind': 'Shape',
        'shapes.stroke': 'Stroke',
        'shapes.fill': 'Fill',
        'shapes.strokeWidth': 'Width',
        'shapes.delete': 'Delete',
        'shapes.empty': 'Click to deselect. Click and drag to draw.',
        'shapes.rect': 'Rectangle',
        'shapes.ellipse': 'Ellipse',
        'shapes.polygon': 'Polygon',
        'shapes.sides': 'Sides',
        'shapes.line': 'Line',
        'shapes.arrow': 'Arrow',
        'shapes.lineStart': 'Start',
        'shapes.lineEnd': 'End',
        'shapes.lineEnd.none': 'None',
        'shapes.lineEnd.bar': 'Bar',
        'shapes.lineEnd.arrow': 'Arrow',
        'shapes.lineEnd.arrowSolid': 'Solid arrow',
        'shapes.lineEnd.circle': 'Circle',
        'shapes.lineEnd.circleSolid': 'Solid circle',
        'shapes.lineEnd.square': 'Square',
        'shapes.lineEnd.squareSolid': 'Solid square',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'shapes.tool': 'أشكال',
        'shapes.done': 'تم',
        'shapes.apply': 'تطبيق',
        'shapes.cancel': 'إلغاء',
        'shapes.reset': 'إعادة تعيين',
        'shapes.add': 'إضافة شكل',
        'shapes.kind': 'الشكل',
        'shapes.stroke': 'الحد',
        'shapes.fill': 'التعبئة',
        'shapes.strokeWidth': 'السُمك',
        'shapes.delete': 'حذف',
        'shapes.empty': 'انقر لإلغاء التحديد. اسحب للرسم',
        'shapes.rect': 'مستطيل',
        'shapes.ellipse': 'قطع ناقص',
        'shapes.polygon': 'مضلع',
        'shapes.sides': 'الأضلاع',
        'shapes.line': 'خط',
        'shapes.arrow': 'سهم',
        'shapes.lineStart': 'البداية',
        'shapes.lineEnd': 'النهاية',
        'shapes.lineEnd.none': 'بدون',
        'shapes.lineEnd.bar': 'شريط',
        'shapes.lineEnd.arrow': 'سهم',
        'shapes.lineEnd.arrowSolid': 'سهم ممتلئ',
        'shapes.lineEnd.circle': 'دائرة',
        'shapes.lineEnd.circleSolid': 'دائرة ممتلئة',
        'shapes.lineEnd.square': 'مربع',
        'shapes.lineEnd.squareSolid': 'مربع ممتلئ',
      },
    });
  }
}

export function applyShapeAnnotations(
  document: ReadonlyImageDocument,
  shapes: readonly ShapeAnnotation[],
): ReadonlyImageDocument {
  const normalized = shapes.map((item) => normalizeShapeAnnotation(item));
  const next = withShapeAnnotations(document, normalized);
  if (annotationsEqual(document.annotations, next.annotations)) {
    return document;
  }
  return next;
}
