import { describe, expect, it } from 'vitest';

import { normalizeSource } from 'fluxio-image-editor/core';

describe('normalizeSource asset ids', () => {
  it('assigns unique nanoid-based ids without a module counter', async () => {
    const previousImage = globalThis.Image;
    class MockImage {
      width = 0;
      height = 0;
      naturalWidth = 0;
      naturalHeight = 0;
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      crossOrigin: string | null = null;
      set src(_value: string) {
        queueMicrotask(() => {
          this.width = 10;
          this.height = 10;
          this.naturalWidth = 10;
          this.naturalHeight = 10;
          this.onload?.(new Event('load'));
        });
      }
    }
    (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;

    try {
      const a = await normalizeSource('https://example.test/a.png');
      const b = await normalizeSource('https://example.test/b.png');
      expect(a.id).toMatch(/^asset_[A-Za-z0-9_-]{12}$/);
      expect(b.id).toMatch(/^asset_[A-Za-z0-9_-]{12}$/);
      expect(a.id).not.toBe(b.id);
    } finally {
      globalThis.Image = previousImage;
    }
  });
});
