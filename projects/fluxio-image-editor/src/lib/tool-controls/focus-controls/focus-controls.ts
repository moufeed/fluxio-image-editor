import { Component, computed, inject } from '@angular/core';

import type { FocusMode, FocusState } from 'fluxio-image-editor/core';

import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-focus-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './focus-controls.html',
})
export class FluxioFocusControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly modeChoices = ['radial', 'linear'] as const satisfies readonly Exclude<
    FocusMode,
    'none'
  >[];

  /** Compact SVG paths for focus mode chips (same pattern as color-overlay / crop-mask). */
  protected readonly modeIconPaths: Readonly<Record<Exclude<FocusMode, 'none'>, string>> = {
    radial:
      'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
    linear: 'M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z',
  };

  protected readonly focusModeValue = computed(() => this.presentation.draftFocus().mode);

  protected readonly visibleFocusSliders = computed(() => {
    const mode = this.focusModeValue();
    return this.presentation.focusSliders.filter(
      (slider) => !slider.linearOnly || mode === 'linear',
    );
  });

  protected focusUiValue(key: Exclude<keyof FocusState, 'mode'>): number {
    return this.presentation.focusUiValue(key);
  }

  protected focusSliderFillPercent(slider: {
    readonly key: Exclude<keyof FocusState, 'mode'>;
    readonly min: number;
    readonly max: number;
  }): number {
    return this.presentation.focusSliderFillPercent(slider);
  }

  protected onModeChange(mode: FocusMode): void {
    this.rasterPreview.setFocusMode(mode);
  }

  protected onFocusSliderInput(key: Exclude<keyof FocusState, 'mode'>, uiValue: number): void {
    this.rasterPreview.updateFocus(key, uiValue);
  }

  protected resetFocus(): void {
    this.rasterPreview.resetFocus();
  }

  protected cancelFocus(): void {
    this.rasterPreview.cancelFocus();
  }

  protected applyFocus(): Promise<void> {
    return this.rasterPreview.applyFocus();
  }
}
