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
    void this.requestDiscardConfirmation({
      messageKey: 'close.unsaved',
      emitConfirmClose: handlers.emitConfirmClose,
    }).then((confirmed) => {
      const dirty = this.shell.getSession()?.isDirty() ?? false;
      handlers.emitClosed({ dirty, confirmed });
    });
  }

  /**
   * Shared dirty gate for close and Open replace.
   * When not dirty / warn off → true. Custom confirm uses `(confirmClose)` without emitting closed.
   */
  requestDiscardConfirmation(options: {
    readonly messageKey: string;
    readonly emitConfirmClose: (event: ConfirmCloseEvent) => void;
  }): Promise<boolean> {
    const session = this.shell.getSession();
    const dirty = session?.isDirty() ?? false;
    if (!dirty || !this.presentation.warnOnUnsaved()) {
      return Promise.resolve(true);
    }

    if (this.shell.config().close?.useCustomConfirm) {
      return new Promise<boolean>((resolve) => {
        options.emitConfirmClose({
          dirty: true,
          resolve: (confirmed: boolean) => resolve(confirmed),
        });
      });
    }

    const ok = globalThis.confirm?.(this.presentation.t(options.messageKey));
    return Promise.resolve(!!ok);
  }
}
