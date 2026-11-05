import type { EditorCommandContext, EditorCommandHandler, EditorCommandResult } from './command';
import { describeAnnotationChange } from './annotation-change-label';
import {
  annotationsEqual,
  normalizeAnnotations,
  withAnnotations,
  type Annotation,
  type ReadonlyImageDocument,
} from '../models/image-document';

/** Set the full annotation stack (global z-order across kinds). */
export const ANNOTATIONS_SET_COMMAND = 'annotations.set';

export interface AnnotationsSetPayload {
  readonly annotations: readonly Annotation[];
  /** Optional history label (e.g. Bring forward). */
  readonly label?: string;
}

export function createAnnotationsSetCommand(): EditorCommandHandler<AnnotationsSetPayload> {
  return {
    id: ANNOTATIONS_SET_COMMAND,
    execute: (payload: AnnotationsSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
      const annotations = normalizeAnnotations(payload?.annotations ?? []);
      const next: ReadonlyImageDocument = withAnnotations(ctx.document, annotations);
      const label =
        payload?.label ?? describeAnnotationChange(ctx.document.annotations, next.annotations);
      if (annotationsEqual(ctx.document.annotations, next.annotations)) {
        return {
          document: ctx.document,
          label,
        };
      }
      return {
        document: next,
        label,
        inversePayload: {
          commandId: ANNOTATIONS_SET_COMMAND,
          payload: { annotations: ctx.document.annotations },
        },
      };
    },
  };
}
