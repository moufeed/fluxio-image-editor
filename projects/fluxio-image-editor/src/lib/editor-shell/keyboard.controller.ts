import { inject, Injectable } from '@angular/core';

import { AnnotationInteractionController } from './annotation-interaction.controller';
import { CompareController } from './compare.controller';
import { EditorPresentationStore } from './editor-presentation.store';
import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';
import { resolveToolHotkey } from './helpers/tool-hotkeys';
import { ModeLifecycleController } from './mode-lifecycle.controller';
import { ToolbarController } from './toolbar.controller';
import { ColorPickerTool } from './tools/color-picker.tool';
import { CropTool } from './tools/crop.tool';
import { DrawingTool } from './tools/drawing.tool';
import { PathTool } from './tools/path.tool';
import { RasterPreviewTool } from './tools/raster-preview.tool';
import { WatermarkTool } from './tools/watermark.tool';

interface EscapePriorityEntry {
  readonly active: () => boolean;
  readonly handler: () => void;
}

/**
 * Document-level keyboard handling for the editor shell
 * (Escape priority, history undo/redo, tool hotkeys, delete, nudge,
 * PV38 canvas geometry paths for crop / redact / focus / path finish).
 */
@Injectable()
export class KeyboardController {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly presentation = inject(EditorPresentationStore);
  private readonly annotations = inject(AnnotationInteractionController);
  private readonly toolbar = inject(ToolbarController);
  private readonly lifecycle = inject(ModeLifecycleController);
  private readonly compare = inject(CompareController);
  private readonly colorPickerTool = inject(ColorPickerTool);
  private readonly cropTool = inject(CropTool);
  private readonly drawingTool = inject(DrawingTool);
  private readonly pathTool = inject(PathTool);
  private readonly rasterPreview = inject(RasterPreviewTool);
  private readonly watermarkTool = inject(WatermarkTool);

  /** Priority-ordered Escape handlers — first active entry wins. */
  private readonly escapePriority: readonly EscapePriorityEntry[] = [
    {
      active: () => !!this.presentation.editingTextId(),
      handler: () => this.lifecycle.endTextEdit(),
    },
    {
      active: () => this.colorPickerTool.isActive(),
      handler: () => this.colorPickerTool.cancel(),
    },
    {
      active: () => this.presentation.sidePanelOpen(),
      handler: () => this.ui.sidePanelOpen.set(false),
    },
    {
      active: () => !!this.presentation.expandedUtilibarGroupId(),
      handler: () => this.ui.expandedUtilibarGroupId.set(null),
    },
    {
      active: () => this.presentation.comparingOriginal() || this.presentation.compareLatched(),
      handler: () => this.compare.clear(),
    },
    {
      active: () => this.annotations.hasActiveGesture(),
      handler: () => this.shell.getSession()?.cancelActiveGesture(),
    },
    {
      active: () => this.presentation.watermarkMode() && this.watermarkTool.hasActiveGesture(),
      handler: () => this.shell.getSession()?.cancelActiveGesture(),
    },
    {
      active: () => this.presentation.drawingMode() && !!this.drawingTool.getActiveStrokeId(),
      handler: () => {
        this.drawingTool.cancelActiveStroke();
      },
    },
    {
      active: () => this.presentation.pathMode() && !!this.pathTool.getActivePathId(),
      handler: () => {
        this.pathTool.cancelActivePath();
      },
    },
    { active: () => this.presentation.cropMode(), handler: () => this.lifecycle.closers.crop() },
    {
      active: () => this.presentation.adjustmentsMode(),
      handler: () => this.lifecycle.closers.adjustments(),
    },
    {
      active: () => this.presentation.effectsMode(),
      handler: () => this.lifecycle.closers.effects(),
    },
    {
      active: () => this.presentation.filtersMode(),
      handler: () => this.lifecycle.closers.filters(),
    },
    { active: () => this.presentation.focusMode(), handler: () => this.lifecycle.closers.focus() },
    {
      active: () => this.presentation.redactMode(),
      handler: () => this.lifecycle.closers.redact(),
    },
    {
      active: () => this.presentation.cropMaskMode(),
      handler: () => this.lifecycle.closers.cropMask(),
    },
    {
      active: () => this.presentation.colorOverlayMode(),
      handler: () => this.lifecycle.closers.colorOverlay(),
    },
    {
      active: () => this.presentation.fillMode(),
      handler: () => this.lifecycle.closers.fill(),
    },
    { active: () => this.presentation.frameMode(), handler: () => this.lifecycle.closers.frame() },
    {
      active: () => this.presentation.textMode(),
      handler: () => void this.lifecycle.doneText(),
    },
    {
      active: () => this.presentation.emojiMode(),
      handler: () => void this.lifecycle.doneEmoji(),
    },
    {
      active: () => this.presentation.shapesMode(),
      handler: () => void this.lifecycle.doneShapes(),
    },
    {
      active: () => this.presentation.drawingMode(),
      handler: () => void this.lifecycle.doneDrawing(),
    },
    {
      active: () => this.presentation.pathMode(),
      handler: () => void this.lifecycle.donePath(),
    },
    {
      active: () => this.presentation.imageOverlayMode(),
      handler: () => void this.lifecycle.doneImageOverlay(),
    },
    {
      active: () => this.presentation.stickersMode(),
      handler: () => void this.lifecycle.doneStickers(),
    },
    {
      active: () => this.presentation.templatesMode(),
      handler: () => this.lifecycle.closers.templates(),
    },
    {
      active: () => this.presentation.watermarkMode(),
      handler: () => void this.lifecycle.doneWatermark(),
    },
    {
      active: () => this.presentation.rotateMode(),
      handler: () => this.lifecycle.closers.rotate(),
    },
    {
      active: () => this.presentation.resizeMode(),
      handler: () => this.lifecycle.closers.resize(),
    },
    {
      active: () => !!this.annotations.primaryId(),
      handler: () => this.annotations.clearSelection(),
    },
  ];

  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.presentation.annotationActionsMenu()) {
        this.annotations.closeActionsMenu();
        event.preventDefault();
        return;
      }
      this.onEscape();
      return;
    }
    if (this.isEditableKeyboardTarget(event.target)) {
      return;
    }
    if (this.tryHistoryShortcut(event)) {
      return;
    }
    if (
      this.annotations.hasActiveGesture() ||
      this.watermarkTool.hasActiveGesture() ||
      this.drawingTool.getActiveStrokeId()
    ) {
      return;
    }
    if (this.tryPathFinish(event)) {
      return;
    }
    if (this.tryRedactCreate(event)) {
      return;
    }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      if (this.annotations.primaryId()) {
        event.preventDefault();
        this.annotations.openActionsMenuAt(16, 16, event.target);
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.rasterPreview.deleteSelectedRedaction()) {
        event.preventDefault();
        return;
      }
      if (this.annotations.deleteSelected()) {
        event.preventDefault();
      }
      return;
    }
    if (this.tryToolHotkey(event)) {
      return;
    }
    if (this.tryCanvasGeometryKeyboard(event)) {
      event.preventDefault();
      return;
    }
    if (this.annotations.nudgeFromKeyboard(event)) {
      event.preventDefault();
    }
  }

  onEscape(): void {
    this.toolbar.closeZoomMenu();
    this.toolbar.closeExportMenu();
    for (const entry of this.escapePriority) {
      if (entry.active()) {
        entry.handler();
        return;
      }
    }
  }

  /**
   * Ctrl/Cmd+Z → undo; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y → redo.
   * Skipped while inline text editing so the field keeps native undo.
   */
  private tryHistoryShortcut(event: KeyboardEvent): boolean {
    if (!(event.ctrlKey || event.metaKey)) {
      return false;
    }
    if (this.presentation.editingTextId()) {
      return false;
    }
    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.shell.getSession()?.redo();
      } else {
        this.shell.getSession()?.undo();
      }
      return true;
    }
    if (key === 'y' && !event.shiftKey) {
      event.preventDefault();
      this.shell.getSession()?.redo();
      return true;
    }
    return false;
  }

  /**
   * Unmodified letter keys activate registered toolbar tools (see `TOOL_HOTKEYS`).
   * Skipped while editing text or using the color picker.
   */
  private tryToolHotkey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      return false;
    }
    if (this.presentation.editingTextId()) {
      return false;
    }
    if (this.colorPickerTool.isActive()) {
      return false;
    }
    const actionId = resolveToolHotkey(event.key);
    if (!actionId) {
      return false;
    }
    const session = this.shell.getSession();
    if (!session?.getToolbarActions().some((action) => action.id === actionId)) {
      return false;
    }
    event.preventDefault();
    void this.toolbar.onToolbarAction(actionId);
    return true;
  }

  /** PV38: Enter finishes the in-progress path; Shift+Enter closes it. */
  private tryPathFinish(event: KeyboardEvent): boolean {
    if (event.key !== 'Enter') {
      return false;
    }
    if (!this.presentation.pathMode() || !this.pathTool.getActivePathId()) {
      return false;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }
    event.preventDefault();
    void this.pathTool.finishActivePath(event.shiftKey);
    return true;
  }

  /** PV38: Enter adds a default centered redaction region. */
  private tryRedactCreate(event: KeyboardEvent): boolean {
    if (event.key !== 'Enter') {
      return false;
    }
    if (!this.presentation.redactMode()) {
      return false;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      return false;
    }
    event.preventDefault();
    return this.rasterPreview.addDefaultRedactionRegion();
  }

  /**
   * PV38: Arrow-key geometry for crop / redact / focus while those modes are open.
   * Crop: move; Alt+Arrow resize edge. Redact/Focus: nudge selection/center.
   */
  private tryCanvasGeometryKeyboard(event: KeyboardEvent): boolean {
    if (this.cropTool.nudgeFromKeyboard(event)) {
      return true;
    }
    if (this.rasterPreview.nudgeRedactionFromKeyboard(event)) {
      return true;
    }
    if (this.rasterPreview.nudgeFocusFromKeyboard(event)) {
      return true;
    }
    return false;
  }

  private isEditableKeyboardTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    return target.isContentEditable;
  }
}
