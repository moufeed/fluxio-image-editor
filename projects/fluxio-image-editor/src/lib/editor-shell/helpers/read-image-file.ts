import {
  ImageEditorError,
  MAX_EMBEDDED_IMAGE_BYTES,
  MAX_EMBEDDED_IMAGE_DATA_URL_CHARS,
} from 'fluxio-image-editor/core';

/** True when the browser-reported MIME type is an image. */
export function isImageMimeType(type: string): boolean {
  return typeof type === 'string' && type.startsWith('image/');
}

/**
 * Read a user-picked file as a data URL after MIME and size validation.
 * Rejects non-image types and oversized files so they never enter document
 * state as huge base64 payloads (watermark / overlay / stickers).
 */
export function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!isImageMimeType(file.type)) {
    return Promise.reject(
      new ImageEditorError('IMAGE_LOAD_FAILED', 'Selected file must be an image'),
    );
  }
  if (Number.isFinite(file.size) && file.size > MAX_EMBEDDED_IMAGE_BYTES) {
    return Promise.reject(
      new ImageEditorError(
        'IMAGE_LOAD_FAILED',
        `Image exceeds max size of ${MAX_EMBEDDED_IMAGE_BYTES} bytes`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new ImageEditorError('IMAGE_LOAD_FAILED', 'Failed to read image file'));
        return;
      }
      if (src.length > MAX_EMBEDDED_IMAGE_DATA_URL_CHARS) {
        reject(
          new ImageEditorError(
            'IMAGE_LOAD_FAILED',
            `Image data URL exceeds max length of ${MAX_EMBEDDED_IMAGE_DATA_URL_CHARS} characters`,
          ),
        );
        return;
      }
      resolve(src);
    };
    reader.onerror = () => {
      reject(new ImageEditorError('IMAGE_LOAD_FAILED', 'Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}
