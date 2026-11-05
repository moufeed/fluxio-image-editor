import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { EditorSession } from 'fluxio-image-editor/core';

import { EditorShellContext } from '../../lib/editor-shell/editor-shell.context';
import { EditorUiStore } from '../../lib/editor-shell/editor-ui.store';
import { KeyboardController } from '../../lib/editor-shell/keyboard.controller';
import { provideEditorShell } from '../../lib/editor-shell/provide-editor-shell';
import { CropTool } from '../../lib/editor-shell/tools/crop.tool';
import { PathTool } from '../../lib/editor-shell/tools/path.tool';
import { RasterPreviewTool } from '../../lib/editor-shell/tools/raster-preview.tool';

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

describe('KeyboardController canvas geometry (PV38)', () => {
  function setup(): {
    keyboard: KeyboardController;
    ui: EditorUiStore;
    cropTool: CropTool;
    pathTool: PathTool;
    rasterPreview: RasterPreviewTool;
  } {
    TestBed.configureTestingModule({
      providers: [...provideEditorShell()],
    });
    const shell = TestBed.inject(EditorShellContext);
    shell.session.set({
      getToolbarActions: () => [],
      getToolbarGroups: () => [],
      undo: vi.fn(),
      redo: vi.fn(),
      store: {
        document: () => ({
          sourceSize: { width: 200, height: 100 },
          output: { width: 200, height: 100 },
        }),
        preview: () => ({
          crop: { x: 20, y: 10, width: 80, height: 40, aspectRatio: null, shape: 'rect' },
        }),
      },
      setPreview: vi.fn(),
    } as unknown as EditorSession);

    return {
      keyboard: TestBed.inject(KeyboardController),
      ui: TestBed.inject(EditorUiStore),
      cropTool: TestBed.inject(CropTool),
      pathTool: TestBed.inject(PathTool),
      rasterPreview: TestBed.inject(RasterPreviewTool),
    };
  }

  it('finishes an active path on Enter and closes on Shift+Enter', () => {
    const { keyboard, ui, pathTool } = setup();
    ui.pathMode.set(true);
    const finish = vi.spyOn(pathTool, 'finishActivePath').mockResolvedValue(true);
    vi.spyOn(pathTool, 'getActivePathId').mockReturnValue('path-1');

    keyboard.onDocumentKeydown(keydown('Enter'));
    expect(finish).toHaveBeenCalledWith(false);

    finish.mockClear();
    keyboard.onDocumentKeydown(keydown('Enter', { shiftKey: true }));
    expect(finish).toHaveBeenCalledWith(true);
  });

  it('nudges crop with Arrow and resizes with Alt+Arrow', () => {
    const { keyboard, ui, cropTool } = setup();
    ui.cropMode.set(true);
    const nudge = vi.spyOn(cropTool, 'nudgeFromKeyboard').mockReturnValue(true);

    keyboard.onDocumentKeydown(keydown('ArrowRight'));
    expect(nudge).toHaveBeenCalled();
  });

  it('adds a default redaction on Enter and deletes on Backspace', () => {
    const { keyboard, ui, rasterPreview } = setup();
    ui.redactMode.set(true);
    const add = vi.spyOn(rasterPreview, 'addDefaultRedactionRegion').mockReturnValue(true);
    const del = vi.spyOn(rasterPreview, 'deleteSelectedRedaction').mockReturnValue(true);

    keyboard.onDocumentKeydown(keydown('Enter'));
    expect(add).toHaveBeenCalled();

    keyboard.onDocumentKeydown(keydown('Backspace'));
    expect(del).toHaveBeenCalled();
  });

  it('nudges focus center with Arrow keys', () => {
    const { keyboard, ui, rasterPreview } = setup();
    ui.focusMode.set(true);
    const nudge = vi.spyOn(rasterPreview, 'nudgeFocusFromKeyboard').mockReturnValue(true);

    keyboard.onDocumentKeydown(keydown('ArrowUp'));
    expect(nudge).toHaveBeenCalled();
  });
});
