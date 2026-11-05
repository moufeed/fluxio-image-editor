import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { EditorSession } from 'fluxio-image-editor/core';

import { EditorShellContext } from '../../lib/editor-shell/editor-shell.context';
import { EditorUiStore } from '../../lib/editor-shell/editor-ui.store';
import { KeyboardController } from '../../lib/editor-shell/keyboard.controller';
import { provideEditorShell } from '../../lib/editor-shell/provide-editor-shell';

function keydown(
  key: string,
  init: Partial<KeyboardEventInit> & { target?: EventTarget | null } = {},
): KeyboardEvent {
  const { target, ...rest } = init;
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...rest });
  if (target !== undefined) {
    Object.defineProperty(event, 'target', { value: target });
  }
  return event;
}

describe('KeyboardController history shortcuts (PV10)', () => {
  function setup(): {
    keyboard: KeyboardController;
    undo: ReturnType<typeof vi.fn>;
    redo: ReturnType<typeof vi.fn>;
    ui: EditorUiStore;
  } {
    TestBed.configureTestingModule({
      providers: [...provideEditorShell()],
    });
    const undo = vi.fn();
    const redo = vi.fn();
    const shell = TestBed.inject(EditorShellContext);
    shell.session.set({ undo, redo } as unknown as EditorSession);
    return {
      keyboard: TestBed.inject(KeyboardController),
      undo,
      redo,
      ui: TestBed.inject(EditorUiStore),
    };
  }

  it('Ctrl+Z undoes and Meta+Z undoes', () => {
    const { keyboard, undo, redo } = setup();

    const ctrlZ = keydown('z', { ctrlKey: true });
    keyboard.onDocumentKeydown(ctrlZ);
    expect(ctrlZ.defaultPrevented).toBe(true);
    expect(undo).toHaveBeenCalledOnce();
    expect(redo).not.toHaveBeenCalled();

    undo.mockClear();
    const metaZ = keydown('z', { metaKey: true });
    keyboard.onDocumentKeydown(metaZ);
    expect(metaZ.defaultPrevented).toBe(true);
    expect(undo).toHaveBeenCalledOnce();
  });

  it('Ctrl+Shift+Z and Ctrl+Y redo', () => {
    const { keyboard, undo, redo } = setup();

    const shiftZ = keydown('z', { ctrlKey: true, shiftKey: true });
    keyboard.onDocumentKeydown(shiftZ);
    expect(shiftZ.defaultPrevented).toBe(true);
    expect(redo).toHaveBeenCalledOnce();
    expect(undo).not.toHaveBeenCalled();

    redo.mockClear();
    const ctrlY = keydown('y', { ctrlKey: true });
    keyboard.onDocumentKeydown(ctrlY);
    expect(ctrlY.defaultPrevented).toBe(true);
    expect(redo).toHaveBeenCalledOnce();
  });

  it('does not steal undo from inputs or while editing text', () => {
    const { keyboard, undo, redo, ui } = setup();

    const input = document.createElement('input');
    const inInput = keydown('z', { ctrlKey: true, target: input });
    keyboard.onDocumentKeydown(inInput);
    expect(inInput.defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();

    ui.editingTextId.set('text-1');
    const whileEditing = keydown('z', { ctrlKey: true });
    keyboard.onDocumentKeydown(whileEditing);
    expect(whileEditing.defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
  });
});
