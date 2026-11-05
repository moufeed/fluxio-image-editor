import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorSession } from 'fluxio-image-editor/core';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';

import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';

function createFixtureDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

function dispatchPointer(
  host: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  init: PointerEventInit & { pointerId: number },
): PointerEvent {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType: 'touch',
    ...init,
  });
  host.dispatchEvent(event);
  return event;
}

describe('EditorSession pinch zoom (PV36)', () => {
  let host: HTMLDivElement;
  let session: EditorSession;
  let renderer: FakeRendererAdapter;

  beforeEach(async () => {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;

    class MockImage {
      onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
      onerror: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
      naturalWidth = 100;
      naturalHeight = 100;
      alt = '';
      crossOrigin = '';
      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'));
        });
      }
    }
    (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;

    host = document.createElement('div');
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

    renderer = new FakeRendererAdapter();
    session = new EditorSession({
      plugins: [new ViewportPlugin()],
      viewport: { minZoom: 0.05, maxZoom: 8 },
    });
    await session.attach(host, renderer);
    await session.load({ url: createFixtureDataUrl() });
    session.setZoom(1, 200, 150);
  });

  afterEach(() => {
    session.destroy();
    host.remove();
  });

  it('pinch-zooms and pans with two touch pointers', () => {
    const cancelSpy = vi.spyOn(renderer, 'cancelActiveGesture');
    const zoomBefore = session.store.viewport().zoom;

    dispatchPointer(host, 'pointerdown', { pointerId: 1, clientX: 150, clientY: 150 });
    dispatchPointer(host, 'pointerdown', { pointerId: 2, clientX: 250, clientY: 150 });
    expect(cancelSpy).toHaveBeenCalled();

    dispatchPointer(host, 'pointermove', { pointerId: 1, clientX: 100, clientY: 150 });
    dispatchPointer(host, 'pointermove', { pointerId: 2, clientX: 300, clientY: 150 });

    const after = session.store.viewport();
    expect(after.zoom).toBeGreaterThan(zoomBefore);
    expect(after.fitMode).toBe('manual');
    expect(renderer.lastViewport?.zoom).toBe(after.zoom);

    dispatchPointer(host, 'pointerup', { pointerId: 1, clientX: 100, clientY: 150 });
    dispatchPointer(host, 'pointerup', { pointerId: 2, clientX: 300, clientY: 150 });
  });

  it('ignores mouse pointers for pinch', () => {
    const zoomBefore = session.store.viewport().zoom;
    host.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 150,
        clientY: 150,
      }),
    );
    host.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        pointerId: 2,
        clientX: 250,
        clientY: 150,
      }),
    );
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 100,
        clientY: 150,
      }),
    );
    expect(session.store.viewport().zoom).toBe(zoomBefore);
  });
});
