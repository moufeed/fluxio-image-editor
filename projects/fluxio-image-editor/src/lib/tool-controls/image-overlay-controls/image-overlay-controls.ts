import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';

import { ImageAnnotationTool } from '../../editor-shell/tools/image-annotation.tool';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { AnnotationControlsBase } from '../annotation-controls-base';

/** Outline upload arrow for the compact file button / dropzone. */
const UPLOAD_ICON_PATH = 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z';

/**
 * Inspector for image-overlay and stickers tools — they share the same
 * {@link ImageAnnotationTool} and near-identical markup, differing only by label
 * namespace, gallery source, and upload gating. `variant` selects which.
 */
@Component({
  selector: 'fluxio-image-overlay-controls',
  imports: [DecimalPipe, OrderActionsComponent, ObjectInspectorActionsComponent],
  templateUrl: './image-overlay-controls.html',
})
export class FluxioImageOverlayControls extends AnnotationControlsBase {
  private readonly imageAnnotationTool = inject(ImageAnnotationTool);
  private dragDepth = 0;

  readonly variant = input<'overlay' | 'stickers'>('overlay');

  protected readonly draftImages = this.presentation.draftImages;
  protected readonly selectedImageIds = this.presentation.selectedImageIds;
  protected readonly selectedImage = this.presentation.selectedImage;
  protected readonly stickersAllowUpload = this.presentation.stickersAllowUpload;
  protected readonly uploadIconPath = UPLOAD_ICON_PATH;
  protected readonly dragOver = signal(false);

  /** Translation-key namespace for the active variant. */
  protected readonly ns = computed(() =>
    this.variant() === 'stickers' ? 'stickers' : 'image-overlay',
  );
  protected readonly gallery = computed(() =>
    this.variant() === 'stickers'
      ? this.presentation.stickersGallery()
      : this.presentation.overlayGallery(),
  );
  protected readonly showUpload = computed(
    () => this.variant() === 'overlay' || this.stickersAllowUpload(),
  );
  protected readonly isEmpty = computed(() => this.draftImages().length === 0);

  protected itemLabel(index: number): string {
    return this.tf(`${this.ns()}.item`, { n: index + 1 });
  }

  protected onOverlayFileSelected(event: Event): void {
    this.imageAnnotationTool.onOverlayFileSelected(event);
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth += 1;
    this.dragOver.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragOver.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.hasFilePayload(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth = 0;
    this.dragOver.set(false);
    const file = Array.from(event.dataTransfer?.files ?? []).find((item) =>
      item.type.startsWith('image/'),
    );
    if (file) {
      this.imageAnnotationTool.addOverlayFile(file);
    }
  }

  protected addGalleryOverlay(src: string): void {
    this.imageAnnotationTool.addGalleryOverlay(src);
  }
  protected selectDraftImage(id: string, event?: Event): void {
    this.imageAnnotationTool.select(id, event);
  }
  protected deleteDraftImage(id: string): void {
    this.imageAnnotationTool.delete(id);
  }
  protected updateSelectedImageOpacity(opacity: number): void {
    this.imageAnnotationTool.updateSelectedOpacity(opacity);
  }
  protected commitSelectedImageOpacity(): void {
    this.imageAnnotationTool.commitSelectedOpacity();
  }
  protected done(): Promise<void> {
    return this.imageAnnotationTool.done();
  }

  private hasFilePayload(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
