import { applyColorOverlayEffect } from './color-overlay-compositing';
import { createInitialColorOverlay, normalizeColorOverlay } from 'fluxio-image-editor/core';

function makeCanvas(fill = '#ffffff'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 8, 8);
  }
  return canvas;
}

function sampleCenter(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(4, 4, 1, 1).data;
}

describe('applyColorOverlayEffect', () => {
  it('returns the same canvas for identity overlay', () => {
    const source = makeCanvas();
    const result = applyColorOverlayEffect(source, createInitialColorOverlay());
    expect(result).toBe(source);
  });

  it('applies a solid color wash with opacity', () => {
    const source = makeCanvas('#ffffff');
    const result = applyColorOverlayEffect(
      source,
      normalizeColorOverlay({ mode: 'solid', color: '#000000', opacity: 0.5 }),
    );
    expect(result).not.toBe(source);
    const pixel = sampleCenter(result);
    expect(pixel[0]).toBeLessThan(200);
    expect(pixel[1]).toBeLessThan(200);
    expect(pixel[2]).toBeLessThan(200);
  });

  it('applies linear and radial gradients', () => {
    const source = makeCanvas('#ffffff');
    const linear = applyColorOverlayEffect(
      source,
      normalizeColorOverlay({
        mode: 'linear',
        color: '#ff0000',
        color2: '#0000ff',
        opacity: 1,
        angle: 0,
      }),
    );
    const radial = applyColorOverlayEffect(
      source,
      normalizeColorOverlay({
        mode: 'radial',
        color: '#00ff00',
        color2: '#000000',
        opacity: 1,
      }),
    );
    expect(sampleCenter(linear)[0]).toBeGreaterThan(0);
    expect(sampleCenter(radial)[1]).toBeGreaterThan(0);
  });
});
