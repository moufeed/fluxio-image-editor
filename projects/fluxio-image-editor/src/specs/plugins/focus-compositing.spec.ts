import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialFocus, normalizeFocus } from 'fluxio-image-editor/core';
import { applyFocusEffect, generateFocusMask } from 'fluxio-image-editor/renderer-fabric';

interface FakeCanvas extends HTMLCanvasElement {
  __pixels: Uint8ClampedArray;
}

function createFakeContext(canvas: FakeCanvas): CanvasRenderingContext2D {
  const pixels = canvas.__pixels;
  const state = {
    fillStyle: 'rgba(0,0,0,1)',
    globalCompositeOperation: 'source-over',
  };

  const parseAlpha = (style: string): number => {
    const match = /rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([0-9.]+))?\)/.exec(style);
    if (!match) {
      return 1;
    }
    return match[1] != null ? Number(match[1]) : 1;
  };

  const fillRect = (x: number, y: number, w: number, h: number): void => {
    const alpha = Math.round(parseAlpha(String(state.fillStyle)) * 255);
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(canvas.width, Math.ceil(x + w));
    const y1 = Math.min(canvas.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * canvas.width + px) * 4;
        if (state.globalCompositeOperation === 'destination-out') {
          pixels[i + 3] = Math.max(0, (pixels[i + 3] ?? 0) - alpha);
        } else if (state.globalCompositeOperation === 'destination-in') {
          pixels[i + 3] = Math.round(((pixels[i + 3] ?? 0) * alpha) / 255);
        } else {
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
          pixels[i + 3] = alpha;
        }
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
    translate: () => undefined,
    rotate: () => undefined,
    beginPath: () => undefined,
    arc: () => undefined,
    fill: () => undefined,
    createRadialGradient: () =>
      ({
        addColorStop: () => undefined,
        toString: () => 'rgba(0,0,0,1)',
      }) as unknown as CanvasGradient,
    createLinearGradient: () =>
      ({
        addColorStop: () => undefined,
        toString: () => 'rgba(0,0,0,1)',
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
    pixels[i] = 50;
    pixels[i + 1] = 100;
    pixels[i + 2] = 150;
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

describe('focus compositing', () => {
  const originalCreateElement = document.createElement.bind(document);
  let nextCanvasSize = { width: 32, height: 24 };

  beforeEach(() => {
    nextCanvasSize = { width: 32, height: 24 };
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return makeCanvas(nextCanvasSize.width, nextCanvasSize.height);
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the original canvas when focus mode is none', () => {
    const sharp = makeCanvas(32, 24);
    const result = applyFocusEffect(sharp, createInitialFocus(), (source) => source);
    expect(result).toBe(sharp);
  });

  it('returns the original canvas when blur is zero', () => {
    const sharp = makeCanvas(32, 24);
    const focus = normalizeFocus({ mode: 'radial', blur: 0 });
    const result = applyFocusEffect(sharp, focus, (source) => source);
    expect(result).toBe(sharp);
  });

  it('produces a different canvas for radial and linear modes', () => {
    nextCanvasSize = { width: 48, height: 36 };
    const sharp = makeCanvas(48, 36);
    const blurredClone = makeCanvas(48, 36);

    const radial = applyFocusEffect(
      sharp,
      normalizeFocus({ mode: 'radial', blur: 0.6, size: 0.25, feather: 0.3 }),
      () => blurredClone,
    );
    expect(radial).not.toBe(sharp);
    expect(radial.width).toBe(48);
    expect(radial.height).toBe(36);

    const linear = applyFocusEffect(
      sharp,
      normalizeFocus({ mode: 'linear', blur: 0.6, size: 0.2, feather: 0.4, angle: 30 }),
      () => blurredClone,
    );
    expect(linear).not.toBe(sharp);
    expect(linear.width).toBe(48);
  });

  it('generates masks for radial and linear modes', () => {
    nextCanvasSize = { width: 40, height: 40 };

    const radialMask = generateFocusMask(
      40,
      40,
      normalizeFocus({ mode: 'radial', size: 0.2, feather: 0.1, centerX: 0.5, centerY: 0.5 }),
    );
    expect(radialMask.width).toBe(40);
    expect(radialMask.height).toBe(40);
    expect(radialMask.getContext('2d')).toBeTruthy();

    const linearMask = generateFocusMask(
      40,
      40,
      normalizeFocus({ mode: 'linear', size: 0.15, feather: 0.05, angle: 0 }),
    );
    expect(linearMask.width).toBe(40);
    expect(linearMask.getContext('2d')).toBeTruthy();
  });
});
