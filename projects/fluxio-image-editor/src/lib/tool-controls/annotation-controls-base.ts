import { inject } from '@angular/core';

import type { AnnotationOrderAction, InteractiveBounds } from 'fluxio-image-editor/core';

import { AnnotationInteractionController } from '../editor-shell/annotation-interaction.controller';
import { ToolControlsBase } from './tool-controls-base';

/**
 * Base for annotation tool controls (text, shapes, drawing, image overlay).
 * Adds the shared object-inspector helpers — geometry editing, reorder, and
 * multi-selection — that every annotation panel exposes.
 */
export abstract class AnnotationControlsBase extends ToolControlsBase {
  protected readonly annotationInteraction = inject(AnnotationInteractionController);

  protected readonly hasMultiSelection = this.presentation.hasMultiSelection;
  protected readonly selectedGeometry = this.presentation.selectedGeometry;

  protected multiSelectionLabel(): string {
    return this.presentation.multiSelectionLabel();
  }

  protected primarySelectedAnnotationId(): string | null {
    return this.annotationInteraction.primaryId();
  }

  protected canReorderSelectedAnnotation(action: AnnotationOrderAction): boolean {
    return this.annotationInteraction.canReorder(action);
  }

  protected reorderSelectedAnnotation(action: AnnotationOrderAction): void {
    this.annotationInteraction.reorder(action);
  }

  protected updateSelectedGeometry(patch: Partial<InteractiveBounds>): void {
    if (this.hasMultiSelection()) {
      return;
    }
    this.annotationInteraction.updateSelectedGeometry(patch);
  }

  protected commitSelectedGeometry(): void {
    this.annotationInteraction.commitSelectedGeometry();
  }
}
