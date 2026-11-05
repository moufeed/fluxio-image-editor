import { Component, input, output } from '@angular/core';

/** Done footer for immediate-commit transform modes (rotate, resize). */
@Component({
  selector: 'fluxio-immediate-tool-actions',
  host: {
    class: 'fluxio-image-editor__controls-actions',
  },
  styleUrl: './tool-actions.scss',
  template: `
    <button
      type="button"
      class="fluxio-btn fluxio-btn--done"
      [disabled]="doneDisabled()"
      (click)="done.emit()"
    >
      {{ doneLabel() }}
    </button>
  `,
})
export class ImmediateToolActionsComponent {
  readonly doneLabel = input.required<string>();
  readonly doneDisabled = input(false);

  readonly done = output<void>();
}
