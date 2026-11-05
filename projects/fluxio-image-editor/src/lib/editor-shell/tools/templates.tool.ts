import { inject, Injectable } from '@angular/core';

import { createDefaultCrop, normalizeCrop, type TemplatePreset } from 'fluxio-image-editor/core';
import {
  DEFAULT_TEMPLATE_GALLERY,
  TEMPLATES_APPLY_COMMAND,
  resolvePrimarySlotAspectRatio,
  resolveTemplateAspectRatio,
  templateHasResizeTarget,
  templateHasSlots,
} from 'fluxio-image-editor/plugins/templates';

import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

@Injectable()
export class TemplatesTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private closers: EditorModeClosers | null = null;

  configure(options: { readonly closers: EditorModeClosers }): void {
    this.closers = options.closers;
  }

  enter(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('templates', this.closers);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    this.ui.templatesMode.set(true);
    this.ui.selectedTemplateId.set(null);
    session.setActiveTool('templates');
    session.setPreview(null);
  }

  cancel(): void {
    this.ui.templatesMode.set(false);
    this.ui.selectedTemplateId.set(null);
    const session = this.shell.getSession();
    session?.setPreview(null);
    session?.setActiveTool(null);
  }

  /** Clear the crop preview but keep the Templates panel open. */
  clearSelection(): void {
    this.ui.selectedTemplateId.set(null);
    const session = this.shell.getSession();
    if (!session || !this.ui.templatesMode()) {
      return;
    }
    session.setPreview(null);
    session.setActiveTool('templates');
  }

  /**
   * Start an interactive crop preview for the template (same chrome as Crop).
   * Always rebuilds a max-fit frame for the new aspect so switching presets
   * does not shrink the previous rect.
   * Collages frame to the first slot aspect so the photo fits that cell.
   */
  selectTemplate(preset: TemplatePreset): void {
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document || !this.ui.templatesMode()) {
      return;
    }

    const slotRatio = resolvePrimarySlotAspectRatio(preset);
    const ratio = slotRatio ?? resolveTemplateAspectRatio(preset);
    const shape = preset.shape ?? 'rect';
    const existing = session.store.preview()?.crop;
    let crop = createDefaultCrop(document.sourceSize, ratio, shape);

    // Keep the previous frame's center when switching sizes (without inheriting its size).
    if (existing) {
      const cx = existing.x + existing.width / 2;
      const cy = existing.y + existing.height / 2;
      crop = normalizeCrop(
        {
          ...crop,
          x: cx - crop.width / 2,
          y: cy - crop.height / 2,
        },
        document.sourceSize,
      );
    }

    this.ui.selectedTemplateId.set(preset.id);
    session.setActiveTool('templates');
    session.setPreview({ crop });
  }

  async apply(): Promise<void> {
    const session = this.shell.getSession();
    const crop = session?.store.preview()?.crop;
    const templateId = this.ui.selectedTemplateId();
    if (!session || !crop || !templateId) {
      return;
    }

    const preset = this.resolvePreset(templateId);
    const resizeTo =
      preset && templateHasResizeTarget(preset)
        ? { width: preset.width!, height: preset.height! }
        : undefined;

    await session.execute(TEMPLATES_APPLY_COMMAND, {
      crop,
      resizeTo,
      placeholders: preset?.placeholders,
      slots: templateHasSlots(preset) ? preset!.slots : undefined,
    });
    this.ui.selectedTemplateId.set(null);
    session.setPreview(null);
    session.setActiveTool('templates');
  }

  private resolvePreset(id: string): TemplatePreset | null {
    const configured = this.shell.config().templates?.gallery;
    const gallery = configured && configured.length > 0 ? configured : DEFAULT_TEMPLATE_GALLERY;
    return gallery.find((item) => item.id === id) ?? null;
  }
}
