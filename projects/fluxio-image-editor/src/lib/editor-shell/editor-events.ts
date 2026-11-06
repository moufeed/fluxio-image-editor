/**
 * Emitted when a registered toolbar/utilibar action is clicked and the shell
 * does not handle it (host plugin custom actions). Host typically calls
 * `handle.export(...)` or other session APIs.
 */
export interface EditorToolbarActionEvent {
  readonly id: string;
}

export interface EditorClosedEvent {
  readonly dirty: boolean;
  readonly confirmed: boolean;
}

/**
 * Emitted when the user tries to close **or** replace the source (Open/New)
 * with unsaved changes and `config.close.useCustomConfirm` is true.
 * The host should present a confirmation dialog and call `resolve(true)` to
 * discard and proceed, or `resolve(false)` to cancel.
 */
export interface ConfirmCloseEvent {
  readonly dirty: boolean;
  readonly resolve: (confirmed: boolean) => void;
}

export type {
  EditorExportProgressStage,
  EditorLoadProgressStage,
  EditorProgressEvent,
  EditorProgressListener,
  EditorProgressOperation,
  EditorProgressStage,
} from 'fluxio-image-editor/core';
