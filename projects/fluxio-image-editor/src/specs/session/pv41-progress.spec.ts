import { describe, expect, it, vi } from 'vitest';

import {
  createEditorProgressEvent,
  EditorSession,
  type EditorProgressEvent,
} from 'fluxio-image-editor/core';
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

function createAttachedSession(options: {
  readonly onLoadProgress?: (event: EditorProgressEvent) => void;
  readonly onExportProgress?: (event: EditorProgressEvent) => void;
}): Promise<{
  session: EditorSession;
  host: HTMLElement;
  restore: () => void;
}> {
  const restore = installDomStubs({ width: 64, height: 48 });
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

  const session = new EditorSession({
    plugins: [
      new ViewportPlugin(),
      new TransformPlugin(),
      new CropPlugin(),
      new ExportPlugin(),
    ],
    onLoadProgress: options.onLoadProgress,
    onExportProgress: options.onExportProgress,
  });
  return session.attach(host, new FakeRendererAdapter()).then(() => ({ session, host, restore }));
}

describe('PV41 load/export progress', () => {
  it('clamps createEditorProgressEvent progress', () => {
    expect(createEditorProgressEvent('load', 'start', -1).progress).toBe(0);
    expect(createEditorProgressEvent('export', 'complete', 2).progress).toBe(1);
  });

  it('emits staged load progress 0→1', async () => {
    const events: EditorProgressEvent[] = [];
    const { session, host, restore } = await createAttachedSession({
      onLoadProgress: (event) => events.push(event),
    });

    try {
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const blob = new Blob([pngHeader], { type: 'image/png' });
      await session.load(new File([blob], 'progress.png', { type: 'image/png' }));

      expect(events.map((e) => e.stage)).toEqual([
        'start',
        'normalize',
        'decode',
        'complete',
      ]);
      expect(events[0]?.progress).toBe(0);
      expect(events.at(-1)?.progress).toBe(1);
      expect(events.every((e) => e.operation === 'load')).toBe(true);
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('emits staged export progress 0→1', async () => {
    const events: EditorProgressEvent[] = [];
    const { session, host, restore } = await createAttachedSession({
      onExportProgress: (event) => events.push(event),
    });

    try {
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const blob = new Blob([pngHeader], { type: 'image/png' });
      await session.load(new File([blob], 'progress.png', { type: 'image/png' }));
      await session.export({ format: 'png' });

      expect(events.map((e) => e.stage)).toEqual(['start', 'rasterize', 'complete']);
      expect(events[0]?.progress).toBe(0);
      expect(events.at(-1)?.progress).toBe(1);
      expect(events.every((e) => e.operation === 'export')).toBe(true);
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('does not emit export complete on failure', async () => {
    const events: EditorProgressEvent[] = [];
    const { session, host, restore } = await createAttachedSession({
      onExportProgress: (event) => events.push(event),
    });

    try {
      const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const blob = new Blob([pngHeader], { type: 'image/png' });
      await session.load(new File([blob], 'progress.png', { type: 'image/png' }));

      const renderer = (session as unknown as { renderer: FakeRendererAdapter }).renderer;
      vi.spyOn(renderer, 'exportRaster').mockRejectedValueOnce(new Error('boom'));

      await expect(session.export({ format: 'png' })).rejects.toMatchObject({
        code: 'EXPORT_FAILED',
      });
      expect(events.map((e) => e.stage)).toEqual(['start', 'rasterize']);
      expect(events.some((e) => e.stage === 'complete')).toBe(false);
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });
});
