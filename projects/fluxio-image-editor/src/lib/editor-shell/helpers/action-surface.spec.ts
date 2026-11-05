import {
  ANNOTATIONS_TOOLBAR_GROUP,
  ANNOTATIONS_TOOLBAR_GROUP_ID,
  ANNOTATIONS_TOOL_ACTION_IDS,
} from 'fluxio-image-editor/core';

import {
  expandVisibleActionIds,
  orderGroupChildren,
  resolveActionSurface,
  resolveGroupSurface,
} from './action-surface';

describe('action-surface helpers', () => {
  it('defaults chrome-owned ids to toolbar and tools to utilibar', () => {
    expect(resolveActionSurface({ id: 'history.panel', surface: 'toolbar' })).toBe('toolbar');
    expect(resolveActionSurface({ id: 'compare.original' })).toBe('toolbar');
    expect(resolveActionSurface({ id: 'crop.tool' })).toBe('utilibar');
    expect(resolveActionSurface({ id: 'crop.tool', surface: 'toolbar' })).toBe('toolbar');
    expect(
      resolveActionSurface({ id: 'history.panel', surface: 'toolbar' }, { surface: 'utilibar' }),
    ).toBe('utilibar');
  });

  it('defaults groups to utilibar', () => {
    expect(resolveGroupSurface(ANNOTATIONS_TOOLBAR_GROUP)).toBe('utilibar');
    expect(resolveGroupSurface(ANNOTATIONS_TOOLBAR_GROUP, { surface: 'toolbar' })).toBe('toolbar');
  });

  it('expands the annotations group alias in visibleActions', () => {
    const registered = new Set<string>([
      'crop.tool',
      'text.tool',
      'shapes.tool',
      'drawing.tool',
    ]);
    expect(expandVisibleActionIds(['crop.tool', ANNOTATIONS_TOOLBAR_GROUP_ID], registered)).toEqual([
      'crop.tool',
      'text.tool',
      'shapes.tool',
      'drawing.tool',
    ]);
  });

  it('orders group children by preferred actionIds then remainder', () => {
    expect(
      orderGroupChildren(ANNOTATIONS_TOOLBAR_GROUP, [
        'stickers.tool',
        'emoji.tool',
        'text.tool',
        'path.tool',
      ]),
    ).toEqual(['text.tool', 'path.tool', 'stickers.tool', 'emoji.tool']);
    expect(ANNOTATIONS_TOOL_ACTION_IDS[0]).toBe('text.tool');
  });
});
