/**
 * Typed errors for host-facing image load, CORS, and export failures.
 * The library returns these; the consuming application maps them to UI.
 */
export type ImageEditorErrorCode =
  | 'IMAGE_LOAD_FAILED'
  | 'CORS_FAILED'
  | 'TAINTED_CANVAS'
  | 'EXPORT_FAILED'
  | 'DESIGN_STATE_INVALID'
  | 'DESIGN_STATE_UNSUPPORTED_VERSION';

export class ImageEditorError extends Error {
  override readonly name = 'ImageEditorError';
  readonly code: ImageEditorErrorCode;
  readonly source?: string;

  constructor(
    code: ImageEditorErrorCode,
    message: string,
    options?: { readonly cause?: unknown; readonly source?: string },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.code = code;
    this.source = options?.source;
  }
}

export function isImageEditorError(error: unknown): error is ImageEditorError {
  return error instanceof ImageEditorError;
}

export function toImageEditorError(
  error: unknown,
  fallbackCode: ImageEditorErrorCode = 'EXPORT_FAILED',
  fallbackMessage = 'Editor operation failed',
): ImageEditorError {
  if (error instanceof ImageEditorError) {
    return error;
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return new ImageEditorError(fallbackCode, message, { cause: error });
}
