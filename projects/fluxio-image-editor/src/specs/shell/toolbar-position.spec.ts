import {
  PluginRegistry,
  sortByToolbarPosition,
  compareToolbarPosition,
  type ImageEditorPlugin,
} from 'fluxio-image-editor/core';

describe('toolbar position ordering', () => {
  it('sorts lower position first and keeps registration order for ties / omitted', () => {
    const sorted = sortByToolbarPosition([
      { id: 'c', position: 30 },
      { id: 'unpositioned-a' },
      { id: 'a', position: 10 },
      { id: 'b', position: 10 },
      { id: 'unpositioned-b' },
      { id: 'd', position: 20 },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      'a',
      'b',
      'd',
      'c',
      'unpositioned-a',
      'unpositioned-b',
    ]);
  });

  it('compares omitted positions as after all numbered ones', () => {
    expect(compareToolbarPosition(5, undefined)).toBeLessThan(0);
    expect(compareToolbarPosition(undefined, 5)).toBeGreaterThan(0);
    expect(compareToolbarPosition(undefined, undefined)).toBe(0);
  });

  it('PluginRegistry returns toolbar actions sorted by position', () => {
    const registry = new PluginRegistry();
    const lateFirst: ImageEditorPlugin = {
      id: 'late-first',
      setup(context) {
        context.registerToolbarAction({ id: 'late', label: 'Late', position: 50 });
      },
    };
    const earlySecond: ImageEditorPlugin = {
      id: 'early-second',
      setup(context) {
        context.registerToolbarAction({ id: 'early', label: 'Early', position: 10 });
      },
    };
    registry.register(lateFirst, () => undefined);
    registry.register(earlySecond, () => undefined);
    expect(registry.getToolbarActions().map((action) => action.id)).toEqual(['early', 'late']);
  });
});
