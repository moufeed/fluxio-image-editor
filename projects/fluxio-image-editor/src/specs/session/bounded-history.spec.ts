import { describe, expect, it } from 'vitest';

import { BoundedHistory, type HistoryEntry } from 'fluxio-image-editor/core';

function entry(id: string): HistoryEntry {
  return {
    id,
    commandId: 'test',
    label: id,
    before: null,
    after: null,
    generationBefore: 0,
    generationAfter: 1,
    timestamp: 0,
  };
}

describe('BoundedHistory ring buffer', () => {
  it('pushes in order without dropping under the limit', () => {
    const history = new BoundedHistory(3);
    history.push(entry('a'));
    history.push(entry('b'));
    expect(history.snapshot().past.map((e) => e.id)).toEqual(['a', 'b']);
    expect(history.snapshot().canUndo).toBe(true);
    expect(history.snapshot().canRedo).toBe(false);
  });

  it('drops the oldest entry when capacity is exceeded', () => {
    const history = new BoundedHistory(3);
    history.push(entry('a'));
    history.push(entry('b'));
    history.push(entry('c'));
    history.push(entry('d'));
    expect(history.snapshot().past.map((e) => e.id)).toEqual(['b', 'c', 'd']);
  });

  it('undo / redo round-trips and clears future on new push', () => {
    const history = new BoundedHistory(5);
    history.push(entry('a'));
    history.push(entry('b'));
    history.push(entry('c'));

    expect(history.undo()?.id).toBe('c');
    expect(history.undo()?.id).toBe('b');
    expect(history.snapshot().past.map((e) => e.id)).toEqual(['a']);
    expect(history.snapshot().future.map((e) => e.id)).toEqual(['c', 'b']);

    expect(history.redo()?.id).toBe('b');
    expect(history.snapshot().past.map((e) => e.id)).toEqual(['a', 'b']);

    history.push(entry('x'));
    expect(history.snapshot().past.map((e) => e.id)).toEqual(['a', 'b', 'x']);
    expect(history.snapshot().future).toEqual([]);
    expect(history.snapshot().canRedo).toBe(false);
  });

  it('clear resets both stacks', () => {
    const history = new BoundedHistory(2);
    history.push(entry('a'));
    history.push(entry('b'));
    history.undo();
    history.clear();
    expect(history.snapshot()).toEqual({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  });
});
