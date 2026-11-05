import { inject, Injectable } from '@angular/core';

import {
  ANNOTATIONS_SET_COMMAND,
  ANNOTATION_NUDGE_STEP,
  ANNOTATION_NUDGE_STEP_LARGE,
  applyGroupTransformableDrag,
  applyNumericBoundsToTransformable,
  boundsFromTransformable,
  canReorderAnnotationLayerById,
  duplicateAnnotation,
  estimateWatermarkBounds,
  groupAnnotationsByIds,
  isAnnotationLocked,
  isAnnotationVisible,
  isImageAnnotation,
  isPathAnnotation,
  isShapeAnnotation,
  isTextAnnotation,
  normalizeAnnotationBlendMode,
  normalizeImageAnnotation,
  normalizePathAnnotation,
  normalizeShapeAnnotation,
  normalizeTextAnnotation,
  normalizeAnnotation,
  patchAnnotationLayerProps,
  renameAnnotationGroup,
  reorderAnnotationLayerById,
  replaceAnnotationKindInStack,
  toggleAnnotationSelection,
  ungroupAnnotationsByGroupId,
  type Annotation,
  type AnnotationBlendMode,
  type AnnotationCreateEvent,
  type AnnotationOrderAction,
  type AnnotationTransformEvent,
  type EditorSession,
  type InteractiveBounds,
  type TransformableAnnotation,
} from 'fluxio-image-editor/core';

import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';
import { WatermarkTool } from './tools/watermark.tool';

export type AnnotationSelectionKind = 'image' | 'text' | 'shape' | 'path';

/**
 * Owns canvas annotation selection, gesture bridging, z-order, keyboard nudge/delete,
 * and the annotation actions menu.
 *
 * Remains bound in editor Select mode so committed objects stay interactive after Done.
 * Tool-specific creation and property editing remain in their tool controllers.
 */
@Injectable()
export class AnnotationInteractionController {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly watermark = inject(WatermarkTool);
  private gestureBaseline: readonly TransformableAnnotation[] | null = null;
  private commitChain: Promise<void> = Promise.resolve();
  private commitActiveDraft: () => Promise<void> = () => Promise.resolve();
  private activeStrokeId: () => string | null = () => null;
  private editRequest: (id: string) => void = () => undefined;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressOrigin: { readonly x: number; readonly y: number } | null = null;

  configure(options: {
    readonly commitActiveDraft: () => Promise<void>;
    readonly activeStrokeId: () => string | null;
    readonly onAnnotationEditRequest?: (id: string) => void;
  }): void {
    this.commitActiveDraft = options.commitActiveDraft;
    this.activeStrokeId = options.activeStrokeId;
    if (options.onAnnotationEditRequest) {
      this.editRequest = options.onAnnotationEditRequest;
    }
  }

  hasActiveGesture(): boolean {
    return this.gestureBaseline !== null;
  }

  clearGesture(): void {
    this.gestureBaseline = null;
  }

  /** Register (or refresh) the persistent annotation bridge on the session. */
  bind(session: EditorSession): void {
    session.setAnnotationInteractionBridge({
      // Hidden layers are not canvas-hit-testable; locked ones remain selectable.
      getAnnotations: () => this.currentDraft().filter((item) => isAnnotationVisible(item)),
      getSelectedIds: () => this.currentSelectedIds(),
      getSelectedId: () => this.primaryId(),
      onSelect: (id, options) => {
        if (id == null) {
          this.clearSelection();
          this.ui.layersSyntheticSelection.set(null);
          this.refreshPreview();
          return;
        }
        const kind = this.kindOfId(id) ?? this.activeKind();
        if (!kind) {
          return;
        }
        this.ui.layersSyntheticSelection.set(null);
        this.applySelection(kind, id, options?.additive === true);
        this.refreshPreview();
      },
      onTransform: (event) => this.onTransform(event),
      getCreateKind: () => {
        if (this.ui.textMode()) {
          return 'text';
        }
        if (this.ui.shapesMode()) {
          return this.ui.shapeDraftKind();
        }
        return null;
      },
      getPolygonSides: () => this.ui.shapeDraftPolygonSides(),
      onCreate: (event) => this.onCreate(event),
      onEditRequest: (id) => {
        const item = this.buildStack().find((annotation) => annotation.id === id);
        if (item && isAnnotationLocked(item)) {
          return;
        }
        this.editRequest(id);
      },
    });
  }

  /** Sync draft arrays from the committed document and drop stale selection ids. */
  syncAfterDocumentChange(): void {
    if (this.hasActiveGesture()) {
      return;
    }
    this.syncAllDraftsFromDocument();
    this.validateSelection();
  }

  /** Populate per-kind drafts from the document for Select mode interaction. */
  syncAllDraftsFromDocument(): void {
    const document = this.shell.getSession()?.store.document();
    if (!document) {
      this.ui.draftTexts.set([]);
      this.ui.draftShapes.set([]);
      this.ui.draftPaths.set([]);
      this.ui.draftImages.set([]);
      return;
    }
    this.ui.draftTexts.set(
      document.annotations.filter(isTextAnnotation).map(normalizeTextAnnotation),
    );
    this.ui.draftShapes.set(
      document.annotations.filter(isShapeAnnotation).map(normalizeShapeAnnotation),
    );
    this.ui.draftPaths.set(
      document.annotations.filter(isPathAnnotation).map(normalizePathAnnotation),
    );
    this.ui.draftImages.set(
      document.annotations.filter(isImageAnnotation).map(normalizeImageAnnotation),
    );
  }

  clearSelection(): void {
    this.ui.selectedTextIds.set([]);
    this.ui.selectedShapeIds.set([]);
    this.ui.selectedPathId.set(null);
    this.ui.selectedImageIds.set([]);
    this.ui.layersSyntheticSelection.set(null);
  }

  validateSelection(): void {
    const ids = new Set(this.buildStack().map((item) => item.id));
    this.ui.selectedTextIds.set(this.ui.selectedTextIds().filter((id) => ids.has(id)));
    this.ui.selectedShapeIds.set(this.ui.selectedShapeIds().filter((id) => ids.has(id)));
    this.ui.selectedImageIds.set(this.ui.selectedImageIds().filter((id) => ids.has(id)));
    const pathId = this.ui.selectedPathId();
    if (pathId && !ids.has(pathId)) {
      this.ui.selectedPathId.set(null);
    }
  }

  currentSelectedIds(): readonly string[] {
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      return this.ui.selectedImageIds();
    }
    if (this.ui.textToolActive()) {
      return this.ui.selectedTextIds();
    }
    if (this.ui.shapesMode()) {
      return this.ui.selectedShapeIds();
    }
    if (this.isPathDraftMode() && !this.activeStrokeId()) {
      const id = this.ui.selectedPathId();
      return id ? [id] : [];
    }
    return this.selectModeSelectedIds();
  }

  primaryId(): string | null {
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      return this.ui.selectedImageId();
    }
    if (this.ui.textToolActive()) {
      return this.ui.selectedTextId();
    }
    if (this.ui.shapesMode()) {
      return this.ui.selectedShapeId();
    }
    if (this.isPathDraftMode()) {
      return this.activeStrokeId() ? null : this.ui.selectedPathId();
    }
    const ids = this.selectModeSelectedIds();
    return ids.length > 0 ? ids[ids.length - 1]! : null;
  }

  /**
   * Interactive annotations for the renderer.
   * Object-tool modes expose that kind's draft; Select mode exposes the full stack.
   */
  currentDraft(): readonly TransformableAnnotation[] {
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      return this.ui.draftImages();
    }
    if (this.ui.textToolActive()) {
      return this.ui.draftTexts();
    }
    if (this.ui.shapesMode()) {
      return this.ui.draftShapes();
    }
    if (this.isPathDraftMode()) {
      return this.ui.draftPaths();
    }
    return this.transformablesFromStack(this.buildStack());
  }

  currentSelected(): TransformableAnnotation | null {
    const id = this.primaryId();
    return id ? (this.currentDraft().find((item) => item.id === id) ?? null) : null;
  }

  selectionKind(): AnnotationSelectionKind | null {
    const id = this.primaryId();
    return id ? this.kindOfId(id) : this.activeKind();
  }

  applySelection(kind: AnnotationSelectionKind, id: string | null, additive = false): void {
    if (!this.isObjectToolOpen()) {
      if (!additive) {
        this.clearOtherKinds(kind);
      }
    }
    if (id == null) {
      if (kind === 'image') {
        this.ui.selectedImageIds.set([]);
      } else if (kind === 'text') {
        this.ui.selectedTextIds.set([]);
      } else if (kind === 'shape') {
        this.ui.selectedShapeIds.set([]);
      } else {
        this.ui.selectedPathId.set(null);
      }
      return;
    }
    if (kind === 'path') {
      this.ui.selectedPathId.set(id);
      const path = this.ui.draftPaths().find((item) => item.id === id);
      if (path) {
        this.ui.penStroke.set(path.stroke);
        this.ui.penStrokeWidth.set(path.strokeWidth);
      }
      return;
    }
    if (additive && this.isObjectToolOpen()) {
      if (kind === 'image') {
        this.ui.selectedImageIds.set(toggleAnnotationSelection(this.ui.selectedImageIds(), id));
      } else if (kind === 'text') {
        this.ui.selectedTextIds.set(toggleAnnotationSelection(this.ui.selectedTextIds(), id));
      } else {
        this.ui.selectedShapeIds.set(toggleAnnotationSelection(this.ui.selectedShapeIds(), id));
      }
      return;
    }
    if (kind === 'image') {
      this.ui.selectedImageIds.set([id]);
    } else if (kind === 'text') {
      this.ui.selectedTextIds.set([id]);
    } else {
      this.ui.selectedShapeIds.set([id]);
    }
  }

  removeIdFromSelection(
    kind: Exclude<AnnotationSelectionKind, 'path'>,
    id: string,
    fallbackId: string | null,
  ): void {
    const current =
      kind === 'image'
        ? this.ui.selectedImageIds()
        : kind === 'text'
          ? this.ui.selectedTextIds()
          : this.ui.selectedShapeIds();
    if (!current.includes(id)) {
      return;
    }
    const remaining = current.filter((item) => item !== id);
    const next = remaining.length > 0 ? remaining : fallbackId ? [fallbackId] : [];
    if (kind === 'image') {
      this.ui.selectedImageIds.set(next);
    } else if (kind === 'text') {
      this.ui.selectedTextIds.set(next);
    } else {
      this.ui.selectedShapeIds.set(next);
    }
  }

  updateSelectedGeometry(patch: Partial<InteractiveBounds>): void {
    const session = this.shell.getSession();
    const output = session?.store.document()?.output;
    const selected = this.currentSelected();
    if (!session || !output || !selected || isAnnotationLocked(selected)) {
      return;
    }
    const current = boundsFromTransformable(selected);
    this.replace(
      applyNumericBoundsToTransformable(
        selected,
        {
          x: patch.x ?? current.x,
          y: patch.y ?? current.y,
          width: patch.width ?? current.width,
          height: patch.height ?? current.height,
        },
        output,
      ),
    );
    this.refreshPreview();
  }

  commitSelectedGeometry(): void {
    const selected = this.currentSelected();
    if (selected && !isAnnotationLocked(selected)) {
      void this.commitActiveDraft();
    }
  }

  reorder(action: AnnotationOrderAction): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const stack = this.buildStack();
    if (!canReorderAnnotationLayerById(stack, id, action)) {
      return;
    }
    const next = reorderAnnotationLayerById(stack, id, action);
    this.syncDrafts(next);
    this.refreshPreview();
    void this.commitStack(next, this.orderLabel(action));
  }

  canReorder(action: AnnotationOrderAction): boolean {
    const id = this.primaryId();
    return id ? canReorderAnnotationLayerById(this.buildStack(), id, action) : false;
  }

  duplicate(): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const stack = this.buildStack();
    const index = stack.findIndex((item) => item.id === id);
    if (index < 0) {
      return;
    }
    const source = stack[index]!;
    if (isAnnotationLocked(source)) {
      return;
    }
    const copy = duplicateAnnotation(source);
    const next = [...stack.slice(0, index + 1), copy, ...stack.slice(index + 1)];
    this.syncDrafts(next);
    this.select(copy.id);
    this.refreshPreview();
    void this.commitStack(next, 'Duplicate annotation');
  }

  /** Selected annotation layer opacity (0–100), or null when nothing selected. */
  selectedOpacityPercent(): number | null {
    const id = this.primaryId();
    if (!id) {
      return null;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    if (!item) {
      return null;
    }
    const opacity = typeof item.opacity === 'number' ? item.opacity : 1;
    return Math.round(opacity * 100);
  }

  /** Live-update selected annotation layer opacity (0–100). */
  updateSelectedOpacity(opacityPercent: number): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const stack = this.buildStack();
    const index = stack.findIndex((item) => item.id === id);
    if (index < 0) {
      return;
    }
    const current = stack[index]!;
    if (isAnnotationLocked(current)) {
      return;
    }
    const opacity = Math.max(0, Math.min(1, opacityPercent / 100));
    const nextItem = normalizeAnnotation({ ...current, opacity } as Annotation);
    this.replace(nextItem as never);
    this.refreshPreview();
  }

  /** Commit selected annotation layer opacity. */
  commitSelectedOpacity(): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    if (item && isAnnotationLocked(item)) {
      return;
    }
    void this.commitStack(this.buildStack(), 'Change layer opacity');
  }

  selectedBlendMode(): AnnotationBlendMode | null {
    const id = this.primaryId();
    if (!id) {
      return null;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    return item ? normalizeAnnotationBlendMode(item.blendMode) : null;
  }

  updateSelectedBlendMode(blendMode: AnnotationBlendMode): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const stack = this.buildStack();
    const current = stack.find((item) => item.id === id);
    if (!current || isAnnotationLocked(current)) {
      return;
    }
    const next = patchAnnotationLayerProps(stack, id, { blendMode });
    this.syncDrafts(next);
    this.refreshPreview();
    void this.commitStack(next, 'Change layer blend mode');
  }

  toggleSelectedVisibility(): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    if (!item) {
      return;
    }
    this.setVisibility(id, !isAnnotationVisible(item));
  }

  setVisibility(id: string, visible: boolean): void {
    this.setVisibilityMany([id], visible);
  }

  setVisibilityMany(ids: readonly string[], visible: boolean): void {
    if (ids.length === 0) {
      return;
    }
    let stack = this.buildStack();
    let changed = false;
    for (const id of ids) {
      const next = patchAnnotationLayerProps(stack, id, { visible });
      if (next !== stack) {
        stack = next;
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    this.syncDrafts(stack);
    this.refreshPreview();
    void this.commitStack(stack, visible ? 'Show layers' : 'Hide layers');
  }

  toggleSelectedLock(): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    if (!item) {
      return;
    }
    this.setLocked(id, !isAnnotationLocked(item));
  }

  setLocked(id: string, locked: boolean): void {
    this.setLockedMany([id], locked);
  }

  setLockedMany(ids: readonly string[], locked: boolean): void {
    if (ids.length === 0) {
      return;
    }
    let stack = this.buildStack();
    let changed = false;
    for (const id of ids) {
      const next = patchAnnotationLayerProps(stack, id, { locked });
      if (next !== stack) {
        stack = next;
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    this.syncDrafts(stack);
    this.refreshPreview();
    void this.commitStack(stack, locked ? 'Lock layers' : 'Unlock layers');
  }

  renameSelected(name: string): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const stack = this.buildStack();
    const current = stack.find((item) => item.id === id);
    if (!current || isAnnotationLocked(current)) {
      return;
    }
    const next = patchAnnotationLayerProps(stack, id, { name: name.trim() });
    if (next === stack) {
      return;
    }
    this.syncDrafts(next);
    void this.commitStack(next, 'Rename layer');
  }

  renameGroup(groupId: string, groupName: string): void {
    const stack = this.buildStack();
    const next = renameAnnotationGroup(stack, groupId, groupName);
    if (next === stack) {
      return;
    }
    this.syncDrafts(next);
    void this.commitStack(next, 'Rename layer group');
  }

  groupSelected(): void {
    const ids = this.currentSelectedIds();
    if (ids.length < 2) {
      return;
    }
    const stack = this.buildStack();
    const label =
      typeof this.shell.translate === 'function'
        ? this.shell.translate('layers.groupDefault')
        : 'Group';
    const next = groupAnnotationsByIds(stack, ids, label || 'Group');
    if (next === stack) {
      return;
    }
    this.syncDrafts(next);
    this.refreshPreview();
    void this.commitStack(next, 'Group layers');
  }

  ungroupSelected(): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const stack = this.buildStack();
    const item = stack.find((annotation) => annotation.id === id);
    const groupId = item?.groupId;
    if (!groupId) {
      return;
    }
    const next = ungroupAnnotationsByGroupId(stack, groupId);
    if (next === stack) {
      return;
    }
    this.syncDrafts(next);
    this.refreshPreview();
    void this.commitStack(next, 'Ungroup layers');
  }

  canGroupSelected(): boolean {
    const ids = this.currentSelectedIds();
    if (ids.length < 2) {
      return false;
    }
    const stack = this.buildStack();
    return ids.every((id) => {
      const item = stack.find((annotation) => annotation.id === id);
      return !!item && !isAnnotationLocked(item);
    });
  }

  canUngroupSelected(): boolean {
    const id = this.primaryId();
    if (!id) {
      return false;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    return !!item?.groupId && !isAnnotationLocked(item);
  }

  isSelectedLocked(): boolean {
    const id = this.primaryId();
    if (!id) {
      return false;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    return !!item && isAnnotationLocked(item);
  }

  requestEdit(): void {
    const id = this.primaryId();
    if (!id) {
      return;
    }
    const item = this.buildStack().find((annotation) => annotation.id === id);
    if (item && isAnnotationLocked(item)) {
      return;
    }
    this.editRequest(id);
  }

  /** Arrow-key nudge for selected transformable annotations or watermark. */
  nudge(dx: number, dy: number): boolean {
    const session = this.shell.getSession();
    const output = session?.store.document()?.output;
    if (!session || !output || (dx === 0 && dy === 0)) {
      return false;
    }

    if (this.ui.watermarkMode() && this.ui.draftWatermark().mode !== 'none') {
      const bounds = estimateWatermarkBounds(this.ui.draftWatermark(), output);
      if (!bounds) {
        return false;
      }
      this.watermark.patch({
        x: Math.min(Math.max(0, bounds.x + dx), Math.max(0, output.width - bounds.width)),
        y: Math.min(Math.max(0, bounds.y + dy), Math.max(0, output.height - bounds.height)),
      });
      void this.watermark.commit();
      return true;
    }

    const ids = this.currentSelectedIds();
    if (ids.length === 0) {
      return false;
    }
    const selected = this.currentDraft().filter(
      (item) => ids.includes(item.id) && !isAnnotationLocked(item),
    );
    if (selected.length === 0) {
      return false;
    }
    const moved = applyGroupTransformableDrag(
      selected,
      'move',
      { x: 0, y: 0 },
      { x: dx, y: dy },
      output,
    );
    for (const annotation of moved) {
      this.replace(annotation);
    }
    this.pushPreview();
    void this.commitActiveDraft();
    return true;
  }

  nudgeFromKeyboard(event: KeyboardEvent): boolean {
    const delta = this.arrowDelta(event);
    if (!delta) {
      return false;
    }
    const step = event.shiftKey ? ANNOTATION_NUDGE_STEP_LARGE : ANNOTATION_NUDGE_STEP;
    return this.nudge(delta.dx * step, delta.dy * step);
  }

  deleteSelected(): boolean {
    const ids = this.currentSelectedIds();
    if (ids.length === 0) {
      return false;
    }
    const stack = this.buildStack();
    if (
      ids.some((id) => {
        const item = stack.find((annotation) => annotation.id === id);
        return !!item && isAnnotationLocked(item);
      })
    ) {
      return false;
    }

    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      const remove = new Set(ids);
      const next = this.ui.draftImages().filter((item) => !remove.has(item.id));
      this.ui.draftImages.set(next);
      this.ui.selectedImageIds.set(next[0]?.id ? [next[0].id] : []);
      this.refreshPreview();
      void this.commitActiveDraft();
      return true;
    }
    if (this.ui.textToolActive()) {
      const remove = new Set(ids);
      const next = this.ui.draftTexts().filter((item) => !remove.has(item.id));
      this.ui.draftTexts.set(next);
      this.ui.selectedTextIds.set(next[0]?.id ? [next[0].id] : []);
      this.refreshPreview();
      void this.commitActiveDraft();
      return true;
    }
    if (this.ui.shapesMode()) {
      const remove = new Set(ids);
      const next = this.ui.draftShapes().filter((item) => !remove.has(item.id));
      this.ui.draftShapes.set(next);
      this.ui.selectedShapeIds.set(next[0]?.id ? [next[0].id] : []);
      this.refreshPreview();
      void this.commitActiveDraft();
      return true;
    }
    if (this.isPathDraftMode() && this.ui.selectedPathId()) {
      const id = this.ui.selectedPathId()!;
      const next = this.ui.draftPaths().filter((item) => item.id !== id);
      this.ui.draftPaths.set(next);
      this.ui.selectedPathId.set(next[0]?.id ?? null);
      this.refreshPreview();
      void this.commitActiveDraft();
      return true;
    }

    // Select mode: remove from full stack, keep a neighbor selected when possible.
    const remove = new Set(ids);
    const primary = this.primaryId();
    const primaryIndex = primary ? stack.findIndex((item) => item.id === primary) : -1;
    const next = stack.filter((item) => !remove.has(item.id));
    this.syncDrafts(next);

    const neighborId =
      primaryIndex >= 0
        ? (stack[primaryIndex + 1]?.id ?? stack[primaryIndex - 1]?.id ?? null)
        : null;
    const nextSelected =
      (neighborId && next.some((item) => item.id === neighborId) ? neighborId : null) ??
      next[next.length - 1]?.id ??
      null;

    if (nextSelected) {
      this.select(nextSelected);
    } else {
      this.clearSelection();
    }
    this.pushPreview();
    void this.commitStack(next);
    return true;
  }

  onViewportContextMenu(event: MouseEvent): void {
    // Always suppress the browser menu; keep the editor actions menu when selected.
    event.preventDefault();
    if (!this.primaryId()) {
      return;
    }
    event.stopPropagation();
    this.openActionsMenuAt(event.clientX, event.clientY);
  }

  onViewportPointerDown(event: PointerEvent): void {
    this.clearLongPress();
    if (event.pointerType !== 'touch' || !this.primaryId()) {
      return;
    }
    if (this.isPathDraftMode() || this.hasActiveGesture()) {
      return;
    }
    this.longPressOrigin = { x: event.clientX, y: event.clientY };
    this.longPressTimer = setTimeout(() => {
      const origin = this.longPressOrigin;
      this.clearLongPress();
      if (!origin || !this.primaryId()) {
        return;
      }
      this.openActionsMenuAt(origin.x, origin.y);
    }, 550);
  }

  onViewportPointerMove(event: PointerEvent): void {
    const origin = this.longPressOrigin;
    if (!origin || !this.longPressTimer) {
      return;
    }
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (dx * dx + dy * dy > 100) {
      this.clearLongPress();
    }
  }

  onViewportPointerUp(): void {
    this.clearLongPress();
  }

  closeActionsMenu(): void {
    this.ui.annotationActionsMenu.set(null);
  }

  runMenuAction(action: AnnotationOrderAction | 'duplicate' | 'delete', event?: Event): void {
    event?.stopPropagation();
    this.closeActionsMenu();
    if (action === 'delete') {
      this.deleteSelected();
      return;
    }
    if (action === 'duplicate') {
      this.duplicate();
      return;
    }
    this.reorder(action);
  }

  openActionsMenuAt(clientX: number, clientY: number, anchor?: EventTarget | null): void {
    this.ui.zoomMenuOpen.set(false);
    this.ui.exportMenuOpen.set(false);
    let x = clientX;
    let y = clientY;
    if (anchor instanceof HTMLElement) {
      const rect = anchor.getBoundingClientRect();
      x = Number.isFinite(clientX) && clientX > 0 ? clientX : rect.left;
      y = Number.isFinite(clientY) && clientY > 0 ? clientY : rect.bottom + 4;
    } else if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 16 && y === 16)) {
      const viewport = this.shell.viewportElement();
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        x = rect.left + 16;
        y = rect.top + 16;
      }
    }
    const maxX = typeof window !== 'undefined' ? window.innerWidth - 220 : x;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - 260 : y;
    this.ui.annotationActionsMenu.set({
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
    });
  }

  clearLongPress(): void {
    if (this.longPressTimer != null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressOrigin = null;
  }

  pushPreview(): void {
    const session = this.shell.getSession();
    if (session?.store.document()) {
      session.setPreview({ annotations: this.buildStack() });
    }
  }

  /**
   * In Select mode the composed display already paints document annotations,
   * so clear the preview overlay after commits. During tools / gestures, push live preview.
   */
  refreshPreview(): void {
    if (this.isObjectToolOpen() || this.hasActiveGesture()) {
      this.pushPreview();
      return;
    }
    const session = this.shell.getSession();
    session?.setPreview(null);
  }

  /**
   * Commit the Select-mode working stack (one history entry).
   * Without a label the command names the entry from the annotation diff.
   */
  commitSelectMode(label?: string): Promise<void> {
    return this.commitStack(this.buildStack(), label);
  }

  replace(annotation: TransformableAnnotation): void {
    if (annotation.kind === 'image' && (this.ui.imageOverlayMode() || this.ui.stickersMode())) {
      this.ui.draftImages.update((list) =>
        this.replaceInList(list, normalizeImageAnnotation(annotation)),
      );
      return;
    }
    if (annotation.kind === 'text' && this.ui.textToolActive()) {
      this.ui.draftTexts.update((list) =>
        this.replaceInList(list, normalizeTextAnnotation(annotation)),
      );
      return;
    }
    if (isShapeAnnotation(annotation) && this.ui.shapesMode()) {
      this.ui.draftShapes.update((list) =>
        this.replaceInList(list, normalizeShapeAnnotation(annotation)),
      );
      return;
    }
    if (annotation.kind === 'path' && this.isPathDraftMode()) {
      this.ui.draftPaths.update((list) =>
        this.replaceInList(list, normalizePathAnnotation(annotation)),
      );
      return;
    }

    // Select mode — update the matching draft kind so buildStack merges correctly.
    if (annotation.kind === 'image') {
      this.ui.draftImages.update((list) =>
        this.replaceInList(list, normalizeImageAnnotation(annotation)),
      );
    } else if (annotation.kind === 'text') {
      this.ui.draftTexts.update((list) =>
        this.replaceInList(list, normalizeTextAnnotation(annotation)),
      );
    } else if (isShapeAnnotation(annotation)) {
      this.ui.draftShapes.update((list) =>
        this.replaceInList(list, normalizeShapeAnnotation(annotation)),
      );
    } else if (annotation.kind === 'path') {
      this.ui.draftPaths.update((list) =>
        this.replaceInList(list, normalizePathAnnotation(annotation)),
      );
    }
  }

  private isObjectToolOpen(): boolean {
    return (
      this.ui.textToolActive() ||
      this.ui.shapesMode() ||
      this.isPathDraftMode() ||
      this.ui.imageOverlayMode() ||
      this.ui.stickersMode()
    );
  }

  /** Freehand Draw or click-to-place Path tool — both edit `draftPaths`. */
  private isPathDraftMode(): boolean {
    return this.ui.drawingMode() || this.ui.pathMode();
  }

  private selectModeSelectedIds(): readonly string[] {
    const ids = [
      ...this.ui.selectedImageIds(),
      ...this.ui.selectedTextIds(),
      ...this.ui.selectedShapeIds(),
      ...(this.ui.selectedPathId() ? [this.ui.selectedPathId()!] : []),
    ];
    return ids;
  }

  private clearOtherKinds(keep: AnnotationSelectionKind): void {
    if (keep !== 'image') {
      this.ui.selectedImageIds.set([]);
    }
    if (keep !== 'text') {
      this.ui.selectedTextIds.set([]);
    }
    if (keep !== 'shape') {
      this.ui.selectedShapeIds.set([]);
    }
    if (keep !== 'path') {
      this.ui.selectedPathId.set(null);
    }
  }

  selectById(id: string | null, options?: { readonly additive?: boolean }): void {
    this.ui.layersSyntheticSelection.set(null);
    if (id == null) {
      this.select(null);
      return;
    }
    const kind = this.kindOfId(id) ?? this.activeKind();
    if (!kind) {
      return;
    }
    this.applySelection(kind, id, options?.additive === true);
    this.refreshPreview();
  }

  selectSynthetic(kind: 'base' | 'adjustments' | 'filters' | null): void {
    this.clearSelection();
    this.ui.layersSyntheticSelection.set(kind);
    this.refreshPreview();
  }

  /**
   * Full annotation stack in document z-order (later entries draw on top).
   * Merges open tool drafts when present.
   */
  layerStack(): readonly Annotation[] {
    return this.buildStack();
  }

  private kindOfId(id: string): AnnotationSelectionKind | null {
    if (this.ui.draftImages().some((item) => item.id === id)) {
      return 'image';
    }
    if (this.ui.draftTexts().some((item) => item.id === id)) {
      return 'text';
    }
    if (this.ui.draftShapes().some((item) => item.id === id)) {
      return 'shape';
    }
    if (this.ui.draftPaths().some((item) => item.id === id)) {
      return 'path';
    }
    const stack = this.shell.getSession()?.store.document()?.annotations ?? [];
    const item = stack.find((annotation) => annotation.id === id);
    if (!item) {
      return null;
    }
    if (isImageAnnotation(item)) {
      return 'image';
    }
    if (isTextAnnotation(item)) {
      return 'text';
    }
    if (isShapeAnnotation(item)) {
      return 'shape';
    }
    if (isPathAnnotation(item)) {
      return 'path';
    }
    return null;
  }

  private activeKind(): AnnotationSelectionKind | null {
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      return 'image';
    }
    if (this.ui.textToolActive()) {
      return 'text';
    }
    if (this.ui.shapesMode()) {
      return 'shape';
    }
    if (this.isPathDraftMode()) {
      return 'path';
    }
    return null;
  }

  private onTransform(event: AnnotationTransformEvent): void {
    const annotations = event.annotations ?? [event.annotation];
    if (annotations.some((item) => isAnnotationLocked(item))) {
      if (event.phase === 'start' || event.phase === 'move') {
        // Allow selection chrome but ignore locked transforms.
        if (!this.currentSelectedIds().includes(event.id)) {
          this.select(event.id);
        }
      }
      if (event.phase === 'start') {
        this.gestureBaseline = this.currentDraft();
      }
      if (event.phase === 'cancel' || event.phase === 'end') {
        this.restoreBaseline();
        this.gestureBaseline = null;
        this.refreshPreview();
      }
      return;
    }
    if (event.phase === 'start') {
      this.gestureBaseline = this.currentDraft();
      if (!this.currentSelectedIds().includes(event.id)) {
        this.select(event.id);
      }
    }
    if (event.phase === 'cancel') {
      this.restoreBaseline();
      this.gestureBaseline = null;
      this.refreshPreview();
      return;
    }
    for (const annotation of annotations) {
      this.replace(annotation);
    }
    if (event.phase === 'end') {
      this.gestureBaseline = null;
      this.pushPreview();
      void this.commitActiveDraft();
      return;
    }
    this.refreshPreview();
  }

  private onCreate(event: AnnotationCreateEvent): void {
    if (event.phase === 'start') {
      this.gestureBaseline = this.currentDraft();
    }
    if (event.phase === 'cancel') {
      this.restoreBaseline();
      this.gestureBaseline = null;
      this.refreshPreview();
      return;
    }
    this.replace(event.annotation);
    this.select(event.annotation.id);
    if (event.phase === 'end') {
      this.gestureBaseline = null;
      this.pushPreview();
      const created = event.annotation;
      void this.commitActiveDraft().then(() => {
        if (isTextAnnotation(created) && this.ui.textMode()) {
          this.editRequest(created.id);
        }
      });
      return;
    }
    this.refreshPreview();
  }

  private restoreBaseline(): void {
    const baseline = this.gestureBaseline;
    if (!baseline) {
      return;
    }
    if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      this.ui.draftImages.set(baseline.filter(isImageAnnotation).map(normalizeImageAnnotation));
    } else if (this.ui.textToolActive()) {
      this.ui.draftTexts.set(baseline.filter(isTextAnnotation).map(normalizeTextAnnotation));
    } else if (this.ui.shapesMode()) {
      this.ui.draftShapes.set(baseline.filter(isShapeAnnotation).map(normalizeShapeAnnotation));
    } else if (this.isPathDraftMode()) {
      this.ui.draftPaths.set(baseline.filter(isPathAnnotation).map(normalizePathAnnotation));
    } else {
      this.ui.draftImages.set(baseline.filter(isImageAnnotation).map(normalizeImageAnnotation));
      this.ui.draftTexts.set(baseline.filter(isTextAnnotation).map(normalizeTextAnnotation));
      this.ui.draftShapes.set(baseline.filter(isShapeAnnotation).map(normalizeShapeAnnotation));
      this.ui.draftPaths.set(baseline.filter(isPathAnnotation).map(normalizePathAnnotation));
    }
  }

  private select(id: string | null): void {
    if (id == null) {
      this.clearSelection();
      return;
    }
    const kind = this.kindOfId(id) ?? this.activeKind();
    if (kind) {
      this.applySelection(kind, id);
    }
  }

  private buildStack(): readonly Annotation[] {
    const document = this.shell.getSession()?.store.document();
    if (!document) {
      return [];
    }
    let stack = document.annotations;
    if (this.ui.textToolActive()) {
      stack = replaceAnnotationKindInStack(stack, isTextAnnotation, this.ui.draftTexts());
    } else if (this.ui.shapesMode()) {
      stack = replaceAnnotationKindInStack(stack, isShapeAnnotation, this.ui.draftShapes());
    } else if (this.isPathDraftMode()) {
      stack = replaceAnnotationKindInStack(stack, isPathAnnotation, this.ui.draftPaths());
    } else if (this.ui.imageOverlayMode() || this.ui.stickersMode()) {
      stack = replaceAnnotationKindInStack(stack, isImageAnnotation, this.ui.draftImages());
    } else {
      // Select mode: merge all draft kinds without losing z-order across kinds.
      stack = replaceAnnotationKindInStack(stack, isTextAnnotation, this.ui.draftTexts());
      stack = replaceAnnotationKindInStack(stack, isShapeAnnotation, this.ui.draftShapes());
      stack = replaceAnnotationKindInStack(stack, isPathAnnotation, this.ui.draftPaths());
      stack = replaceAnnotationKindInStack(stack, isImageAnnotation, this.ui.draftImages());
    }
    return stack;
  }

  private transformablesFromStack(
    stack: readonly Annotation[],
  ): readonly TransformableAnnotation[] {
    return stack.filter(
      (item): item is TransformableAnnotation =>
        isImageAnnotation(item) ||
        isTextAnnotation(item) ||
        isShapeAnnotation(item) ||
        isPathAnnotation(item),
    );
  }

  private syncDrafts(stack: readonly Annotation[]): void {
    this.ui.draftTexts.set(stack.filter(isTextAnnotation).map(normalizeTextAnnotation));
    this.ui.draftShapes.set(stack.filter(isShapeAnnotation).map(normalizeShapeAnnotation));
    this.ui.draftPaths.set(stack.filter(isPathAnnotation).map(normalizePathAnnotation));
    this.ui.draftImages.set(stack.filter(isImageAnnotation).map(normalizeImageAnnotation));
  }

  private commitStack(annotations: readonly Annotation[], label?: string): Promise<void> {
    this.commitChain = this.commitChain
      .catch(() => undefined)
      .then(async () => {
        const session = this.shell.getSession();
        if (!session) {
          return;
        }
        const selectedId = this.primaryId();
        await session.execute(ANNOTATIONS_SET_COMMAND, { annotations, label });
        const document = session.store.document();
        if (document) {
          this.syncDrafts(document.annotations);
          if (selectedId && document.annotations.some((item) => item.id === selectedId)) {
            this.select(selectedId);
          } else {
            this.validateSelection();
          }
        }
        this.refreshPreview();
      });
    return this.commitChain;
  }

  private replaceInList<T extends TransformableAnnotation>(
    list: readonly T[],
    item: T,
  ): readonly T[] {
    return list.some((current) => current.id === item.id)
      ? list.map((current) => (current.id === item.id ? item : current))
      : [...list, item];
  }

  private orderLabel(action: AnnotationOrderAction): string {
    switch (action) {
      case 'front':
        return 'Bring to front';
      case 'forward':
        return 'Bring forward';
      case 'backward':
        return 'Send backward';
      case 'back':
        return 'Send to back';
    }
  }

  private arrowDelta(event: KeyboardEvent): { dx: number; dy: number } | null {
    switch (event.key) {
      case 'ArrowLeft':
        return { dx: -1, dy: 0 };
      case 'ArrowRight':
        return { dx: 1, dy: 0 };
      case 'ArrowUp':
        return { dx: 0, dy: -1 };
      case 'ArrowDown':
        return { dx: 0, dy: 1 };
      default:
        return null;
    }
  }
}
