/**
 * Guardrails for embedding image data URLs in document state
 * (watermark.imageSrc, image-overlay annotations).
 *
 * Binary uploads are capped by byte size; persisted/pasted data URLs by
 * character length (base64 is ~4/3 of binary). Oversized values are rejected
 * at upload and cleared at normalize with a console warning.
 */

/** Max binary size accepted for a user-picked watermark / overlay image. */
export const MAX_EMBEDDED_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Max UTF-16 code units for a single embedded `data:` URL in document state.
 * Allows base64 expansion of {@link MAX_EMBEDDED_IMAGE_BYTES} plus a MIME header.
 */
export const MAX_EMBEDDED_IMAGE_DATA_URL_CHARS =
  Math.ceil(MAX_EMBEDDED_IMAGE_BYTES * (4 / 3)) + 128;

/** True when `src` looks like a data URL (case-insensitive scheme). */
export function isDataUrl(src: string | null | undefined): boolean {
  return typeof src === 'string' && /^data:/i.test(src.trim());
}

/**
 * Return `src` unchanged when within budget; otherwise return `''` and warn.
 * Non-data URLs (http/https/blob) are never truncated.
 */
export function clampEmbeddedImageSrc(
  src: string | null | undefined,
  maxChars: number = MAX_EMBEDDED_IMAGE_DATA_URL_CHARS,
): string {
  if (typeof src !== 'string') {
    return '';
  }
  const trimmed = src.trim();
  if (!trimmed) {
    return '';
  }
  if (!isDataUrl(trimmed)) {
    return trimmed;
  }
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  console.warn(
    `[fluxio-image-editor] Embedded image data URL exceeds ${maxChars} characters ` +
      `(got ${trimmed.length}); clearing to protect memory.`,
  );
  return '';
}
