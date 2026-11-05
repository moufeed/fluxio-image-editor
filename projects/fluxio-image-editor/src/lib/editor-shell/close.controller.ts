import { inject, Injectable } from '@angular/core';

import type { ConfirmCloseEvent, EditorClosedEvent } from './editor-events';
import { EditorPresentationStore } from './editor-presentation.store';
import { EditorShellContext } from './editor-shell.context';

/**
 * Host close / unsaved-changes confirmation for the editor shell.
 */
@Injectable()
export class CloseController {
  private readonly shell = inject(EditorShellContext);
  private readonly presentation = inject(EditorPresentationStore);

  requestClose(handlers: {
    readonly emitConfirmClose: (event: ConfirmCloseEvent) => void;
    readonly emitClosed: (event: EditorClosedEvent) => void;
  }): void {
    const session = this.shell.getSession();
    const dirty = session?.isDirty() ?? false;
    if (dirty && this.presentation.warnOnUnsaved()) {
      if (this.shell.config().close?.useCustomConfirm) {
        handlers.emitConfirmClose({
          dirty,
          resolve: (confirmed: boolean) => {
            handlers.emitClosed({ dirty, confirmed });
          },
        });
        return;
      }
      const ok = globalThis.confirm?.(this.presentation.t('close.unsaved'));
      if (!ok) {
        handlers.emitClosed({ dirty, confirmed: false });
        return;
      }
    }
    handlers.emitClosed({ dirty, confirmed: true });
  }
}
