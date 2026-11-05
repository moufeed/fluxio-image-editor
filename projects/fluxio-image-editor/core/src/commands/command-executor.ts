import type {
  EditorCommandContext,
  EditorCommandHandler,
  ExecuteCommandOptions,
  HistoryEntry,
} from './command';
import { BoundedHistory } from './history';
import type { ReadonlyImageDocument } from '../models/image-document';

export class CommandExecutor {
  private readonly handlers = new Map<string, EditorCommandHandler>();
  private readonly history: BoundedHistory;
  private sequence = 0;
  private activeCoalesceKey: string | null = null;

  constructor(historyLimit = 50) {
    this.history = new BoundedHistory(historyLimit);
  }

  register(handler: EditorCommandHandler): void {
    this.handlers.set(handler.id, handler);
  }

  unregister(commandId: string): void {
    this.handlers.delete(commandId);
  }

  execute<TPayload>(
    commandId: string,
    payload: TPayload,
    document: ReadonlyImageDocument,
    generationBefore = 0,
    options?: ExecuteCommandOptions,
  ): { document: ReadonlyImageDocument; entry: HistoryEntry | null } {
    const handler = this.handlers.get(commandId) as EditorCommandHandler<TPayload> | undefined;
    if (!handler) {
      throw new Error(`Unknown command: ${commandId}`);
    }

    const context: EditorCommandContext = { document };
    const result = handler.execute(payload, context);

    // No-op commands (e.g. click/select with unchanged annotations) must not
    // inflate the undo stack or history-snapshots timeline.
    if (result.document === document) {
      return { document, entry: null };
    }

    const compact = !!result.inversePayload;
    const coalesceKey = options?.coalesceKey;
    const merged = coalesceKey
      ? this.mergeIntoActiveRun(coalesceKey, commandId, payload, result, compact, generationBefore)
      : null;
    if (merged) {
      return { document: result.document, entry: merged };
    }
    this.activeCoalesceKey = coalesceKey ?? null;

    const entry: HistoryEntry = {
      id: `hist-${++this.sequence}`,
      commandId,
      label: result.label,
      before: compact ? null : document,
      after: compact ? null : result.document,
      inverse: result.inversePayload,
      forward: compact ? { commandId, payload } : undefined,
      generationBefore,
      generationAfter: generationBefore + 1,
      timestamp: Date.now(),
      coalesceKey,
    };
    this.history.push(entry);
    return { document: result.document, entry };
  }

  /**
   * End the current coalesced run so the next command starts a fresh entry.
   * Call when a continuous interaction finishes (pointer up, blur, change).
   */
  sealCoalescing(): void {
    this.activeCoalesceKey = null;
  }

  /**
   * Fold a continuing run into the newest entry: undo data stays at the run
   * start, redo data tracks the latest value.
   */
  private mergeIntoActiveRun(
    coalesceKey: string,
    commandId: string,
    payload: unknown,
    result: { document: ReadonlyImageDocument; label: string },
    compact: boolean,
    generationBefore: number,
  ): HistoryEntry | null {
    if (this.activeCoalesceKey !== coalesceKey) {
      return null;
    }
    const top = this.history.peek();
    if (!top || top.coalesceKey !== coalesceKey || top.commandId !== commandId) {
      return null;
    }
    if (!!top.inverse !== compact) {
      return null;
    }
    const merged: HistoryEntry = {
      ...top,
      label: result.label,
      after: compact ? null : result.document,
      forward: compact ? { commandId, payload } : undefined,
      generationAfter: generationBefore + 1,
      timestamp: Date.now(),
    };
    return this.history.replaceTop(merged) ? merged : null;
  }

  /**
   * Execute a command without recording a history entry.
   * Used internally by undo/redo to replay inverse/forward descriptors.
   */
  executeNoHistory<TPayload>(
    commandId: string,
    payload: TPayload,
    document: ReadonlyImageDocument,
  ): { document: ReadonlyImageDocument; label: string } {
    const handler = this.handlers.get(commandId) as EditorCommandHandler<TPayload> | undefined;
    if (!handler) {
      throw new Error(`Unknown command: ${commandId}`);
    }
    const context: EditorCommandContext = { document };
    const result = handler.execute(payload, context);
    return { document: result.document, label: result.label };
  }

  undo(): HistoryEntry | null {
    this.sealCoalescing();
    return this.history.undo();
  }

  redo(): HistoryEntry | null {
    this.sealCoalescing();
    return this.history.redo();
  }

  clearHistory(): void {
    this.sealCoalescing();
    this.history.clear();
  }

  getHistorySnapshot() {
    return this.history.snapshot();
  }
}
