import { Component, inject, output } from '@angular/core';

import { CompareController } from '../../editor-shell/compare.controller';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { ToolbarController } from '../../editor-shell/toolbar.controller';

/**
 * Top chrome toolbar: zoom, history, compare, plugin actions, export menu, close.
 */
@Component({
  selector: 'fluxio-editor-toolbar',
  templateUrl: './editor-toolbar.html',
  host: {
    class: 'fluxio-editor-toolbar-host',
    // Participate in the shell CSS grid via the inner header's grid-area.
    style: 'display: contents',
  },
})
export class EditorToolbarComponent {
  readonly closeRequest = output<void>();

  protected readonly presentation = inject(EditorPresentationStore);
  protected readonly toolbar = inject(ToolbarController);
  protected readonly compare = inject(CompareController);
}
