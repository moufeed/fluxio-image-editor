import { computed, Injectable, signal } from '@angular/core';

import {
  createInitialAdjustments,
  createInitialEffects,
  createInitialFilters,
  createInitialFocus,
  createInitialCropMask,
  createInitialColorOverlay,
  createInitialFill,
  createInitialFrame,
  createInitialRedactions,
  createInitialWatermark,
  loadRecentColors,
  pushRecentColor,
  saveRecentColors,
  loadRecentEmojis,
  saveRecentEmojis,
  pushRecentEmoji,
  loadFavoriteEmojis,
  saveFavoriteEmojis,
  toggleFavoriteEmoji,
  loadEmojiSkinTone,
  saveEmojiSkinTone,
  normalizeSkinToneIndex,
  resolveMarkupSnapConfig,
  type AdjustmentsState,
  type EffectsState,
  type FilterPresetId,
  type FiltersState,
  type FocusState,
  type CropMaskState,
  type ColorOverlayState,
  type FillState,
  type FrameState,
  type RedactionRegion,
  type ImageAnnotation,
  type MarkupSnapConfig,
  type PathAnnotation,
  type RasterExportFormat,
  type ShapeAnnotation,
  type TextAnnotation,
  type WatermarkState,
  type EmojiSkinToneIndex,
} from 'fluxio-image-editor/core';

/** Screen-space placement + font style for the in-place text editing textarea. */
export interface EditingTextOverlay {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly angle: number;
  /** Rotation pivot in px from the overlay's top-left (annotation-bounds center). */
  readonly originXPx: number;
  readonly originYPx: number;
  readonly fontPx: number;
  readonly lineHeight: number;
  readonly paddingPx: number;
  readonly fontFamily: string;
  readonly fontStyle: string;
  readonly fontWeight: string;
  /** CSS `text-decoration` value for underline / line-through. */
  readonly textDecoration: string;
  readonly textAlign: string;
  readonly color: string;
}

export type EditorControlTool =
  | 'crop'
  | 'rotate'
  | 'resize'
  | 'adjustments'
  | 'effects'
  | 'filters'
  | 'focus'
  | 'redact'
  | 'crop-mask'
  | 'color-overlay'
  | 'fill'
  | 'frame'
  | 'text'
  | 'shapes'
  | 'drawing'
  | 'path'
  | 'image-overlay'
  | 'stickers'
  | 'emoji'
  | 'templates'
  | 'watermark'
  | 'rulers';

/** Active tab inside the shared side panel (plugin panel ids, e.g. layers/history). */
export type SidePanelTab = string;

/**
 * Per-editor transient presentation state.
 *
 * The store is provided by FluxioImageEditor, so multiple editors never share drafts,
 * selections, menus, or active modes.
 */
@Injectable()
export class EditorUiStore {
  readonly exportOpen = signal(false);
  readonly batchExportOpen = signal(false);
  readonly batchExportBusy = signal(false);
  readonly batchExportSelectedIds = signal<readonly string[]>([]);
  /** Current batch step while exporting; null when idle. */
  readonly batchExportProgress = signal<{
    readonly index: number;
    readonly total: number;
    readonly presetId: string;
    readonly label: string;
  } | null>(null);
  readonly exportFormat = signal<RasterExportFormat>('png');
  readonly exportQuality = signal(0.92);
  readonly exportFileName = signal('fluxio-export');
  readonly annotationActionsMenu = signal<{ readonly x: number; readonly y: number } | null>(null);
  readonly sidePanelOpen = signal(false);
  readonly sidePanelTab = signal<SidePanelTab>('layers');
  /** Collapsed flat folder ids in the Layers panel (UI-only). */
  readonly collapsedLayerGroupIds = signal<readonly string[]>([]);
  /**
   * Synthetic Layers selection when no annotation is selected
   * (`base` | `adjustments` | `filters` | null).
   */
  readonly layersSyntheticSelection = signal<'base' | 'adjustments' | 'filters' | null>(null);
  /** Expanded utilibar group id (e.g. `'annotations'`), or null when collapsed. */
  readonly expandedUtilibarGroupId = signal<string | null>(null);

  readonly cropMode = signal(false);
  readonly rotateMode = signal(false);
  readonly resizeMode = signal(false);
  readonly adjustmentsMode = signal(false);
  readonly effectsMode = signal(false);
  readonly filtersMode = signal(false);
  readonly focusMode = signal(false);
  readonly redactMode = signal(false);
  readonly cropMaskMode = signal(false);
  readonly colorOverlayMode = signal(false);
  readonly fillMode = signal(false);
  readonly frameMode = signal(false);
  readonly textMode = signal(false);
  readonly emojiMode = signal(false);
  readonly shapesMode = signal(false);
  readonly drawingMode = signal(false);
  readonly pathMode = signal(false);
  readonly imageOverlayMode = signal(false);
  readonly stickersMode = signal(false);
  readonly templatesMode = signal(false);
  readonly watermarkMode = signal(false);
  readonly rulersMode = signal(false);
  /** PV49: live markup snap / grid / guides (plugin-owned; not document state). */
  readonly markupSnap = signal<MarkupSnapConfig>(resolveMarkupSnapConfig(null));
  /** Transient eyedropper — does not replace the active control tool. */
  readonly colorPickerMode = signal(false);
  /** Recent opaque `#rrggbb` colors shared by color fields (hydrated from localStorage). */
  readonly recentColors = signal<readonly string[]>(loadRecentColors());

  readonly compareLatched = signal(false);
  readonly comparingOriginal = signal(false);
  readonly cropAspectId = signal('free');
  /** Preview-only crop guides (synced from config on crop enter; toggleable in UI). */
  readonly cropGuideCircle = signal(false);
  readonly cropGuideBleed = signal(false);
  /** PV38: focused redaction region for keyboard nudge / delete. */
  readonly selectedRedactionId = signal<string | null>(null);
  readonly selectedTemplateId = signal<string | null>(null);
  readonly draftAdjustments = signal<AdjustmentsState>(createInitialAdjustments());
  readonly draftEffects = signal<EffectsState>(createInitialEffects());
  readonly draftFilters = signal<FiltersState>(createInitialFilters());
  readonly draftFocus = signal<FocusState>(createInitialFocus());
  readonly draftRedactions = signal<readonly RedactionRegion[]>(createInitialRedactions());
  readonly draftCropMask = signal<CropMaskState>(createInitialCropMask());
  /**
   * Outside visibility (0–100) while Mask tool is open — preview only, not committed.
   * Apply still hard-clips transparent outside.
   */
  readonly cropMaskPreviewOpacity = signal(35);
  readonly draftColorOverlay = signal<ColorOverlayState>(createInitialColorOverlay());
  readonly draftFill = signal<FillState>(createInitialFill());
  readonly draftFrame = signal<FrameState>(createInitialFrame());
  /** Pintura-style filter preset preview data-URLs (keyed by preset id). */
  readonly filterThumbUrls = signal<Readonly<Partial<Record<FilterPresetId, string>>>>({});
  readonly draftWatermark = signal<WatermarkState>(createInitialWatermark());
  readonly draftTexts = signal<readonly TextAnnotation[]>([]);
  readonly draftShapes = signal<readonly ShapeAnnotation[]>([]);
  readonly draftPaths = signal<readonly PathAnnotation[]>([]);
  readonly draftImages = signal<readonly ImageAnnotation[]>([]);

  /** Id of the text annotation being edited in-place on the canvas, or null. */
  readonly editingTextId = signal<string | null>(null);
  /** Live screen geometry/style for the in-place text editing overlay. */
  readonly editingTextOverlay = signal<EditingTextOverlay | null>(null);

  readonly selectedTextIds = signal<readonly string[]>([]);
  readonly selectedShapeIds = signal<readonly string[]>([]);
  readonly selectedPathId = signal<string | null>(null);
  /** Selected vertex index on the editable path (finished-path edit); null when none. */
  readonly selectedPathVertexIndex = signal<number | null>(null);
  readonly selectedImageIds = signal<readonly string[]>([]);
  readonly selectedTextId = computed(() => this.last(this.selectedTextIds()));
  readonly selectedShapeId = computed(() => this.last(this.selectedShapeIds()));
  readonly selectedImageId = computed(() => this.last(this.selectedImageIds()));

  readonly penStroke = signal('#ff3b30');
  readonly penStrokeWidth = signal(4);
  readonly shapeDraftKind = signal<ShapeAnnotation['kind']>('rect');
  /** Draft regular-polygon side count used for the next create (3–12). */
  readonly shapeDraftPolygonSides = signal(3);
  readonly arbitraryAngle = signal(0);
  readonly resizeWidth = signal(0);
  readonly resizeHeight = signal(0);
  readonly resizeLock = signal(true);
  /** Active resize size-preset id, or null when dimensions are custom (PV08). */
  readonly resizePresetId = signal<string | null>(null);
  readonly zoomMenuOpen = signal(false);
  readonly exportMenuOpen = signal(false);
  /** Open plugin “New blank” size menu. */
  readonly blankMenuOpen = signal(false);

  readonly activeControlTool = computed<EditorControlTool | null>(() => {
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
    if (this.rotateMode()) {
      return 'rotate';
    }
    if (this.resizeMode()) {
      return 'resize';
    }
    return null;
  });

  /** Text or emoji object-tool is active (shared draft texts / selection). */
  readonly textToolActive = computed(() => this.textMode() || this.emojiMode());

  readonly annotationInteractionActive = computed(
    () =>
      !(
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
        this.watermarkMode() ||
        this.rulersMode()
      ),
  );

  deactivateModes(): void {
    this.cropMode.set(false);
    this.rotateMode.set(false);
    this.resizeMode.set(false);
    this.adjustmentsMode.set(false);
    this.effectsMode.set(false);
    this.filtersMode.set(false);
    this.focusMode.set(false);
    this.redactMode.set(false);
    this.selectedRedactionId.set(null);
    this.cropMaskMode.set(false);
    this.colorOverlayMode.set(false);
    this.fillMode.set(false);
    this.frameMode.set(false);
    this.textMode.set(false);
    this.emojiMode.set(false);
    this.shapesMode.set(false);
    this.drawingMode.set(false);
    this.pathMode.set(false);
    this.imageOverlayMode.set(false);
    this.stickersMode.set(false);
    this.templatesMode.set(false);
    this.selectedTemplateId.set(null);
    this.watermarkMode.set(false);
    this.rulersMode.set(false);
    this.colorPickerMode.set(false);
  }

  /** Record a committed color into recent history (deduped, persisted). */
  rememberColor(cssColor: string): void {
    const prev = this.recentColors();
    const next = pushRecentColor(prev, cssColor);
    if (next.length === prev.length && next.every((color, index) => color === prev[index])) {
      return;
    }
    this.recentColors.set(next);
    saveRecentColors(next);
  }

  readonly recentEmojis = signal<readonly string[]>(loadRecentEmojis());
  readonly favoriteEmojis = signal<readonly string[]>(loadFavoriteEmojis());
  readonly emojiSkinTone = signal<EmojiSkinToneIndex>(loadEmojiSkinTone());

  /** Record a placed emoji glyph into recent history (deduped, persisted). */
  rememberEmoji(glyph: string): void {
    const prev = this.recentEmojis();
    const next = pushRecentEmoji(prev, glyph);
    if (next.length === prev.length && next.every((item, index) => item === prev[index])) {
      return;
    }
    this.recentEmojis.set(next);
    saveRecentEmojis(next);
  }

  /** Toggle a glyph in favorites (persisted). */
  toggleFavoriteEmojiGlyph(glyph: string): void {
    const next = toggleFavoriteEmoji(this.favoriteEmojis(), glyph);
    this.favoriteEmojis.set(next);
    saveFavoriteEmojis(next);
  }

  /** Persist preferred Fitzpatrick skin-tone index (0–5). */
  setEmojiSkinTone(index: number): void {
    const next = normalizeSkinToneIndex(index);
    if (next === this.emojiSkinTone()) {
      return;
    }
    this.emojiSkinTone.set(next);
    saveEmojiSkinTone(next);
  }

  private last(ids: readonly string[]): string | null {
    return ids.length > 0 ? ids[ids.length - 1]! : null;
  }
}
