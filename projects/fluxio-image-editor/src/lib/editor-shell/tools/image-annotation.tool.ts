import { inject, Injectable } from '@angular/core';

import {
  cascadePlaceImageAnnotation,
  createDefaultImageAnnotation,
  isImageAnnotation,
  normalizeImageAnnotation,
} from 'fluxio-image-editor/core';
import { IMAGE_OVERLAY_SET_COMMAND } from 'fluxio-image-editor/plugins/image-overlay';

import { AnnotationInteractionController } from '../annotation-interaction.controller';
import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';
import { probeImageSize } from '../helpers/probe-image-size';
import { readImageFileAsDataUrl } from '../helpers/read-image-file';

@Injectable()
export class ImageAnnotationTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private readonly annotations = inject(AnnotationInteractionController);
  private closers: EditorModeClosers | null = null;
  private commitChain: Promise<void> = Promise.resolve();

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  enterOverlay(): void {
    this.enter('image-overlay');
  }

  enterStickers(): void {
    this.enter('stickers');
  }

  cancel(): void {
    const wasOpen = this.ui.imageOverlayMode() || this.ui.stickersMode();
    this.annotations.clearGesture();
    this.ui.imageOverlayMode.set(false);
    this.ui.stickersMode.set(false);
    this.ui.selectedImageIds.set([]);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    const tool = session.store.activeTool();
    if (wasOpen || tool === 'image-overlay' || tool === 'stickers') {
      this.annotations.syncAllDraftsFromDocument();
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  reset(): void {
    this.ui.draftImages.set([]);
    this.ui.selectedImageIds.set([]);
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      this.annotations.pushPreview();
      void this.commit();
    }
  }

  addGalleryOverlay(src: string): void {
    const document = this.shell.getSession()?.store.document();
    if (!document || !src) {
      return;
    }
    void probeImageSize(src).then((intrinsic) => {
      if (!this.ui.imageOverlayMode() && !this.ui.stickersMode()) {
        return;
      }
      const placed = cascadePlaceImageAnnotation(
        createDefaultImageAnnotation(document.output, src, intrinsic),
        this.ui.draftImages(),
        document.output,
      );
      this.ui.draftImages.update((list) => [...list, placed]);
      this.ui.selectedImageIds.set([placed.id]);
      this.annotations.pushPreview();
      void this.commit();
    });
  }

  onOverlayFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.addOverlayFile(file);
  }

  /** Add an overlay/sticker from a picked or dropped image file. */
  addOverlayFile(file: File): void {
    void readImageFileAsDataUrl(file)
      .then((src) => this.addGalleryOverlay(src))
      .catch((error) => this.shell.reportError(error));
  }

  select(id: string, event?: Event): void {
    const additive =
      event instanceof MouseEvent && (event.shiftKey || event.ctrlKey || event.metaKey);
    this.annotations.applySelection('image', id, additive);
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      this.annotations.pushPreview();
    }
  }

  delete(id: string): void {
    const next = this.ui.draftImages().filter((item) => item.id !== id);
    this.ui.draftImages.set(next);
    this.annotations.removeIdFromSelection('image', id, next[0]?.id ?? null);
    this.annotations.pushPreview();
    void this.commit();
  }

  updateSelectedOpacity(opacity: number): void {
    const id = this.ui.selectedImageId();
    if (!id) {
      return;
    }
    this.ui.draftImages.update((list) =>
      list.map((item) =>
        item.id === id
          ? normalizeImageAnnotation({ ...item, opacity: opacity / 100, id, src: item.src })
          : item,
      ),
    );
    this.annotations.pushPreview();
  }

  commitSelectedOpacity(): void {
    if ((!this.ui.imageOverlayMode() && !this.ui.stickersMode()) || !this.ui.selectedImageId()) {
      return;
    }
    void this.commit();
  }

  async done(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || (!this.ui.imageOverlayMode() && !this.ui.stickersMode())) {
      return;
    }
    const keepIds = this.ui.selectedImageIds();
    await this.commit();
    this.annotations.clearGesture();
    this.ui.imageOverlayMode.set(false);
    this.ui.stickersMode.set(false);
    this.annotations.syncAllDraftsFromDocument();
    this.ui.selectedImageIds.set(
      keepIds.filter((id) => this.ui.draftImages().some((item) => item.id === id)),
    );
    this.annotations.bind(session);
    session.setPreview(null);
    session.setActiveTool(null);
  }

  commit(): Promise<void> {
    this.commitChain = this.commitChain.catch(() => undefined).then(() => this.commitNow());
    return this.commitChain;
  }

  private enter(tool: 'image-overlay' | 'stickers'): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers(tool === 'stickers' ? 'stickers' : 'image-overlay', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const images = document.annotations.filter(isImageAnnotation).map(normalizeImageAnnotation);
    this.ui.draftImages.set(images);
    const keep = this.ui.selectedImageIds().filter((id) => images.some((item) => item.id === id));
    this.ui.selectedImageIds.set(keep.length > 0 ? keep : images[0]?.id ? [images[0].id] : []);
    if (tool === 'stickers') {
      this.ui.imageOverlayMode.set(false);
      this.ui.stickersMode.set(true);
    } else {
      this.ui.stickersMode.set(false);
      this.ui.imageOverlayMode.set(true);
    }
    session.setActiveTool(tool);
    this.annotations.bind(session);
    this.annotations.pushPreview();
  }

  private async commitNow(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || (!this.ui.imageOverlayMode() && !this.ui.stickersMode())) {
      return;
    }
    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: this.ui.draftImages() });
    const document = session.store.document();
    if (document) {
      const images = document.annotations.filter(isImageAnnotation).map(normalizeImageAnnotation);
      this.ui.draftImages.set(images);
      const selected = this.ui
        .selectedImageIds()
        .filter((id) => images.some((item) => item.id === id));
      this.ui.selectedImageIds.set(
        selected.length > 0 ? selected : images[0]?.id ? [images[0].id] : [],
      );
    }
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      this.annotations.pushPreview();
    }
  }
}
