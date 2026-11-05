import { Component, inject } from '@angular/core';
import { resolvePresetAspectRatio, type AspectRatioPreset } from 'fluxio-image-editor/core';

import { CropTool } from '../../editor-shell/tools/crop.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

/** Built-in aspect chip icons (24×24). Unknown presets fall back to a ratio rect. */
const ASPECT_ICON_PATHS: Readonly<Record<string, string>> = {
  free: 'M7 5H5v2H3V3h4v2zm10 0V3h4v4h-2V5h-2zM5 17v2h2v2H3v-4h2zm14 2h-2v2h4v-4h-2v2zM8 8h8v8H8V8zm1.5 1.5v5h5v-5h-5z',
  ellipse:
    'M12 5c-4.4 0-8 3.1-8 7s3.6 7 8 7 8-3.1 8-7-3.6-7-8-7zm0 2c3.3 0 6 2.2 6 5s-2.7 5-6 5-6-2.2-6-5 2.7-5 6-5z',
  '1:1': 'M7 7h10v10H7V7zm1.6 1.6v6.8h6.8V8.6H8.6z',
  '4:3': 'M5 7.5h14v9H5v-9zm1.6 1.6v5.8h10.8V9.1H6.6z',
  '16:9': 'M3.5 8h17v8h-17V8zm1.6 1.6v4.8h13.8V9.6H5.1z',
  '3:2': 'M4 7.5h16v9H4v-9zm1.6 1.6v5.8h12.8V9.1H5.6z',
};

function aspectRectIconPath(ratio: number): string {
  const max = 14;
  const w = ratio >= 1 ? max : max * ratio;
  const h = ratio >= 1 ? max / ratio : max;
  const x = (24 - w) / 2;
  const y = (24 - h) / 2;
  const inset = 1.5;
  return `M${x} ${y}h${w}v${h}h${-w}z M${x + inset} ${y + inset}h${w - inset * 2}v${h - inset * 2}h${-(w - inset * 2)}z`;
}

@Component({
  selector: 'fluxio-crop-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './crop-controls.html',
})
export class FluxioCropControls extends ToolControlsBase {
  private readonly cropTool = inject(CropTool);

  protected readonly aspectRatios = this.presentation.aspectRatios;
  protected readonly cropAspectId = this.presentation.cropAspectId;
  protected readonly cropGuideCircle = this.presentation.cropGuideCircle;
  protected readonly cropGuideBleed = this.presentation.cropGuideBleed;
  protected readonly cropMinimizeToolbar = this.presentation.cropMinimizeToolbar;

  protected aspectLabel(preset: AspectRatioPreset): string {
    if (preset.labelKey) {
      const translated = this.t(preset.labelKey);
      if (translated !== preset.labelKey) {
        return translated;
      }
    }
    return preset.label;
  }

  protected aspectIconPath(preset: AspectRatioPreset): string {
    const known = ASPECT_ICON_PATHS[preset.id];
    if (known) {
      return known;
    }
    if (preset.shape === 'ellipse') {
      return ASPECT_ICON_PATHS['ellipse'];
    }
    const ratio = resolvePresetAspectRatio(preset);
    if (ratio == null || !(ratio > 0)) {
      return ASPECT_ICON_PATHS['free'];
    }
    return aspectRectIconPath(ratio);
  }

  protected onCropAspectChange(id: string): void {
    this.cropTool.changeAspect(id);
  }

  protected onGuideCircleToggle(): void {
    this.cropTool.setGuideCircle(!this.cropGuideCircle());
  }

  protected onGuideBleedToggle(): void {
    this.cropTool.setGuideBleed(!this.cropGuideBleed());
  }

  protected applyCrop(): Promise<void> {
    return this.cropTool.apply();
  }

  protected cancelCrop(): void {
    this.cropTool.cancel();
  }
}
