import { Component, computed, inject } from '@angular/core';

import {
  CROP_MASK_SHAPES,
  type CropMaskShapeId,
  type CropMaskState,
} from 'fluxio-image-editor/core';

import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-crop-mask-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './crop-mask-controls.html',
})
export class FluxioCropMaskControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly shapeChoices = CROP_MASK_SHAPES.filter((shape) => shape !== 'custom');

  /** Compact SVG paths for mask shape buttons (same chip pattern as frame styles). */
  protected readonly shapeIconPaths: Readonly<Record<CropMaskShapeId, string>> = {
    none: 'M6 6h12v12H6zm1.6 1.6v8.8h8.8V7.6z',
    circle: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z',
    'rounded-rect':
      'M8 5h8a3 3 0 013 3v8a3 3 0 01-3 3H8a3 3 0 01-3-3V8a3 3 0 013-3zm0 1.7a1.3 1.3 0 00-1.3 1.3v8a1.3 1.3 0 001.3 1.3h8a1.3 1.3 0 001.3-1.3V8A1.3 1.3 0 0016 6.7H8z',
    triangle: 'M12 5L4 19h16L12 5zm0 3.8L17.2 17H6.8L12 8.8z',
    diamond: 'M12 3.5L20.5 12 12 20.5 3.5 12 12 3.5zm0 3.2L6.7 12 12 17.3 17.3 12 12 6.7z',
    hexagon: 'M12 3.5l7 4v9l-7 4-7-4v-9l7-4zm0 2.3L7 8.1v7.8l5 2.9 5-2.9V8.1l-5-2.3z',
    star: 'M12 3.2l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L12 16.8 6.4 20.4l1.7-6.4-5.1-4.2 6.6-.4L12 3.2z',
    heart:
      'M12 20.2S4.5 15.1 4.5 9.8C4.5 7 6.7 5 9.2 5c1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2 2.5 0 4.7 2 4.7 4.8 0 5.3-7.5 10.4-8.9 10.4z',
    custom: 'M5 5h14v14H5zm2 2v10h10V7zm2 2h6v6H9z',
  };

  protected readonly cropMaskShape = computed(() => this.presentation.draftCropMask().shape);

  protected readonly visibleCropMaskSliders = computed(() => {
    const shape = this.cropMaskShape();
    return this.presentation.cropMaskSliders.filter((slider) => {
      if (shape === 'none') {
        return false;
      }
      if (slider.key === 'cornerRadius') {
        return shape === 'rounded-rect';
      }
      return true;
    });
  });

  protected readonly cropMaskPreviewOpacity = this.presentation.cropMaskPreviewOpacity;

  protected cropMaskUiValue(key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>): number {
    return this.presentation.cropMaskUiValue(key);
  }

  protected cropMaskSliderFillPercent(slider: {
    readonly key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>;
    readonly min: number;
    readonly max: number;
  }): number {
    return this.presentation.cropMaskSliderFillPercent(slider);
  }

  protected onShapeChange(shape: CropMaskShapeId): void {
    this.rasterPreview.setCropMaskShape(shape);
  }

  protected onCustomGallerySelect(path: string): void {
    this.rasterPreview.updateCropMaskFields({ shape: 'custom', customPath: path });
  }

  protected cropMaskGallery() {
    return this.presentation.cropMaskGallery();
  }

  protected isCustomGalleryActive(path: string): boolean {
    const draft = this.presentation.draftCropMask();
    return draft.shape === 'custom' && (draft.customPath ?? '') === path;
  }

  protected onCropMaskSliderInput(
    key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>,
    uiValue: number,
  ): void {
    this.rasterPreview.updateCropMask(key, uiValue);
  }

  protected onCropMaskPreviewOpacity(uiValue: number): void {
    this.rasterPreview.updateCropMaskPreviewOpacity(uiValue);
  }

  protected resetCropMask(): void {
    this.rasterPreview.resetCropMask();
  }

  protected cancelCropMask(): void {
    this.rasterPreview.cancelCropMask();
  }

  protected applyCropMask(): Promise<void> {
    return this.rasterPreview.applyCropMask();
  }
}
