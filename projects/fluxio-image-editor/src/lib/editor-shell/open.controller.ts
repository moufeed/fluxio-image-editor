import { inject, Injectable } from '@angular/core';

import type { ImageEditorSource, OpenBlankPreset } from 'fluxio-image-editor/core';
import { createBlankImageBlob } from 'fluxio-image-editor/core';
import { resolveOpenConfig } from 'fluxio-image-editor/plugins/open';

import { BootstrapController } from './bootstrap.controller';
import { CloseController } from './close.controller';
import { EditorPresentationStore } from './editor-presentation.store';
import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';

/**
 * Shell owner for the optional Open plugin: file pick, blank synthesis, dirty confirm.
 */
@Injectable()
export class OpenController {
  private readonly shell = inject(EditorShellContext);
  private readonly ui = inject(EditorUiStore);
  private readonly presentation = inject(EditorPresentationStore);
  private readonly closeController = inject(CloseController);
  private readonly bootstrap = inject(BootstrapController);

  resolvedConfig() {
    return resolveOpenConfig(this.shell.config().open);
  }

  blankPresets(): readonly OpenBlankPreset[] {
    return this.resolvedConfig().blankPresets;
  }

  /** True when New should open a size menu instead of one-shot defaultBlank. */
  usesBlankMenu(): boolean {
    return this.blankPresets().length > 1;
  }

  async openFile(): Promise<void> {
    this.closeBlankMenu();
    if (!(await this.confirmReplaceIfNeeded())) {
      return;
    }
    const file = await this.pickImageFile();
    if (!file) {
      return;
    }
    await this.loadAndEmit(file);
  }

  async onNewAction(): Promise<void> {
    if (this.usesBlankMenu()) {
      this.ui.zoomMenuOpen.set(false);
      this.ui.exportMenuOpen.set(false);
      this.ui.blankMenuOpen.update((open) => !open);
      return;
    }
    await this.openBlank();
  }

  async openBlank(preset?: OpenBlankPreset): Promise<void> {
    this.closeBlankMenu();
    if (!(await this.confirmReplaceIfNeeded())) {
      return;
    }
    const resolved = this.resolvedConfig();
    const width = preset?.width ?? resolved.defaultBlank.width;
    const height = preset?.height ?? resolved.defaultBlank.height;
    const fill = preset?.fill ?? resolved.defaultBlank.fill;
    const file = await createBlankImageBlob({ width, height, fill });
    await this.loadAndEmit(file);
  }

  chooseBlankPreset(preset: OpenBlankPreset, event?: Event): void {
    event?.stopPropagation();
    void this.openBlank(preset);
  }

  closeBlankMenu(): void {
    this.ui.blankMenuOpen.set(false);
  }

  private async confirmReplaceIfNeeded(): Promise<boolean> {
    const resolved = this.resolvedConfig();
    if (!resolved.confirmReplace) {
      return true;
    }
    return this.closeController.requestDiscardConfirmation({
      messageKey: 'open.replaceConfirm',
      emitConfirmClose: (event) => this.shell.emitConfirmClose(event),
    });
  }

  private pickImageFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  private async loadAndEmit(source: ImageEditorSource): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    try {
      await session.load(source);
      this.bootstrap.rememberSource(source);
      this.shell.emitSourceChanged(source);
    } catch (error) {
      this.shell.reportError(error);
    }
  }
}
