import { createMaxFitCrop } from 'fluxio-image-editor/core';
import {
  DEFAULT_BATCH_EXPORT_PRESETS,
  resolveBatchExportAspectRatio,
} from 'fluxio-image-editor/plugins/batch-export';

describe('createMaxFitCrop', () => {
  it('fills the source when aspect is null', () => {
    const crop = createMaxFitCrop({ width: 1000, height: 500 }, null);
    expect(crop.width).toBeCloseTo(1000);
    expect(crop.height).toBeCloseTo(500);
    expect(crop.x).toBeCloseTo(0);
    expect(crop.y).toBeCloseTo(0);
  });

  it('centers a square max-fit on a wide source', () => {
    const crop = createMaxFitCrop({ width: 1000, height: 500 }, 1);
    expect(crop.width).toBeCloseTo(500);
    expect(crop.height).toBeCloseTo(500);
    expect(crop.x).toBeCloseTo(250);
    expect(crop.y).toBeCloseTo(0);
  });

  it('centers a tall max-fit on a wide source', () => {
    const crop = createMaxFitCrop({ width: 1000, height: 500 }, 9 / 16);
    expect(crop.width / crop.height).toBeCloseTo(9 / 16, 5);
    expect(crop.height).toBeCloseTo(500);
  });
});

describe('resolveBatchExportAspectRatio (BE02)', () => {
  it('returns explicit ratio and ignores sized presets without ratio', () => {
    expect(resolveBatchExportAspectRatio({ id: 'a', label: 'A', format: 'png', ratio: 1 })).toBe(1);
    expect(
      resolveBatchExportAspectRatio({
        id: 'b',
        label: 'B',
        format: 'png',
        width: 100,
        height: 50,
      }),
    ).toBeNull();
  });

  it('sets ratio on default social / web presets', () => {
    const ig = DEFAULT_BATCH_EXPORT_PRESETS.find((p) => p.id === 'ig-post');
    const story = DEFAULT_BATCH_EXPORT_PRESETS.find((p) => p.id === 'ig-story');
    const original = DEFAULT_BATCH_EXPORT_PRESETS.find((p) => p.id === 'original-png');
    expect(resolveBatchExportAspectRatio(ig!)).toBe(1);
    expect(resolveBatchExportAspectRatio(story!)).toBeCloseTo(9 / 16);
    expect(resolveBatchExportAspectRatio(original!)).toBeNull();
  });
});
