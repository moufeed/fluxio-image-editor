import { resolveExportDimensions } from 'fluxio-image-editor/core';

describe('resolveExportDimensions', () => {
  it('returns source size when no resize options are set', () => {
    expect(resolveExportDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('honors explicit width and height', () => {
    expect(resolveExportDimensions(800, 600, { width: 1080, height: 1920 })).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('scales proportionally from a single dimension', () => {
    expect(resolveExportDimensions(800, 600, { width: 400 })).toEqual({
      width: 400,
      height: 300,
    });
  });

  it('applies multiplier when width/height are omitted', () => {
    expect(resolveExportDimensions(100, 50, { multiplier: 2 })).toEqual({
      width: 200,
      height: 100,
    });
  });
});
