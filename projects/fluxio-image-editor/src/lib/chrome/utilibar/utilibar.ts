import { Component, computed, input, output } from '@angular/core';

import type { EditorToolbarPosition } from 'fluxio-image-editor/core';

/** View model for one utilibar tool action button. */
export interface UtilibarAction {
  readonly id: string;
  readonly label: string;
  readonly iconPath: string | null;
  readonly showIcon: boolean;
  readonly showLabel: boolean;
  readonly active: boolean;
}

/** Top-level utilibar entry: tool button or group that opens a sub-rail. */
export interface UtilibarItem {
  readonly kind: 'action' | 'group';
  readonly id: string;
  readonly label: string;
  readonly iconPath: string | null;
  readonly showIcon: boolean;
  readonly showLabel: boolean;
  readonly active: boolean;
  readonly expanded?: boolean;
  readonly children?: readonly UtilibarAction[];
}

/**
 * Side utility rail for plugin tool actions (crop, rotate, shapes, …).
 * Expanded groups open a secondary sub-rail beside this rail (not a dropdown).
 */
@Component({
  selector: 'fluxio-utilibar',
  templateUrl: './utilibar.html',
  styleUrl: './utilibar.scss',
  host: {
    class: 'fluxio-utilibar-host fluxio-image-editor__utilibar',
    '[attr.data-pos]': 'position()',
    '[attr.data-subrail]': 'expandedGroup() ? "true" : null',
  },
})
export class UtilibarComponent {
  readonly actions = input.required<readonly UtilibarItem[]>();
  readonly position = input<EditorToolbarPosition>('left');
  readonly disabled = input(false);
  readonly ariaLabel = input.required<string>();
  readonly toolsAriaLabel = input.required<string>();

  readonly actionSelect = output<string>();

  protected readonly expandedGroup = computed(
    () => this.actions().find((item) => item.kind === 'group' && item.expanded) ?? null,
  );

  protected onActionClick(actionId: string): void {
    this.actionSelect.emit(actionId);
  }
}
