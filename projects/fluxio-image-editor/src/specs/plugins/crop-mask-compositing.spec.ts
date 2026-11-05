import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { normalizeCropMask } from 'fluxio-image-editor/core';
import { applyCropMaskEffect, generateCropMaskCanvas } from 'fluxio-image-editor/renderer-fabric';

interface FakeCanvas extends HTMLCanvasElement {
  __pixels: Uint8ClampedArray;
}

function createFakeContext(canvas: FakeCanvas): CanvasRenderingContext2D {
  const pixels = canvas.__pixels;
  const state = {
    fillStyle: 'rgba(0,0,0,1)',
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    filter: 'none',
  };

  const fillAll = (alpha: number): void => {
    for (let i = 0; i < pixels.length; i += 4) {
      if (state.globalCompositeOperation === 'destination-in') {
        pixels[i + 3] = Math.round(((pixels[i + 3] ?? 0) * alpha) / 255);
      } else {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = alpha;
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
    get globalAlpha() {
      return state.globalAlpha;
    },
    set globalAlpha(value: number) {
      state.globalAlpha = value;
    },
    get filter() {
      return state.filter;
    },
    set filter(value: string) {
      state.filter = value;
    },
    fillRect: () => fillAll(255),
    clearRect: () => {
      pixels.fill(0);
    },
    drawImage: (image: CanvasImageSource) => {
      const src = image as FakeCanvas;
      if (src.__pixels) {
        if (state.globalCompositeOperation === 'destination-in') {
          for (let i = 3; i < pixels.length; i += 4) {
            const maskA = src.__pixels[i] ?? 0;
            pixels[i] = Math.round(((pixels[i] ?? 0) * maskA) / 255);
          }
        } else {
          const alpha = state.globalAlpha;
          for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = src.__pixels[i] ?? 0;
            pixels[i + 1] = src.__pixels[i + 1] ?? 0;
            pixels[i + 2] = src.__pixels[i + 2] ?? 0;
            pixels[i + 3] = Math.round((src.__pixels[i + 3] ?? 0) * alpha);
          }
        }
      }
    },
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    arcTo: () => undefined,
    bezierCurveTo: () => undefined,
    ellipse: () => undefined,
    fill: () => fillAll(255),
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
    pixels[i] = 0;
    pixels[i + 1] = 200;
    pixels[i + 2] = 0;
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

describe('crop mask compositing', () => {
  const originalCreateElement = document.createElement.bind(document);
  let nextCanvasSize = { width: 40, height: 40 };

  beforeEach(() => {
    nextCanvasSize = { width: 40, height: 40 };
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

  it('returns the original canvas when mask shape is none', () => {
    const source = makeCanvas(40, 40);
    const result = applyCropMaskEffect(source, normalizeCropMask({ shape: 'none' }));
    expect(result).toBe(source);
  });

  it('composites destination-in for an active mask', () => {
    const source = makeCanvas(40, 40);
    const result = applyCropMaskEffect(source, normalizeCropMask({ shape: 'circle', inset: 0 }));
    expect(result).not.toBe(source);
    const center = result.getContext('2d')!.getImageData(20, 20, 1, 1).data;
    expect(center[3]).toBeGreaterThan(0);
  });

  it('keeps a separate preview canvas when outsideOpacity is set', () => {
    const source = makeCanvas(40, 40);
    const result = applyCropMaskEffect(source, normalizeCropMask({ shape: 'circle', inset: 0 }), {
      outsideOpacity: 0.35,
    });
    expect(result).not.toBe(source);
    const center = result.getContext('2d')!.getImageData(20, 20, 1, 1).data;
    expect(center[3]).toBeGreaterThan(0);
  });

  it('generates a mask canvas for star', () => {
    nextCanvasSize = { width: 32, height: 32 };
    const mask = generateCropMaskCanvas(32, 32, normalizeCropMask({ shape: 'star' }));
    expect(mask.width).toBe(32);
    expect(mask.height).toBe(32);
    const data = mask.getContext('2d')!.getImageData(16, 16, 1, 1).data;
    expect(data[3]).toBeGreaterThan(0);
  });
});
