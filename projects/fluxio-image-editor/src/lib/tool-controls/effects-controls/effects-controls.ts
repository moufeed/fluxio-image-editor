import { Component, inject } from '@angular/core';

import type { EffectsState } from 'fluxio-image-editor/core';

import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-effects-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './effects-controls.html',
})
export class FluxioEffectsControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly effectSliders = this.presentation.effectSliders;

  protected effectUiValue(key: keyof EffectsState): number {
    return this.presentation.effectUiValue(key);
  }
  protected effectSliderFillPercent(slider: {
    readonly key: keyof EffectsState;
    readonly min: number;
    readonly max: number;
  }): number {
    return this.presentation.effectSliderFillPercent(slider);
  }
  protected onEffectSliderInput(key: keyof EffectsState, uiValue: number): void {
    this.rasterPreview.updateEffect(key, uiValue);
  }
  protected resetDraftEffects(): void {
    this.rasterPreview.resetEffects();
  }
  protected cancelEffects(): void {
    this.rasterPreview.cancelEffects();
  }
  protected applyEffects(): Promise<void> {
    return this.rasterPreview.applyEffects();
  }
}
