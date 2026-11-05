import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { PathTool } from '../../editor-shell/tools/path.tool';
import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { AnnotationControlsBase } from '../annotation-controls-base';

@Component({
  selector: 'fluxio-path-controls',
  imports: [
    DecimalPipe,
    ColorAlphaFieldComponent,
    OrderActionsComponent,
    ObjectInspectorActionsComponent,
  ],
  templateUrl: './path-controls.html',
})
export class FluxioPathControls extends AnnotationControlsBase {
  private readonly pathTool = inject(PathTool);

  protected readonly draftPaths = this.presentation.draftPaths;
  protected readonly selectedPathId = this.presentation.selectedPathId;
  protected readonly selectedPath = this.presentation.selectedPath;
  protected readonly penStroke = this.presentation.penStroke;
  protected readonly penStrokeWidth = this.presentation.penStrokeWidth;
  protected readonly colorFallbackRed = this.presentation.colorFallbackRed;
  protected readonly hasActivePath = () => !!this.pathTool.getActivePathId();

  protected selectDraftPath(id: string): void {
    this.pathTool.select(id);
  }
  protected deleteDraftPath(id: string): Promise<void> {
    return this.pathTool.delete(id);
  }
  protected updatePenStroke(stroke: string): void {
    this.pathTool.updatePenStroke(stroke);
  }
  protected updatePenStrokeWidth(width: number): void {
    this.pathTool.updatePenStrokeWidth(width);
  }
  protected commitPenProps(): void {
    this.pathTool.commitPenProps();
  }
  protected finishPath(): Promise<boolean> {
    return this.pathTool.finishActivePath(false);
  }
  protected closePath(): Promise<boolean> {
    return this.pathTool.finishActivePath(true);
  }
  protected clearPaths(): void {
    this.pathTool.clear();
  }
  protected donePath(): Promise<void> {
    return this.pathTool.done();
  }
}
