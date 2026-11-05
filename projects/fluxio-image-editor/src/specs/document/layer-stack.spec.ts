import {
  createDefaultTextAnnotation,
  groupAnnotationsByIds,
  isAnnotationLocked,
  isAnnotationVisible,
  normalizeAnnotation,
  normalizeAnnotationBlendMode,
  normalizeAnnotationLayerProps,
  patchAnnotationLayerProps,
  reorderAnnotationLayerById,
  ungroupAnnotationsByGroupId,
  type Annotation,
} from 'fluxio-image-editor/core';

function text(id: string, patch: Partial<Annotation> = {}): Annotation {
  return normalizeAnnotation({
    ...createDefaultTextAnnotation({ width: 400, height: 300 }),
    id,
    text: id,
    ...patch,
  } as Annotation);
}

describe('annotation layer props', () => {
  it('normalizes visibility, lock, blend, and folder fields', () => {
    const layer = normalizeAnnotationLayerProps({
      opacity: 1.5,
      visible: false,
      locked: true,
      blendMode: 'multiply',
      name: '  Hero  ',
      groupId: 'grp_1',
      groupName: '  Banner  ',
    });
    expect(layer).toEqual({
      opacity: 1,
      visible: false,
      locked: true,
      blendMode: 'multiply',
      name: 'Hero',
      groupId: 'grp_1',
      groupName: 'Banner',
    });
    expect(normalizeAnnotationBlendMode('nope')).toBe('normal');
  });

  it('defaults missing layer props to visible unlocked normal', () => {
    const annotation = normalizeAnnotation(text('a'));
    expect(isAnnotationVisible(annotation)).toBe(true);
    expect(isAnnotationLocked(annotation)).toBe(false);
    expect(annotation.blendMode).toBe('normal');
  });
});

describe('layer stack grouping', () => {
  it('groups selected annotations into a contiguous folder block', () => {
    const stack = [text('a'), text('b'), text('c')];
    const next = groupAnnotationsByIds(stack, ['a', 'c'], 'Pack');
    expect(next).toHaveLength(3);
    const grouped = next.filter((item) => item.groupId);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.groupId).toBe(grouped[1]?.groupId);
    expect(grouped[0]?.groupName).toBe('Pack');
    const first = next.findIndex((item) => item.groupId);
    expect(next[first + 1]?.groupId).toBe(next[first]?.groupId);
  });

  it('ungroups a folder and clears group fields', () => {
    const stacked = groupAnnotationsByIds([text('a'), text('b')], ['a', 'b'], 'G');
    const groupId = stacked[0]?.groupId;
    expect(groupId).toBeTruthy();
    const next = ungroupAnnotationsByGroupId(stacked, groupId!);
    expect(next.every((item) => !item.groupId)).toBe(true);
  });

  it('moves a whole folder block when reordering a member', () => {
    const stacked = groupAnnotationsByIds(
      [text('a'), text('b'), text('c')],
      ['a', 'b'],
      'G',
    );
    const next = reorderAnnotationLayerById(stacked, stacked[0]!.id, 'front');
    const groupId = next.find((item) => item.groupId)?.groupId;
    const indices = next
      .map((item, index) => (item.groupId === groupId ? index : -1))
      .filter((index) => index >= 0);
    expect(indices.length).toBe(2);
    expect(indices[1]).toBe(indices[0]! + 1);
    expect(indices[1]).toBe(next.length - 1);
  });

  it('does not reorder locked annotations', () => {
    const stack = [text('a', { locked: true }), text('b')];
    expect(reorderAnnotationLayerById(stack, 'a', 'front')).toBe(stack);
  });

  it('patches visibility without touching other items', () => {
    const stack = [text('a'), text('b')];
    const next = patchAnnotationLayerProps(stack, 'a', { visible: false });
    expect(isAnnotationVisible(next[0]!)).toBe(false);
    expect(isAnnotationVisible(next[1]!)).toBe(true);
  });
});
