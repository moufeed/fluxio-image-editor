import { inject, Injectable } from '@angular/core';

import {
  createAnnotationId,
  isPathAnnotation,
  normalizePathAnnotation,
} from 'fluxio-image-editor/core';
import { DRAWING_SET_COMMAND } from 'fluxio-image-editor/plugins/drawing';

import { AnnotationInteractionController } from '../annotation-interaction.controller';
import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

@Injectable()
export class DrawingTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private readonly annotations = inject(AnnotationInteractionController);
  private closers: EditorModeClosers | null = null;
  private commitChain: Promise<void> = Promise.resolve();
  private activeStrokeId: string | null = null;
  private lastDrawPoint: { x: number; y: number } | null = null;

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  getActiveStrokeId(): string | null {
    return this.activeStrokeId;
  }

  enter(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('drawing', this.closers);
    const session = this.shell.getSession();
    const document = session?.store.document();
    if (!session || !document) {
      return;
    }
    const paths = document.annotations.filter(isPathAnnotation).map(normalizePathAnnotation);
    this.ui.draftPaths.set(paths);
    const keep = this.ui.selectedPathId();
    this.ui.selectedPathId.set(
      keep && paths.some((item) => item.id === keep) ? keep : (paths[0]?.id ?? null),
    );
    this.activeStrokeId = null;
    this.lastDrawPoint = null;
    this.ui.drawingMode.set(true);
    session.setActiveTool('drawing');
    session.setDrawPointHandler((event) => this.onDrawPoint(event));
    session.setDrawingStrokeWidthProvider(() => this.ui.penStrokeWidth());
    this.annotations.bind(session);
    this.annotations.pushPreview();
  }

  cancel(): void {
    const wasOpen = this.ui.drawingMode();
    if (this.activeStrokeId) {
      const strokeId = this.activeStrokeId;
      this.ui.draftPaths.update((list) => list.filter((item) => item.id !== strokeId));
      this.activeStrokeId = null;
      this.lastDrawPoint = null;
    }
    this.annotations.clearGesture();
    this.ui.drawingMode.set(false);
    this.ui.selectedPathId.set(null);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    session.setDrawPointHandler(null);
    session.setDrawingStrokeWidthProvider(null);
    if (wasOpen || session.store.activeTool() === 'drawing') {
      this.annotations.syncAllDraftsFromDocument();
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  async reset(): Promise<void> {
    this.ui.draftPaths.set([]);
    this.ui.selectedPathId.set(null);
    this.activeStrokeId = null;
    this.lastDrawPoint = null;
    if (this.ui.drawingMode()) {
      this.annotations.pushPreview();
      await this.commit();
    }
  }

  select(id: string): void {
    this.annotations.applySelection('path', id);
    if (this.ui.drawingMode()) {
      this.annotations.pushPreview();
    }
  }

  async delete(id: string): Promise<void> {
    const next = this.ui.draftPaths().filter((item) => item.id !== id);
    this.ui.draftPaths.set(next);
    if (this.ui.selectedPathId() === id) {
      this.ui.selectedPathId.set(next[0]?.id ?? null);
    }
    if (this.activeStrokeId === id) {
      this.activeStrokeId = null;
      this.lastDrawPoint = null;
    }
    this.annotations.pushPreview();
    if (this.ui.drawingMode()) {
      await this.commit();
    }
  }

  updatePenStroke(stroke: string): void {
    this.ui.penStroke.set(stroke);
    const id = this.ui.selectedPathId();
    if (!this.ui.drawingMode() || !id || this.activeStrokeId) {
      return;
    }
    this.ui.draftPaths.update((list) =>
      list.map((item) => (item.id === id ? normalizePathAnnotation({ ...item, stroke }) : item)),
    );
    this.annotations.pushPreview();
  }

  updatePenStrokeWidth(width: number): void {
    this.ui.penStrokeWidth.set(Math.max(1, Math.round(width)));
    const id = this.ui.selectedPathId();
    if (!this.ui.drawingMode() || !id || this.activeStrokeId) {
      return;
    }
    this.ui.draftPaths.update((list) =>
      list.map((item) =>
        item.id === id
          ? normalizePathAnnotation({ ...item, strokeWidth: this.ui.penStrokeWidth() })
          : item,
      ),
    );
    this.annotations.pushPreview();
  }

  /** Record one history entry once a stroke colour/width interaction settles. */
  commitPenProps(): void {
    if (!this.ui.drawingMode() || this.activeStrokeId) {
      return;
    }
    void this.commit();
  }

  clear(): void {
    void this.reset();
  }

  /** Cancel an in-progress stroke without committing (Escape during draw). */
  cancelActiveStroke(): boolean {
    if (!this.activeStrokeId) {
      return false;
    }
    const strokeId = this.activeStrokeId;
    this.ui.draftPaths.update((list) => list.filter((item) => item.id !== strokeId));
    this.activeStrokeId = null;
    this.lastDrawPoint = null;
    this.annotations.pushPreview();
    this.shell.getSession()?.cancelActiveGesture();
    return true;
  }

  syncFromDocument(): void {
    if (!this.ui.drawingMode() || this.activeStrokeId) {
      return;
    }
    const document = this.shell.getSession()?.store.document();
    if (!document) {
      return;
    }
    const paths = document.annotations.filter(isPathAnnotation).map(normalizePathAnnotation);
    this.ui.draftPaths.set(paths);
    if (this.ui.selectedPathId() && !paths.some((item) => item.id === this.ui.selectedPathId())) {
      this.ui.selectedPathId.set(paths[0]?.id ?? null);
    }
    this.annotations.pushPreview();
  }

  async done(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.drawingMode()) {
      return;
    }
    if (this.activeStrokeId) {
      this.activeStrokeId = null;
      this.lastDrawPoint = null;
    }
    // Commit unconditionally: property edits stay as preview until they settle.
    await this.commit();
    const keepId = this.ui.selectedPathId();
    this.annotations.clearGesture();
    this.ui.drawingMode.set(false);
    this.annotations.syncAllDraftsFromDocument();
    this.ui.selectedPathId.set(
      keepId && this.ui.draftPaths().some((item) => item.id === keepId) ? keepId : null,
    );
    session.setDrawPointHandler(null);
    session.setDrawingStrokeWidthProvider(null);
    this.annotations.bind(session);
    session.setPreview(null);
    session.setActiveTool(null);
  }

  commit(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.drawingMode()) {
      return Promise.resolve();
    }
    const paths = this.ui.draftPaths();
    this.commitChain = this.commitChain
      .catch(() => undefined)
      .then(() => session.execute(DRAWING_SET_COMMAND, { paths }));
    return this.commitChain;
  }

  private onDrawPoint(event: {
    readonly phase: 'start' | 'move' | 'end';
    readonly x: number;
    readonly y: number;
  }): void {
    if (!this.ui.drawingMode()) {
      return;
    }
    if (event.phase === 'start') {
      const stroke = normalizePathAnnotation({
        id: createAnnotationId(),
        points: [{ x: event.x, y: event.y }],
        stroke: this.ui.penStroke(),
        strokeWidth: this.ui.penStrokeWidth(),
      });
      this.activeStrokeId = stroke.id;
      this.lastDrawPoint = { x: event.x, y: event.y };
      this.ui.draftPaths.update((list) => [...list, stroke]);
      this.ui.selectedPathId.set(null);
      this.annotations.pushPreview();
      return;
    }

    if (event.phase === 'move' && this.activeStrokeId) {
      const last = this.lastDrawPoint;
      if (last) {
        const dx = event.x - last.x;
        const dy = event.y - last.y;
        if (dx * dx + dy * dy < 4) {
          return;
        }
      }
      this.lastDrawPoint = { x: event.x, y: event.y };
      const strokeId = this.activeStrokeId;
      this.ui.draftPaths.update((list) =>
        list.map((item) =>
          item.id === strokeId
            ? normalizePathAnnotation({
                ...item,
                points: [...item.points, { x: event.x, y: event.y }],
              })
            : item,
        ),
      );
      this.annotations.pushPreview();
      return;
    }

    if (event.phase === 'end') {
      const finishedId = this.activeStrokeId;
      this.activeStrokeId = null;
      this.lastDrawPoint = null;
      if (finishedId) {
        this.ui.selectedPathId.set(finishedId);
        this.annotations.pushPreview();
        void this.commit();
      }
    }
  }
}
