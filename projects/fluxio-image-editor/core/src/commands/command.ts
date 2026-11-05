import type { ReadonlyImageDocument } from '../models/image-document';

export interface EditorCommandContext {
  readonly document: ReadonlyImageDocument;
}

/**
 * Optional inverse descriptor returned by a command handler.
 * When provided, the history stores only the forward/inverse descriptors
 * instead of full before/after document snapshots, saving significant memory.
 */
export interface CommandInverseDescriptor {
  readonly commandId: string;
  readonly payload: unknown;
}

export interface EditorCommandResult {
  readonly document: ReadonlyImageDocument;
  readonly label: string;
  /**
   * Optional: efficient undo descriptor. When provided, history avoids storing
   * full document snapshots. The command with this id + payload will be executed
   * to reverse the change during undo.
   */
  readonly inversePayload?: CommandInverseDescriptor;
}

export interface EditorCommandHandler<TPayload = unknown> {
  readonly id: string;
  execute(payload: TPayload, context: EditorCommandContext): EditorCommandResult;
}

export interface HistoryEntry {
  readonly id: string;
  readonly commandId: string;
  readonly label: string;
  /**
   * Full document snapshot before the command.
   * Null when `inverse` is provided (compact entry — replay inverse to undo).
   */
  readonly before: ReadonlyImageDocument | null;
  /**
   * Full document snapshot after the command.
   * Null when `forward` is provided (compact entry — replay forward to redo).
   */
  readonly after: ReadonlyImageDocument | null;
  /** When set, undo replays this command instead of restoring `before`. */
  readonly inverse?: CommandInverseDescriptor;
  /** When set, redo replays this command instead of restoring `after`. */
  readonly forward?: CommandInverseDescriptor;
  /**
   * Document generation before this command ran.
   * Restored on undo so dirty-checking stays correct.
   */
  readonly generationBefore: number;
  /**
   * Document generation after this command ran.
   * Restored on redo so dirty-checking stays correct.
   */
  readonly generationAfter: number;
  readonly timestamp: number;
  /**
   * Interaction key used to merge continuous edits (slider drags, numeric
   * spinners) into a single undo step until the run is sealed.
   */
  readonly coalesceKey?: string;
}

export interface ExecuteCommandOptions {
  /**
   * When set, consecutive executions of the same command sharing this key are
   * merged into the previous history entry instead of pushing a new one.
   * The run ends on `sealCoalescing()`, undo/redo, or any other command.
   * Only safe for commands whose payload describes an absolute target state.
   */
  readonly coalesceKey?: string;
}
