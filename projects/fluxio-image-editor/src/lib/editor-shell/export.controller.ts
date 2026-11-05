import { inject, Injectable } from '@angular/core';

import {
  fileExtensionForExportFormat,
  isEllipticalCrop,
  isIdentityCropMask,
  normalizeCropMask,
  resolveCropConfig,
  type ImageEditorExportResult,
  type PublicExportOptions,
  type RasterExportFormat,
} from 'fluxio-image-editor/core';

import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';

@Injectable()
export class ExportController {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);

  open(format: RasterExportFormat): void {
    const doc = this.shell.getSession()?.store.document();
    const crop = doc?.crop;
    const requiresAlpha =
      (resolveCropConfig(this.shell.config().crop).forcePngOnEllipticalCrop &&
        isEllipticalCrop(crop)) ||
      !isIdentityCropMask(normalizeCropMask(doc?.cropMask));
    this.ui.exportFormat.set(requiresAlpha && format === 'jpeg' ? 'png' : format);
    this.ui.exportOpen.set(true);
  }

  close(): void {
    this.ui.exportOpen.set(false);
  }

  qualityFillPercent(): number {
    return ((this.ui.exportQuality() - 0.1) / 0.9) * 100;
  }

  async confirm(): Promise<ImageEditorExportResult | null> {
    const session = this.shell.getSession();
    if (!session) {
      return null;
    }
    try {
      const format = this.ui.exportFormat();
      const options: PublicExportOptions = {
        format,
        quality: format === 'jpeg' || format === 'webp' ? this.ui.exportQuality() : 1,
        fileName: `${this.ui.exportFileName()}.${fileExtensionForExportFormat(format)}`,
        asFile: true,
        backgroundColor: format === 'jpeg' ? '#ffffff' : undefined,
      };
      const result = await session.export(options);
      this.ui.exportOpen.set(false);
      return result;
    } catch (error) {
      this.shell.reportError(error);
      return null;
    }
  }

  downloadDesignState(): void {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    try {
      const envelope = session.exportDesignState();
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fluxio-design-${envelope.exportedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.shell.reportError(error);
    }
  }

  pickDesignStateFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      void file
        .text()
        .then((text) => this.shell.getSession()?.loadDesignState(text))
        .catch((error) => this.shell.reportError(error));
    };
    input.click();
  }
}
