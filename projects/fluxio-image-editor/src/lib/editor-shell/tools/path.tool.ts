import { inject, Injectable } from '@angular/core';

import {
  createAnnotationId,
  isPathAnnotation,
  normalizePathAnnotation,
} from 'fluxio-image-editor/core';
import { PATH_SET_COMMAND } from 'fluxio-image-editor/plugins/path';

import { AnnotationInteractionController } from '../annotation-interaction.controller';
import { EditorModeCoordinator, type EditorModeClosers } from '../editor-mode.coordinator';
import { EditorShellContext } from '../editor-shell.context';
import { EditorUiStore } from '../editor-ui.store';

const CLOSE_HIT_PADDING = 28;

/** Click-to-place polyline path tool (separate from freehand Draw). */
@Injectable()
export class PathTool {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly modes = inject(EditorModeCoordinator);
  private readonly annotations = inject(AnnotationInteractionController);
  private closers: EditorModeClosers | null = null;
  private commitChain: Promise<void> = Promise.resolve();
  private activePathId: string | null = null;

  configure(closers: EditorModeClosers): void {
    this.closers = closers;
  }

  getActivePathId(): string | null {
    return this.activePathId;
  }

  /** Delete the currently selected path vertex (canvas toolbar). */
  deleteSelectedVertex(): void {
    this.onPathVertexDelete();
  }

  enter(): void {
    if (!this.closers) {
      return;
    }
    this.modes.closeOthers('path', this.closers);
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
    this.activePathId = null;
    this.ui.selectedPathVertexIndex.set(null);
    this.ui.pathMode.set(true);
    session.setActiveTool('path');
    this.registerPathProviders(session);
    session.setPathVertexHandler((event) => this.onPathVertex(event));
    session.setPathDrawingActiveProvider(() => !!this.activePathId);
    this.annotations.bind(session);
    this.annotations.pushPreview();
  }

  cancel(): void {
    const wasOpen = this.ui.pathMode();
    if (this.activePathId) {
      const pathId = this.activePathId;
      this.ui.draftPaths.update((list) => list.filter((item) => item.id !== pathId));
      this.activePathId = null;
    }
    this.annotations.clearGesture();
    this.ui.pathMode.set(false);
    this.ui.selectedPathId.set(null);
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    this.clearPathProviders(session);
    if (wasOpen || session.store.activeTool() === 'path') {
      this.annotations.syncAllDraftsFromDocument();
      session.setPreview(null);
      session.setActiveTool(null);
    }
  }

  async reset(): Promise<void> {
    this.ui.draftPaths.set([]);
    this.ui.selectedPathId.set(null);
    this.activePathId = null;
    if (this.ui.pathMode()) {
      this.annotations.pushPreview();
      await this.commit();
    }
  }

  select(id: string): void {
    if (this.activePathId && this.activePathId !== id) {
      void this.finishActivePath(false);
    }
    this.ui.selectedPathVertexIndex.set(null);
    this.annotations.applySelection('path', id);
    if (this.ui.pathMode()) {
      this.annotations.pushPreview();
    }
  }

  async delete(id: string): Promise<void> {
    const next = this.ui.draftPaths().filter((item) => item.id !== id);
    this.ui.draftPaths.set(next);
    if (this.ui.selectedPathId() === id) {
      this.ui.selectedPathId.set(next[0]?.id ?? null);
    }
    if (this.activePathId === id) {
      this.activePathId = null;
    }
    this.ui.selectedPathVertexIndex.set(null);
    this.annotations.pushPreview();
    if (this.ui.pathMode()) {
      await this.commit();
    }
  }

  updatePenStroke(stroke: string): void {
    this.ui.penStroke.set(stroke);
    const id = this.ui.selectedPathId();
    if (!this.ui.pathMode() || !id || this.activePathId) {
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
    if (!this.ui.pathMode() || !id || this.activePathId) {
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
    if (!this.ui.pathMode() || this.activePathId) {
      return;
    }
    void this.commit();
  }

  clear(): void {
    void this.reset();
  }

  /** Cancel an in-progress polyline without committing (Escape). */
  cancelActivePath(): boolean {
    if (!this.activePathId) {
      return false;
    }
    const pathId = this.activePathId;
    this.ui.draftPaths.update((list) => list.filter((item) => item.id !== pathId));
    this.activePathId = null;
    this.ui.selectedPathVertexIndex.set(null);
    this.annotations.pushPreview();
    return true;
  }

  /** Finish the in-progress polyline (Finish button / Enter). */
  async finishActivePath(close = false): Promise<boolean> {
    if (!this.activePathId) {
      return false;
    }
    const pathId = this.activePathId;
    const current = this.ui.draftPaths().find((item) => item.id === pathId);
    if (!current || current.points.length < 2) {
      this.cancelActivePath();
      return false;
    }
    if (close && current.points.length >= 3) {
      this.ui.draftPaths.update((list) =>
        list.map((item) =>
          item.id === pathId ? normalizePathAnnotation({ ...item, closed: true }) : item,
        ),
      );
    }
    this.activePathId = null;
    this.ui.selectedPathVertexIndex.set(null);
    this.ui.selectedPathId.set(pathId);
    this.annotations.pushPreview();
    await this.commit();
    return true;
  }

  syncFromDocument(): void {
    if (!this.ui.pathMode() || this.activePathId) {
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
    if (!session || !this.ui.pathMode()) {
      return;
    }
    if (this.activePathId) {
      await this.finishActivePath(false);
    }
    // Commit unconditionally: property edits stay as preview until they settle.
    await this.commit();
    const keepId = this.ui.selectedPathId();
    this.annotations.clearGesture();
    this.ui.pathMode.set(false);
    this.annotations.syncAllDraftsFromDocument();
    this.ui.selectedPathId.set(
      keepId && this.ui.draftPaths().some((item) => item.id === keepId) ? keepId : null,
    );
    // Keep vertex edit providers so finished/selected paths remain editable in Select.
    session.setPathVertexHandler(null);
    session.setPathDrawingActiveProvider(() => false);
    this.registerPathProviders(session);
    this.annotations.bind(session);
    session.setPreview(null);
    session.setActiveTool(null);
  }

  commit(): Promise<void> {
    const session = this.shell.getSession();
    if (!session || !this.ui.pathMode()) {
      return Promise.resolve();
    }
    const paths = this.ui.draftPaths();
    this.commitChain = this.commitChain
      .catch(() => undefined)
      .then(() => session.execute(PATH_SET_COMMAND, { paths }));
    return this.commitChain;
  }

  private editablePathPoints(): readonly { readonly x: number; readonly y: number }[] | null {
    const pathId = this.activePathId ?? this.ui.selectedPathId();
    if (!pathId) {
      return null;
    }
    const current = this.ui.draftPaths().find((item) => item.id === pathId);
    return current?.points ?? null;
  }

  private editablePathStroke(): string {
    const pathId = this.activePathId ?? this.ui.selectedPathId();
    if (pathId) {
      const current = this.ui.draftPaths().find((item) => item.id === pathId);
      if (current) {
        return current.stroke;
      }
    }
    return this.ui.penStroke();
  }

  private editablePathClosed(): boolean {
    const pathId = this.activePathId ?? this.ui.selectedPathId();
    if (!pathId) {
      return false;
    }
    const current = this.ui.draftPaths().find((item) => item.id === pathId);
    return !!current?.closed;
  }

  private editablePathId(): string | null {
    return this.activePathId ?? this.ui.selectedPathId();
  }

  private registerPathProviders(
    session: NonNullable<ReturnType<EditorShellContext['getSession']>>,
  ): void {
    session.setPathVertexMoveHandler((event) => this.onPathVertexMove(event));
    session.setPathVertexInsertHandler((event) => this.onPathVertexInsert(event));
    session.setPathVertexSelectHandler((index) => this.onPathVertexSelect(index));
    session.setPathVertexDeleteHandler(() => this.onPathVertexDelete());
    session.setPathSelectedVertexIndexProvider(() => this.ui.selectedPathVertexIndex());
    session.setPathActivePointsProvider(() => this.editablePathPoints());
    session.setPathActiveStrokeProvider(() => this.editablePathStroke());
    session.setPathActiveClosedProvider(() => this.editablePathClosed());
  }

  private clearPathProviders(
    session: NonNullable<ReturnType<EditorShellContext['getSession']>>,
  ): void {
    session.setPathVertexHandler(null);
    session.setPathVertexMoveHandler(null);
    session.setPathVertexInsertHandler(null);
    session.setPathVertexSelectHandler(null);
    session.setPathVertexDeleteHandler(null);
    session.setPathSelectedVertexIndexProvider(null);
    session.setPathActivePointsProvider(null);
    session.setPathActiveStrokeProvider(null);
    session.setPathActiveClosedProvider(null);
    session.setPathDrawingActiveProvider(null);
    this.ui.selectedPathVertexIndex.set(null);
  }

  private onPathVertexSelect(index: number | null): void {
    if (this.activePathId) {
      this.ui.selectedPathVertexIndex.set(null);
      return;
    }
    const points = this.editablePathPoints();
    if (index == null || !points || index < 0 || index >= points.length) {
      this.ui.selectedPathVertexIndex.set(null);
    } else {
      this.ui.selectedPathVertexIndex.set(index);
    }
    this.annotations.pushPreview();
  }

  private onPathVertexDelete(): void {
    const pathId = this.editablePathId();
    const index = this.ui.selectedPathVertexIndex();
    if (!pathId || index == null || this.activePathId) {
      return;
    }
    const current = this.ui.draftPaths().find((item) => item.id === pathId);
    if (!current) {
      return;
    }
    const minPoints = current.closed ? 3 : 2;
    if (current.points.length <= minPoints) {
      // Too few points left — remove the whole path instead.
      void this.delete(pathId);
      return;
    }
    this.ui.draftPaths.update((list) =>
      list.map((item) => {
        if (item.id !== pathId) {
          return item;
        }
        const points = item.points.filter((_, i) => i !== index);
        return normalizePathAnnotation({ ...item, points });
      }),
    );
    this.ui.selectedPathVertexIndex.set(null);
    this.annotations.pushPreview();
    void this.commitSelectedPathEdit();
  }

  private onPathVertexMove(event: {
    readonly phase: 'start' | 'move' | 'end';
    readonly index: number;
    readonly x: number;
    readonly y: number;
  }): void {
    const pathId = this.editablePathId();
    if (!pathId) {
      return;
    }
    // After Path Done, drafts still live on the UI store for Select-mode edits.
    this.ui.draftPaths.update((list) =>
      list.map((item) => {
        if (item.id !== pathId) {
          return item;
        }
        if (event.index < 0 || event.index >= item.points.length) {
          return item;
        }
        const points = item.points.map((point, index) =>
          index === event.index ? { x: event.x, y: event.y } : point,
        );
        return normalizePathAnnotation({ ...item, points });
      }),
    );
    if (!this.activePathId) {
      this.ui.selectedPathVertexIndex.set(event.index);
    }
    this.annotations.pushPreview();
    if (event.phase === 'end' && !this.activePathId) {
      void this.commitSelectedPathEdit();
    }
  }

  private onPathVertexInsert(event: {
    readonly afterIndex: number;
    readonly x: number;
    readonly y: number;
  }): void {
    const pathId = this.editablePathId();
    if (!pathId || this.activePathId) {
      return;
    }
    this.ui.draftPaths.update((list) =>
      list.map((item) => {
        if (item.id !== pathId) {
          return item;
        }
        if (event.afterIndex < 0 || event.afterIndex >= item.points.length) {
          return item;
        }
        const points = [
          ...item.points.slice(0, event.afterIndex + 1),
          { x: event.x, y: event.y },
          ...item.points.slice(event.afterIndex + 1),
        ];
        return normalizePathAnnotation({ ...item, points });
      }),
    );
    this.ui.selectedPathVertexIndex.set(event.afterIndex + 1);
    this.annotations.pushPreview();
    // Commit happens on the following vertex-drag end (insert always starts a drag).
  }

  /** Persist vertex edits for a finished path (Path mode or Select after Done). */
  private async commitSelectedPathEdit(): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    const paths = this.ui.draftPaths();
    this.commitChain = this.commitChain
      .catch(() => undefined)
      .then(() => session.execute(PATH_SET_COMMAND, { paths }));
    await this.commitChain;
  }

  private onPathVertex(event: {
    readonly type: 'click' | 'dblclick';
    readonly x: number;
    readonly y: number;
  }): void {
    if (!this.ui.pathMode()) {
      return;
    }

    if (event.type === 'dblclick') {
      void this.finishActivePath(false);
      return;
    }

    if (this.activePathId) {
      const current = this.ui.draftPaths().find((item) => item.id === this.activePathId);
      if (current && current.points.length >= 3) {
        const first = current.points[0]!;
        const dx = event.x - first.x;
        const dy = event.y - first.y;
        const hit = Math.max(CLOSE_HIT_PADDING, current.strokeWidth * 2);
        if (dx * dx + dy * dy <= hit * hit) {
          void this.finishActivePath(true);
          return;
        }
      }
      const pathId = this.activePathId;
      this.ui.draftPaths.update((list) =>
        list.map((item) =>
          item.id === pathId
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

    const path = normalizePathAnnotation({
      id: createAnnotationId(),
      points: [{ x: event.x, y: event.y }],
      stroke: this.ui.penStroke(),
      strokeWidth: this.ui.penStrokeWidth(),
      closed: false,
    });
    this.activePathId = path.id;
    this.ui.draftPaths.update((list) => [...list, path]);
    this.ui.selectedPathId.set(null);
    this.ui.selectedPathVertexIndex.set(null);
    this.annotations.pushPreview();
  }
}
