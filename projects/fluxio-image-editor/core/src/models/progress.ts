/**
 * Host-facing progress for load / export (PV41 — Pintura loadprogress / processprogress parity).
 * Stages are coarse; byte-level network progress may refine `progress` later without breaking hosts.
 */
export type EditorLoadProgressStage =
  | 'start'
  | 'normalize'
  | 'decode'
  | 'complete';

export type EditorExportProgressStage = 'start' | 'rasterize' | 'complete';

export type EditorProgressStage = EditorLoadProgressStage | EditorExportProgressStage;

export type EditorProgressOperation = 'load' | 'export';

export interface EditorProgressEvent {
  /** Which long-running operation this event belongs to. */
  readonly operation: EditorProgressOperation;
  /**
   * Overall progress for the operation in `[0, 1]`.
   * Always emits `0` at start and `1` on success; failures do not emit `1`.
   */
  readonly progress: number;
  /** Coarse stage id for UI copy / analytics. */
  readonly stage: EditorProgressStage;
  /**
   * Pintura-style: whether intermediate updates are expected for this stage.
   * Staged (non-byte) progress uses `false` until a length-aware source is available.
   */
  readonly lengthComputable: boolean;
}

export type EditorProgressListener = (event: EditorProgressEvent) => void;

export function createEditorProgressEvent(
  operation: EditorProgressOperation,
  stage: EditorProgressStage,
  progress: number,
  lengthComputable = false,
): EditorProgressEvent {
  const clamped = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  return {
    operation,
    progress: clamped,
    stage,
    lengthComputable,
  };
}
