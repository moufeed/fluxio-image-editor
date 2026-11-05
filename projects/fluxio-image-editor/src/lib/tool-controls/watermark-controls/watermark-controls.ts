import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import type { WatermarkMode, WatermarkPosition, WatermarkState } from 'fluxio-image-editor/core';

import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { readImageFileAsDataUrl } from '../../editor-shell/helpers/read-image-file';
import { WatermarkTool } from '../../editor-shell/tools/watermark.tool';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-watermark-controls',
  imports: [DecimalPipe, ColorAlphaFieldComponent, ObjectInspectorActionsComponent],
  templateUrl: './watermark-controls.html',
})
export class FluxioWatermarkControls extends ToolControlsBase {
  private readonly watermarkTool = inject(WatermarkTool);
  private readonly shell = inject(EditorShellContext);

  protected readonly draftWatermark = this.presentation.draftWatermark;
  protected readonly watermarkModes = this.presentation.watermarkModes;
  protected readonly watermarkPositions = this.presentation.watermarkPositions;
  protected readonly watermarkGallery = this.presentation.watermarkGallery;
  protected readonly colorFallbackWhite = this.presentation.colorFallbackWhite;

  protected setWatermarkMode(mode: WatermarkMode): void {
    this.watermarkTool.setMode(mode);
  }
  protected setWatermarkPresetPosition(position: WatermarkPosition): void {
    this.watermarkTool.setPosition(position);
  }
  protected patchDraftWatermark(patch: Partial<WatermarkState>): void {
    this.watermarkTool.patch(patch);
  }
  protected commitSelectedWatermarkProps(): void {
    void this.watermarkTool.commit();
  }
  protected setWatermarkImageSrc(src: string): void {
    this.watermarkTool.setImage(src);
  }
  protected onWatermarkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    void readImageFileAsDataUrl(file)
      .then((src) => this.setWatermarkImageSrc(src))
      .catch((error) => this.shell.reportError(error));
  }
  protected doneWatermark(): Promise<void> {
    return this.watermarkTool.done();
  }
}
