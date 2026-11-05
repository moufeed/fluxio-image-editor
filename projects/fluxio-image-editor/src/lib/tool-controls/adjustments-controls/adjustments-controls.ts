import { Component, inject } from '@angular/core';

import type { AdjustmentsState } from 'fluxio-image-editor/core';

import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-adjustments-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './adjustments-controls.html',
})
export class FluxioAdjustmentsControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly adjustmentSliders = this.presentation.adjustmentSliders;

  protected adjustmentUiValue(key: keyof AdjustmentsState): number {
    return this.presentation.adjustmentUiValue(key);
  }
  protected adjustmentSliderFillPercent(slider: {
    readonly key: keyof AdjustmentsState;
    readonly min: number;
    readonly max: number;
  }): number {
    return this.presentation.adjustmentSliderFillPercent(slider);
  }
  protected onAdjustmentSliderInput(key: keyof AdjustmentsState, uiValue: number): void {
    this.rasterPreview.updateAdjustment(key, uiValue);
  }
  protected resetDraftAdjustments(): void {
    this.rasterPreview.resetAdjustments();
  }
  protected cancelAdjustments(): void {
    this.rasterPreview.cancelAdjustments();
  }
  protected applyAdjustments(): Promise<void> {
    return this.rasterPreview.applyAdjustments();
  }
}
