import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { EditorSession } from 'fluxio-image-editor/core';

import { EditorShellContext } from '../../lib/editor-shell/editor-shell.context';
import { EditorUiStore } from '../../lib/editor-shell/editor-ui.store';
import { KeyboardController } from '../../lib/editor-shell/keyboard.controller';
import { provideEditorShell } from '../../lib/editor-shell/provide-editor-shell';
import { ToolbarController } from '../../lib/editor-shell/toolbar.controller';

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

describe('KeyboardController tool hotkeys (PV35)', () => {
  function setup(actionIds: readonly string[] = ['crop.tool', 'text.tool', 'drawing.tool']): {
    keyboard: KeyboardController;
    onToolbarAction: ReturnType<typeof vi.fn>;
    ui: EditorUiStore;
  } {
    TestBed.configureTestingModule({
      providers: [...provideEditorShell()],
    });
    const shell = TestBed.inject(EditorShellContext);
    shell.session.set({
      getToolbarActions: () => actionIds.map((id) => ({ id })),
      getToolbarGroups: () => [],
      undo: vi.fn(),
      redo: vi.fn(),
    } as unknown as EditorSession);

    const toolbar = TestBed.inject(ToolbarController);
    const onToolbarAction = vi.fn().mockResolvedValue(undefined);
    toolbar.onToolbarAction = onToolbarAction;

    return {
      keyboard: TestBed.inject(KeyboardController),
      onToolbarAction,
      ui: TestBed.inject(EditorUiStore),
    };
  }

  it('activates registered tools via letter keys', () => {
    const { keyboard, onToolbarAction } = setup();

    const crop = keydown('c');
    keyboard.onDocumentKeydown(crop);
    expect(crop.defaultPrevented).toBe(true);
    expect(onToolbarAction).toHaveBeenCalledWith('crop.tool');

    onToolbarAction.mockClear();
    keyboard.onDocumentKeydown(keydown('t'));
    expect(onToolbarAction).toHaveBeenCalledWith('text.tool');

    onToolbarAction.mockClear();
    keyboard.onDocumentKeydown(keydown('B'));
    expect(onToolbarAction).toHaveBeenCalledWith('drawing.tool');
  });

  it('ignores unregistered tools and modifier combinations', () => {
    const { keyboard, onToolbarAction } = setup(['crop.tool']);

    keyboard.onDocumentKeydown(keydown('t'));
    expect(onToolbarAction).not.toHaveBeenCalled();

    keyboard.onDocumentKeydown(keydown('c', { ctrlKey: true }));
    expect(onToolbarAction).not.toHaveBeenCalled();

    keyboard.onDocumentKeydown(keydown('c', { shiftKey: true }));
    expect(onToolbarAction).not.toHaveBeenCalled();
  });

  it('does not steal keys from inputs or while editing text', () => {
    const { keyboard, onToolbarAction, ui } = setup();

    const input = document.createElement('input');
    keyboard.onDocumentKeydown(keydown('c', { target: input }));
    expect(onToolbarAction).not.toHaveBeenCalled();

    ui.editingTextId.set('text-1');
    keyboard.onDocumentKeydown(keydown('c'));
    expect(onToolbarAction).not.toHaveBeenCalled();
  });
});
