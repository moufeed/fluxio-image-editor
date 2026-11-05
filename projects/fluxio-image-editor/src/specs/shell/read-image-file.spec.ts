import { ImageEditorError, MAX_EMBEDDED_IMAGE_BYTES } from 'fluxio-image-editor/core';

import {
  isImageMimeType,
  readImageFileAsDataUrl,
} from '../../lib/editor-shell/helpers/read-image-file';

describe('readImageFileAsDataUrl', () => {
  it('accepts image/* MIME types', () => {
    expect(isImageMimeType('image/png')).toBe(true);
    expect(isImageMimeType('image/jpeg')).toBe(true);
    expect(isImageMimeType('image/webp')).toBe(true);
  });

  it('rejects non-image and empty MIME types', () => {
    expect(isImageMimeType('')).toBe(false);
    expect(isImageMimeType('text/plain')).toBe(false);
    expect(isImageMimeType('application/pdf')).toBe(false);
  });

  it('rejects non-image files before reading', async () => {
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });
    await expect(readImageFileAsDataUrl(file)).rejects.toBeInstanceOf(ImageEditorError);
    await expect(readImageFileAsDataUrl(file)).rejects.toMatchObject({
      code: 'IMAGE_LOAD_FAILED',
    });
  });

  it('rejects oversized image files before reading', async () => {
    const bytes = new Uint8Array(MAX_EMBEDDED_IMAGE_BYTES + 1);
    const file = new File([bytes], 'huge.png', { type: 'image/png' });
    await expect(readImageFileAsDataUrl(file)).rejects.toMatchObject({
      code: 'IMAGE_LOAD_FAILED',
    });
  });

  it('reads an image file as a data URL', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'tiny.png', {
      type: 'image/png',
    });
    const src = await readImageFileAsDataUrl(file);
    expect(src.startsWith('data:image/png;base64,')).toBe(true);
  });
});
