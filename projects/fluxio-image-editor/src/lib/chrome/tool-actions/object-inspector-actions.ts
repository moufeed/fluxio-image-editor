import { Component, input, output } from '@angular/core';

/** Delete + Done footer for canvas object tools with immediate semantic commits. */
@Component({
  selector: 'fluxio-object-inspector-actions',
  host: {
    class: 'fluxio-image-editor__controls-actions',
  },
  styleUrl: './tool-actions.scss',
  template: `
    @if (showDelete()) {
      <button
        type="button"
        class="fluxio-btn fluxio-btn--clear"
        [disabled]="deleteDisabled()"
        (click)="deleteSelected.emit()"
      >
        {{ deleteLabel() }}
      </button>
    }
    @if (showSecondary()) {
      <button
        type="button"
        class="fluxio-btn fluxio-btn--clear"
        [disabled]="secondaryDisabled()"
        (click)="secondary.emit()"
      >
        {{ secondaryLabel() }}
      </button>
    }
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
export class ObjectInspectorActionsComponent {
  readonly deleteLabel = input<string>('');
  readonly secondaryLabel = input<string>('');
  readonly doneLabel = input.required<string>();
  readonly showDelete = input(true);
  readonly showSecondary = input(false);
  readonly deleteDisabled = input(true);
  readonly secondaryDisabled = input(false);
  readonly doneDisabled = input(false);

  readonly deleteSelected = output<void>();
  readonly secondary = output<void>();
  readonly done = output<void>();
}
