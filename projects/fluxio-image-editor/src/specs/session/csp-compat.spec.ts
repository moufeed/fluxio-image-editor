import { describe, expect, it } from 'vitest';

import {
    EditorSession,
    ImageEditorError,
    isImageEditorError,
} from 'fluxio-image-editor/core';
import { CropPlugin } from 'fluxio-image-editor/plugins/crop';
import { ExportPlugin } from 'fluxio-image-editor/plugins/export';
import { TransformPlugin } from 'fluxio-image-editor/plugins/transform';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';

import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function installDomStubs(imageSize: { width: number; height: number } | 'fail'): () => void {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;

  const previousImage = globalThis.Image;
  const previousFetch = globalThis.fetch;

  class MockImage {
    width = 0;
    height = 0;
    naturalWidth = 0;
    naturalHeight = 0;
    onload: ((ev: Event) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    crossOrigin: string | null = null;
    set src(value: string) {
      queueMicrotask(() => {
        if (imageSize === 'fail' || value.includes('example.invalid')) {
          this.onerror?.(new Event('error'));
          return;
        }
        this.width = imageSize.width;
        this.height = imageSize.height;
        this.naturalWidth = imageSize.width;
        this.naturalHeight = imageSize.height;
        this.onload?.(new Event('load'));
      });
    }
  }
  (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    if (url.includes('example.invalid') || url.includes('/missing')) {
      throw new TypeError('Failed to fetch');
    }
    if (url.includes('/fixtures/') || url.startsWith('/')) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    }
    return previousFetch(input);
  }) as typeof fetch;

  return () => {
    globalThis.Image = previousImage;
    globalThis.fetch = previousFetch;
  };
}

function createHost(): HTMLDivElement {
  const host = document.createElement('div');
  Object.defineProperty(host, 'getBoundingClientRect', {
    value: () => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  document.body.appendChild(host);
  return host;
}

async function createSession(renderer: FakeRendererAdapter): Promise<{
  session: EditorSession;
  host: HTMLDivElement;
}> {
  const host = createHost();
  const session = new EditorSession({
    plugins: [
      new ViewportPlugin(),
      new TransformPlugin(),
      new CropPlugin(),
      new ExportPlugin(),
    ],
  });
  await session.attach(host, renderer);
  return { session, host };
}

describe('CSP / source-boundary compatibility', () => {
  it('loads from File and exports a Blob', async () => {
    const restore = installDomStubs({ width: 64, height: 48 });
    const renderer = new FakeRendererAdapter();
    const { session, host } = await createSession(renderer);

    try {
      const file = new File([new Uint8Array([137, 80, 78, 71])], 'upload.png', {
        type: 'image/png',
      });
      await session.load(file);
      expect(session.store.isReady()).toBe(true);
      expect(session.getSnapshot().document?.source.kind).toBe('file');
      expect(renderer.loadedAsset?.revokeOnDestroy).toBe(true);

      const exported = await session.export({ format: 'png' });
      expect(exported.blob).toBeInstanceOf(Blob);
      expect(exported.blob.size).toBeGreaterThan(0);
      expect(exported.format).toBe('png');
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('loads from Blob', async () => {
    const restore = installDomStubs({ width: 32, height: 32 });
    const renderer = new FakeRendererAdapter();
    const { session, host } = await createSession(renderer);

    try {
      const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
      await session.load(blob);
      expect(session.store.isReady()).toBe(true);
      expect(session.getSnapshot().document?.source.kind).toBe('blob-url');
      expect(renderer.loadedAsset?.objectUrl.startsWith('blob:')).toBe(true);
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('loads from a same-origin fixture URL', async () => {
    const restore = installDomStubs({ width: 120, height: 80 });
    const renderer = new FakeRendererAdapter();
    const { session, host } = await createSession(renderer);

    try {
      await session.load('/fixtures/sample.jpg');
      expect(session.store.isReady()).toBe(true);
      expect(session.getSnapshot().document?.source.kind).toBe('url');
      expect(session.getSnapshot().document?.sourceSize).toEqual({ width: 120, height: 80 });
      expect(renderer.loadedAsset?.objectUrl).toBe('/fixtures/sample.jpg');
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('returns a controlled typed error for an invalid remote URL', async () => {
    const restore = installDomStubs('fail');
    const renderer = new FakeRendererAdapter();
    const { session, host } = await createSession(renderer);

    try {
      await expect(session.load('https://example.invalid/missing.png')).rejects.toSatisfy(
        (error: unknown) =>
          isImageEditorError(error) &&
          (error.code === 'CORS_FAILED' || error.code === 'IMAGE_LOAD_FAILED'),
      );
      expect(session.store.status()).toBe('error');
      expect(session.store.isReady()).toBe(false);
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('destroys the adapter and clears session resources', async () => {
    const restore = installDomStubs({ width: 16, height: 16 });
    const renderer = new FakeRendererAdapter();
    const { session, host } = await createSession(renderer);

    try {
      await session.load(PNG_1X1);
      expect(renderer.mounted).toBe(true);
      expect(renderer.loadedAsset).toBeTruthy();

      session.destroy();
      expect(renderer.destroyed).toBe(true);
      expect(renderer.mounted).toBe(false);
      expect(renderer.loadedAsset).toBeNull();
      expect(session.store.document()).toBeNull();
      expect(() => session.undo()).toThrow(/destroyed/);
    } finally {
      host.remove();
      restore();
    }
  });

  it('keeps Fabric runtime types out of serialized state', async () => {
    const restore = installDomStubs({ width: 40, height: 40 });
    const renderer = new FakeRendererAdapter();
    const { session, host } = await createSession(renderer);

    try {
      await session.load(PNG_1X1);
      await session.execute('transform.rotate', { degrees: 90 });

      const snapshot = session.getSnapshot();
      const serialized = JSON.stringify(snapshot);
      expect(serialized).not.toMatch(/fabric\.Canvas|FabricObject|FabricImage|StaticCanvas/i);

      const document = snapshot.document!;
      expect(document.pluginState).toEqual({});
      for (const value of Object.values(document)) {
        expect(String(value)).not.toMatch(/Fabric/);
      }
    } finally {
      session.destroy();
      host.remove();
      restore();
    }
  });

  it('exposes ImageEditorError as a typed host-facing contract', () => {
    const error = new ImageEditorError('TAINTED_CANVAS', 'tainted');
    expect(isImageEditorError(error)).toBe(true);
    expect(error.code).toBe('TAINTED_CANVAS');
  });
});
