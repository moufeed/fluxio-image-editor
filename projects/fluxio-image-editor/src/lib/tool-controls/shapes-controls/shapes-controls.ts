import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { LINE_END_STYLES, type LineEndStyle } from 'fluxio-image-editor/core';

import { ShapesTool } from '../../editor-shell/tools/shapes.tool';
import { ColorAlphaFieldComponent } from '../../chrome/color-alpha-field/color-alpha-field';
import { OrderActionsComponent } from '../../chrome/order-actions/order-actions';
import { ObjectInspectorActionsComponent } from '../../chrome/tool-actions/object-inspector-actions';
import { AnnotationControlsBase } from '../annotation-controls-base';

@Component({
  selector: 'fluxio-shapes-controls',
  imports: [
    DecimalPipe,
    ColorAlphaFieldComponent,
    OrderActionsComponent,
    ObjectInspectorActionsComponent,
  ],
  templateUrl: './shapes-controls.html',
})
export class FluxioShapesControls extends AnnotationControlsBase {
  private readonly shapesTool = inject(ShapesTool);

  protected readonly draftShapes = this.presentation.draftShapes;
  protected readonly selectedShapeIds = this.presentation.selectedShapeIds;
  protected readonly selectedShape = this.presentation.selectedShape;
  protected readonly polygonSidesValue = this.presentation.polygonSidesValue;
  protected readonly shapeKinds = this.presentation.shapeKinds;
  protected readonly shapeDraftKind = this.presentation.shapeDraftKind;
  protected readonly colorFallbackRed = this.presentation.colorFallbackRed;
  protected readonly colorFallbackBlack = this.presentation.colorFallbackBlack;

  protected readonly shapeIconPaths: Record<string, string> = {
    rect: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
    ellipse: 'M12 4C7 4 4 7.6 4 12s3 8 8 8 8-3.6 8-8-3-8-8-8z',
    polygon: 'M12 4l7 4.5v7L12 20l-7-4.5v-7z',
    line: 'M6 17l12-10 2 2-12 10z',
    arrow: 'M19 12l-6 6v-3H5V9h8V6z',
  };
  protected readonly lineEndStyles = LINE_END_STYLES;
  /** Compact SVG paths for Pintura-like line start/end style buttons. */
  protected readonly lineEndIconPaths: Record<LineEndStyle, string> = {
    none: 'M4 12h16',
    bar: 'M4 12h12M18 7v10',
    arrow: 'M4 12h12M14 7l6 5-6 5',
    arrowSolid: 'M4 12h11M13 7l7 5-7 5z',
    circle: 'M4 12h8M19 12a3 3 0 11-6 0 3 3 0 016 0',
    circleSolid: 'M4 12h8M16 12a3.2 3.2 0 110 0.01',
    square: 'M4 12h8M14 9h6v6h-6z',
    squareSolid: 'M4 12h8M14 9h6v6h-6z',
  };
  protected readonly lineEndIconFilled: ReadonlySet<LineEndStyle> = new Set([
    'arrowSolid',
    'circleSolid',
    'squareSolid',
  ]);

  protected addDraftShape(): void {
    this.shapesTool.add();
  }
  protected selectDraftShape(id: string, event?: Event): void {
    this.shapesTool.select(id, event);
  }
  protected deleteDraftShape(id: string): void {
    this.shapesTool.delete(id);
  }
  protected updateSelectedShapePolygonSides(sides: number): void {
    this.shapesTool.updateSelectedPolygonSides(sides);
  }
  protected updateSelectedShapeStroke(stroke: string): void {
    this.shapesTool.updateSelectedStroke(stroke);
  }
  protected updateSelectedShapeFill(fill: string): void {
    this.shapesTool.updateSelectedFill(fill);
  }
  protected updateSelectedShapeStrokeWidth(width: number): void {
    this.shapesTool.updateSelectedStrokeWidth(width);
  }
  protected updateSelectedShapeLineStart(style: LineEndStyle): void {
    this.shapesTool.updateSelectedLineStart(style);
  }
  protected updateSelectedShapeLineEnd(style: LineEndStyle): void {
    this.shapesTool.updateSelectedLineEnd(style);
  }
  protected commitSelectedShapeProps(): void {
    this.shapesTool.commitSelectedProps();
  }
  protected doneShapes(): Promise<void> {
    return this.shapesTool.done();
  }
}
