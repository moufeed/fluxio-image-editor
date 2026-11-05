import { Component, computed, inject } from '@angular/core';

import {
  COLOR_OVERLAY_MODES,
  DEFAULT_OPAQUE_BLACK,
  DEFAULT_OPAQUE_WHITE,
  type ColorOverlayMode,
  type ColorOverlayState,
} from 'fluxio-image-editor/core';

import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-color-overlay-controls',
  imports: [PreviewToolActionsComponent, ColorAlphaFieldComponent],
  templateUrl: './color-overlay-controls.html',
})
export class FluxioColorOverlayControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly modeChoices = COLOR_OVERLAY_MODES;
  protected readonly colorFallbackBlack = DEFAULT_OPAQUE_BLACK;
  protected readonly colorFallbackWhite = DEFAULT_OPAQUE_WHITE;

  /** Compact SVG paths for mode buttons (Figma-style fill type chips). */
  protected readonly modeIconPaths: Readonly<Record<ColorOverlayMode, string>> = {
    none: 'M6 6h12v12H6zm1.6 1.6v8.8h8.8V7.6z',
    solid: 'M6 6h12v12H6z',
    linear: 'M7 7h2.2v10H7zm4.4 0H13.6v10h-2.2zm4.4 0H18v10h-2.2z',
    radial:
      'M12 5a7 7 0 100 14 7 7 0 000-14zm0 2.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 2.5a2 2 0 100 4 2 2 0 000-4z',
    angular: 'M12 4a8 8 0 108 8h-8V4zm1.6 1.55V12H18.4A6.4 6.4 0 0013.6 5.55z',
  };

  protected readonly overlayMode = computed(() => this.presentation.draftColorOverlay().mode);

  protected readonly showColors = computed(() => this.overlayMode() !== 'none');

  protected readonly showAccentColor = computed(() => {
    const mode = this.overlayMode();
    return mode === 'linear' || mode === 'radial' || mode === 'angular';
  });

  protected readonly visibleOverlaySliders = computed(() => {
    const mode = this.overlayMode();
    return this.presentation.colorOverlaySliders.filter((slider) => {
      if (mode === 'none') {
        return false;
      }
      if (slider.key === 'angle') {
        return mode === 'linear' || mode === 'angular';
      }
      return true;
    });
  });

  protected overlayUiValue(
    key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>,
  ): number {
    return this.presentation.colorOverlayUiValue(key);
  }

  protected overlaySliderFillPercent(slider: {
    readonly key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>;
    readonly min: number;
    readonly max: number;
  }): number {
    return this.presentation.colorOverlaySliderFillPercent(slider);
  }

  protected overlayColor(): string {
    return this.presentation.draftColorOverlay().color;
  }

  protected overlayColor2(): string {
    return this.presentation.draftColorOverlay().color2;
  }

  protected onModeChange(mode: ColorOverlayMode): void {
    this.rasterPreview.setColorOverlayMode(mode);
  }

  protected onOverlaySliderInput(
    key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>,
    uiValue: number,
  ): void {
    this.rasterPreview.updateColorOverlay(key, uiValue);
  }

  protected onColorInput(color: string): void {
    this.rasterPreview.updateColorOverlayColor('color', color);
  }

  protected onColor2Input(color: string): void {
    this.rasterPreview.updateColorOverlayColor('color2', color);
  }

  protected resetColorOverlay(): void {
    this.rasterPreview.resetColorOverlay();
  }

  protected cancelColorOverlay(): void {
    this.rasterPreview.cancelColorOverlay();
  }

  protected applyColorOverlay(): Promise<void> {
    return this.rasterPreview.applyColorOverlay();
  }
}
