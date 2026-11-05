import { DecimalPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';

import type { ImageEditorExportResult } from 'fluxio-image-editor/core';

import { AnnotationInteractionController } from '../../editor-shell/annotation-interaction.controller';
import { BatchExportController } from '../../editor-shell/batch-export.controller';
import { EditorPresentationStore } from '../../editor-shell/editor-presentation.store';
import { ExportController } from '../../editor-shell/export.controller';

/**
 * Modal dialogs (export / batch export) and the annotation context-actions menu.
 */
@Component({
  selector: 'fluxio-editor-dialogs',
  imports: [DecimalPipe],
  templateUrl: './editor-dialogs.html',
  host: {
    class: 'fluxio-editor-dialogs-host',
    style: 'display: contents',
  },
})
export class EditorDialogsComponent {
  readonly saved = output<ImageEditorExportResult>();
  readonly batchSaved = output<readonly ImageEditorExportResult[]>();

  protected readonly presentation = inject(EditorPresentationStore);
  protected readonly annotations = inject(AnnotationInteractionController);
  protected readonly exportCtrl = inject(ExportController);
  protected readonly batchExport = inject(BatchExportController);

  protected async confirmExport(): Promise<void> {
    const result = await this.exportCtrl.confirm();
    if (result) {
      this.saved.emit(result);
    }
  }

  protected async confirmBatchExport(): Promise<void> {
    const results = await this.batchExport.confirm();
    if (!results || results.length === 0) {
      return;
    }
    this.batchSaved.emit(results);
    for (const result of results) {
      this.saved.emit(result);
    }
  }
}
