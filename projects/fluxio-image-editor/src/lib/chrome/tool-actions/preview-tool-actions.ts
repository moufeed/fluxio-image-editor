import { Component, input, output } from '@angular/core';

/** Reset / Cancel / Apply footer for raster preview tools (adjustments, effects, filters, crop). */
@Component({
  selector: 'fluxio-preview-tool-actions',
  host: {
    class: 'fluxio-image-editor__controls-actions',
  },
  styleUrl: './tool-actions.scss',
  template: `
    @if (showReset()) {
      <button
        type="button"
        class="fluxio-btn fluxio-btn--cancel"
        [disabled]="resetDisabled()"
        (click)="reset.emit()"
      >
        {{ resetLabel() }}
      </button>
    }
    <button
      type="button"
      class="fluxio-btn fluxio-btn--cancel"
      [disabled]="cancelDisabled()"
      (click)="cancel.emit()"
    >
      {{ cancelLabel() }}
    </button>
    <button
      type="button"
      class="fluxio-btn fluxio-btn--done"
      [disabled]="applyDisabled()"
      (click)="apply.emit()"
    >
      {{ applyLabel() }}
    </button>
  `,
})
export class PreviewToolActionsComponent {
  readonly resetLabel = input('');
  readonly cancelLabel = input.required<string>();
  readonly applyLabel = input.required<string>();
  readonly showReset = input(true);
  readonly resetDisabled = input(false);
  readonly cancelDisabled = input(false);
  readonly applyDisabled = input(false);

  readonly reset = output<void>();
  readonly cancel = output<void>();
  readonly apply = output<void>();
}
