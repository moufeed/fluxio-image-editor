import { createImageDocument } from 'fluxio-image-editor/core';
import { applyFilters, filtersFromPayload } from 'fluxio-image-editor/plugins/filters';

describe('applyFilters', () => {
  const base = createImageDocument({
    source: { kind: 'url', id: '1', url: 'x' },
    sourceSize: { width: 200, height: 100 },
  });

  it('applies filter presets and is idempotent for the same values', () => {
    const withFilter = applyFilters(base, { preset: 'kodachrome' });
    expect(withFilter.filters.preset).toBe('kodachrome');
    expect(applyFilters(withFilter, { preset: 'kodachrome' })).toBe(withFilter);
  });

  it('accepts a bare preset id', () => {
    expect(applyFilters(base, 'sepia').filters.preset).toBe('sepia');
    expect(applyFilters(base, 'none').filters.preset).toBe('none');
  });
});

describe('filtersFromPayload', () => {
  it('prefers filters over preset when both are present', () => {
    expect(filtersFromPayload({ filters: { preset: 'vintage' }, preset: 'sepia' })).toEqual({
      preset: 'vintage',
    });
  });

  it('falls back to preset, then null', () => {
    expect(filtersFromPayload({ preset: 'polaroid' })).toBe('polaroid');
    expect(filtersFromPayload({ filters: null })).toBeNull();
    expect(filtersFromPayload({})).toBeNull();
    expect(filtersFromPayload(null)).toBeNull();
  });
});
