import type { Annotation, ReadonlyImageDocument } from '../models/image-document';
import type {
  EditorCommandContext,
  EditorCommandResult,
} from '../commands/command';
import { describeAnnotationChange } from '../commands/annotation-change-label';
import type { ImageEditorPluginContext } from './plugin';

export interface AnnotationCommandConfig<T extends Annotation> {
  /** e.g. 'text.set' */
  readonly setCommandId: string;
  /** e.g. 'text.reset' */
  readonly resetCommandId: string;
  /** Human-readable kind label, e.g. 'Text' */
  readonly kindLabel: string;
  /** Singular noun for one item used in history labels, e.g. 'stroke' → "Add stroke". */
  readonly itemLabel?: string;
  /** Key used in the set-command payload object (e.g. 'texts', 'shapes'). */
  readonly payloadKey: string;
  /** Extract the annotation array from the set-command payload */
  readonly extractItems: (payload: unknown) => readonly T[];
  /** Apply normalized items to the document */
  readonly applyToDocument: (
    document: ReadonlyImageDocument,
    items: readonly T[],
  ) => ReadonlyImageDocument;
  /** Type guard to count / snapshot annotations of this kind */
  readonly isKind: (annotation: Annotation) => annotation is T;
}

/**
 * Register a standard set/reset command pair for an annotation plugin.
 * Both commands return `inversePayload` so history can store compact
 * forward/inverse descriptors instead of full document snapshots.
 */
export function registerAnnotationCommands<T extends Annotation>(
  context: ImageEditorPluginContext,
  config: AnnotationCommandConfig<T>,
): void {
  const snapshotPayload = (document: ReadonlyImageDocument): Record<string, readonly T[]> => ({
    [config.payloadKey]: document.annotations.filter(config.isKind),
  });
  const changeLabels = { kind: config.kindLabel, item: config.itemLabel };

  context.registerCommand({
    id: config.setCommandId,
    execute: (payload: unknown, ctx: EditorCommandContext): EditorCommandResult => {
      const items = config.extractItems(payload);
      const previous = snapshotPayload(ctx.document);
      const next = config.applyToDocument(ctx.document, items);
      const label = describeAnnotationChange(
        previous[config.payloadKey],
        next.annotations.filter(config.isKind),
        changeLabels,
      );
      if (next === ctx.document) {
        return { document: next, label };
      }
      return {
        document: next,
        label,
        inversePayload: {
          commandId: config.setCommandId,
          payload: previous,
        },
      };
    },
  });

  context.registerCommand({
    id: config.resetCommandId,
    execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => {
      const previous = snapshotPayload(ctx.document);
      const next = config.applyToDocument(ctx.document, []);
      const label = `Clear ${config.kindLabel.toLowerCase()}`;
      if (next === ctx.document) {
        return { document: next, label };
      }
      return {
        document: next,
        label,
        inversePayload: {
          commandId: config.setCommandId,
          payload: previous,
        },
      };
    },
  });
}
