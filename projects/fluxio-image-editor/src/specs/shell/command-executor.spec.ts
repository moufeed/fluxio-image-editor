import {
  CommandExecutor,
  createAnnotationId,
  createImageDocument,
  isTextAnnotation,
  normalizeTextAnnotation,
  type TextAnnotation,
} from 'fluxio-image-editor/core';
import {
  resizeDocument,
  rotateDocument,
  TRANSFORM_RESIZE_COMMAND,
  TRANSFORM_ROTATE_COMMAND,
  type ResizeCommandPayload,
} from 'fluxio-image-editor/plugins/transform';
import {
  applyTextAnnotations,
  TEXT_SET_COMMAND,
  type TextSetPayload,
} from 'fluxio-image-editor/plugins/text';

describe('CommandExecutor history', () => {
  it('records one history entry for rotate and supports undo/redo', () => {
    const executor = new CommandExecutor();
    executor.register({
      id: TRANSFORM_ROTATE_COMMAND,
      execute: (payload: { degrees: number }, context) => ({
        document: rotateDocument(context.document, payload.degrees),
        label: `Rotate ${payload.degrees}°`,
      }),
    });

    const initial = createImageDocument({
      source: { kind: 'url', id: 'a', url: 'x' },
      sourceSize: { width: 100, height: 80 },
    });

    const rotated = executor.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 }, initial);
    expect(rotated.document.transform.rotationDegrees).toBe(90);
    expect(executor.getHistorySnapshot().canUndo).toBe(true);

    const undone = executor.undo();
    expect(undone?.before?.transform.rotationDegrees).toBe(0);
    expect(undone?.inverse).toBeUndefined();

    const redone = executor.redo();
    expect(redone?.after?.transform.rotationDegrees).toBe(90);
  });

  it('stores compact inverse/forward entries when inversePayload is provided', () => {
    const executor = new CommandExecutor();
    executor.register({
      id: TEXT_SET_COMMAND,
      execute: (payload: TextSetPayload, ctx) => {
        const previous = ctx.document.annotations.filter(isTextAnnotation);
        const next = applyTextAnnotations(ctx.document, payload?.texts ?? []);
        if (next === ctx.document) {
          return { document: next, label: 'Text' };
        }
        return {
          document: next,
          label: 'Text',
          inversePayload: {
            commandId: TEXT_SET_COMMAND,
            payload: { texts: previous },
          },
        };
      },
    });

    const initial = createImageDocument({
      source: { kind: 'url', id: 'a', url: 'x' },
      sourceSize: { width: 100, height: 80 },
    });

    const text: TextAnnotation = normalizeTextAnnotation({
      id: createAnnotationId(),
      text: 'Hello',
      x: 10,
      y: 20,
    });
    expect(text.underline).toBe(false);
    expect(text.linethrough).toBe(false);

    const decorated = normalizeTextAnnotation({
      ...text,
      underline: true,
      linethrough: true,
    });
    expect(decorated.underline).toBe(true);
    expect(decorated.linethrough).toBe(true);

    const result = executor.execute(TEXT_SET_COMMAND, { texts: [text] }, initial);
    expect(result.document.annotations.filter(isTextAnnotation)).toHaveLength(1);
    expect(result.entry).not.toBeNull();
    expect(result.entry!.before).toBeNull();
    expect(result.entry!.after).toBeNull();
    expect(result.entry!.inverse?.commandId).toBe(TEXT_SET_COMMAND);
    expect(result.entry!.forward?.commandId).toBe(TEXT_SET_COMMAND);
    expect((result.entry!.inverse?.payload as TextSetPayload).texts).toHaveLength(0);

    const undone = executor.undo();
    expect(undone?.inverse).toBeDefined();
    const restored = executor.executeNoHistory(
      undone!.inverse!.commandId,
      undone!.inverse!.payload,
      result.document,
    );
    expect(restored.document.annotations.filter(isTextAnnotation)).toHaveLength(0);

    const redone = executor.redo();
    const reapplied = executor.executeNoHistory(
      redone!.forward!.commandId,
      redone!.forward!.payload,
      restored.document,
    );
    expect(reapplied.document.annotations.filter(isTextAnnotation)).toHaveLength(1);
  });

  it('does not record history when the command is a no-op', () => {
    const executor = new CommandExecutor();
    executor.register({
      id: TEXT_SET_COMMAND,
      execute: (payload: TextSetPayload, ctx) => {
        const next = applyTextAnnotations(ctx.document, payload?.texts ?? []);
        if (next === ctx.document) {
          return { document: next, label: 'Text' };
        }
        return {
          document: next,
          label: 'Text',
          inversePayload: {
            commandId: TEXT_SET_COMMAND,
            payload: { texts: ctx.document.annotations.filter(isTextAnnotation) },
          },
        };
      },
    });

    const initial = createImageDocument({
      source: { kind: 'url', id: 'a', url: 'x' },
      sourceSize: { width: 100, height: 80 },
    });

    const noop = executor.execute(TEXT_SET_COMMAND, { texts: [] }, initial);
    expect(noop.document).toBe(initial);
    expect(noop.entry).toBeNull();
    expect(executor.getHistorySnapshot().past).toHaveLength(0);
    expect(executor.getHistorySnapshot().canUndo).toBe(false);
  });
});

describe('CommandExecutor coalescing', () => {
  const COALESCE_KEY = 'transform.resize';

  function createResizeExecutor(): CommandExecutor {
    const executor = new CommandExecutor();
    executor.register({
      id: TRANSFORM_RESIZE_COMMAND,
      execute: (payload: ResizeCommandPayload, ctx) => {
        const next = resizeDocument(ctx.document, payload);
        return { document: next, label: `Resize ${next.output.width}×${next.output.height}` };
      },
    });
    executor.register({
      id: TRANSFORM_ROTATE_COMMAND,
      execute: (payload: { degrees: number }, ctx) => ({
        document: rotateDocument(ctx.document, payload.degrees),
        label: `Rotate ${payload.degrees}°`,
      }),
    });
    return executor;
  }

  function createDocument() {
    return createImageDocument({
      source: { kind: 'url', id: 'a', url: 'x' },
      sourceSize: { width: 100, height: 80 },
    });
  }

  function resize(
    executor: CommandExecutor,
    document: ReturnType<typeof createDocument>,
    width: number,
    generation: number,
    coalesceKey?: string,
  ) {
    return executor.execute(
      TRANSFORM_RESIZE_COMMAND,
      { width, height: 80 },
      document,
      generation,
      coalesceKey ? { coalesceKey } : undefined,
    );
  }

  it('folds a continuous run into a single undo step', () => {
    const executor = createResizeExecutor();
    const initial = createDocument();

    const first = resize(executor, initial, 120, 0, COALESCE_KEY);
    const second = resize(executor, first.document, 160, 1, COALESCE_KEY);
    const third = resize(executor, second.document, 200, 2, COALESCE_KEY);

    const snapshot = executor.getHistorySnapshot();
    expect(snapshot.past).toHaveLength(1);
    expect(third.entry!.id).toBe(first.entry!.id);
    expect(third.entry!.before?.output.width).toBe(100);
    expect(third.entry!.after?.output.width).toBe(200);
    expect(third.entry!.generationBefore).toBe(0);
    expect(third.entry!.generationAfter).toBe(3);
    expect(third.entry!.label).toBe('Resize 200×80');

    const undone = executor.undo();
    expect(undone?.before?.output.width).toBe(100);
    expect(executor.getHistorySnapshot().canUndo).toBe(false);
  });

  it('starts a new entry after the run is sealed', () => {
    const executor = createResizeExecutor();
    const initial = createDocument();

    const first = resize(executor, initial, 120, 0, COALESCE_KEY);
    executor.sealCoalescing();
    const second = resize(executor, first.document, 160, 1, COALESCE_KEY);

    expect(executor.getHistorySnapshot().past).toHaveLength(2);
    expect(second.entry!.before?.output.width).toBe(120);
  });

  it('does not merge across a different command or without a key', () => {
    const executor = createResizeExecutor();
    const initial = createDocument();

    const first = resize(executor, initial, 120, 0, COALESCE_KEY);
    const rotated = executor.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 }, first.document, 1);
    const third = resize(executor, rotated.document, 160, 2, COALESCE_KEY);
    const fourth = resize(executor, third.document, 180, 3);

    expect(executor.getHistorySnapshot().past).toHaveLength(4);
    expect(fourth.entry!.coalesceKey).toBeUndefined();
  });
});
