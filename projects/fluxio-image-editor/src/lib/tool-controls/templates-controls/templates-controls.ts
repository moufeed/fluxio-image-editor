import { Component, computed, inject } from '@angular/core';

import type { TemplatePreset } from 'fluxio-image-editor/core';
import { templateHasPlaceholders, templateHasSlots } from 'fluxio-image-editor/plugins/templates';

import { EditorShellContext } from '../../editor-shell/editor-shell.context';
import { TemplatesTool } from '../../editor-shell/tools/templates.tool';
import { PreviewToolActionsComponent } from '../../chrome/tool-actions/preview-tool-actions';
import { ToolControlsBase } from '../tool-controls-base';

@Component({
  selector: 'fluxio-templates-controls',
  imports: [PreviewToolActionsComponent],
  templateUrl: './templates-controls.html',
})
export class FluxioTemplatesControls extends ToolControlsBase {
  private readonly templatesTool = inject(TemplatesTool);
  private readonly shell = inject(EditorShellContext);

  protected readonly gallery = this.presentation.templateGallery;
  protected readonly selectedTemplateId = this.presentation.selectedTemplateId;

  protected readonly hasSelection = computed(() => this.selectedTemplateId() != null);

  protected readonly selectedIsCollage = computed(() => {
    const id = this.selectedTemplateId();
    if (!id) {
      return false;
    }
    const preset = this.gallery().find((item) => item.id === id);
    return templateHasSlots(preset);
  });

  protected readonly categories = computed((): readonly string[] => {
    const cats: string[] = [];
    const seen = new Set<string>();
    for (const item of this.gallery()) {
      const key = item.category?.trim() || '';
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      cats.push(key);
    }
    return cats;
  });

  protected templatesInCategory(category: string): readonly TemplatePreset[] {
    return this.gallery().filter((item) => (item.category?.trim() || '') === category);
  }

  protected hasPlaceholders(preset: TemplatePreset): boolean {
    return templateHasPlaceholders(preset);
  }

  protected hasSlots(preset: TemplatePreset): boolean {
    return templateHasSlots(preset);
  }

  protected sizeLabel(preset: TemplatePreset): string {
    if (preset.width != null && preset.height != null) {
      return `${Math.round(preset.width)}×${Math.round(preset.height)}`;
    }
    if (preset.ratio == null) {
      return this.t('crop.free');
    }
    const r = preset.ratio;
    if (Math.abs(r - 1) < 0.01) {
      return '1:1';
    }
    if (Math.abs(r - 16 / 9) < 0.02) {
      return '16:9';
    }
    if (Math.abs(r - 9 / 16) < 0.02) {
      return '9:16';
    }
    if (Math.abs(r - 4 / 3) < 0.02) {
      return '4:3';
    }
    if (Math.abs(r - 3 / 4) < 0.02) {
      return '3:4';
    }
    if (Math.abs(r - 3 / 2) < 0.02) {
      return '3:2';
    }
    if (Math.abs(r - 2 / 3) < 0.02) {
      return '2:3';
    }
    if (Math.abs(r - 3) < 0.02) {
      return '3:1';
    }
    return r.toFixed(2);
  }

  protected categoryTitle(category: string): string {
    return category || this.t('templates.gallery');
  }

  protected selectTemplate(preset: TemplatePreset): void {
    this.templatesTool.selectTemplate(preset);
  }

  protected clearSelection(): void {
    this.templatesTool.clearSelection();
  }

  protected apply(): void {
    void this.templatesTool.apply().catch((error: unknown) => {
      this.shell.reportError(error);
    });
  }

  protected done(): void {
    this.templatesTool.cancel();
  }
}
