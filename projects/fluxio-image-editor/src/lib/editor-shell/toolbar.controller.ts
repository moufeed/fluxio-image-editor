import { computed, inject, Injectable } from '@angular/core';

import {
  type EditorToolbarActionDisplay,
  type RasterExportFormat,
  type ZoomPreset,
} from 'fluxio-image-editor/core';
import { STICKERS_TOOL_ACTION } from 'fluxio-image-editor/plugins/stickers';
import { EMOJI_TOOL_ACTION } from 'fluxio-image-editor/plugins/emoji';
import { TEMPLATES_TOOL_ACTION } from 'fluxio-image-editor/plugins/templates';
import { RULERS_TOOL_ACTION } from 'fluxio-image-editor/plugins/rulers';
import { BATCH_EXPORT_DIALOG_ACTION } from 'fluxio-image-editor/plugins/batch-export';
import {
  PERSISTENCE_EXPORT_ACTION,
  PERSISTENCE_LOAD_ACTION,
} from 'fluxio-image-editor/plugins/persistence';
import {
  EXPORT_DIALOG_ACTION,
  EXPORT_JPEG_ACTION,
  EXPORT_PNG_ACTION,
  EXPORT_WEBP_ACTION,
} from 'fluxio-image-editor/plugins/export';
import { OPEN_FILE_ACTION, OPEN_NEW_ACTION } from 'fluxio-image-editor/plugins/open';
import {
  TRANSFORM_FLIP_H_COMMAND,
  TRANSFORM_FLIP_V_COMMAND,
  TRANSFORM_ROTATE_COMMAND,
} from 'fluxio-image-editor/plugins/transform';

/** Chrome action ids — keep as strings so the shell does not import plugin packages. */
const HISTORY_PANEL_ACTION = 'history.panel';
const LAYERS_PANEL_ACTION = 'layers.panel';
import {
  VIEWPORT_FIT_ACTION,
  VIEWPORT_ZOOM_IN_ACTION,
  VIEWPORT_ZOOM_OUT_ACTION,
} from 'fluxio-image-editor/plugins/viewport';

import { DEFAULT_ACTION_ICON_KEYS, resolveToolbarIconPath } from '../chrome/toolbar-icons';
import type { UtilibarItem } from '../chrome/utilibar/utilibar';
import { AnnotationInteractionController } from './annotation-interaction.controller';
import { BatchExportController } from './batch-export.controller';
import { CompareController } from './compare.controller';
import { EditorModeCoordinator } from './editor-mode.coordinator';
import { EditorPresentationStore } from './editor-presentation.store';
import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore } from './editor-ui.store';
import { ExportController } from './export.controller';
import { toolbarActionTranslationKey } from './helpers/toolbar-action-labels';
import { ModeLifecycleController } from './mode-lifecycle.controller';
import { OpenController } from './open.controller';
import { CropTool } from './tools/crop.tool';
import { DrawingTool } from './tools/drawing.tool';
import { PathTool } from './tools/path.tool';
import { ImageAnnotationTool } from './tools/image-annotation.tool';
import { RasterPreviewTool } from './tools/raster-preview.tool';
import { ShapesTool } from './tools/shapes.tool';
import { TextTool } from './tools/text.tool';
import { TemplatesTool } from './tools/templates.tool';
import { TransformTool } from './tools/transform.tool';
import { WatermarkTool } from './tools/watermark.tool';
import { RulersTool } from './tools/rulers.tool';

/**
 * Chrome toolbar / utilibar / zoom / export-menu operations for the editor shell.
 */
@Injectable()
export class ToolbarController {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly presentation = inject(EditorPresentationStore);
  private readonly annotations = inject(AnnotationInteractionController);
  private readonly exportController = inject(ExportController);
  private readonly batchExportController = inject(BatchExportController);
  private readonly compare = inject(CompareController);
  private readonly openController = inject(OpenController);
  private readonly modes = inject(EditorModeCoordinator);
  private readonly lifecycle = inject(ModeLifecycleController);
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

  readonly utilibarActions = computed((): readonly UtilibarItem[] => {
    const activeById: Readonly<Record<string, boolean>> = {
      'crop.tool': this.presentation.cropMode(),
      'transform.rotate-tool': this.presentation.rotateMode(),
      'transform.resize-tool': this.presentation.resizeMode(),
      'adjustments.tool': this.presentation.adjustmentsMode(),
      'effects.tool': this.presentation.effectsMode(),
      'filters.tool': this.presentation.filtersMode(),
      'focus.tool': this.presentation.focusMode(),
      'redact.tool': this.presentation.redactMode(),
      'crop-mask.tool': this.presentation.cropMaskMode(),
      'color-overlay.tool': this.presentation.colorOverlayMode(),
      'fill.tool': this.presentation.fillMode(),
      'frame.tool': this.presentation.frameMode(),
      'text.tool': this.presentation.textMode(),
      'emoji.tool': this.presentation.emojiMode(),
      'shapes.tool': this.presentation.shapesMode(),
      'drawing.tool': this.presentation.drawingMode(),
      'path.tool': this.presentation.pathMode(),
      'image-overlay.tool': this.presentation.imageOverlayMode(),
      'stickers.tool': this.presentation.stickersMode(),
      'templates.tool': this.presentation.templatesMode(),
      'watermark.tool': this.presentation.watermarkMode(),
      'rulers.tool': this.presentation.rulersMode(),
      'history.panel':
        this.presentation.sidePanelOpen() && this.presentation.sidePanelTab() === 'history',
      'layers.panel':
        this.presentation.sidePanelOpen() && this.presentation.sidePanelTab() === 'layers',
    };
    const expandedGroupId = this.presentation.expandedUtilibarGroupId();
    return this.presentation.utilibarRailItems().map((item) => {
      if (item.kind === 'group') {
        const children = (item.children ?? []).map((childId) => ({
          id: childId,
          label: this.actionLabel(childId),
          iconPath: this.actionIconPath(childId),
          showIcon: this.showActionIcon(childId),
          showLabel: this.showActionLabel(childId),
          active: activeById[childId] === true,
        }));
        return {
          kind: 'group' as const,
          id: item.id,
          label: this.actionLabel(item.id),
          iconPath: this.actionIconPath(item.id),
          showIcon: this.showActionIcon(item.id),
          showLabel: this.showActionLabel(item.id),
          active: children.some((child) => child.active),
          expanded: expandedGroupId === item.id,
          children,
        };
      }
      return {
        kind: 'action' as const,
        id: item.id,
        label: this.actionLabel(item.id),
        iconPath: this.actionIconPath(item.id),
        showIcon: this.showActionIcon(item.id),
        showLabel: this.showActionLabel(item.id),
        active: activeById[item.id] === true,
      };
    });
  });

  readonly toolbarPluginActions = computed(() => {
    const activeById: Readonly<Record<string, boolean>> = {
      'history.panel':
        this.presentation.sidePanelOpen() && this.presentation.sidePanelTab() === 'history',
      'layers.panel':
        this.presentation.sidePanelOpen() && this.presentation.sidePanelTab() === 'layers',
      [OPEN_NEW_ACTION]: this.presentation.blankMenuOpen(),
    };
    return this.presentation.toolbarPluginActionIds().map((id) => ({
      id,
      label: this.actionLabel(id),
      iconPath: this.actionIconPath(id),
      showIcon: this.showActionIcon(id),
      showLabel: this.showActionLabel(id),
      active: activeById[id] === true,
    }));
  });

  async onToolbarAction(actionId: string): Promise<void> {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    try {
      const isGroup = session.getToolbarGroups().some((group) => group.id === actionId);
      if (isGroup) {
        this.toggleUtilibarGroup(actionId);
        return;
      }

      const memberGroupId = session
        .getToolbarActions()
        .find((action) => action.id === actionId)?.groupId;
      if (memberGroupId) {
        this.ui.expandedUtilibarGroupId.set(memberGroupId);
      } else {
        this.ui.expandedUtilibarGroupId.set(null);
      }

      switch (actionId) {
        case 'transform.rotate-cw':
          await session.execute(TRANSFORM_ROTATE_COMMAND, {
            degrees: this.shell.config().rotate?.incrementDegrees ?? 90,
          });
          break;
        case 'transform.rotate-tool':
          this.toggleRotateMode();
          break;
        case 'transform.resize-tool':
          this.toggleResizeMode();
          break;
        case 'transform.flip-h':
          await session.execute(TRANSFORM_FLIP_H_COMMAND);
          break;
        case 'transform.flip-v':
          await session.execute(TRANSFORM_FLIP_V_COMMAND);
          break;
        case VIEWPORT_FIT_ACTION:
          session.fitViewport();
          break;
        case VIEWPORT_ZOOM_IN_ACTION:
          this.onZoomIn();
          break;
        case VIEWPORT_ZOOM_OUT_ACTION:
          this.onZoomOut();
          break;
        case 'crop.tool':
          this.toggleCropMode();
          break;
        case 'crop.apply':
          await this.cropTool.apply();
          break;
        case 'crop.cancel':
          this.cropTool.cancel();
          break;
        case 'adjustments.tool':
          this.toggleAdjustmentsMode();
          break;
        case 'effects.tool':
          this.toggleEffectsMode();
          break;
        case 'filters.tool':
          this.toggleFiltersMode();
          break;
        case 'focus.tool':
          this.toggleFocusMode();
          break;
        case 'redact.tool':
          this.toggleRedactMode();
          break;
        case 'crop-mask.tool':
          this.toggleCropMaskMode();
          break;
        case 'color-overlay.tool':
          this.toggleColorOverlayMode();
          break;
        case 'fill.tool':
          this.toggleFillMode();
          break;
        case 'frame.tool':
          this.toggleFrameMode();
          break;
        case 'text.tool':
          this.toggleTextMode();
          break;
        case 'shapes.tool':
          this.toggleShapesMode();
          break;
        case 'drawing.tool':
          this.toggleDrawingMode();
          break;
        case 'path.tool':
          this.togglePathMode();
          break;
        case 'image-overlay.tool':
          this.toggleImageOverlayMode();
          break;
        case STICKERS_TOOL_ACTION:
          this.toggleStickersMode();
          break;
        case EMOJI_TOOL_ACTION:
          this.toggleEmojiMode();
          break;
        case TEMPLATES_TOOL_ACTION:
          this.toggleTemplatesMode();
          break;
        case 'watermark.tool':
          this.toggleWatermarkMode();
          break;
        case RULERS_TOOL_ACTION:
          this.toggleRulersMode();
          break;
        case PERSISTENCE_EXPORT_ACTION:
          this.exportController.downloadDesignState();
          break;
        case PERSISTENCE_LOAD_ACTION:
          this.exportController.pickDesignStateFile();
          break;
        case EXPORT_DIALOG_ACTION:
          this.closeZoomMenu();
          this.ui.exportMenuOpen.update((open) => !open);
          break;
        case BATCH_EXPORT_DIALOG_ACTION:
          this.closeExportMenu();
          this.batchExportController.open();
          break;
        case EXPORT_PNG_ACTION:
          this.exportController.open('png');
          break;
        case EXPORT_JPEG_ACTION:
          this.exportController.open('jpeg');
          break;
        case EXPORT_WEBP_ACTION:
          this.exportController.open('webp');
          break;
        case HISTORY_PANEL_ACTION:
          this.toggleSidePanel('history');
          break;
        case LAYERS_PANEL_ACTION:
          this.toggleSidePanel('layers');
          break;
        case OPEN_FILE_ACTION:
          this.closeZoomMenu();
          this.closeExportMenu();
          this.closeBlankMenu();
          void this.openController.openFile();
          break;
        case OPEN_NEW_ACTION:
          this.closeZoomMenu();
          this.closeExportMenu();
          void this.openController.onNewAction();
          break;
        default: {
          const registered = session.getToolbarActions().some((action) => action.id === actionId);
          if (registered) {
            this.shell.emitAction({ id: actionId });
          }
          break;
        }
      }
    } catch (error) {
      this.shell.reportError(error);
    }
  }

  onZoomIn(): void {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    const factor = this.presentation.zoomStepFactor();
    session.setZoom(session.store.viewport().zoom * factor);
  }

  onZoomOut(): void {
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    const factor = this.presentation.zoomStepFactor();
    session.setZoom(session.store.viewport().zoom / factor);
  }

  onCenterViewport(): void {
    this.shell.getSession()?.centerViewport();
  }

  toggleZoomMenu(event: Event): void {
    event.stopPropagation();
    this.closeExportMenu();
    this.closeBlankMenu();
    if (!this.presentation.useZoomPresetsMenu()) {
      this.shell.getSession()?.fitViewport();
      this.ui.zoomMenuOpen.set(false);
      return;
    }
    this.ui.zoomMenuOpen.update((open) => !open);
  }

  closeZoomMenu(): void {
    this.ui.zoomMenuOpen.set(false);
  }

  toggleExportMenu(event: Event): void {
    event.stopPropagation();
    this.closeZoomMenu();
    this.closeBlankMenu();
    this.ui.exportMenuOpen.update((open) => !open);
  }

  closeExportMenu(): void {
    this.ui.exportMenuOpen.set(false);
  }

  closeBlankMenu(): void {
    this.openController.closeBlankMenu();
  }

  chooseBlankPreset(
    preset: {
      readonly id: string;
      readonly label: string;
      readonly width: number;
      readonly height: number;
      readonly fill?: string;
    },
    event?: Event,
  ): void {
    this.openController.chooseBlankPreset(preset, event);
  }

  blankPresets(): ReturnType<OpenController['blankPresets']> {
    return this.openController.blankPresets();
  }

  usesBlankMenu(): boolean {
    return this.openController.usesBlankMenu();
  }

  chooseExportFormat(format: RasterExportFormat, event?: Event): void {
    event?.stopPropagation();
    this.closeExportMenu();
    this.exportController.open(format);
  }

  chooseDesignExport(event?: Event): void {
    event?.stopPropagation();
    this.closeExportMenu();
    this.exportController.downloadDesignState();
  }

  chooseDesignLoad(event?: Event): void {
    event?.stopPropagation();
    this.closeExportMenu();
    this.exportController.pickDesignStateFile();
  }

  openBatchExportFromMenu(event?: Event): void {
    event?.stopPropagation();
    this.closeExportMenu();
    this.batchExportController.open();
  }

  onDocumentClick(): void {
    if (this.ui.zoomMenuOpen()) {
      this.closeZoomMenu();
    }
    if (this.ui.exportMenuOpen()) {
      this.closeExportMenu();
    }
    if (this.ui.blankMenuOpen()) {
      this.closeBlankMenu();
    }
    if (this.ui.annotationActionsMenu()) {
      this.annotations.closeActionsMenu();
    }
  }

  applyZoomPreset(preset: ZoomPreset, event?: Event): void {
    event?.stopPropagation();
    const session = this.shell.getSession();
    if (!session) {
      return;
    }
    if (preset.factor === 'fit') {
      session.fitViewport();
    } else {
      session.setZoom(preset.factor);
    }
    this.closeZoomMenu();
  }

  zoomPresetLabel(preset: ZoomPreset): string {
    if (preset.label) {
      return preset.label;
    }
    if (preset.labelKey) {
      return this.presentation.t(preset.labelKey);
    }
    return String(preset.factor);
  }

  onUndo(): void {
    this.shell.getSession()?.undo();
  }

  onRedo(): void {
    this.shell.getSession()?.redo();
  }

  onReset(): void {
    this.compare.clear();
    this.shell.getSession()?.reset();
    this.cropTool.cancel();
    this.rasterPreview.cancelAdjustments();
    this.rasterPreview.cancelEffects();
    this.rasterPreview.cancelFilters();
    this.rasterPreview.cancelFocus();
    this.rasterPreview.cancelCropMask();
    this.rasterPreview.cancelColorOverlay();
    this.rasterPreview.cancelFrame();
    this.textTool.cancel();
    this.shapesTool.cancel();
    this.drawingTool.cancel();
    this.imageAnnotationTool.cancel();
    this.watermarkTool.cancel();
  }

  actionLabel(actionId: string): string {
    const override = this.presentation.toolbar().actions?.[actionId]?.label;
    if (override) {
      return override;
    }
    const key = toolbarActionTranslationKey(actionId);
    const translated = this.presentation.t(key);
    if (translated !== key) {
      return translated;
    }
    const session = this.shell.getSession();
    return (
      session?.getToolbarActions().find((item) => item.id === actionId)?.label ??
      session?.getToolbarGroups().find((item) => item.id === actionId)?.label ??
      actionId
    );
  }

  actionDisplay(actionId: string): EditorToolbarActionDisplay {
    return (
      this.presentation.toolbar().actions?.[actionId]?.display ??
      this.presentation.toolbarActionDisplay()
    );
  }

  showActionIcon(actionId: string): boolean {
    const display = this.actionDisplay(actionId);
    return display === 'icon' || display === 'both';
  }

  showActionLabel(actionId: string): boolean {
    const display = this.actionDisplay(actionId);
    return display === 'label' || display === 'both';
  }

  actionIconPath(actionId: string): string | null {
    const overrideIcon = this.presentation.toolbar().actions?.[actionId]?.icon;
    const session = this.shell.getSession();
    const registeredIcon =
      session?.getToolbarActions().find((item) => item.id === actionId)?.icon ??
      session?.getToolbarGroups().find((item) => item.id === actionId)?.icon;
    const iconKey =
      overrideIcon ?? registeredIcon ?? DEFAULT_ACTION_ICON_KEYS[actionId] ?? undefined;
    return resolveToolbarIconPath(iconKey);
  }

  toggleUtilibarGroup(groupId: string): void {
    const expanding = this.ui.expandedUtilibarGroupId() !== groupId;
    this.ui.expandedUtilibarGroupId.update((current) => (current === groupId ? null : groupId));
    // Expanding Annotate (or any group) should dismiss the active tool panel.
    if (expanding) {
      this.modes.closeAll(this.lifecycle.closers);
    }
  }

  toggleCropMode(): void {
    if (this.ui.cropMode()) {
      this.cropTool.cancel();
    } else {
      this.cropTool.enter();
    }
  }

  toggleRotateMode(): void {
    if (this.ui.rotateMode()) {
      this.transformTool.closeRotate();
    } else {
      this.transformTool.enterRotate();
    }
  }

  toggleResizeMode(): void {
    if (this.ui.resizeMode()) {
      this.transformTool.closeResize();
    } else {
      this.transformTool.enterResize();
    }
  }

  toggleAdjustmentsMode(): void {
    if (this.ui.adjustmentsMode()) {
      this.rasterPreview.cancelAdjustments();
    } else {
      this.rasterPreview.enterAdjustments();
    }
  }

  toggleEffectsMode(): void {
    if (this.ui.effectsMode()) {
      this.rasterPreview.cancelEffects();
    } else {
      this.rasterPreview.enterEffects();
    }
  }

  toggleFiltersMode(): void {
    if (this.ui.filtersMode()) {
      this.rasterPreview.cancelFilters();
    } else {
      this.rasterPreview.enterFilters();
    }
  }

  toggleFocusMode(): void {
    if (this.ui.focusMode()) {
      this.rasterPreview.cancelFocus();
    } else {
      this.rasterPreview.enterFocus();
    }
  }

  toggleRedactMode(): void {
    if (this.ui.redactMode()) {
      this.rasterPreview.cancelRedact();
    } else {
      this.rasterPreview.enterRedact();
    }
  }

  toggleCropMaskMode(): void {
    if (this.ui.cropMaskMode()) {
      this.rasterPreview.cancelCropMask();
    } else {
      this.rasterPreview.enterCropMask();
    }
  }

  toggleColorOverlayMode(): void {
    if (this.ui.colorOverlayMode()) {
      this.rasterPreview.cancelColorOverlay();
    } else {
      this.rasterPreview.enterColorOverlay();
    }
  }

  toggleFillMode(): void {
    if (this.ui.fillMode()) {
      this.rasterPreview.cancelFill();
    } else {
      this.rasterPreview.enterFill();
    }
  }

  toggleFrameMode(): void {
    if (this.ui.frameMode()) {
      this.rasterPreview.cancelFrame();
    } else {
      this.rasterPreview.enterFrame();
    }
  }

  toggleTextMode(): void {
    if (this.ui.textMode()) {
      this.textTool.cancel();
    } else {
      this.textTool.enter();
    }
  }

  toggleShapesMode(): void {
    if (this.ui.shapesMode()) {
      this.shapesTool.cancel();
    } else {
      this.shapesTool.enter();
    }
  }

  toggleDrawingMode(): void {
    if (this.ui.drawingMode()) {
      this.drawingTool.cancel();
    } else {
      this.drawingTool.enter();
    }
  }

  togglePathMode(): void {
    if (this.ui.pathMode()) {
      this.pathTool.cancel();
    } else {
      this.pathTool.enter();
    }
  }

  toggleImageOverlayMode(): void {
    if (this.ui.imageOverlayMode()) {
      this.imageAnnotationTool.cancel();
    } else {
      this.imageAnnotationTool.enterOverlay();
    }
  }

  toggleStickersMode(): void {
    if (this.ui.stickersMode()) {
      this.imageAnnotationTool.cancel();
    } else {
      this.imageAnnotationTool.enterStickers();
    }
  }

  toggleEmojiMode(): void {
    if (this.ui.emojiMode()) {
      this.textTool.cancel();
    } else {
      this.textTool.enterEmoji();
    }
  }

  toggleTemplatesMode(): void {
    if (this.ui.templatesMode()) {
      this.templatesTool.cancel();
    } else {
      this.templatesTool.enter();
    }
  }

  toggleWatermarkMode(): void {
    if (this.ui.watermarkMode()) {
      this.watermarkTool.cancel();
    } else {
      this.watermarkTool.enter();
    }
  }

  toggleRulersMode(): void {
    if (this.ui.rulersMode()) {
      this.rulersTool.cancel();
    } else {
      this.rulersTool.enter();
    }
  }

  toggleSidePanel(tab: string): void {
    const open = this.ui.sidePanelOpen();
    if (open && this.ui.sidePanelTab() === tab) {
      this.ui.sidePanelOpen.set(false);
      return;
    }
    this.ui.sidePanelTab.set(tab);
    this.ui.sidePanelOpen.set(true);
    if (tab === 'layers') {
      this.annotations.syncAllDraftsFromDocument();
    }
  }
}
