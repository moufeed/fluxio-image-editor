import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { EditorSession } from 'fluxio-image-editor/core';

import { EditorShellContext } from '../../lib/editor-shell/editor-shell.context';
import { ModeLifecycleController } from '../../lib/editor-shell/mode-lifecycle.controller';
import { provideEditorShell } from '../../lib/editor-shell/provide-editor-shell';
import { ToolbarController } from '../../lib/editor-shell/toolbar.controller';

describe('ToolbarController host action emit', () => {
  it('emits (action) for registered actions the shell does not handle', async () => {
    const emitAction = vi.fn();
    TestBed.configureTestingModule({
      providers: [...provideEditorShell()],
    });

    const shell = TestBed.inject(EditorShellContext);
    shell.emitAction = emitAction;
    shell.config = () => ({});
    shell.session.set({
      getToolbarGroups: () => [],
      getToolbarActions: () => [
        { id: 'host.save', label: 'Save PNG', icon: 'export', surface: 'toolbar' },
      ],
    } as unknown as EditorSession);

    TestBed.inject(ModeLifecycleController).bind();
    const toolbar = TestBed.inject(ToolbarController);
    await toolbar.onToolbarAction('host.save');

    expect(emitAction).toHaveBeenCalledWith({ id: 'host.save' });
  });

  it('does not emit for unknown unregistered action ids', async () => {
    const emitAction = vi.fn();
    TestBed.configureTestingModule({
      providers: [...provideEditorShell()],
    });

    const shell = TestBed.inject(EditorShellContext);
    shell.emitAction = emitAction;
    shell.config = () => ({});
    shell.session.set({
      getToolbarGroups: () => [],
      getToolbarActions: () => [],
    } as unknown as EditorSession);

    TestBed.inject(ModeLifecycleController).bind();
    const toolbar = TestBed.inject(ToolbarController);
    await toolbar.onToolbarAction('not.registered');

    expect(emitAction).not.toHaveBeenCalled();
  });
});
