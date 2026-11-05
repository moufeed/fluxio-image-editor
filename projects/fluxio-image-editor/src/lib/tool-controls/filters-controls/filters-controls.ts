import { Component, inject } from '@angular/core';

import type { FilterPresetId } from 'fluxio-image-editor/core';

import { RasterPreviewTool } from '../../editor-shell/tools/raster-preview.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-filters-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './filters-controls.html',
})
export class FluxioFiltersControls extends ToolControlsBase {
  private readonly rasterPreview = inject(RasterPreviewTool);

  protected readonly filterPresets = this.presentation.filterPresets;
  protected readonly draftFilters = this.presentation.draftFilters;
  protected readonly filterThumbUrls = this.presentation.filterThumbUrls;

  protected filterPresetLabel(preset: string): string {
    return this.presentation.filterPresetLabel(preset);
  }

  protected selectFilterPreset(preset: FilterPresetId): void {
    this.rasterPreview.selectFilter(preset);
  }
  protected resetDraftFilters(): void {
    this.rasterPreview.resetFilters();
  }
  protected cancelFilters(): void {
    this.rasterPreview.cancelFilters();
  }
  protected applyFilters(): Promise<void> {
    return this.rasterPreview.applyFilters();
  }
}
