import { Component, inject } from '@angular/core';

import type { RedactionRegion } from 'fluxio-image-editor/core';

import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-redact-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './redact-controls.html',
})
export class FluxioRedactControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly regions = this.presentation.draftRedactions;

  /** Coverage readout in percent of the output box (regions are normalized). */
  protected regionSize(region: RedactionRegion): string {
    return `${Math.round(region.width * 100)}% × ${Math.round(region.height * 100)}%`;
  }

  protected removeRegion(id: string): void {
    this.rasterPreview.removeRedactionRegion(id);
  }

  protected resetRedact(): void {
    this.rasterPreview.resetRedact();
  }

  protected cancelRedact(): void {
    this.rasterPreview.cancelRedact();
  }

  protected applyRedact(): Promise<void> {
    return this.rasterPreview.applyRedact();
  }
}
