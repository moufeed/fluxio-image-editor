import { Component, computed, inject } from '@angular/core';

import {
  FRAME_STYLES,
  DEFAULT_OPAQUE_BLACK,
  DEFAULT_OPAQUE_WHITE,
  type FrameState,
  type FrameStyleId,
} from 'fluxio-image-editor/core';

import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-frame-controls',
  imports: [PreviewToolActionsComponent, ColorAlphaFieldComponent],
  templateUrl: './frame-controls.html',
})
export class FluxioFrameControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly styleChoices = FRAME_STYLES.filter((style) => style !== 'image');
  protected readonly colorFallbackWhite = DEFAULT_OPAQUE_WHITE;
  protected readonly colorFallbackBlack = DEFAULT_OPAQUE_BLACK;

  /** Compact SVG paths for style buttons (same chip pattern as fill modes). */
  protected readonly styleIconPaths: Readonly<Record<FrameStyleId, string>> = {
    none: 'M6 6h12v12H6zm1.6 1.6v8.8h8.8V7.6z',
    solid: 'M5 5h14v14H5zm2 2v10h10V7z',
    double: 'M4.5 4.5h15v15h-15zm1.5 1.5v12h12V6zm2 2h8v8H8zm1.4 1.4v5.2h5.2V9.4z',
    rounded:
      'M8 5h8a3 3 0 013 3v8a3 3 0 01-3 3H8a3 3 0 01-3-3V8a3 3 0 013-3zm0 1.7a1.3 1.3 0 00-1.3 1.3v8a1.3 1.3 0 001.3 1.3h8a1.3 1.3 0 001.3-1.3V8A1.3 1.3 0 0016 6.7H8z',
    gradient: 'M5 5h14v14H5zm2 2v10h10V7zm1.5 1.5h7v1.5h-7zm0 2.5h7v1.5h-7zm0 2.5h7v1.5h-7z',
    polaroid: 'M6 3.5h12v17H6zm1.6 1.6v9.2h8.8V5.1zm1.2 11h6.4v2.2H8.8z',
    film: 'M4 5h16v14H4zm2 1.5v2h1.5v-2zm0 4v2h1.5v-2zm0 4v2h1.5v-2zM16.5 6.5v2H18v-2zm0 4v2H18v-2zm0 4v2H18v-2zM8.5 7h7v10h-7z',
    image: 'M5 5h14v14H5zm2 2v10h10V7zm1 6l2.5-3 2 2.5L14 10l3 4z',
  };

  protected readonly frameStyle = computed(() => this.presentation.draftFrame().style);

  protected readonly visibleFrameSliders = computed(() => {
    const style = this.frameStyle();
    return this.presentation.frameSliders.filter((slider) => {
      if (style === 'none') {
        return false;
      }
      if (style === 'image') {
        return slider.key === 'opacity';
      }
      if (slider.key === 'cornerRadius') {
        return style === 'rounded';
      }
      return true;
    });
  });

  protected readonly showAccentColor = computed(() => {
    const style = this.frameStyle();
    return style === 'double' || style === 'gradient';
  });

  protected readonly showColors = computed(() => {
    const style = this.frameStyle();
    return style !== 'none' && style !== 'image';
  });

  protected frameUiValue(
    key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>,
  ): number {
    return this.presentation.frameUiValue(key);
  }

  protected frameSliderFillPercent(slider: {
    readonly key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>;
    readonly min: number;
    readonly max: number;
  }): number {
    return this.presentation.frameSliderFillPercent(slider);
  }

  protected frameColor(): string {
    return this.presentation.draftFrame().color;
  }

  protected frameColor2(): string {
    return this.presentation.draftFrame().color2;
  }

  protected frameGallery() {
    return this.presentation.frameGallery();
  }

  protected isFrameGalleryActive(src: string): boolean {
    const draft = this.presentation.draftFrame();
    return draft.style === 'image' && (draft.imageSrc ?? '') === src;
  }

  protected onStyleChange(style: FrameStyleId): void {
    this.rasterPreview.setFrameStyle(style);
  }

  protected onFrameGallerySelect(src: string): void {
    this.rasterPreview.setFrameGalleryItem(src);
  }

  protected onFrameSliderInput(
    key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>,
    uiValue: number,
  ): void {
    this.rasterPreview.updateFrame(key, uiValue);
  }

  protected onColorInput(color: string): void {
    this.rasterPreview.updateFrameColor('color', color);
  }

  protected onColor2Input(color: string): void {
    this.rasterPreview.updateFrameColor('color2', color);
  }

  protected resetFrame(): void {
    this.rasterPreview.resetFrame();
  }

  protected cancelFrame(): void {
    this.rasterPreview.cancelFrame();
  }

  protected applyFrame(): Promise<void> {
    return this.rasterPreview.applyFrame();
  }
}
