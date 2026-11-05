import { Component, input, output } from '@angular/core';

import type { AnnotationOrderAction } from 'fluxio-image-editor/core';

/** Bring to front — layers + jump to top. */
const BRING_TO_FRONT_ICON =
  'M2 19h16v2H2v-2zm0-4h12v2H2v-2zm0-4h8v2H2v-2zm0-4h4v2H2V7zm16.5 1.5L22 5l-3.5-3.5-1.42 1.42L18.17 4H13v2h5.17l-1.09 1.09L18.5 8.5z';

/** Bring forward — layers + step up. */
const BRING_FORWARD_ICON =
  'M2 17h16v2H2v-2zm0-4h12v2H2v-2zm0-4h8v2H2V9zm16.5 4.5L22 17l-3.5 3.5-1.42-1.42L18.17 18H13v-2h5.17l-1.09-1.09L18.5 13.5z';

/** Send backward — layers + step down. */
const SEND_BACKWARD_ICON =
  'M2 7h16V5H2v2zm0 4h12V9H2v2zm0 4h8v-2H2v2zm16.5-1.5L22 9l-3.5-3.5-1.42 1.42L18.17 8H13v2h5.17l-1.09 1.09L18.5 13.5z';

/** Send to back — layers + jump to bottom. */
const SEND_TO_BACK_ICON =
  'M2 5h16V3H2v2zm0 4h12V7H2v2zm0 4h8v-2H2v2zm0 4h4v-2H2v2zm16.5-1.5L22 19l-3.5 3.5-1.42-1.42L18.17 20H13v-2h5.17l-1.09-1.09L18.5 15.5z';

/**
 * Figma-style arrange controls: front / forward / backward / back as icon buttons.
 * Used in the controls panel inspector instead of a "More actions" menu.
 */
@Component({
  selector: 'fluxio-order-actions',
  host: {
    class: 'fluxio-order-actions',
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
  },
  template: `
    <button
      type="button"
      class="fluxio-order-actions__btn"
      [disabled]="disabled() || !canFront()"
      [attr.aria-label]="bringToFrontLabel()"
      [attr.title]="bringToFrontLabel()"
      (click)="reorder.emit('front')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path [attr.d]="bringToFrontIcon" fill="currentColor" />
      </svg>
    </button>
    <button
      type="button"
      class="fluxio-order-actions__btn"
      [disabled]="disabled() || !canForward()"
      [attr.aria-label]="bringForwardLabel()"
      [attr.title]="bringForwardLabel()"
      (click)="reorder.emit('forward')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path [attr.d]="bringForwardIcon" fill="currentColor" />
      </svg>
    </button>
    <button
      type="button"
      class="fluxio-order-actions__btn"
      [disabled]="disabled() || !canBackward()"
      [attr.aria-label]="sendBackwardLabel()"
      [attr.title]="sendBackwardLabel()"
      (click)="reorder.emit('backward')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path [attr.d]="sendBackwardIcon" fill="currentColor" />
      </svg>
    </button>
    <button
      type="button"
      class="fluxio-order-actions__btn"
      [disabled]="disabled() || !canBack()"
      [attr.aria-label]="sendToBackLabel()"
      [attr.title]="sendToBackLabel()"
      (click)="reorder.emit('back')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path [attr.d]="sendToBackIcon" fill="currentColor" />
      </svg>
    </button>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.35rem;
      width: 100%;
    }

    .fluxio-order-actions__btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: var(--fluxio-control-h, 2rem);
      margin: 0;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--fluxio-radius-sm, 0.35rem);
      background: var(--fluxio-panel-input-bg, color-mix(in srgb, var(--fluxio-control-bg, #1c222c) 88%, black 12%));
      color: var(--fluxio-text, #eef2f7);
      cursor: pointer;
      transition:
        background-color 140ms ease,
        border-color 140ms ease,
        color 140ms ease,
        opacity 140ms ease;
    }

    .fluxio-order-actions__btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--fluxio-panel-input-bg, #252b36) 70%, white 8%);
      border-color: color-mix(in srgb, var(--fluxio-border, #3a4352) 80%, transparent);
    }

    .fluxio-order-actions__btn:focus-visible {
      outline: 1px solid var(--fluxio-focus, #3aa0ff);
      outline-offset: 1px;
    }

    .fluxio-order-actions__btn:disabled {
      opacity: 0.35;
      cursor: default;
    }

    .fluxio-order-actions__btn svg {
      display: block;
      flex-shrink: 0;
      pointer-events: none;
    }
  `,
})
export class OrderActionsComponent {
  readonly ariaLabel = input.required<string>();
  readonly bringToFrontLabel = input.required<string>();
  readonly bringForwardLabel = input.required<string>();
  readonly sendBackwardLabel = input.required<string>();
  readonly sendToBackLabel = input.required<string>();
  readonly disabled = input(false);
  readonly canFront = input(true);
  readonly canForward = input(true);
  readonly canBackward = input(true);
  readonly canBack = input(true);

  readonly reorder = output<AnnotationOrderAction>();

  protected readonly bringToFrontIcon = BRING_TO_FRONT_ICON;
  protected readonly bringForwardIcon = BRING_FORWARD_ICON;
  protected readonly sendBackwardIcon = SEND_BACKWARD_ICON;
  protected readonly sendToBackIcon = SEND_TO_BACK_ICON;
}
