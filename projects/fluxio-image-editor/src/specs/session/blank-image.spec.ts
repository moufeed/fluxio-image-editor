import { createBlankImageBlob, ImageEditorError } from 'fluxio-image-editor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('createBlankImageBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paints via canvas and returns a PNG File', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const blob = new Blob([pngBytes], { type: 'image/png' });
    const fillRect = vi.fn();
    const ctx = { fillStyle: '', fillRect };
    const toBlob = vi.fn((cb: BlobCallback) => {
      cb(blob);
    });
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string,
      options?: ElementCreationOptions,
    ) => {
      if (tagName.toLowerCase() === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
          toBlob,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName, options);
    }) as typeof document.createElement);

    // Force the DOM canvas path (jsdom has no usable OffscreenCanvas/2d).
    const previousOffscreen = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = undefined;

    try {
      const file = await createBlankImageBlob({ width: 32, height: 24, fill: '#ff0000' });
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('image/png');
      expect(file.name).toBe('untitled.png');
      expect(fillRect).toHaveBeenCalledWith(0, 0, 32, 24);
      expect(toBlob).toHaveBeenCalled();
    } finally {
      (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = previousOffscreen;
    }
  });

  it('rejects invalid sizes', async () => {
    await expect(createBlankImageBlob({ width: 0, height: 10 })).rejects.toBeInstanceOf(
      ImageEditorError,
    );
  });
});
