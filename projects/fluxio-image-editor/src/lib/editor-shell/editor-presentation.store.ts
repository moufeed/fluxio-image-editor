import { computed, inject, Injectable, signal } from '@angular/core';

import {
  DEFAULT_ASPECT_RATIOS,
  DEFAULT_FILL_COLORS,
  boundsFromTransformable,
  DEFAULT_OPAQUE_BLACK,
  DEFAULT_OPAQUE_RED,
  DEFAULT_OPAQUE_WHITE,
  estimateWatermarkBounds,
  isRtlEditorLocale,
  resolveCropConfig,
  resolveFilterLabel,
  resolveResizeConfig,
  resolveFilterPresetIds,
  resolveToolbarConfig,
  resolveToolbarPosition,
  sortByToolbarPosition,
  unionBounds,
  type AdjustmentsState,
  type EditorToolbarActionDisplay,
  type EffectsState,
  type FocusState,
  type CropMaskState,
  type ColorOverlayState,
  type FrameState,
  type InteractiveBounds,
  type ShapeAnnotation,
  type WatermarkMode,
  type WatermarkPosition,
} from 'fluxio-image-editor/core';
import { DEFAULT_STICKER_GALLERY } from 'fluxio-image-editor/plugins/stickers';
import { DEFAULT_EMOJI_GALLERY } from 'fluxio-image-editor/plugins/emoji';
import { DEFAULT_TEMPLATE_GALLERY } from 'fluxio-image-editor/plugins/templates';
import { DEFAULT_BATCH_EXPORT_PRESETS } from 'fluxio-image-editor/plugins/batch-export';
import { COMPARE_ORIGINAL_ACTION } from 'fluxio-image-editor/plugins/compare';
import { EXPORT_DIALOG_ACTION } from 'fluxio-image-editor/plugins/export';
import {
  VIEWPORT_FIT_ACTION,
  resolveZoomPresets,
  resolveZoomStepFactor,
} from 'fluxio-image-editor/plugins/viewport';

import { AnnotationInteractionController } from './annotation-interaction.controller';
import { EditorShellContext } from './editor-shell.context';
import { EditorUiStore, type EditorControlTool } from './editor-ui.store';
import {
  expandVisibleActionIds,
  orderGroupChildren,
  resolveActionSurface,
  resolveGroupSurface,
  SHELL_OWNED_TOOLBAR_ACTION_IDS,
} from './helpers/action-surface';

/** Top-level utilibar entry: a single tool or a collapsible group. */
export interface UtilibarRailItem {
  readonly kind: 'action' | 'group';
  readonly id: string;
  readonly children?: readonly string[];
}

/**
 * Template-facing derived presentation state for the editor shell.
 * Owns computeds/labels/galleries; mutable drafts and modes stay on {@link EditorUiStore}.
 */
@Injectable()
export class EditorPresentationStore {
  private readonly ui = inject(EditorUiStore);
  private readonly shell = inject(EditorShellContext);
  private readonly annotations = inject(AnnotationInteractionController);

  readonly exportOpen = this.ui.exportOpen;
  readonly batchExportOpen = this.ui.batchExportOpen;
  readonly batchExportBusy = this.ui.batchExportBusy;
  readonly batchExportSelectedIds = this.ui.batchExportSelectedIds;
  readonly batchExportProgress = this.ui.batchExportProgress;
  readonly exportFormat = this.ui.exportFormat;
  readonly exportQuality = this.ui.exportQuality;
  readonly exportFileName = this.ui.exportFileName;
  readonly annotationActionsMenu = this.ui.annotationActionsMenu;
  readonly sidePanelOpen = this.ui.sidePanelOpen;
  readonly sidePanelTab = this.ui.sidePanelTab;
  readonly expandedUtilibarGroupId = this.ui.expandedUtilibarGroupId;
  readonly cropMode = this.ui.cropMode;
  readonly rotateMode = this.ui.rotateMode;
  readonly resizeMode = this.ui.resizeMode;
  readonly adjustmentsMode = this.ui.adjustmentsMode;
  readonly effectsMode = this.ui.effectsMode;
  readonly filtersMode = this.ui.filtersMode;
  readonly focusMode = this.ui.focusMode;
  readonly redactMode = this.ui.redactMode;
  readonly cropMaskMode = this.ui.cropMaskMode;
  readonly colorOverlayMode = this.ui.colorOverlayMode;
  readonly fillMode = this.ui.fillMode;
  readonly frameMode = this.ui.frameMode;
  readonly textMode = this.ui.textMode;
  readonly emojiMode = this.ui.emojiMode;
  readonly textToolActive = this.ui.textToolActive;
  readonly shapesMode = this.ui.shapesMode;
  readonly drawingMode = this.ui.drawingMode;
  readonly pathMode = this.ui.pathMode;
  readonly imageOverlayMode = this.ui.imageOverlayMode;
  readonly stickersMode = this.ui.stickersMode;
  readonly templatesMode = this.ui.templatesMode;
  readonly watermarkMode = this.ui.watermarkMode;
  readonly rulersMode = this.ui.rulersMode;
  readonly markupSnap = this.ui.markupSnap;
  readonly colorPickerMode = this.ui.colorPickerMode;
  readonly compareLatched = this.ui.compareLatched;
  readonly comparingOriginal = this.ui.comparingOriginal;
  readonly cropAspectId = this.ui.cropAspectId;
  readonly cropGuideCircle = this.ui.cropGuideCircle;
  readonly cropGuideBleed = this.ui.cropGuideBleed;
  readonly draftAdjustments = this.ui.draftAdjustments;
  readonly draftEffects = this.ui.draftEffects;
  readonly draftFilters = this.ui.draftFilters;
  readonly draftFocus = this.ui.draftFocus;
  readonly draftRedactions = this.ui.draftRedactions;
  readonly draftCropMask = this.ui.draftCropMask;
  readonly cropMaskPreviewOpacity = this.ui.cropMaskPreviewOpacity;
  readonly draftColorOverlay = this.ui.draftColorOverlay;
  readonly draftFill = this.ui.draftFill;
  readonly draftFrame = this.ui.draftFrame;
  readonly filterThumbUrls = this.ui.filterThumbUrls;
  readonly draftWatermark = this.ui.draftWatermark;
  readonly draftTexts = this.ui.draftTexts;
  readonly editingTextId = this.ui.editingTextId;
  readonly editingTextOverlay = this.ui.editingTextOverlay;
  readonly draftShapes = this.ui.draftShapes;
  readonly draftPaths = this.ui.draftPaths;
  readonly draftImages = this.ui.draftImages;
  readonly selectedTextIds = this.ui.selectedTextIds;
  readonly selectedShapeIds = this.ui.selectedShapeIds;
  readonly selectedPathId = this.ui.selectedPathId;
  readonly selectedImageIds = this.ui.selectedImageIds;
  readonly selectedTextId = this.ui.selectedTextId;
  readonly selectedShapeId = this.ui.selectedShapeId;
  readonly selectedImageId = this.ui.selectedImageId;
  readonly penStroke = this.ui.penStroke;
  readonly penStrokeWidth = this.ui.penStrokeWidth;
  readonly shapeDraftKind = this.ui.shapeDraftKind;
  readonly shapeDraftPolygonSides = this.ui.shapeDraftPolygonSides;
  readonly arbitraryAngle = this.ui.arbitraryAngle;
  readonly resizeWidth = this.ui.resizeWidth;
  readonly resizeHeight = this.ui.resizeHeight;
  readonly resizeLock = this.ui.resizeLock;
  readonly resizePresetId = this.ui.resizePresetId;
  readonly zoomMenuOpen = this.ui.zoomMenuOpen;
  readonly exportMenuOpen = this.ui.exportMenuOpen;

  readonly watermarkPositions: readonly WatermarkPosition[] = [
    'center',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ];
  readonly watermarkModes: readonly WatermarkMode[] = ['none', 'text', 'image'];
  readonly shapeKinds: readonly ShapeAnnotation['kind'][] = [
    'rect',
    'ellipse',
    'polygon',
    'line',
    'arrow',
  ];
  readonly colorFallbackWhite = DEFAULT_OPAQUE_WHITE;
  readonly colorFallbackBlack = DEFAULT_OPAQUE_BLACK;
  readonly colorFallbackRed = DEFAULT_OPAQUE_RED;
  /** Curated web-safe font stacks for the text tool font picker. */
  readonly fontFamilies: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'Sans Serif', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
  ];
  readonly filterPresets = computed(() =>
    resolveFilterPresetIds(this.shell.config().filters ?? null),
  );
  readonly adjustmentSliders: readonly {
    readonly key: keyof AdjustmentsState;
    readonly min: number;
    readonly max: number;
  }[] = [
    { key: 'brightness', min: -100, max: 100 },
    { key: 'contrast', min: -100, max: 100 },
    { key: 'exposure', min: -100, max: 100 },
    { key: 'hue', min: -100, max: 100 },
    { key: 'saturation', min: -100, max: 100 },
    { key: 'value', min: -100, max: 100 },
    { key: 'warmth', min: -100, max: 100 },
    { key: 'gamma', min: -100, max: 100 },
    { key: 'clarity', min: 0, max: 100 },
    { key: 'vignette', min: 0, max: 100 },
    { key: 'sharpen', min: 0, max: 100 },
    { key: 'blur', min: 0, max: 100 },
  ];
  readonly effectSliders: readonly {
    readonly key: keyof EffectsState;
    readonly min: number;
    readonly max: number;
  }[] = [
    { key: 'threshold', min: 0, max: 100 },
    { key: 'posterize', min: 0, max: 100 },
    { key: 'pixelate', min: 0, max: 100 },
    { key: 'noise', min: 0, max: 100 },
  ];
  readonly focusSliders: readonly {
    readonly key: Exclude<keyof FocusState, 'mode'>;
    readonly min: number;
    readonly max: number;
    readonly linearOnly?: boolean;
  }[] = [
    { key: 'blur', min: 0, max: 100 },
    { key: 'size', min: 0, max: 100 },
    { key: 'feather', min: 0, max: 100 },
    { key: 'centerX', min: 0, max: 100 },
    { key: 'centerY', min: 0, max: 100 },
    { key: 'angle', min: -180, max: 180, linearOnly: true },
  ];
  readonly cropMaskSliders: readonly {
    readonly key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>;
    readonly min: number;
    readonly max: number;
  }[] = [
    { key: 'inset', min: 0, max: 45 },
    { key: 'cornerRadius', min: 0, max: 100 },
    { key: 'feather', min: 0, max: 100 },
    { key: 'angle', min: -180, max: 180 },
  ];
  readonly frameSliders: readonly {
    readonly key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>;
    readonly min: number;
    readonly max: number;
  }[] = [
    { key: 'thickness', min: 1, max: 25 },
    { key: 'opacity', min: 0, max: 100 },
    { key: 'cornerRadius', min: 0, max: 100 },
  ];
  readonly colorOverlaySliders: readonly {
    readonly key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>;
    readonly min: number;
    readonly max: number;
  }[] = [
    { key: 'opacity', min: 0, max: 100 },
    { key: 'angle', min: 0, max: 360 },
  ];

  readonly hasMultiSelection = computed(() => {
    if (this.imageOverlayMode() || this.stickersMode()) {
      return this.selectedImageIds().length > 1;
    }
    if (this.textToolActive()) {
      return this.selectedTextIds().length > 1;
    }
    if (this.shapesMode()) {
      return this.selectedShapeIds().length > 1;
    }
    return false;
  });

  readonly multiSelectionCount = computed(() => {
    if (this.imageOverlayMode() || this.stickersMode()) {
      return this.selectedImageIds().length;
    }
    if (this.textToolActive()) {
      return this.selectedTextIds().length;
    }
    if (this.shapesMode()) {
      return this.selectedShapeIds().length;
    }
    return 0;
  });

  readonly toolbar = computed(() => resolveToolbarConfig(this.shell.config().toolbar));
  readonly themeMode = computed(() => this.shell.config().theme ?? 'dark');
  readonly themeClass = computed(() => {
    const value = this.shell.config().themeClass?.trim();
    return value || null;
  });
  /** Root classes: base + optional host `themeClass` for CSS-driven custom themes. */
  readonly themeHostClass = computed(() => {
    const extra = this.themeClass();
    return extra ? `fluxio-image-editor ${extra}` : 'fluxio-image-editor';
  });
  readonly locale = computed(() => this.shell.config().locale ?? 'en');
  readonly textDirection = computed(() => {
    const dir = this.shell.config().dir ?? 'auto';
    if (dir !== 'auto') {
      return dir;
    }
    return isRtlEditorLocale(this.locale()) ? 'rtl' : 'ltr';
  });
  readonly customThemeStyle = computed(() => {
    if (this.themeMode() !== 'custom') {
      return null;
    }
    const tokens = this.shell.config().themeTokens ?? {};
    const entries = Object.entries(tokens).filter(
      ([key, value]) => key.startsWith('--') && typeof value === 'string' && value.length > 0,
    );
    if (entries.length === 0) {
      return null;
    }
    return entries.map(([key, value]) => `${key}:${value}`).join(';');
  });

  readonly hasCustomCanvasBackground = computed(() => {
    const bg = this.shell.config().canvasBackground;
    return !!(bg?.backgroundColor || bg?.backgroundImage);
  });

  readonly viewportStageStyle = computed(() => {
    const bg = this.shell.config().canvasBackground;
    if (!bg) {
      return null;
    }
    const parts: string[] = [];
    if (bg.backgroundColor) {
      parts.push(`background-color:${bg.backgroundColor}`);
    }
    if (bg.backgroundImage) {
      parts.push(`background-image:${bg.backgroundImage}`);
    }
    return parts.length > 0 ? parts.join(';') : null;
  });

  readonly aspectRatios = computed(() => this.shell.config().aspectRatios ?? DEFAULT_ASPECT_RATIOS);
  readonly allowArbitraryAngle = computed(
    () => this.shell.config().rotate?.allowArbitraryAngle ?? false,
  );
  /** PV08: resize size presets (`config.resize.sizePresets`). */
  readonly resizeSizePresets = computed(
    () => resolveResizeConfig(this.shell.config().resize).sizePresets ?? [],
  );
  readonly showSave = computed(() => this.toolbar().showSaveButton !== false);
  readonly warnOnUnsaved = computed(() => this.shell.config().close?.warnOnUnsaved !== false);

  readonly readyState = computed(() => this.shell.session()?.store.isReady() ?? false);
  readonly canUndoState = computed(() => this.shell.session()?.store.canUndo() ?? false);
  readonly canRedoState = computed(() => this.shell.session()?.store.canRedo() ?? false);
  readonly dirtyState = computed(() => this.shell.session()?.store.isDirty() ?? false);
  readonly showCompareControl = computed(() => {
    const overrides = this.toolbar().actions ?? {};
    if (overrides[COMPARE_ORIGINAL_ACTION]?.visible === false) {
      return false;
    }
    if (!this.eligibleLeafActionIds().includes(COMPARE_ORIGINAL_ACTION)) {
      return false;
    }
    const action = this.shell
      .session()
      ?.getToolbarActions()
      .find((item) => item.id === COMPARE_ORIGINAL_ACTION);
    if (!action) {
      return false;
    }
    return resolveActionSurface(action, overrides[COMPARE_ORIGINAL_ACTION]) === 'toolbar';
  });
  readonly statusState = computed(() => {
    if (this.shell.pluginsBootstrapping()) {
      return 'loading' as const;
    }
    return this.shell.session()?.store.status() ?? 'idle';
  });
  readonly errorState = computed(() => this.shell.session()?.store.errorMessage() ?? null);
  readonly rotationState = computed(
    () => this.shell.session()?.store.document()?.transform.rotationDegrees ?? 0,
  );
  readonly outputWidthState = computed(
    () => this.shell.session()?.store.document()?.output.width ?? 0,
  );
  readonly outputHeightState = computed(
    () => this.shell.session()?.store.document()?.output.height ?? 0,
  );
  /** Base photo lock (designImage.locked). Default true when unloaded. */
  readonly designImageLocked = computed(() => {
    const document = this.shell.session()?.store.document();
    if (!document) {
      return true;
    }
    return document.designImage?.locked !== false;
  });
  readonly zoomState = computed(() => this.shell.session()?.store.viewport().zoom ?? 1);
  readonly zoomPercentState = computed(() => Math.round(this.zoomState() * 100));
  readonly zoomPresets = computed(() => resolveZoomPresets(this.shell.config().viewport));
  readonly useZoomPresetsMenu = computed(
    () => this.shell.config().viewport?.useZoomPresetsMenu !== false,
  );
  readonly zoomStepFactor = computed(() => resolveZoomStepFactor(this.shell.config().viewport));
  /** Pintura-style floating recenter when the canvas was panned / zoomed off-center. */
  readonly showViewportRecenter = computed(() => {
    const session = this.shell.session();
    if (!session) {
      return false;
    }
    // Read reactive deps so the button updates after pan/zoom.
    session.store.viewport();
    session.store.document();
    session.store.preview();
    session.store.activeTool();
    return session.needsViewportRecenter();
  });
  readonly utilsPosition = computed(() => this.toolbar().position);
  readonly toolbarBarPosition = computed(() => this.toolbar().toolbarPosition ?? 'top');
  readonly controlsPosition = computed(
    () => this.toolbar().controlsPosition ?? this.toolbar().position,
  );
  readonly toolbarActionDisplay = computed(
    (): EditorToolbarActionDisplay => this.toolbar().actionDisplay ?? 'both',
  );

  readonly controlsOpen = computed(
    () =>
      this.cropMode() ||
      this.adjustmentsMode() ||
      this.effectsMode() ||
      this.filtersMode() ||
      this.focusMode() ||
      this.redactMode() ||
      this.cropMaskMode() ||
      this.colorOverlayMode() ||
      this.fillMode() ||
      this.frameMode() ||
      this.textMode() ||
      this.emojiMode() ||
      this.shapesMode() ||
      this.drawingMode() ||
      this.pathMode() ||
      this.imageOverlayMode() ||
      this.stickersMode() ||
      this.templatesMode() ||
      this.watermarkMode() ||
      this.rulersMode() ||
      (this.rotateMode() && this.readyState()) ||
      (this.resizeMode() && this.readyState()),
  );

  readonly activeControlTool = computed((): EditorControlTool | null => {
    if (this.cropMode()) {
      return 'crop';
    }
    if (this.adjustmentsMode()) {
      return 'adjustments';
    }
    if (this.effectsMode()) {
      return 'effects';
    }
    if (this.filtersMode()) {
      return 'filters';
    }
    if (this.focusMode()) {
      return 'focus';
    }
    if (this.redactMode()) {
      return 'redact';
    }
    if (this.cropMaskMode()) {
      return 'crop-mask';
    }
    if (this.colorOverlayMode()) {
      return 'color-overlay';
    }
    if (this.fillMode()) {
      return 'fill';
    }
    if (this.frameMode()) {
      return 'frame';
    }
    if (this.textMode()) {
      return 'text';
    }
    if (this.emojiMode()) {
      return 'emoji';
    }
    if (this.shapesMode()) {
      return 'shapes';
    }
    if (this.drawingMode()) {
      return 'drawing';
    }
    if (this.pathMode()) {
      return 'path';
    }
    if (this.stickersMode()) {
      return 'stickers';
    }
    if (this.templatesMode()) {
      return 'templates';
    }
    if (this.imageOverlayMode()) {
      return 'image-overlay';
    }
    if (this.watermarkMode()) {
      return 'watermark';
    }
    if (this.rulersMode()) {
      return 'rulers';
    }
    if (this.rotateMode() && this.readyState()) {
      return 'rotate';
    }
    if (this.resizeMode() && this.readyState()) {
      return 'resize';
    }
    return null;
  });

  readonly selectedText = computed(() => {
    const id = this.selectedTextId();
    return this.draftTexts().find((item) => item.id === id) ?? null;
  });
  readonly selectedShape = computed(() => {
    const id = this.selectedShapeId();
    return this.draftShapes().find((item) => item.id === id) ?? null;
  });
  readonly polygonSidesValue = computed(() => {
    const shape = this.selectedShape();
    if (shape?.kind === 'polygon') {
      return shape.points.length;
    }
    return this.shapeDraftPolygonSides();
  });
  readonly selectedPath = computed(() => {
    const id = this.selectedPathId();
    return this.draftPaths().find((item) => item.id === id) ?? null;
  });
  readonly selectedImage = computed(() => {
    const id = this.selectedImageId();
    return this.draftImages().find((item) => item.id === id) ?? null;
  });

  readonly selectedGeometry = computed((): InteractiveBounds | null => {
    if (this.watermarkMode()) {
      const output = this.shell.session()?.store.document()?.output;
      if (!output) {
        return null;
      }
      return estimateWatermarkBounds(this.draftWatermark(), output);
    }
    if (this.hasMultiSelection()) {
      const ids =
        this.imageOverlayMode() || this.stickersMode()
          ? this.selectedImageIds()
          : this.textToolActive()
            ? this.selectedTextIds()
            : this.shapesMode()
              ? this.selectedShapeIds()
              : [];
      const items = this.annotations.currentDraft().filter((item) => ids.includes(item.id));
      return unionBounds(items.map(boundsFromTransformable));
    }
    const selected = this.annotations.currentSelected();
    return selected ? boundsFromTransformable(selected) : null;
  });

  readonly annotationInteractionActive = computed(() => {
    if (!this.readyState()) {
      return false;
    }
    if (
      this.cropMode() ||
      this.adjustmentsMode() ||
      this.effectsMode() ||
      this.filtersMode() ||
      this.focusMode() ||
      this.redactMode() ||
      this.cropMaskMode() ||
      this.colorOverlayMode() ||
      this.fillMode() ||
      this.frameMode() ||
      this.templatesMode() ||
      this.rotateMode() ||
      this.resizeMode() ||
      this.watermarkMode()
    ) {
      return false;
    }
    return true;
  });

  /**
   * PV38: viewport is keyboard-focusable for annotation interaction and
   * canvas-geometry modes (crop / redact / focus / crop-mask / watermark / path).
   */
  readonly canvasKeyboardActive = computed(() => {
    if (!this.readyState()) {
      return false;
    }
    if (this.annotationInteractionActive()) {
      return true;
    }
    return (
      this.cropMode() ||
      this.redactMode() ||
      this.focusMode() ||
      this.cropMaskMode() ||
      this.watermarkMode() ||
      this.pathMode()
    );
  });

  readonly canvasSelectionToolbarVisible = computed(() => {
    if (this.ui.selectedPathVertexIndex() != null) {
      return false;
    }
    if (!this.annotationInteractionActive() || !this.selectedGeometry()) {
      return false;
    }
    if (this.watermarkMode()) {
      return this.draftWatermark().mode !== 'none';
    }
    if (this.hasMultiSelection()) {
      return false;
    }
    return !!this.annotations.primaryId();
  });

  readonly canvasSelectionToolbarPosition = computed((): { x: number; y: number } | null => {
    const geo = this.selectedGeometry();
    const viewport = this.shell.session()?.store.viewport();
    if (!geo || !viewport) {
      return null;
    }
    const clearancePx = 10;
    const centerX = (geo.x + geo.width / 2) * viewport.zoom + viewport.panX;
    const topY = geo.y * viewport.zoom + viewport.panY - clearancePx;
    const edge = 48;
    return {
      x: Math.max(edge, Math.min(viewport.width - edge, centerX)),
      y: topY,
    };
  });

  /** Delete-only toolbar shown above a selected path vertex. */
  readonly pathVertexToolbarVisible = computed(() => {
    const index = this.ui.selectedPathVertexIndex();
    if (index == null) {
      return false;
    }
    const pathId = this.ui.selectedPathId();
    if (!pathId) {
      return false;
    }
    const path = this.ui.draftPaths().find((item) => item.id === pathId);
    return !!path && index >= 0 && index < path.points.length;
  });

  readonly pathVertexToolbarPosition = computed((): { x: number; y: number } | null => {
    const index = this.ui.selectedPathVertexIndex();
    const pathId = this.ui.selectedPathId();
    const viewport = this.shell.session()?.store.viewport();
    if (index == null || !pathId || !viewport) {
      return null;
    }
    const path = this.ui.draftPaths().find((item) => item.id === pathId);
    const point = path?.points[index];
    if (!point) {
      return null;
    }
    const clearancePx = 10;
    const centerX = point.x * viewport.zoom + viewport.panX;
    const topY = point.y * viewport.zoom + viewport.panY - clearancePx;
    const edge = 48;
    return {
      x: Math.max(edge, Math.min(viewport.width - edge, centerX)),
      y: topY,
    };
  });

  readonly canvasSelectionToolbarShowDuplicate = computed(
    () => !this.watermarkMode() && !!this.annotations.primaryId(),
  );

  readonly canvasSelectionToolbarShowEdit = computed(
    () => !this.watermarkMode() && !!this.annotations.primaryId(),
  );

  readonly canvasSelectionToolbarShowReorder = computed(
    () => !this.watermarkMode() && !!this.annotations.primaryId(),
  );

  readonly canvasSelectionToolbarDeleteLabel = computed(() => {
    if (this.watermarkMode()) {
      return this.t('watermark.remove');
    }
    const kind = this.annotations.selectionKind();
    if (kind === 'path' || this.drawingMode() || this.pathMode()) {
      return this.pathMode() ? this.t('path.delete') : this.t('drawing.delete');
    }
    if (kind === 'text' || this.textToolActive()) {
      return this.emojiMode() ? this.t('emoji.delete') : this.t('text.delete');
    }
    if (kind === 'shape' || this.shapesMode()) {
      return this.t('shapes.delete');
    }
    if (kind === 'image' || this.stickersMode()) {
      return this.stickersMode() ? this.t('stickers.delete') : this.t('image-overlay.delete');
    }
    if (this.imageOverlayMode()) {
      return this.t('image-overlay.delete');
    }
    return this.t('annotation.delete');
  });

  readonly overlayGallery = computed(() => this.shell.config().imageOverlay?.gallery ?? []);
  readonly stickersGallery = computed(() => {
    const configured = this.shell.config().stickers?.gallery;
    return configured && configured.length > 0 ? configured : DEFAULT_STICKER_GALLERY;
  });
  readonly stickersAllowUpload = computed(() => this.shell.config().stickers?.allowUpload === true);
  readonly emojiGallery = computed(() => {
    const configured = this.shell.config().emoji?.gallery;
    return configured && configured.length > 0 ? configured : DEFAULT_EMOJI_GALLERY;
  });
  readonly templateGallery = computed(() => {
    const configured = this.shell.config().templates?.gallery;
    return configured && configured.length > 0 ? configured : DEFAULT_TEMPLATE_GALLERY;
  });
  readonly fillGallery = computed(() => this.shell.config().fill?.gallery ?? []);
  readonly fillColors = computed(() => {
    const colors = this.shell.config().fill?.colors;
    return colors && colors.length > 0 ? colors : DEFAULT_FILL_COLORS;
  });
  readonly cropMaskGallery = computed(() => this.shell.config().cropMask?.gallery ?? []);
  /** PV37: Pintura `cropMinimizeToolbar` parity (`auto` | `always` | `never`). */
  readonly cropMinimizeToolbar = computed(
    () => resolveCropConfig(this.shell.config().crop).minimizeToolbar ?? 'auto',
  );
  readonly frameGallery = computed(() => this.shell.config().frame?.gallery ?? []);
  readonly selectedTemplateId = this.ui.selectedTemplateId;
  /** True when the color-picker plugin is loaded and not host-disabled. */
  readonly colorPickerAvailable = computed(() => {
    if (this.shell.config().colorPicker?.enabled === false) {
      return false;
    }
    const ids = this.shell.session()?.getRegisteredPluginIds() ?? [];
    return ids.includes('color-picker');
  });
  /** Recent opaque colors for color-field swatches. */
  readonly recentColors = this.ui.recentColors;
  /** Opaque `#rrggbb` of the last-focused color field (for recent active state). */
  readonly recentColorTargetKey = signal<string | null>(null);

  readonly recentEmojis = this.ui.recentEmojis;
  readonly favoriteEmojis = this.ui.favoriteEmojis;
  readonly emojiSkinTone = this.ui.emojiSkinTone;

  private recentColorApply: ((css: string) => void) | null = null;

  rememberColor(cssColor: string): void {
    this.ui.rememberColor(cssColor);
  }

  rememberEmoji(glyph: string): void {
    this.ui.rememberEmoji(glyph);
  }

  toggleFavoriteEmoji(glyph: string): void {
    this.ui.toggleFavoriteEmojiGlyph(glyph);
  }

  setEmojiSkinTone(index: number): void {
    this.ui.setEmojiSkinTone(index);
  }

  isFavoriteEmoji(glyph: string): boolean {
    return this.favoriteEmojis().includes(glyph);
  }

  /** Register which color field receives the next recent-swatch click. */
  registerRecentColorTarget(apply: (css: string) => void, currentHex: string): void {
    this.recentColorApply = apply;
    this.recentColorTargetKey.set(currentHex.toLowerCase());
  }

  /** Apply a recent color to the last-focused field. Returns false if none registered. */
  applyRecentColor(css: string): boolean {
    if (!this.recentColorApply) {
      return false;
    }
    this.recentColorApply(css);
    return true;
  }
  readonly batchExportAvailable = computed(() => {
    const ids = this.shell.session()?.getRegisteredPluginIds() ?? [];
    return ids.includes('batch-export');
  });
  readonly batchExportPresets = computed(() => {
    const configured = this.shell.config().batchExport?.presets;
    return configured && configured.length > 0 ? configured : DEFAULT_BATCH_EXPORT_PRESETS;
  });
  readonly watermarkGallery = computed(() => {
    const cfg = this.shell.config().watermark;
    const gallery = [...(cfg?.gallery ?? [])];
    if (cfg?.imageSrc && !gallery.some((item) => item.src === cfg.imageSrc)) {
      gallery.unshift({
        id: 'host-default',
        label: this.t('watermark.default'),
        src: cfg.imageSrc,
      });
    }
    return gallery;
  });

  /**
   * Eligible leaf action ids after host whitelist / aliases / shell filters.
   * Includes utilibar tools and dynamic toolbar-surface plugin actions.
   */
  readonly visibleActions = computed(() => this.eligibleLeafActionIds());

  /** Top-level utilibar rail entries (tools + groups). */
  readonly utilibarRailItems = computed((): readonly UtilibarRailItem[] => {
    const eligible = this.eligibleLeafActionIds();
    const useHostOrder = this.toolbar().visibleActions !== undefined;
    const session = this.shell.session();
    const actions = session?.getToolbarActions() ?? [];
    const groups = session?.getToolbarGroups() ?? [];
    const actionOverrides = this.toolbar().actions ?? {};
    const byId = new Map(actions.map((action) => [action.id, action]));
    const groupsById = new Map(groups.map((group) => [group.id, group]));

    interface RailEntry {
      readonly order: number;
      readonly tie: number;
      readonly item: UtilibarRailItem;
    }
    const entries: RailEntry[] = [];
    const emittedGroups = new Set<string>();
    let tie = 0;

    for (const id of eligible) {
      const action = byId.get(id);
      if (!action) {
        continue;
      }
      if (resolveActionSurface(action, actionOverrides[id]) !== 'utilibar') {
        continue;
      }

      const groupId = action.groupId;
      if (groupId) {
        if (emittedGroups.has(groupId)) {
          continue;
        }
        const group = groupsById.get(groupId);
        if (!group || resolveGroupSurface(group, actionOverrides[groupId]) !== 'utilibar') {
          entries.push({
            order: useHostOrder
              ? tie
              : resolveToolbarPosition(actionOverrides[id]?.position ?? action.position),
            tie,
            item: { kind: 'action', id },
          });
          tie += 1;
          continue;
        }
        const childIds = eligible.filter((childId) => {
          const child = byId.get(childId);
          return (
            !!child &&
            child.groupId === groupId &&
            resolveActionSurface(child, actionOverrides[childId]) === 'utilibar'
          );
        });
        if (childIds.length === 0) {
          continue;
        }
        emittedGroups.add(groupId);

        let childMin: number | undefined;
        for (const childId of childIds) {
          const child = byId.get(childId);
          const childPos = actionOverrides[childId]?.position ?? child?.position;
          if (childPos === undefined) {
            continue;
          }
          childMin = childMin === undefined ? childPos : Math.min(childMin, childPos);
        }
        const groupPos = actionOverrides[groupId]?.position ?? group.position ?? childMin;

        entries.push({
          order: useHostOrder ? tie : resolveToolbarPosition(groupPos),
          tie,
          item: {
            kind: 'group',
            id: groupId,
            children: orderGroupChildren(group, childIds),
          },
        });
        tie += 1;
        continue;
      }

      entries.push({
        order: useHostOrder
          ? tie
          : resolveToolbarPosition(actionOverrides[id]?.position ?? action.position),
        tie,
        item: { kind: 'action', id },
      });
      tie += 1;
    }

    if (!useHostOrder) {
      entries.sort((a, b) => a.order - b.order || a.tie - b.tie);
    }
    return entries.map((entry) => entry.item);
  });

  /**
   * Plugin actions that render on the chrome toolbar (excluding shell-owned
   * controls such as zoom / export / compare).
   */
  readonly toolbarPluginActionIds = computed(() => {
    const actionOverrides = this.toolbar().actions ?? {};
    const actions = this.shell.session()?.getToolbarActions() ?? [];
    const byId = new Map(actions.map((action) => [action.id, action]));
    const out: string[] = [];
    for (const id of this.eligibleLeafActionIds()) {
      if (SHELL_OWNED_TOOLBAR_ACTION_IDS.has(id)) {
        continue;
      }
      const action = byId.get(id);
      if (!action) {
        continue;
      }
      if (resolveActionSurface(action, actionOverrides[id]) !== 'toolbar') {
        continue;
      }
      out.push(id);
    }
    return out;
  });

  private eligibleLeafActionIds(): readonly string[] {
    const configured = this.toolbar().visibleActions;
    const actionOverrides = this.toolbar().actions ?? {};
    const registeredActions = this.shell.session()?.getToolbarActions() ?? [];
    const registeredIds = new Set(registeredActions.map((action) => action.id));

    let raw: readonly string[];
    if (configured === undefined) {
      const sorted = sortByToolbarPosition(
        registeredActions.map((action) => ({
          id: action.id,
          position: actionOverrides[action.id]?.position ?? action.position,
        })),
      );
      raw =
        sorted.length > 0
          ? sorted.map((action) => action.id)
          : [
              'transform.rotate-tool',
              'transform.resize-tool',
              VIEWPORT_FIT_ACTION,
              'crop.tool',
              EXPORT_DIALOG_ACTION,
            ];
    } else if (configured.length === 0) {
      raw = [];
    } else {
      raw = expandVisibleActionIds(configured, registeredIds);
    }

    const cropActive = this.cropMode();
    const normalized: string[] = [];
    let hasRotateTool = false;
    let hasResizeTool = false;
    for (const id of raw) {
      if (actionOverrides[id]?.visible === false) {
        continue;
      }
      if (
        id === 'transform.rotate-cw' ||
        id === 'transform.flip-h' ||
        id === 'transform.flip-v' ||
        id === 'transform.rotate-tool'
      ) {
        if (actionOverrides['transform.rotate-tool']?.visible === false) {
          continue;
        }
        if (!hasRotateTool) {
          normalized.push('transform.rotate-tool');
          hasRotateTool = true;
        }
        continue;
      }
      if (id === 'transform.resize-tool' || id === 'transform.resize') {
        if (actionOverrides['transform.resize-tool']?.visible === false) {
          continue;
        }
        if (!hasResizeTool) {
          normalized.push('transform.resize-tool');
          hasResizeTool = true;
        }
        continue;
      }
      if (id === 'crop.apply' || id === 'crop.cancel') {
        if (cropActive) {
          normalized.push(id);
        }
        continue;
      }
      normalized.push(id);
    }
    return normalized;
  }

  t(key: string): string {
    return this.shell.session()?.locales.t(key) ?? key;
  }

  /** Filters panel label: locale → host `filters.labels` → id. */
  filterPresetLabel(preset: string): string {
    const key = `filters.preset.${preset}`;
    const translated = this.t(key);
    if (translated !== key) {
      return translated;
    }
    return resolveFilterLabel(preset, this.shell.config().filters?.labels);
  }

  multiSelectionLabel(): string {
    return this.t('annotation.multiSelected').replace(
      '{count}',
      String(this.multiSelectionCount()),
    );
  }

  adjustmentUiValue(key: keyof AdjustmentsState): number {
    return Math.round(this.draftAdjustments()[key] * 100);
  }

  adjustmentSliderFillPercent(slider: {
    readonly key: keyof AdjustmentsState;
    readonly min: number;
    readonly max: number;
  }): number {
    const value = this.adjustmentUiValue(slider.key);
    const span = slider.max - slider.min;
    return span <= 0 ? 0 : ((value - slider.min) / span) * 100;
  }

  effectUiValue(key: keyof EffectsState): number {
    return Math.round(this.draftEffects()[key] * 100);
  }

  effectSliderFillPercent(slider: {
    readonly key: keyof EffectsState;
    readonly min: number;
    readonly max: number;
  }): number {
    const value = this.effectUiValue(slider.key);
    const span = slider.max - slider.min;
    return span <= 0 ? 0 : ((value - slider.min) / span) * 100;
  }

  focusUiValue(key: Exclude<keyof FocusState, 'mode'>): number {
    const draft = this.draftFocus();
    if (key === 'angle') {
      return Math.round(draft.angle);
    }
    return Math.round(draft[key] * 100);
  }

  focusSliderFillPercent(slider: {
    readonly key: Exclude<keyof FocusState, 'mode'>;
    readonly min: number;
    readonly max: number;
  }): number {
    const value = this.focusUiValue(slider.key);
    const span = slider.max - slider.min;
    return span <= 0 ? 0 : ((value - slider.min) / span) * 100;
  }

  cropMaskUiValue(key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>): number {
    const draft = this.draftCropMask();
    if (key === 'angle') {
      return Math.round(draft.angle);
    }
    if (key === 'inset') {
      return Math.round(draft.inset * 100);
    }
    return Math.round(draft[key] * 100);
  }

  cropMaskSliderFillPercent(slider: {
    readonly key: Exclude<keyof CropMaskState, 'shape' | 'customPath'>;
    readonly min: number;
    readonly max: number;
  }): number {
    const value = this.cropMaskUiValue(slider.key);
    const span = slider.max - slider.min;
    return span <= 0 ? 0 : ((value - slider.min) / span) * 100;
  }

  frameUiValue(key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>): number {
    const draft = this.draftFrame();
    if (key === 'thickness') {
      return Math.round(draft.thickness * 100);
    }
    return Math.round(draft[key] * 100);
  }

  frameSliderFillPercent(slider: {
    readonly key: Exclude<keyof FrameState, 'style' | 'color' | 'color2' | 'imageSrc'>;
    readonly min: number;
    readonly max: number;
  }): number {
    const value = this.frameUiValue(slider.key);
    const span = slider.max - slider.min;
    return span <= 0 ? 0 : ((value - slider.min) / span) * 100;
  }

  colorOverlayUiValue(key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>): number {
    const draft = this.draftColorOverlay();
    if (key === 'angle') {
      return Math.round(draft.angle);
    }
    return Math.round(draft.opacity * 100);
  }

  colorOverlaySliderFillPercent(slider: {
    readonly key: Exclude<keyof ColorOverlayState, 'mode' | 'color' | 'color2'>;
    readonly min: number;
    readonly max: number;
  }): number {
    const value = this.colorOverlayUiValue(slider.key);
    const span = slider.max - slider.min;
    return span <= 0 ? 0 : ((value - slider.min) / span) * 100;
  }
}
