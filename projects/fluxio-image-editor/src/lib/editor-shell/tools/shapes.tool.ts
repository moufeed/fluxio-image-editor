import { inject, Injectable } from '@angular/core';

import {
  boundsFromShape,
  cascadePlaceBounds,
  clampPolygonSides,
  createDefaultShapeAnnotation,
  isShapeAnnotation,
  normalizeShapeAnnotation,
  regularPolygonPointsInBounds,
  type LineEndStyle,
  type ShapeAnnotation,
} from 'fluxio-image-editor/core';
import { SHAPES_SET_COMMAND } from 'fluxio-image-editor/plugins/shapes';

import { AnnotationInteractionController } from '../annotation-interaction.controller';
import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

@Injectable()
export class ShapesTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private readonly annotations = inject(AnnotationInteractionController);
  private closers: EditorModeClosers | null = null;
  private commitChain: Promise<void> = Promise.resolve();

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  enter(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('shapes', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const shapes = document.annotations.filter(isShapeAnnotation).map(normalizeShapeAnnotation);
    this.ui.draftShapes.set(shapes);
    const keep = this.ui.selectedShapeIds().filter((id) => shapes.some((item) => item.id === id));
    this.ui.selectedShapeIds.set(keep.length > 0 ? keep : shapes[0]?.id ? [shapes[0].id] : []);
    this.ui.shapesMode.set(true);
    session.setActiveTool('shapes');
    this.annotations.bind(session);
    this.annotations.pushPreview();
  }

  cancel(): void {
    const wasOpen = this.ui.shapesMode();
    this.annotations.clearGesture();
    this.ui.shapesMode.set(false);
    this.ui.selectedShapeIds.set([]);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (wasOpen || session.store.activeTool() === 'shapes') {
      this.annotations.syncAllDraftsFromDocument();
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  reset(): void {
    this.ui.draftShapes.set([]);
    this.ui.selectedShapeIds.set([]);
    if (this.ui.shapesMode()) {
      this.annotations.pushPreview();
      void this.commit();
    }
  }

  add(): void {
    const document = this.shell.getSession()?.store.document();
    if (!document) {
      return;
    }
    const candidate = createDefaultShapeAnnotation(this.ui.shapeDraftKind(), document.output, {
      polygonSides: this.ui.shapeDraftPolygonSides(),
    });
    const placedBounds = cascadePlaceBounds(
      boundsFromShape(candidate),
      this.ui.draftShapes().map(boundsFromShape),
      document.output,
    );
    const next =
      candidate.kind === 'rect' || candidate.kind === 'ellipse'
        ? normalizeShapeAnnotation({
            ...candidate,
            x: placedBounds.x,
            y: placedBounds.y,
          })
        : candidate.kind === 'polygon'
          ? normalizeShapeAnnotation({
              ...candidate,
              points: candidate.points.map((p) => ({
                x: p.x + (placedBounds.x - boundsFromShape(candidate).x),
                y: p.y + (placedBounds.y - boundsFromShape(candidate).y),
              })),
            })
          : normalizeShapeAnnotation({
              ...candidate,
              x1: candidate.x1 + (placedBounds.x - boundsFromShape(candidate).x),
              y1: candidate.y1 + (placedBounds.y - boundsFromShape(candidate).y),
              x2: candidate.x2 + (placedBounds.x - boundsFromShape(candidate).x),
              y2: candidate.y2 + (placedBounds.y - boundsFromShape(candidate).y),
            });
    this.ui.draftShapes.update((list) => [...list, next]);
    this.ui.selectedShapeIds.set([next.id]);
    this.annotations.pushPreview();
    void this.commit();
  }

  select(id: string, event?: Event): void {
    const additive =
      event instanceof MouseEvent && (event.shiftKey || event.ctrlKey || event.metaKey);
    this.annotations.applySelection('shape', id, additive);
    const selected = this.ui.draftShapes().find((item) => item.id === id);
    if (selected?.kind === 'polygon') {
      this.ui.shapeDraftPolygonSides.set(clampPolygonSides(selected.points.length));
    }
    if (this.ui.shapesMode()) {
      this.annotations.pushPreview();
    }
  }

  delete(id: string): void {
    const next = this.ui.draftShapes().filter((item) => item.id !== id);
    this.ui.draftShapes.set(next);
    this.annotations.removeIdFromSelection('shape', id, next[0]?.id ?? null);
    this.annotations.pushPreview();
    void this.commit();
  }

  updateSelectedStroke(stroke: string): void {
    this.patchSelected({ stroke } as Partial<ShapeAnnotation>);
  }

  updateSelectedFill(fill: string): void {
    const selected = this.ui.draftShapes().find((item) => item.id === this.ui.selectedShapeId());
    if (!selected || selected.kind === 'line' || selected.kind === 'arrow') {
      return;
    }
    this.patchSelected({ fill } as Partial<ShapeAnnotation>);
  }

  updateSelectedStrokeWidth(width: number): void {
    this.patchSelected({ strokeWidth: width } as Partial<ShapeAnnotation>);
  }

  updateSelectedLineStart(lineStart: LineEndStyle): void {
    const selected = this.ui.draftShapes().find((item) => item.id === this.ui.selectedShapeId());
    if (!selected || (selected.kind !== 'line' && selected.kind !== 'arrow')) {
      return;
    }
    this.patchSelected({ lineStart } as Partial<ShapeAnnotation>);
  }

  updateSelectedLineEnd(lineEnd: LineEndStyle): void {
    const selected = this.ui.draftShapes().find((item) => item.id === this.ui.selectedShapeId());
    if (!selected || (selected.kind !== 'line' && selected.kind !== 'arrow')) {
      return;
    }
    this.patchSelected({ lineEnd } as Partial<ShapeAnnotation>);
  }

  updateSelectedPolygonSides(sides: number): void {
    const nextSides = clampPolygonSides(sides);
    this.ui.shapeDraftPolygonSides.set(nextSides);
    const selected = this.ui.draftShapes().find((item) => item.id === this.ui.selectedShapeId());
    if (!selected || selected.kind !== 'polygon') {
      return;
    }
    if (selected.points.length === nextSides) {
      return;
    }
    this.patchSelected({
      points: regularPolygonPointsInBounds(boundsFromShape(selected), nextSides),
    } as Partial<ShapeAnnotation>);
    void this.commit();
  }

  setDraftPolygonSides(sides: number): void {
    // Same control drives draft + selected polygon so sides changes are live.
    this.updateSelectedPolygonSides(sides);
  }

  commitSelectedProps(): void {
    if (!this.ui.shapesMode() || !this.ui.selectedShapeId()) {
      return;
    }
    void this.commit();
  }

  async done(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.shapesMode()) {
      return;
    }
    const keepIds = this.ui.selectedShapeIds();
    await this.commit();
    this.annotations.clearGesture();
    this.ui.shapesMode.set(false);
    this.annotations.syncAllDraftsFromDocument();
    this.ui.selectedShapeIds.set(
      keepIds.filter((id) => this.ui.draftShapes().some((item) => item.id === id)),
    );
    this.annotations.bind(session);
    session.setPreview(null);
    session.setActiveTool(null);
  }

  commit(): Promise<void> {
    this.commitChain = this.commitChain.catch(() => undefined).then(() => this.commitNow());
    return this.commitChain;
  }

  private patchSelected(patch: Partial<ShapeAnnotation>): void {
    const id = this.ui.selectedShapeId();
    if (!id) {
      return;
    }
    this.ui.draftShapes.update((list) =>
      list.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return normalizeShapeAnnotation({
          ...item,
          ...patch,
          id,
          kind: item.kind,
        } as ShapeAnnotation);
      }),
    );
    this.annotations.pushPreview();
  }

  private async commitNow(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.shapesMode()) {
      return;
    }
    await session.execute(SHAPES_SET_COMMAND, { shapes: this.ui.draftShapes() });
    const document = session.store.document();
    if (document) {
      const shapes = document.annotations.filter(isShapeAnnotation).map(normalizeShapeAnnotation);
      this.ui.draftShapes.set(shapes);
      const selected = this.ui
        .selectedShapeIds()
        .filter((id) => shapes.some((item) => item.id === id));
      this.ui.selectedShapeIds.set(
        selected.length > 0 ? selected : shapes[0]?.id ? [shapes[0].id] : [],
      );
    }
    if (this.ui.shapesMode()) {
      this.annotations.pushPreview();
    }
  }
}
