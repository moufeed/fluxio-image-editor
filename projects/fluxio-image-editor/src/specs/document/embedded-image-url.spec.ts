import {
  MAX_EMBEDDED_IMAGE_DATA_URL_CHARS,
  clampEmbeddedImageSrc,
  isDataUrl,
  normalizeImageAnnotation,
  normalizeWatermark,
} from 'fluxio-image-editor/core';

describe('embedded image data URL guardrails', () => {
  it('detects data URLs case-insensitively', () => {
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
    expect(isDataUrl('DATA:image/jpeg;base64,abc')).toBe(true);
    expect(isDataUrl('https://cdn.example/a.png')).toBe(false);
    expect(isDataUrl('')).toBe(false);
  });

  it('passes through http URLs and small data URLs', () => {
    expect(clampEmbeddedImageSrc('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
    expect(clampEmbeddedImageSrc('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('clears oversized data URLs with a warning', () => {
    const huge = `data:image/png;base64,${'A'.repeat(MAX_EMBEDDED_IMAGE_DATA_URL_CHARS)}`;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(clampEmbeddedImageSrc(huge)).toBe('');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('normalizes watermark imageSrc through the cap', () => {
    const huge = `data:image/png;base64,${'B'.repeat(MAX_EMBEDDED_IMAGE_DATA_URL_CHARS)}`;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(normalizeWatermark({ mode: 'image', imageSrc: huge }).imageSrc).toBe('');
    expect(
      normalizeWatermark({ mode: 'image', imageSrc: 'https://cdn.example/wm.png' }).imageSrc,
    ).toBe('https://cdn.example/wm.png');
    warn.mockRestore();
  });

  it('normalizes image annotation src through the cap', () => {
    const huge = `data:image/png;base64,${'C'.repeat(MAX_EMBEDDED_IMAGE_DATA_URL_CHARS)}`;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(normalizeImageAnnotation({ id: 'img-1', src: huge }).src).toBe('');
    warn.mockRestore();
  });
});
