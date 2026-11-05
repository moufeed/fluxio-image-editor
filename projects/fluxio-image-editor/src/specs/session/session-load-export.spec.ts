import { describe, expect, it } from 'vitest';

import { EditorSession } from 'fluxio-image-editor/core';
import { CropPlugin } from 'fluxio-image-editor/plugins/crop';
import { ExportPlugin } from 'fluxio-image-editor/plugins/export';
import { TransformPlugin } from 'fluxio-image-editor/plugins/transform';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';

import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';

function installDomStubs(imageSize: { width: number; height: number }): () => void {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;

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
        this.width = imageSize.width;
        this.height = imageSize.height;
        this.naturalWidth = imageSize.width;
        this.naturalHeight = imageSize.height;
        this.onload?.(new Event('load'));
      });
    }
  }
  (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;

  return () => {
    globalThis.Image = previousImage;
  };
}

describe('session load / export', () => {
  it('loads a large synthetic PNG and exports', async () => {
    const restore = installDomStubs({ width: 4096, height: 2160 });
    const host = document.createElement('div');
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(host);

    const renderer = new FakeRendererAdapter();
    const session = new EditorSession({
      plugins: [
        new ViewportPlugin(),
        new TransformPlugin(),
        new CropPlugin(),
        new ExportPlugin(),
      ],
    });

    try {
      await session.attach(host, renderer);
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const blob = new Blob([pngHeader, new Uint8Array(1024)], { type: 'image/png' });
      await session.load(new File([blob], 'large-smoke.png', { type: 'image/png' }));
      expect(session.store.isReady()).toBe(true);
      expect(session.store.document()?.sourceSize).toEqual({ width: 4096, height: 2160 });
      const exported = await session.export({ format: 'png' });
      expect(exported.blob.size).toBeGreaterThan(0);
      expect(exported.width).toBeGreaterThan(0);
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('fails export when raster encode exceeds timeoutMs', async () => {
    const restore = installDomStubs({ width: 64, height: 64 });
    const host = document.createElement('div');
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(host);

    const renderer = new FakeRendererAdapter();
    renderer.exportDelayMs = 80;
    const session = new EditorSession({
      plugins: [
        new ViewportPlugin(),
        new TransformPlugin(),
        new CropPlugin(),
        new ExportPlugin(),
      ],
    });

    try {
      await session.attach(host, renderer);
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const blob = new Blob([pngHeader, new Uint8Array(64)], { type: 'image/png' });
      await session.load(new File([blob], 'timeout.png', { type: 'image/png' }));

      await expect(session.export({ format: 'png', timeoutMs: 10 })).rejects.toMatchObject({
        code: 'EXPORT_FAILED',
        message: expect.stringContaining('timed out'),
      });
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });
});
