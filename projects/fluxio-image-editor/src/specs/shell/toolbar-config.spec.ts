import {
  normalizeControlsPanelPosition,
  normalizeToolbarPosition,
  resolveToolbarConfig,
} from 'fluxio-image-editor/core';

describe('toolbar config side-rail normalization', () => {
  it('defaults utilibar and controls to left', () => {
    const resolved = resolveToolbarConfig();
    expect(resolved.position).toBe('left');
    expect(resolved.controlsPosition).toBe('left');
    expect('presentation' in resolved).toBe(false);
  });

  it('maps legacy top/bottom utilibar positions to left', () => {
    expect(normalizeToolbarPosition('top')).toBe('left');
    expect(normalizeToolbarPosition('bottom')).toBe('left');
    expect(normalizeToolbarPosition('left')).toBe('left');
    expect(normalizeToolbarPosition('right')).toBe('right');
  });

  it('defaults controlsPosition to utilibar side', () => {
    const resolved = resolveToolbarConfig({
      position: 'right',
    });
    expect(resolved.position).toBe('right');
    expect(resolved.controlsPosition).toBe('right');
  });

  it('allows controls on the opposite side from the utilibar', () => {
    expect(normalizeControlsPanelPosition('left', 'right')).toBe('left');
    const resolved = resolveToolbarConfig({
      position: 'left',
      controlsPosition: 'right',
    });
    expect(resolved.position).toBe('left');
    expect(resolved.controlsPosition).toBe('right');
  });
});
