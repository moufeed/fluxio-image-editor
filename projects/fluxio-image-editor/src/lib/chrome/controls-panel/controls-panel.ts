import { Component, input, ViewEncapsulation } from '@angular/core';

import type { EditorControlsPanelPosition } from 'fluxio-image-editor/core';

/**
 * Side options panel for the active tool.
 * Projects plugin control groups from the editor shell via content projection.
 *
 * Encapsulation is None so inspector rules (namespaced under `fluxio-controls-panel`)
 * style projected tool-control markup the same way the shell sheet did before the split.
 */
@Component({
  selector: 'fluxio-controls-panel',
  template: `
    @if (open()) {
      <section
        class="fluxio-controls-panel"
        role="region"
        [attr.aria-label]="ariaLabel()"
        [attr.data-tool]="activeTool()"
        [attr.data-pos]="position()"
      >
        <div class="fluxio-controls-panel__scroll">
          <ng-content />
        </div>
      </section>
    }
  `,
  styleUrl: './controls-panel.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'fluxio-controls-panel-host',
    '[class.fluxio-controls-panel-host--open]': 'open()',
    '[attr.data-pos]': 'position()',
    '[attr.hidden]': 'open() ? null : true',
  },
})
export class ControlsPanelComponent {
  readonly open = input(false);
  readonly position = input<EditorControlsPanelPosition>('left');
  readonly ariaLabel = input.required<string>();
  readonly activeTool = input<string | null>(null);
}
