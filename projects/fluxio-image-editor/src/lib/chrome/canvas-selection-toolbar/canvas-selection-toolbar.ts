import { Component, input, output } from '@angular/core';

/** Pencil — 24×24 path. */
const EDIT_ICON =
  'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z';

/** Duplicate (two overlapping pages) — 24×24 path. */
const DUPLICATE_ICON =
  'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z';

/** Trash can — 24×24 path. */
const DELETE_ICON =
  'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z';

/** Bring forward — stacked layers up. */
const BRING_FORWARD_ICON =
  'M2 17h16v2H2v-2zm0-4h12v2H2v-2zm0-4h8v2H2V9zm16.5 4.5L22 17l-3.5 3.5-1.42-1.42L18.17 18H13v-2h5.17l-1.09-1.09L18.5 13.5z';

/** Send backward — stacked layers down. */
const SEND_BACKWARD_ICON =
  'M2 7h16V5H2v2zm0 4h12V9H2v2zm0 4h8v-2H2v2zm16.5-1.5L22 9l-3.5-3.5-1.42 1.42L18.17 8H13v2h5.17l-1.09 1.09L18.5 13.5z';

/** Floating contextual actions for the currently selected canvas object. */
@Component({
  selector: 'fluxio-canvas-selection-toolbar',
  template: `
    <div
      class="fluxio-cst"
      role="toolbar"
      [attr.aria-label]="ariaLabel()"
      (pointerdown)="$event.stopPropagation()"
      (click)="$event.stopPropagation()"
    >
      @if (showEdit()) {
        <button
          type="button"
          class="fluxio-cst__btn"
          [attr.aria-label]="editLabel()"
          [attr.title]="editLabel()"
          (click)="edit.emit()"
        >
          <svg
            class="fluxio-cst__icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="editIcon" fill="currentColor" />
          </svg>
        </button>
      }
      @if (showDuplicate()) {
        <button
          type="button"
          class="fluxio-cst__btn"
          [attr.aria-label]="duplicateLabel()"
          [attr.title]="duplicateLabel()"
          (click)="duplicate.emit()"
        >
          <svg
            class="fluxio-cst__icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="duplicateIcon" fill="currentColor" />
          </svg>
        </button>
      }
      @if (showReorder()) {
        <button
          type="button"
          class="fluxio-cst__btn"
          [attr.aria-label]="bringForwardLabel()"
          [attr.title]="bringForwardLabel()"
          [disabled]="!canBringForward()"
          (click)="bringForward.emit()"
        >
          <svg
            class="fluxio-cst__icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="bringForwardIcon" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="fluxio-cst__btn"
          [attr.aria-label]="sendBackwardLabel()"
          [attr.title]="sendBackwardLabel()"
          [disabled]="!canSendBackward()"
          (click)="sendBackward.emit()"
        >
          <svg
            class="fluxio-cst__icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="sendBackwardIcon" fill="currentColor" />
          </svg>
        </button>
      }
      @if (showDelete()) {
        <button
          type="button"
          class="fluxio-cst__btn"
          [attr.aria-label]="deleteLabel()"
          [attr.title]="deleteLabel()"
          (click)="deleteSelected.emit()"
        >
          <svg
            class="fluxio-cst__icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="deleteIcon" fill="currentColor" />
          </svg>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      pointer-events: auto;
    }

    .fluxio-cst {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid rgb(255 255 255 / 14%);
      background: rgb(22 22 24 / 94%);
      box-shadow:
        0 1px 0 rgb(255 255 255 / 8%) inset,
        0 6px 20px rgb(0 0 0 / 45%);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .fluxio-cst__btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: #f5f5f7;
      cursor: pointer;
      transition:
        background-color 120ms ease,
        color 120ms ease,
        opacity 120ms ease;
    }

    .fluxio-cst__btn:hover:not(:disabled) {
      background: rgb(255 255 255 / 14%);
    }

    .fluxio-cst__btn:focus-visible {
      outline: 2px solid rgb(255 255 255 / 55%);
      outline-offset: 1px;
      background: rgb(255 255 255 / 14%);
    }

    .fluxio-cst__btn:active:not(:disabled) {
      background: rgb(255 255 255 / 20%);
    }

    .fluxio-cst__btn:disabled {
      opacity: 0.35;
      cursor: default;
    }

    .fluxio-cst__icon {
      display: block;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      pointer-events: none;
    }
  `,
})
export class CanvasSelectionToolbarComponent {
  readonly ariaLabel = input('');
  readonly editLabel = input('');
  readonly duplicateLabel = input('');
  readonly deleteLabel = input('');
  readonly bringForwardLabel = input('');
  readonly sendBackwardLabel = input('');
  readonly showEdit = input(true);
  readonly showDuplicate = input(true);
  readonly showReorder = input(true);
  readonly showDelete = input(true);
  readonly canBringForward = input(true);
  readonly canSendBackward = input(true);

  readonly edit = output<void>();
  readonly duplicate = output<void>();
  readonly bringForward = output<void>();
  readonly sendBackward = output<void>();
  readonly deleteSelected = output<void>();

  protected readonly editIcon = EDIT_ICON;
  protected readonly duplicateIcon = DUPLICATE_ICON;
  protected readonly deleteIcon = DELETE_ICON;
  protected readonly bringForwardIcon = BRING_FORWARD_ICON;
  protected readonly sendBackwardIcon = SEND_BACKWARD_ICON;
}
