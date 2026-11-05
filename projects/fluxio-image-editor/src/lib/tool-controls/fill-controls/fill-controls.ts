import { Component, computed, inject, signal } from '@angular/core';

import { DEFAULT_OPAQUE_WHITE, FILL_MODES, type FillMode } from 'fluxio-image-editor/core';

import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

const UPLOAD_ICON_PATH = 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z';

@Component({
  selector: 'fluxio-fill-controls',
  imports: [PreviewToolActionsComponent, ColorAlphaFieldComponent],
  templateUrl: './fill-controls.html',
})
export class FluxioFillControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);
  private dragDepth = 0;

  protected readonly modeChoices = FILL_MODES;
  protected readonly colorFallback = DEFAULT_OPAQUE_WHITE;
  protected readonly uploadIconPath = UPLOAD_ICON_PATH;
  protected readonly dragOver = signal(false);

  protected readonly modeIconPaths: Readonly<Record<FillMode, string>> = {
    none: 'M6 6h12v12H6zm1.6 1.6v8.8h8.8V7.6z',
    solid: 'M6 6h12v12H6z',
    image: 'M5 5h14v14H5V5zm2 2v10h10V7H7zm2 6.5l1.8 2.2 2.4-3.1L15 15H9l0-1.5z',
  };

  protected readonly fillMode = computed(() => this.presentation.draftFill().mode);
  protected readonly showSolid = computed(() => this.fillMode() === 'solid');
  protected readonly showImage = computed(() => this.fillMode() === 'image');
  protected readonly fillGallery = this.presentation.fillGallery;
  protected readonly hasImageSrc = computed(
    () => this.presentation.draftFill().imageSrc.trim().length > 0,
  );
  /** Uploaded / non-gallery image preview (gallery selection already highlights in the grid). */
  protected readonly customImageSrc = computed(() => {
    const src = this.presentation.draftFill().imageSrc.trim();
    if (!src) {
      return null;
    }
    return this.fillGallery().some((item) => item.src === src) ? null : src;
  });

  protected fillColor(): string {
    return this.presentation.draftFill().color;
  }

  protected opacityUi(): number {
    return Math.round(this.presentation.draftFill().opacity * 100);
  }

  protected onModeChange(mode: FillMode): void {
    this.rasterPreview.setFillMode(mode);
  }

  protected onColorInput(color: string): void {
    this.rasterPreview.updateFillColor(color);
  }

  protected onOpacityInput(value: number): void {
    this.rasterPreview.updateFillOpacity(value);
  }

  protected onGallerySelect(src: string): void {
    this.rasterPreview.setFillImage(src);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) {
      this.rasterPreview.setFillImageFile(file);
    }
    if (input) {
      input.value = '';
    }
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth += 1;
    this.dragOver.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragOver.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth = 0;
    this.dragOver.set(false);
    const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
      item.type.startsWith('image/'),
    );
    if (file) {
      this.rasterPreview.setFillImageFile(file);
    }
  }

  protected resetFill(): void {
    this.rasterPreview.resetFill();
  }

  protected cancelFill(): void {
    this.rasterPreview.cancelFill();
  }

  protected applyFill(): Promise<void> {
    return this.rasterPreview.applyFill();
  }

  private hasFilePayload(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
