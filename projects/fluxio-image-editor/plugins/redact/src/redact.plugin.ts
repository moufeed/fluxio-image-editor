import type {
  EditorCommandContext,
  EditorCommandResult,
  ImageEditorPlugin,
  ImageEditorPluginContext,
  ReadonlyImageDocument,
  RedactionRegion,
} from 'fluxio-image-editor/core';
import { isIdentityRedactions, normalizeRedactions, redactionsEqual } from 'fluxio-image-editor/core';

export const REDACTIONS_SET_COMMAND = 'redactions.set';
export const REDACTIONS_RESET_COMMAND = 'redactions.reset';
export const REDACT_TOOL_ACTION = 'redact.tool';

export interface RedactionsSetPayload {
  readonly redactions: readonly RedactionRegion[];
}

export class RedactPlugin implements ImageEditorPlugin {
  readonly id = 'redact';

  setup(context: ImageEditorPluginContext): void {
    context.registerTool({
      id: 'redact',
      label: 'Redact',
    });

    context.registerCommand({
      id: REDACTIONS_SET_COMMAND,
      execute: (payload: RedactionsSetPayload, ctx: EditorCommandContext): EditorCommandResult => {
        const next = applyRedactions(ctx.document, payload?.redactions);
        const count = next.redactions.length;
        return {
          document: next,
          label:
            count === 0
              ? 'Clear redactions'
              : count === 1
                ? 'Redact region'
                : `Redact ${count} regions`,
        };
      },
    });

    context.registerCommand({
      id: REDACTIONS_RESET_COMMAND,
      execute: (_payload: unknown, ctx: EditorCommandContext): EditorCommandResult => ({
        document: applyRedactions(ctx.document, []),
        label: 'Clear redactions',
      }),
    });

    context.registerToolbarAction({
      id: REDACT_TOOL_ACTION,
      label: 'Redact',
      icon: 'redact',
      position: 65,
    });

    context.registerLocale({
      locale: 'en',
      messages: {
        'redact.tool': 'Redact',
        'redact.apply': 'Apply',
        'redact.cancel': 'Cancel',
        'redact.reset': 'Clear all',
        'redact.empty': 'Drag on the image to add a region, then drag it or its corners to adjust.',
        'redact.delete': 'Remove',
        'redact.regions': 'Regions',
        'redact.region': 'Region',
      },
    });
    context.registerLocale({
      locale: 'ar',
      messages: {
        'redact.tool': 'تنقيح',
        'redact.apply': 'تطبيق',
        'redact.cancel': 'إلغاء',
        'redact.reset': 'مسح الكل',
        'redact.empty': 'اسحب على الصورة لإضافة منطقة، ثم اسحبها أو اسحب زواياها لتعديلها.',
        'redact.delete': 'إزالة',
        'redact.regions': 'المناطق',
        'redact.region': 'منطقة',
      },
    });
  }
}

export function applyRedactions(
  document: ReadonlyImageDocument,
  regions: readonly RedactionRegion[] | null | undefined,
): ReadonlyImageDocument {
  const redactions = normalizeRedactions(regions);
  if (redactionsEqual(document.redactions, redactions)) {
    return document;
  }
  return { ...document, redactions };
}

export function hasRedactions(document: ReadonlyImageDocument): boolean {
  return !isIdentityRedactions(document.redactions);
}
