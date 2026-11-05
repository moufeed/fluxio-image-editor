import { describe, expect, it } from 'vitest';

import { resolveToolHotkey, TOOL_HOTKEYS } from '../../lib/editor-shell/helpers/tool-hotkeys';

describe('tool hotkeys map (PV35)', () => {
  it('maps primary tools with case-insensitive letters', () => {
    expect(resolveToolHotkey('c')).toBe('crop.tool');
    expect(resolveToolHotkey('T')).toBe('text.tool');
    expect(resolveToolHotkey('b')).toBe('drawing.tool');
    expect(resolveToolHotkey('h')).toBe('history.panel');
    expect(resolveToolHotkey('l')).toBe('layers.panel');
  });

  it('ignores non-letter and unmapped keys', () => {
    expect(resolveToolHotkey('Enter')).toBeNull();
    expect(resolveToolHotkey('1')).toBeNull();
    expect(resolveToolHotkey('q')).toBeNull();
  });

  it('keeps hotkey keys unique', () => {
    const values = Object.values(TOOL_HOTKEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});
