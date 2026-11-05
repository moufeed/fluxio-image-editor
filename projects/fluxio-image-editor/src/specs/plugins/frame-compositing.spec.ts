import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizeFrame } from 'fluxio-image-editor/core';
import { applyFrameEffect } from 'fluxio-image-editor/renderer-fabric';

interface FakeCanvas extends HTMLCanvasElement {
  __pixels: Uint8ClampedArray;
}

function createFakeContext(canvas: FakeCanvas): CanvasRenderingContext2D {
  const pixels = canvas.__pixels;
  const state = {
    fillStyle: '#ffffff',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  };

  const fillRect = (x: number, y: number, w: number, h: number): void => {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(canvas.width, Math.ceil(x + w));
    const y1 = Math.min(canvas.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * canvas.width + px) * 4;
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = Math.round(255 * state.globalAlpha);
      }
    }
  };

  return {
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      state.fillStyle = String(value);
    },
    get globalAlpha() {
      return state.globalAlpha;
    },
    set globalAlpha(value: number) {
      state.globalAlpha = value;
    },
    get globalCompositeOperation() {
      return state.globalCompositeOperation;
    },
    set globalCompositeOperation(value: string) {
      state.globalCompositeOperation = value;
    },
    fillRect,
    clearRect: () => undefined,
    drawImage: (image: CanvasImageSource) => {
      const src = image as FakeCanvas;
      if (src.__pixels) {
        pixels.set(src.__pixels);
      }
    },
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    arcTo: () => undefined,
    rect: () => undefined,
    fill: () => fillRect(0, 0, canvas.width, canvas.height),
    createLinearGradient: () =>
      ({
        addColorStop: () => undefined,
      }) as unknown as CanvasGradient,
    getImageData: (sx: number, sy: number): ImageData => {
      const i = (sy * canvas.width + sx) * 4;
      return {
        data: new Uint8ClampedArray([
          pixels[i] ?? 0,
          pixels[i + 1] ?? 0,
          pixels[i + 2] ?? 0,
          pixels[i + 3] ?? 0,
        ]),
        width: 1,
        height: 1,
        colorSpace: 'srgb',
      } as ImageData;
    },
  } as unknown as CanvasRenderingContext2D;
}

function makeCanvas(width: number, height: number): FakeCanvas {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 10;
    pixels[i + 1] = 20;
    pixels[i + 2] = 30;
    pixels[i + 3] = 255;
  }
  const canvas = {
    width,
    height,
    __pixels: pixels,
  } as FakeCanvas;
  canvas.getContext = ((type: string) => {
    if (type !== '2d') {
      return null;
    }
    return createFakeContext(canvas);
  }) as HTMLCanvasElement['getContext'];
  return canvas;
}

describe('frame compositing', () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return makeCanvas(40, 40);
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the original canvas when frame style is none', () => {
    const source = makeCanvas(40, 40);
    const result = applyFrameEffect(source, normalizeFrame({ style: 'none' }));
    expect(result).toBe(source);
  });

  it('draws a solid frame onto a cloned canvas', () => {
    const source = makeCanvas(40, 40);
    const result = applyFrameEffect(
      source,
      normalizeFrame({ style: 'solid', thickness: 0.1, color: '#ffffff' }),
    );
    expect(result).not.toBe(source);
    const edge = result.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    expect(edge[0]).toBe(255);
  });
});
