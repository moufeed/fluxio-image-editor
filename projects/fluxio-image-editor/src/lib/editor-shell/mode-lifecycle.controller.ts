import { inject, Injectable } from '@angular/core';

import type { EditorModeClosers } from './editor-mode.coordinator';
import { AnnotationInteractionController } from './annotation-interaction.controller';
import { EditorPresentationStore } from './editor-presentation.store';
import { EditorShellContext } from './editor-shell.context';
import { CropTool } from './tools/crop.tool';
import { DrawingTool } from './tools/drawing.tool';
import { ImageAnnotationTool } from './tools/image-annotation.tool';
import { PathTool } from './tools/path.tool';
import { RasterPreviewTool } from './tools/raster-preview.tool';
import { ShapesTool } from './tools/shapes.tool';
import { TemplatesTool } from './tools/templates.tool';
import { TextTool } from './tools/text.tool';
import { TransformTool } from './tools/transform.tool';
import { WatermarkTool } from './tools/watermark.tool';
import { RulersTool } from './tools/rulers.tool';

/**
 * Owns mode closers, tool wiring, inspector open, and canvas-selection toolbar
 * actions that span multiple tools.
 */
@Injectable()
export class ModeLifecycleController {
  private readonly shell = inject(EditorShellContext);
  private readonly presentation = inject(EditorPresentationStore);
  private readonly annotations = inject(AnnotationInteractionController);
  private readonly cropTool = inject(CropTool);
  private readonly transformTool = inject(TransformTool);
  private readonly rasterPreview = inject(RasterPreviewTool);
  private readonly textTool = inject(TextTool);
  private readonly shapesTool = inject(ShapesTool);
  private readonly drawingTool = inject(DrawingTool);
  private readonly pathTool = inject(PathTool);
  private readonly imageAnnotationTool = inject(ImageAnnotationTool);
  private readonly watermarkTool = inject(WatermarkTool);
  private readonly templatesTool = inject(TemplatesTool);
  private readonly rulersTool = inject(RulersTool);

  readonly closers: EditorModeClosers = {
    crop: () => this.cropTool.cancel(),
    rotate: () => this.transformTool.closeRotate(),
    resize: () => this.transformTool.closeResize(),
    adjustments: () => this.rasterPreview.cancelAdjustments(),
    effects: () => this.rasterPreview.cancelEffects(),
    filters: () => this.rasterPreview.cancelFilters(),
    focus: () => this.rasterPreview.cancelFocus(),
    redact: () => this.rasterPreview.cancelRedact(),
    cropMask: () => this.rasterPreview.cancelCropMask(),
    colorOverlay: () => this.rasterPreview.cancelColorOverlay(),
    fill: () => this.rasterPreview.cancelFill(),
    frame: () => this.rasterPreview.cancelFrame(),
    text: () => this.textTool.cancel(),
    shapes: () => this.shapesTool.cancel(),
    drawing: () => this.drawingTool.cancel(),
    path: () => this.pathTool.cancel(),
    imageOverlay: () => this.imageAnnotationTool.cancel(),
    watermark: () => this.watermarkTool.cancel(),
    templates: () => this.templatesTool.cancel(),
    rulers: () => this.rulersTool.cancel(),
  };

  /** Wire tools + annotation bridge. Call once from the shell composition root. */
  bind(): void {
    this.annotations.configure({
      commitActiveDraft: () => this.commitActiveAnnotationDraft(),
      activeStrokeId: () => this.drawingTool.getActiveStrokeId() ?? this.pathTool.getActivePathId(),
      onAnnotationEditRequest: (id) => this.openInspectorForAnnotation(id),
    });
    this.rasterPreview.configure(this.closers);
    this.cropTool.configure({
      closers: this.closers,
      aspectRatios: () => this.presentation.aspectRatios(),
    });
    this.transformTool.configure(this.closers);
    this.textTool.configure(this.closers);
    this.shapesTool.configure(this.closers);
    this.drawingTool.configure(this.closers);
    this.pathTool.configure(this.closers);
    this.imageAnnotationTool.configure(this.closers);
    this.watermarkTool.configure(this.closers);
    this.templatesTool.configure({ closers: this.closers });
    this.rulersTool.configure(this.closers);
  }

  endTextEdit(): void {
    this.textTool.endEdit();
  }

  updateEditingText(value: string): void {
    this.textTool.updateEditingContent(value);
  }

  async doneText(): Promise<void> {
    await this.textTool.done();
  }

  async doneEmoji(): Promise<void> {
    await this.textTool.done();
  }

  async doneShapes(): Promise<void> {
    await this.shapesTool.done();
  }

  async doneDrawing(): Promise<void> {
    await this.drawingTool.done();
  }

  async donePath(): Promise<void> {
    await this.pathTool.done();
  }

  async doneImageOverlay(): Promise<void> {
    await this.imageAnnotationTool.done();
  }

  async doneStickers(): Promise<void> {
    await this.imageAnnotationTool.done();
  }

  async doneWatermark(): Promise<void> {
    await this.watermarkTool.done();
  }

  onCanvasSelectionToolbarEdit(): void {
    const id = this.annotations.primaryId();
    if (id) {
      this.openInspectorForAnnotation(id);
    }
  }

  onCanvasSelectionToolbarDuplicate(): void {
    this.annotations.duplicate();
  }

  onCanvasSelectionToolbarBringForward(): void {
    this.annotations.reorder('forward');
  }

  onCanvasSelectionToolbarSendBackward(): void {
    this.annotations.reorder('backward');
  }

  onCanvasSelectionToolbarDelete(): void {
    if (this.presentation.watermarkMode()) {
      this.watermarkTool.remove();
      return;
    }
    this.deletePrimarySelectedInActiveTool();
  }

  onPathVertexToolbarDelete(): void {
    this.pathTool.deleteSelectedVertex();
  }

  deletePrimarySelectedInActiveTool(): void {
    if (this.annotations.deleteSelected()) {
      return;
    }
    const id = this.annotations.primaryId();
    if (!id) {
      return;
    }
    if (this.presentation.textMode() || this.presentation.emojiMode()) {
      this.textTool.delete(id);
    } else if (this.presentation.shapesMode()) {
      this.shapesTool.delete(id);
    } else if (this.presentation.drawingMode() || this.presentation.pathMode()) {
      void this.deleteDraftPath(id);
    } else if (this.presentation.imageOverlayMode() || this.presentation.stickersMode()) {
      this.imageAnnotationTool.delete(id);
    }
  }

  private async deleteDraftPath(id: string): Promise<void> {
    if (this.presentation.pathMode()) {
      await this.pathTool.delete(id);
      return;
    }
    await this.drawingTool.delete(id);
  }

  private openInspectorForAnnotation(id: string): void {
    this.annotations.syncAllDraftsFromDocument();
    const kind = this.annotations.selectionKind() ?? this.kindFromDocument(id);
    if (!kind) {
      return;
    }
    this.annotations.applySelection(kind, id, false);
    if (kind === 'text') {
      this.textTool.beginEdit(id);
      return;
    }
    if (kind === 'shape') {
      if (!this.presentation.shapesMode()) {
        this.shapesTool.enter();
      }
      this.shapesTool.select(id);
      return;
    }
    if (kind === 'path') {
      if (!this.presentation.drawingMode()) {
        this.drawingTool.enter();
      }
      this.drawingTool.select(id);
      return;
    }
    if (kind === 'image') {
      if (!this.presentation.imageOverlayMode() && !this.presentation.stickersMode()) {
        this.imageAnnotationTool.enterOverlay();
      }
      this.imageAnnotationTool.select(id);
    }
  }

  private kindFromDocument(id: string): 'image' | 'text' | 'shape' | 'path' | null {
    const annotation = this.shell
      .getSession()
      ?.store.document()
      ?.annotations.find((item) => item.id === id);
    if (!annotation) {
      return null;
    }
    if (annotation.kind === 'image') {
      return 'image';
    }
    if (annotation.kind === 'text') {
      return 'text';
    }
    if (annotation.kind === 'path') {
      return 'path';
    }
    if (
      annotation.kind === 'rect' ||
      annotation.kind === 'ellipse' ||
      annotation.kind === 'polygon' ||
      annotation.kind === 'line' ||
      annotation.kind === 'arrow'
    ) {
      return 'shape';
    }
    return null;
  }

  private commitActiveAnnotationDraft(): Promise<void> {
    if (this.presentation.imageOverlayMode() || this.presentation.stickersMode()) {
      return this.imageAnnotationTool.commit();
    }
    if (this.presentation.textMode() || this.presentation.emojiMode()) {
      return this.textTool.commit();
    }
    if (this.presentation.shapesMode()) {
      return this.shapesTool.commit();
    }
    if (this.presentation.drawingMode()) {
      return this.drawingTool.commit();
    }
    if (this.presentation.pathMode()) {
      return this.pathTool.commit();
    }
    return this.annotations.commitSelectMode();
  }
}
