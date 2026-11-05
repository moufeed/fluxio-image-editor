import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialFill, normalizeFill } from 'fluxio-image-editor/core';
import { applyFillEffect } from 'fluxio-image-editor/renderer-fabric';

interface FakeCanvas extends HTMLCanvasElement {
  __pixels: Uint8ClampedArray;
}

function parseCssColor(value: string): [number, number, number, number] {
  const hex = value.trim();
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    return [
      Number.parseInt(full.slice(1, 3), 16),
      Number.parseInt(full.slice(3, 5), 16),
      Number.parseInt(full.slice(5, 7), 16),
      255,
    ];
  }
  const rgba = hex.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgba) {
    return [
      Number(rgba[1]),
      Number(rgba[2]),
      Number(rgba[3]),
      Math.round(Number(rgba[4] ?? 1) * 255),
    ];
  }
  return [0, 0, 0, 255];
}

function createFakeContext(canvas: FakeCanvas): CanvasRenderingContext2D {
  const pixels = canvas.__pixels;
  const state = {
    fillStyle: '#ffffff',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  };

  const fillRect = (x: number, y: number, w: number, h: number): void => {
    const [r, g, b, a] = parseCssColor(String(state.fillStyle));
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(canvas.width, Math.ceil(x + w));
    const y1 = Math.min(canvas.height, Math.ceil(y + h));
    const srcA = Math.round(a * state.globalAlpha);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * canvas.width + px) * 4;
        if (state.globalCompositeOperation === 'destination-over') {
          const dstA = pixels[i + 3] ?? 0;
          if (dstA === 0) {
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = srcA;
          }
        } else {
          pixels[i] = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;
          pixels[i + 3] = srcA;
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
    clearRect: () => {
      pixels.fill(0);
    },
    drawImage: (image: CanvasImageSource) => {
      const src = image as FakeCanvas;
      if (src.__pixels) {
        pixels.set(src.__pixels);
      }
    },
    save: () => undefined,
    restore: () => undefined,
    getImageData: (sx: number, sy: number, sw = 1, sh = 1): ImageData => {
      const data = new Uint8ClampedArray(sw * sh * 4);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const srcI = ((sy + y) * canvas.width + (sx + x)) * 4;
          const dstI = (y * sw + x) * 4;
          data[dstI] = pixels[srcI] ?? 0;
          data[dstI + 1] = pixels[srcI + 1] ?? 0;
          data[dstI + 2] = pixels[srcI + 2] ?? 0;
          data[dstI + 3] = pixels[srcI + 3] ?? 0;
        }
      }
      return { data, width: sw, height: sh, colorSpace: 'srgb' } as ImageData;
    },
  } as unknown as CanvasRenderingContext2D;
}

function makeCanvas(
  width: number,
  height: number,
  seed?: (pixels: Uint8ClampedArray) => void,
): FakeCanvas {
  const pixels = new Uint8ClampedArray(width * height * 4);
  seed?.(pixels);
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

describe('fill compositing (PV25)', () => {
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return makeCanvas(2, 1);
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the original canvas when fill is identity', () => {
    const source = makeCanvas(2, 1);
    expect(applyFillEffect(source, createInitialFill())).toBe(source);
  });

  it('paints behind transparent pixels with destination-over', () => {
    const source = makeCanvas(2, 1, (pixels) => {
      // Left: opaque red; right: transparent
      pixels[0] = 255;
      pixels[1] = 0;
      pixels[2] = 0;
      pixels[3] = 255;
    });

    const result = applyFillEffect(
      source,
      normalizeFill({ mode: 'solid', color: '#0000ff', opacity: 1 }),
    );
    expect(result).not.toBe(source);
    const data = result.getContext('2d')!.getImageData(0, 0, 2, 1).data;
    expect(Array.from(data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(data.slice(4, 8))).toEqual([0, 0, 255, 255]);
  });
});
