import {
  createImageDocument,
  createInitialFrame,
  frameEqual,
  isIdentityFrame,
  normalizeFrame,
} from 'fluxio-image-editor/core';
import { applyFrame } from 'fluxio-image-editor/plugins/frame';

describe('frame model', () => {
  it('creates identity frame by default', () => {
    const frame = createInitialFrame();
    expect(frame.style).toBe('none');
    expect(isIdentityFrame(frame)).toBe(true);
  });

  it('normalizes and clamps frame values', () => {
    expect(
      normalizeFrame({
        style: 'solid',
        thickness: 2,
        opacity: 1.5,
        cornerRadius: -1,
        color: '#ff0000',
        color2: '',
      }),
    ).toEqual({
      style: 'solid',
      thickness: 0.25,
      color: '#ff0000',
      color2: '#111111',
      opacity: 1,
      cornerRadius: 0,
      imageSrc: '',
    });
    expect(normalizeFrame({ style: 'nope' as 'solid' }).style).toBe('none');
  });

  it('compares frame states and applies document updates', () => {
    const base = createImageDocument({
      source: { kind: 'url', id: 'src', url: 'https://example.com/a.png' },
      sourceSize: { width: 100, height: 80 },
    });
    expect(isIdentityFrame(base.frame)).toBe(true);

    const next = applyFrame(base, { style: 'polaroid', thickness: 0.08, color: '#f5f5f5' });
    expect(next.frame.style).toBe('polaroid');
    expect(next.frame.thickness).toBe(0.08);
    expect(next.frame.color).toBe('#f5f5f5');
    expect(frameEqual(next.frame, next.frame)).toBe(true);
    expect(applyFrame(next, next.frame)).toBe(next);
    expect(applyFrame(next, null).frame.style).toBe('none');
  });
});
