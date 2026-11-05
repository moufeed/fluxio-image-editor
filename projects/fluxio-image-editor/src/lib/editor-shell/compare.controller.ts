import { inject, Injectable } from '@angular/core';

import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';

@Injectable()
export class CompareController {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private holdStartedAt = 0;
  private suppressClick = false;

  pointerDown(event: PointerEvent): void {
    const session = this.shell.getSession();
    if (!session?.store.isReady() || event.button !== 0) {
      return;
    }
    this.holdStartedAt = performance.now();
    this.suppressClick = false;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.apply(true);
  }

  pointerUp(event: PointerEvent): void {
    if (
      event.button !== 0 &&
      event.type !== 'pointercancel' &&
      event.type !== 'lostpointercapture'
    ) {
      return;
    }
    const heldMs = performance.now() - this.holdStartedAt;
    if (heldMs >= 200 || event.type === 'pointercancel') {
      this.suppressClick = heldMs >= 200;
      if (!this.ui.compareLatched()) {
        this.apply(false);
      }
    }
  }

  click(event: Event): void {
    event.preventDefault();
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const next = !this.ui.compareLatched();
    this.ui.compareLatched.set(next);
    this.apply(next);
  }

  clear(): void {
    this.ui.compareLatched.set(false);
    this.apply(false);
  }

  private apply(active: boolean): void {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    session.setCompareOriginal(active);
    this.ui.comparingOriginal.set(session.isComparingOriginal());
  }
}
