import { TestBed } from '@angular/core/testing';

import { CloseController } from '../../lib/editor-shell/close.controller';
import { EditorPresentationStore } from '../../lib/editor-shell/editor-presentation.store';
import { EditorShellContext } from '../../lib/editor-shell/editor-shell.context';
import { EditorUiStore } from '../../lib/editor-shell/editor-ui.store';
import { provideEditorShell } from '../../lib/editor-shell/provide-editor-shell';

describe('CloseController.requestDiscardConfirmation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideEditorShell()],
    });
  });

  it('returns true when the session is not dirty', async () => {
    const shell = TestBed.inject(EditorShellContext);
    shell.config = () => ({ close: { warnOnUnsaved: true } });
    const close = TestBed.inject(CloseController);
    await expect(
      close.requestDiscardConfirmation({
        messageKey: 'open.replaceConfirm',
        emitConfirmClose: () => undefined,
      }),
    ).resolves.toBe(true);
  });

  it('uses custom confirmClose when dirty and useCustomConfirm is set', async () => {
    const shell = TestBed.inject(EditorShellContext);
    shell.config = () => ({ close: { warnOnUnsaved: true, useCustomConfirm: true } });
    // Presentation warnOnUnsaved reads config; ensure store sees it via shell.
    TestBed.inject(EditorUiStore);
    TestBed.inject(EditorPresentationStore);

    const session = {
      isDirty: () => true,
    };
    shell.session.set(session as never);

    const close = TestBed.inject(CloseController);
    const captured: { resolve?: (ok: boolean) => void } = {};
    const pending = close.requestDiscardConfirmation({
      messageKey: 'open.replaceConfirm',
      emitConfirmClose: (event) => {
        captured.resolve = event.resolve;
      },
    });

    expect(captured.resolve).toBeTypeOf('function');
    captured.resolve?.(false);
    await expect(pending).resolves.toBe(false);
  });
});
