import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { DrawingTool } from '../../editor-shell/tools/drawing.tool';
import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { AnnotationControlsBase } from '../annotation-controls-base';

@Component({
  selector: 'fluxio-drawing-controls',
  imports: [
    DecimalPipe,
    ColorAlphaFieldComponent,
    OrderActionsComponent,
    ObjectInspectorActionsComponent,
  ],
  templateUrl: './drawing-controls.html',
})
export class FluxioDrawingControls extends AnnotationControlsBase {
  private readonly drawingTool = inject(DrawingTool);

  protected readonly draftPaths = this.presentation.draftPaths;
  protected readonly selectedPathId = this.presentation.selectedPathId;
  protected readonly selectedPath = this.presentation.selectedPath;
  protected readonly penStroke = this.presentation.penStroke;
  protected readonly penStrokeWidth = this.presentation.penStrokeWidth;
  protected readonly colorFallbackRed = this.presentation.colorFallbackRed;

  protected selectDraftPath(id: string): void {
    this.drawingTool.select(id);
  }
  protected deleteDraftPath(id: string): Promise<void> {
    return this.drawingTool.delete(id);
  }
  protected updatePenStroke(stroke: string): void {
    this.drawingTool.updatePenStroke(stroke);
  }
  protected updatePenStrokeWidth(width: number): void {
    this.drawingTool.updatePenStrokeWidth(width);
  }
  protected commitPenProps(): void {
    this.drawingTool.commitPenProps();
  }
  protected clearDrawing(): void {
    this.drawingTool.clear();
  }
  protected doneDrawing(): Promise<void> {
    return this.drawingTool.done();
  }
}
