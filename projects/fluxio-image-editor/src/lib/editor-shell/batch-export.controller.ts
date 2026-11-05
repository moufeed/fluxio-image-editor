import { inject, Injectable } from '@angular/core';

import {
  createMaxFitCrop,
  fileExtensionForExportFormat,
  isEllipticalCrop,
  isIdentityCropMask,
  normalizeCropMask,
  resolveCropConfig,
  type BatchExportPreset,
  type ImageEditorExportResult,
  type PublicExportOptions,
  type ReadonlyEditorPreview,
} from 'fluxio-image-editor/core';
import {
  DEFAULT_BATCH_EXPORT_PRESETS,
  resolveBatchExportAspectRatio,
} from 'fluxio-image-editor/plugins/batch-export';

import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';

@Injectable()
export class BatchExportController {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);

  open(): void {
    const presets = this.presets();
    const selected =
      this.ui.batchExportSelectedIds().length > 0
        ? this.ui.batchExportSelectedIds()
        : presets.slice(0, 3).map((item) => item.id);
    this.ui.batchExportSelectedIds.set(selected.filter((id) => presets.some((p) => p.id === id)));
    this.ui.batchExportBusy.set(false);
    this.ui.batchExportProgress.set(null);
    this.ui.batchExportOpen.set(true);
  }

  close(): void {
    if (this.ui.batchExportBusy()) {
      return;
    }
    this.ui.batchExportOpen.set(false);
  }

  presets(): readonly BatchExportPreset[] {
    const configured = this.shell.config().batchExport?.presets;
    return configured && configured.length > 0 ? configured : DEFAULT_BATCH_EXPORT_PRESETS;
  }

  togglePreset(id: string): void {
    this.ui.batchExportSelectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }

  selectAll(): void {
    this.ui.batchExportSelectedIds.set(this.presets().map((item) => item.id));
  }

  selectNone(): void {
    this.ui.batchExportSelectedIds.set([]);
  }

  qualityFillPercent(): number {
    return ((this.ui.exportQuality() - 0.1) / 0.9) * 100;
  }

  progressFillPercent(): number {
    const progress = this.ui.batchExportProgress();
    if (!progress || progress.total <= 0) {
      return 0;
    }
    return (progress.index / progress.total) * 100;
  }

  isPresetExporting(id: string): boolean {
    return this.ui.batchExportProgress()?.presetId === id;
  }

  isPresetExported(id: string): boolean {
    const progress = this.ui.batchExportProgress();
    if (!progress || !this.ui.batchExportBusy()) {
      return false;
    }
    const selected = this.presets().filter((preset) =>
      this.ui.batchExportSelectedIds().includes(preset.id),
    );
    const index = selected.findIndex((preset) => preset.id === id);
    return index >= 0 && index < progress.index - 1;
  }

  async confirm(): Promise<readonly ImageEditorExportResult[] | null> {
    const session = this.shell.getSession();
    if (!session || this.ui.batchExportBusy()) {
      return null;
    }

    const selected = this.presets().filter((preset) =>
      this.ui.batchExportSelectedIds().includes(preset.id),
    );
    if (selected.length === 0) {
      return null;
    }

    const doc = session.store.document();
    const requiresAlpha =
      (resolveCropConfig(this.shell.config().crop).forcePngOnEllipticalCrop &&
        isEllipticalCrop(doc?.crop)) ||
      !isIdentityCropMask(normalizeCropMask(doc?.cropMask));

    const baseName = this.ui.exportFileName().trim() || 'fluxio-export';
    const sharedQuality = this.ui.exportQuality();
    const results: ImageEditorExportResult[] = [];
    const previousPreview: ReadonlyEditorPreview | null = session.store.preview() ?? null;

    this.ui.batchExportBusy.set(true);
    this.ui.batchExportProgress.set(null);
    try {
      for (let i = 0; i < selected.length; i += 1) {
        const preset = selected[i]!;
        this.ui.batchExportProgress.set({
          index: i + 1,
          total: selected.length,
          presetId: preset.id,
          label: preset.label,
        });
        // Yield so the busy/progress UI can paint between sequential exports.
        await Promise.resolve();

        let format = preset.format;
        if (requiresAlpha && format === 'jpeg') {
          format = 'png';
        }
        const quality =
          format === 'jpeg' || format === 'webp' ? (preset.quality ?? sharedQuality) : 1;
        const suffix = preset.fileNameSuffix ?? `-${preset.id}`;
        const fileName = `${baseName}${suffix}.${fileExtensionForExportFormat(format)}`;
        const options: PublicExportOptions = {
          format,
          quality,
          width: preset.width,
          height: preset.height,
          fileName,
          asFile: true,
          backgroundColor: format === 'jpeg' ? '#ffffff' : undefined,
        };

        const ratio = resolveBatchExportAspectRatio(preset);
        if (ratio != null && doc) {
          const crop = createMaxFitCrop(doc.sourceSize, ratio);
          session.setPreview({
            ...(previousPreview ?? {}),
            crop,
          });
        } else {
          session.setPreview(previousPreview);
        }

        results.push(await session.export(options));
      }
      this.ui.batchExportOpen.set(false);
      return results;
    } catch (error) {
      this.shell.reportError(error);
      return null;
    } finally {
      session.setPreview(previousPreview);
      this.ui.batchExportBusy.set(false);
      this.ui.batchExportProgress.set(null);
    }
  }
}
