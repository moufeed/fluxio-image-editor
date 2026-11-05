import { DEFAULT_ZOOM_PRESETS } from 'fluxio-image-editor/core';
import {
  DEFAULT_ZOOM_STEP_FACTOR,
  resolveZoomPresets,
  resolveZoomStepFactor,
} from 'fluxio-image-editor/plugins/viewport';

describe('viewport zoom presets', () => {
  it('exposes zoom presets and step factor', () => {
    expect(resolveZoomStepFactor()).toBe(DEFAULT_ZOOM_STEP_FACTOR);
    expect(resolveZoomPresets()).toEqual(DEFAULT_ZOOM_PRESETS);
    expect(resolveZoomPresets().some((p) => p.factor === 'fit')).toBe(true);
    expect(resolveZoomPresets().some((p) => p.factor === 1)).toBe(true);
  });
});
