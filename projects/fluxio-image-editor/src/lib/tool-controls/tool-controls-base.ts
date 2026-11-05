import { inject } from '@angular/core';

import { EditorPresentationStore } from '../editor-shell/editor-presentation.store';

/**
 * Shared base for per-tool control components. Provides access to the editor
 * presentation store (state) and the `t()` translation helper. All state and
 * tool services are provided by the parent `FluxioImageEditor` and resolved through
 * the element-injector hierarchy — child components must not re-provide them.
 */
export abstract class ToolControlsBase {
  protected readonly presentation = inject(EditorPresentationStore);

  protected t(key: string): string {
    return this.presentation.t(key);
  }

  /** Resolve `t(key)` and replace `{name}` placeholders. */
  protected tf(key: string, params: Readonly<Record<string, string | number>>): string {
    let message = this.t(key);
    for (const [name, value] of Object.entries(params)) {
      message = message.replaceAll(`{${name}}`, String(value));
    }
    return message;
  }
}
