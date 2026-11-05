import { Component, computed, inject } from '@angular/core';

import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { RulersTool } from '../../editor-shell/tools/rulers.tool';
import { ToolControlsBase } from '../tool-controls-base';

const GRID_PRESETS = [0, 8, 16, 32, 64] as const;
const SNAP_PRESETS = [0, 4, 8, 12, 16] as const;

@Component({
  selector: 'fluxio-rulers-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './rulers-controls.html',
})
export class FluxioRulersControls extends ToolControlsBase {
  private readonly rulersTool = inject(RulersTool);

  protected readonly markupSnap = this.presentation.markupSnap;
  protected readonly gridPresets = GRID_PRESETS;
  protected readonly snapPresets = SNAP_PRESETS;
  protected readonly snapToContextActive = computed(() => {
    const snap = this.markupSnap();
    return snap.snapToContext && snap.snapThreshold > 0;
  });

  protected gridLabel(size: number): string {
    return size <= 0 ? this.t('rulers.off') : `${size}`;
  }

  protected snapLabel(size: number): string {
    return size <= 0 ? this.t('rulers.off') : `${size}`;
  }

  protected onGridSize(size: number): void {
    this.rulersTool.setGridSize(size);
  }

  protected onSnapThreshold(size: number): void {
    this.rulersTool.setSnapThreshold(size);
  }

  protected onToggleShowGrid(): void {
    this.rulersTool.toggleShowGrid();
  }

  protected onToggleShowRulers(): void {
    this.rulersTool.toggleShowRulers();
  }

  protected onToggleSnapToContext(): void {
    this.rulersTool.toggleSnapToContext();
  }

  protected onAddVertical(): void {
    this.rulersTool.addGuide('x');
  }

  protected onAddHorizontal(): void {
    this.rulersTool.addGuide('y');
  }

  protected onClearGuides(): void {
    this.rulersTool.clearGuides();
  }

  protected onReset(): void {
    this.rulersTool.reset();
  }

  protected onDone(): void {
    this.rulersTool.cancel();
  }
}
