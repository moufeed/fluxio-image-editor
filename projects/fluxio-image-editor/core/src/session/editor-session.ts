import { computeCenteredPan, computeContainFit, isViewportCentered } from '../geometry/fit';
import { applyPinchViewport, type PinchPoint } from '../geometry/pinch';
import { clampZoom, zoomAtPoint } from '../geometry/zoom';
import { CommandExecutor } from '../commands/command-executor';
import type { ExecuteCommandOptions, HistoryEntry } from '../commands/command';
import { createAnnotationsSetCommand } from '../commands/annotations-set';
import { LocaleCatalog } from '../i18n/locale-catalog';
import {
  createImageDocument,
  getOrientedContentSize,
  type CropMaskState,
  type DesignImageState,
  type FilterPresetId,
  type FocusState,
  type FrameState,
  type ReadonlyImageDocument,
  type RedactionRegion,
  type WatermarkState,
} from '../models/image-document';
import {
  mergeDesignOntoDocument,
  parseDesignState,
  serializeDesignState,
  type DesignStateEnvelope,
  type LoadDesignStateOptions,
} from '../models/design-state';
import type { ImageEditorConfig, ViewportPluginConfig } from '../models/config';
import type { EditorLocaleCode, HostLocalePacks, MessageDictionary } from '../models/config';
import { resolveHostLocaleMessages } from '../models/config';
import type { RgbaColor } from '../models/color';
import type { MarkupSnapChrome, MarkupSnapConfig } from '../geometry/markup-snap';
import { createEditorProgressEvent, type EditorProgressListener } from '../models/progress';
import type { FilterColorMatrixSource, FiltersPluginConfig } from '../models/filter-registry';
import { resolveFilterPresetIds } from '../models/filter-registry';
import {
  DEFAULT_EXPORT_TIMEOUT_MS,
  MAX_EXPORT_DIMENSION,
  fileExtensionForExportFormat,
  mimeTypeForExportFormat,
  normalizeExportFormat,
  resolveExportDimensions,
  withTimeout,
  type ImageEditorExportResult,
  type PublicExportOptions,
} from '../models/export-result';
import { ImageEditorError, toImageEditorError } from '../models/errors';
import type { ImageEditorSource } from '../models/source';
import { createEmptyViewport } from '../models/viewport-state';
import type { ImageEditorPlugin } from '../plugins/plugin';
import { PluginRegistry } from '../plugins/plugin-registry';
import type {
  AnnotationCreateEvent,
  AnnotationTransformEvent,
  DesignImageTransformEvent,
  FilterThumbnailOptions,
  RasterExportOptions,
  ReadonlyEditorPreview,
  RenderingEnginePort,
  WatermarkTransformEvent,
} from '../ports/rendering-engine.port';
import type {
  AnnotationCreateKind,
  TransformableAnnotation,
} from '../geometry/annotation-transform';
import { EditorStore } from '../state/editor-store';
import { normalizeSource, revokeAsset } from './asset-loader';

/**
 * Shell-owned bridge for UX-I0 / UX-I5 annotation interaction
 * (image-overlay / text / shapes / drawing paths).
 */
export interface AnnotationInteractionBridge {
  /** Live interactive annotations for the active tool. */
  readonly getAnnotations: () => readonly TransformableAnnotation[];
  /** Phase 4.8.1: full selection set (order: older → primary last). */
  readonly getSelectedIds?: () => readonly string[];
  /** Primary selection id (last selected). */
  readonly getSelectedId: () => string | null;
  readonly onSelect: (id: string | null, options?: { readonly additive?: boolean }) => void;
  readonly onTransform: (event: AnnotationTransformEvent) => void;
  /** When set, empty-canvas gestures create annotations of this kind. */
  readonly getCreateKind?: () => AnnotationCreateKind | null;
  /** Side count for polygon create gestures (3–12). */
  readonly getPolygonSides?: () => number;
  readonly onCreate?: (event: AnnotationCreateEvent) => void;
  /** Double-click on a text annotation requests in-place editing. */
  readonly onEditRequest?: (id: string) => void;
}

/**
 * Shell-owned bridge for UX-I3 watermark canvas interaction.
 */
export interface WatermarkInteractionBridge {
  readonly getWatermark: () => WatermarkState | null;
  readonly onTransform: (event: WatermarkTransformEvent) => void;
}

/**
 * Shell-owned bridge for unlocked base-photo placement on the document plate.
 */
export interface DesignImageInteractionBridge {
  /** When false, design-image gestures are disabled. */
  readonly isActive: () => boolean;
  readonly getDesignImage: () => DesignImageState | null;
  readonly onTransform: (event: DesignImageTransformEvent) => void;
}

export interface EditorSessionOptions {
  readonly historyLimit?: number;
  readonly plugins?: readonly ImageEditorPlugin[];
  readonly locale?: EditorLocaleCode;
  readonly viewport?: Partial<ViewportPluginConfig>;
  /** Host filter registry (PV19); pushed to the renderer on attach / applyConfig. */
  readonly filters?: Partial<FiltersPluginConfig>;
  /** Host message overrides for the active locale (PV39). */
  readonly messages?: MessageDictionary;
  /** Host locale packs keyed by locale code (PV39). */
  readonly locales?: HostLocalePacks;
  readonly onChanged?: () => void;
  /** PV41: load progress (0→1 staged). */
  readonly onLoadProgress?: EditorProgressListener;
  /** PV41: export progress (0→1 staged). */
  readonly onExportProgress?: EditorProgressListener;
}

export interface ImageEditorHandle {
  load(source: ImageEditorSource): Promise<void>;
  execute(commandId: string, payload?: unknown, options?: ExecuteCommandOptions): Promise<void>;
  /** End the active coalesced run so the next command starts a new undo step. */
  sealHistoryCoalescing(): void;
  undo(): void;
  redo(): void;
  /**
   * Jump to a history index (0 = original / empty past).
   * Applies undo/redo in a batch and renders once at the end.
   */
  jumpToHistoryIndex(targetIndex: number): void;
  reset(): void;
  fitViewport(): void;
  /** Keep zoom; recenter pan so content sits in the middle of the canvas. */
  centerViewport(): void;
  setZoom(zoom: number, pointX?: number, pointY?: number): void;
  panBy(dx: number, dy: number): void;
  setPreview(preview: ReadonlyEditorPreview | null): void;
  setActiveTool(toolId: string | null): void;
  /**
   * Phase 4.8.5: show the loaded baseline while `active` (view-only).
   * Does not mutate document, history, or dirty state.
   */
  setCompareOriginal(active: boolean): void;
  isComparingOriginal(): boolean;
  export(options?: PublicExportOptions): Promise<ImageEditorExportResult>;
  exportDesignState(): DesignStateEnvelope;
  loadDesignState(input: unknown, options?: LoadDesignStateOptions): Promise<void>;
  getSnapshot(): ReturnType<EditorStore['snapshot']> & { readonly comparingOriginal: boolean };
  isDirty(): boolean;
  destroy(): void;
}

export class EditorSession implements ImageEditorHandle {
  readonly store = new EditorStore();
  readonly locales: LocaleCatalog;
  private readonly commands: CommandExecutor;
  private readonly plugins = new PluginRegistry();
  private readonly viewportConfig: Required<
    Pick<ViewportPluginConfig, 'wheelZoom' | 'pinchZoom' | 'minZoom' | 'maxZoom'>
  >;
  private readonly onChanged?: () => void;
  private onLoadProgress?: EditorProgressListener;
  private onExportProgress?: EditorProgressListener;
  private hostFilterFunctions: Readonly<Record<string, FilterColorMatrixSource>> | null = null;
  private hostFilterPresets: readonly FilterPresetId[] | null = null;
  /** PV49: live grid / guides chrome (preview-only). */
  private markupSnapChrome: MarkupSnapChrome | null = null;
  /** PV49: snap settings for annotation gestures. */
  private markupSnapConfig: MarkupSnapConfig | null = null;
  private renderer: RenderingEnginePort | null = null;
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;
  private wheelHandler: ((event: WheelEvent) => void) | null = null;
  private pinchPointerDownHandler: ((event: PointerEvent) => void) | null = null;
  private pinchPointerMoveHandler: ((event: PointerEvent) => void) | null = null;
  private pinchPointerUpHandler: ((event: PointerEvent) => void) | null = null;
  /** Active non-mouse pointers for pinch (viewport-local coords). */
  private readonly pinchPointers = new Map<number, PinchPoint>();
  private pinchPrevPair: { readonly a: PinchPoint; readonly b: PinchPoint } | null = null;
  private pinchActive = false;
  private drawPointHandler:
    | ((event: {
        readonly phase: 'start' | 'move' | 'end';
        readonly x: number;
        readonly y: number;
      }) => void)
    | null = null;
  private drawingStrokeWidthProvider: (() => number) | null = null;
  private pathVertexHandler:
    | ((event: {
        readonly type: 'click' | 'dblclick';
        readonly x: number;
        readonly y: number;
      }) => void)
    | null = null;
  private pathVertexMoveHandler:
    | ((event: {
        readonly phase: 'start' | 'move' | 'end';
        readonly index: number;
        readonly x: number;
        readonly y: number;
      }) => void)
    | null = null;
  private pathVertexInsertHandler:
    | ((event: { readonly afterIndex: number; readonly x: number; readonly y: number }) => void)
    | null = null;
  private pathVertexSelectHandler: ((index: number | null) => void) | null = null;
  private pathVertexDeleteHandler: (() => void) | null = null;
  private pathSelectedVertexIndexProvider: (() => number | null) | null = null;
  private pathActivePointsProvider:
    (() => readonly { readonly x: number; readonly y: number }[] | null) | null = null;
  private pathActiveStrokeProvider: (() => string) | null = null;
  private pathActiveClosedProvider: (() => boolean) | null = null;
  private pathDrawingActiveProvider: (() => boolean) | null = null;
  private colorPickerActiveProvider: (() => boolean) | null = null;
  private colorSampleHandler: ((event: { readonly x: number; readonly y: number }) => void) | null =
    null;
  private annotationBridge: AnnotationInteractionBridge | null = null;
  private watermarkBridge: WatermarkInteractionBridge | null = null;
  private designImageBridge: DesignImageInteractionBridge | null = null;
  /** Shell syncs draftFocus + preview while Focus tool is active. */
  private focusChangeHandler: ((focus: FocusState) => void) | null = null;
  /** Shell syncs draftCropMask + preview while Crop-mask tool is active. */
  private cropMaskChangeHandler: ((cropMask: CropMaskState) => void) | null = null;
  private frameChangeHandler: ((frame: FrameState) => void) | null = null;
  /** Shell appends draft redaction regions while Redact tool is active. */
  private redactionAddHandler: ((region: RedactionRegion) => void) | null = null;
  private redactionChangeHandler: ((region: RedactionRegion) => void) | null = null;
  /** Phase 4.8.5: view-only original overlay (not document state). */
  private comparingOriginal = false;
  /** Last host locale merge input (PV39); re-resolved when locale changes. */
  private hostLocaleMerge: {
    messages?: MessageDictionary | null;
    locales?: HostLocalePacks | null;
  } = {};

  constructor(options: EditorSessionOptions = {}) {
    this.commands = new CommandExecutor(options.historyLimit ?? 50);
    this.commands.register(createAnnotationsSetCommand());
    this.locales = new LocaleCatalog(options.locale ?? 'en');
    this.onChanged = options.onChanged;
    this.onLoadProgress = options.onLoadProgress;
    this.onExportProgress = options.onExportProgress;
    this.viewportConfig = {
      wheelZoom: options.viewport?.wheelZoom ?? true,
      pinchZoom: options.viewport?.pinchZoom ?? true,
      minZoom: options.viewport?.minZoom ?? 0.05,
      maxZoom: options.viewport?.maxZoom ?? 8,
    };
    this.applyFiltersConfig(options.filters);
    for (const plugin of options.plugins ?? []) {
      this.plugins.register(plugin, (command) => this.commands.register(command), this.locales);
    }
    this.hostLocaleMerge = {
      messages: options.messages,
      locales: options.locales,
    };
    this.pushHostLocaleMessages();
  }

  async attach(host: HTMLElement, renderer: RenderingEnginePort): Promise<void> {
    this.assertAlive();
    this.host = host;
    this.renderer = renderer;
    const rect = host.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 1);
    const height = Math.max(Math.floor(rect.height), 1);
    this.store.setViewport(createEmptyViewport(width, height));
    await renderer.mount(host, { width, height, backgroundColor: 'transparent' });
    this.pushHostFilterFunctions();
    this.pushMarkupSnapState();
    this.resizeObserver = new ResizeObserver(() => this.onHostResize());
    this.resizeObserver.observe(host);
    this.bindWheel(host);
    this.bindPinch(host);
    renderer.setInteractionHandlers?.({
      onPan: ({ dx, dy }) => this.panBy(dx, dy),
      onWheelZoom: ({ deltaY, pointX, pointY }) => {
        const factor = deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.store.viewport().zoom * factor, pointX, pointY);
      },
      onCropChange: (crop) => {
        const tool = this.store.activeTool();
        if (tool !== 'crop' && tool !== 'templates') {
          return;
        }
        const prev = this.store.preview();
        this.setPreview({
          crop,
          cropGuides: prev?.cropGuides ?? null,
        });
      },
      onFocusChange: (focus) => {
        if (this.store.activeTool() !== 'focus') {
          return;
        }
        this.focusChangeHandler?.(focus);
      },
      onCropMaskChange: (cropMask) => {
        if (this.store.activeTool() !== 'crop-mask') {
          return;
        }
        this.cropMaskChangeHandler?.(cropMask);
      },
      onFrameChange: (frame) => {
        if (this.store.activeTool() !== 'frame') {
          return;
        }
        this.frameChangeHandler?.(frame);
      },
      isDrawingActive: () => this.store.activeTool() === 'drawing',
      isRedactActive: () => this.store.activeTool() === 'redact',
      onRedactionAdd: (region) => {
        this.redactionAddHandler?.(region);
      },
      onRedactionChange: (region) => {
        this.redactionChangeHandler?.(region);
      },
      getDrawingStrokeWidth: () => this.drawingStrokeWidthProvider?.() ?? 4,
      onDrawPoint: (event) => {
        this.drawPointHandler?.(event);
      },
      isPathToolActive: () => this.store.activeTool() === 'path',
      onPathVertex: (event) => {
        this.pathVertexHandler?.(event);
      },
      onPathVertexMove: (event) => {
        this.pathVertexMoveHandler?.(event);
      },
      onPathVertexInsert: (event) => {
        this.pathVertexInsertHandler?.(event);
      },
      getSelectedPathVertexIndex: () => this.pathSelectedVertexIndexProvider?.() ?? null,
      onPathVertexSelect: (index) => {
        this.pathVertexSelectHandler?.(index);
      },
      onPathVertexDelete: () => {
        this.pathVertexDeleteHandler?.();
      },
      getActivePathPoints: () => this.pathActivePointsProvider?.() ?? null,
      getActivePathStroke: () => this.pathActiveStrokeProvider?.() ?? '#000000',
      getActivePathClosed: () => this.pathActiveClosedProvider?.() ?? false,
      isPathDrawingActive: () => this.pathDrawingActiveProvider?.() ?? false,
      isAnnotationInteractionActive: () =>
        !!this.annotationBridge && !this.isAnnotationSelectBlocked(),
      getInteractiveAnnotations: () => this.annotationBridge?.getAnnotations?.() ?? [],
      getSelectedAnnotationIds: () => {
        const ids = this.annotationBridge?.getSelectedIds?.();
        if (ids) {
          return ids;
        }
        const primary = this.annotationBridge?.getSelectedId() ?? null;
        return primary ? [primary] : [];
      },
      getSelectedAnnotationId: () => this.annotationBridge?.getSelectedId() ?? null,
      onAnnotationSelect: (id, options) => {
        this.annotationBridge?.onSelect(id, options);
      },
      onAnnotationTransform: (event) => {
        this.annotationBridge?.onTransform(event);
      },
      getAnnotationCreateKind: () => this.annotationBridge?.getCreateKind?.() ?? null,
      getPolygonSides: () => this.annotationBridge?.getPolygonSides?.() ?? 3,
      onAnnotationCreate: (event) => {
        this.annotationBridge?.onCreate?.(event);
      },
      onAnnotationEditRequest: (id) => {
        this.annotationBridge?.onEditRequest?.(id);
      },
      isWatermarkInteractionActive: () =>
        this.store.activeTool() === 'watermark' && !!this.watermarkBridge,
      getInteractiveWatermark: () => this.watermarkBridge?.getWatermark() ?? null,
      onWatermarkTransform: (event) => {
        this.watermarkBridge?.onTransform(event);
      },
      isDesignImageInteractionActive: () =>
        !!this.designImageBridge &&
        this.designImageBridge.isActive() &&
        !this.isDesignImageInteractionBlocked(),
      getInteractiveDesignImage: () => {
        const preview = this.store.preview()?.designImage;
        const document = this.store.document();
        if (preview && document) {
          return preview;
        }
        return this.designImageBridge?.getDesignImage() ?? null;
      },
      onDesignImageTransform: (event) => {
        this.designImageBridge?.onTransform(event);
      },
      isColorPickerActive: () => this.colorPickerActiveProvider?.() ?? false,
      onColorSample: (event) => {
        this.colorSampleHandler?.(event);
      },
    });
  }

  /**
   * Shell-owned freehand listener. Active only while `activeTool === 'drawing'`.
   */
  setDrawPointHandler(
    handler:
      | ((event: {
          readonly phase: 'start' | 'move' | 'end';
          readonly x: number;
          readonly y: number;
        }) => void)
      | null,
  ): void {
    this.assertAlive();
    this.drawPointHandler = handler;
  }

  /**
   * Shell-owned brush width for the freehand cursor. Active while drawing tool is open.
   */
  setDrawingStrokeWidthProvider(provider: (() => number) | null): void {
    this.assertAlive();
    this.drawingStrokeWidthProvider = provider;
  }

  /**
   * Shell-owned Path tool vertex listener. Active only while `activeTool === 'path'`.
   */
  setPathVertexHandler(
    handler:
      | ((event: {
          readonly type: 'click' | 'dblclick';
          readonly x: number;
          readonly y: number;
        }) => void)
      | null,
  ): void {
    this.assertAlive();
    this.pathVertexHandler = handler;
  }

  /**
   * Shell-owned Path tool vertex-drag listener. Active while `activeTool === 'path'`.
   */
  setPathVertexMoveHandler(
    handler:
      | ((event: {
          readonly phase: 'start' | 'move' | 'end';
          readonly index: number;
          readonly x: number;
          readonly y: number;
        }) => void)
      | null,
  ): void {
    this.assertAlive();
    this.pathVertexMoveHandler = handler;
  }

  /**
   * Shell-owned Path tool vertex-insert listener (finished-path segment click).
   */
  setPathVertexInsertHandler(
    handler:
      | ((event: { readonly afterIndex: number; readonly x: number; readonly y: number }) => void)
      | null,
  ): void {
    this.assertAlive();
    this.pathVertexInsertHandler = handler;
  }

  setPathVertexSelectHandler(handler: ((index: number | null) => void) | null): void {
    this.assertAlive();
    this.pathVertexSelectHandler = handler;
  }

  setPathVertexDeleteHandler(handler: (() => void) | null): void {
    this.assertAlive();
    this.pathVertexDeleteHandler = handler;
  }

  setPathSelectedVertexIndexProvider(provider: (() => number | null) | null): void {
    this.assertAlive();
    this.pathSelectedVertexIndexProvider = provider;
  }

  /**
   * Shell-owned provider for in-progress Path vertices (anchor handles / rubber-band).
   */
  setPathActivePointsProvider(
    provider: (() => readonly { readonly x: number; readonly y: number }[] | null) | null,
  ): void {
    this.assertAlive();
    this.pathActivePointsProvider = provider;
  }

  /**
   * Shell-owned provider for in-progress Path stroke color.
   */
  setPathActiveStrokeProvider(provider: (() => string) | null): void {
    this.assertAlive();
    this.pathActiveStrokeProvider = provider;
  }

  /**
   * Shell-owned provider: whether the editable Path is closed.
   */
  setPathActiveClosedProvider(provider: (() => boolean) | null): void {
    this.assertAlive();
    this.pathActiveClosedProvider = provider;
  }

  /**
   * Shell-owned provider: true while Path tool is placing new vertices.
   */
  setPathDrawingActiveProvider(provider: (() => boolean) | null): void {
    this.assertAlive();
    this.pathDrawingActiveProvider = provider;
  }

  /** Shell-owned eyedropper active flag (transient; does not change activeTool). */
  setColorPickerActiveProvider(provider: (() => boolean) | null): void {
    this.assertAlive();
    this.colorPickerActiveProvider = provider;
  }

  /** Shell-owned eyedropper click listener in scene/output space. */
  setColorSampleHandler(
    handler: ((event: { readonly x: number; readonly y: number }) => void) | null,
  ): void {
    this.assertAlive();
    this.colorSampleHandler = handler;
  }

  /**
   * Sample a composed document pixel at scene/output coordinates.
   * Returns null when unsupported or unloaded; may throw TAINTED_CANVAS.
   */
  async samplePixelAtScenePoint(x: number, y: number): Promise<RgbaColor | null> {
    this.assertAlive();
    if (!this.renderer?.samplePixelAtScenePoint) {
      return null;
    }
    return this.renderer.samplePixelAtScenePoint(x, y);
  }

  /**
   * Shell-owned annotation interaction bridge.
   * Remains registered in Select mode so committed objects stay selectable after Done.
   * Pointer ownership is gated by {@link isAnnotationSelectBlocked}.
   */
  setAnnotationInteractionBridge(bridge: AnnotationInteractionBridge | null): void {
    this.assertAlive();
    this.annotationBridge = bridge;
  }

  /**
   * Shell-owned watermark interaction bridge (UX-I3). Active while
   * `activeTool === 'watermark'` and a bridge is registered.
   */
  setWatermarkInteractionBridge(bridge: WatermarkInteractionBridge | null): void {
    this.assertAlive();
    this.watermarkBridge = bridge;
  }

  /**
   * Shell-owned design-image unlock bridge. Active when the base photo is unlocked
   * and no exclusive tool owns the pointer.
   */
  setDesignImageInteractionBridge(bridge: DesignImageInteractionBridge | null): void {
    this.assertAlive();
    this.designImageBridge = bridge;
  }

  /**
   * Shell-owned focus canvas-handle listener. Active while `activeTool === 'focus'`.
   * Updates draft + preview; Apply still commits.
   */
  setFocusChangeHandler(handler: ((focus: FocusState) => void) | null): void {
    this.assertAlive();
    this.focusChangeHandler = handler;
  }

  /**
   * Shell-owned crop-mask canvas-handle listener. Active while `activeTool === 'crop-mask'`.
   * Updates draft + preview; Apply still commits.
   */
  setCropMaskChangeHandler(handler: ((cropMask: CropMaskState) => void) | null): void {
    this.assertAlive();
    this.cropMaskChangeHandler = handler;
  }

  /**
   * Shell-owned frame canvas-handle listener. Active while `activeTool === 'frame'`.
   * Updates draft + preview; Apply still commits.
   */
  setFrameChangeHandler(handler: ((frame: FrameState) => void) | null): void {
    this.assertAlive();
    this.frameChangeHandler = handler;
  }

  /**
   * Shell-owned redact drag listener. Active while `activeTool === 'redact'`.
   * Appends a region to the draft; Apply still commits.
   */
  setRedactionAddHandler(handler: ((region: RedactionRegion) => void) | null): void {
    this.assertAlive();
    this.redactionAddHandler = handler;
  }

  /** Shell-owned move/resize listener for existing draft regions. */
  setRedactionChangeHandler(handler: ((region: RedactionRegion) => void) | null): void {
    this.assertAlive();
    this.redactionChangeHandler = handler;
  }

  /** Cancel in-progress renderer gesture (Escape). */
  cancelActiveGesture(): void {
    this.assertAlive();
    this.renderer?.cancelActiveGesture?.();
  }

  /** Current viewport zoom (scene → screen scale), or 1 when unavailable. */
  getViewportZoom(): number {
    return this.renderer?.getViewportZoom?.() ?? 1;
  }

  /** Map a scene/output-space point to viewport client coordinates for DOM overlays. */
  mapScenePointToClient(point: {
    readonly x: number;
    readonly y: number;
  }): { readonly x: number; readonly y: number } | null {
    return this.renderer?.mapScenePointToClient?.(point) ?? null;
  }

  async load(source: ImageEditorSource): Promise<void> {
    this.assertAlive();
    if (!this.renderer) {
      throw new Error('Editor is not attached');
    }

    this.store.setStatus('loading');
    this.emitLoadProgress('start', 0);
    // Paint the full-viewport loading overlay before decode/render work.
    await yieldForUiPaint();
    this.assertAlive();
    const previous = this.store.asset();
    try {
      const asset = await normalizeSource(source);
      this.emitLoadProgress('normalize', 0.35);
      await this.renderer.loadSource(asset);
      this.emitLoadProgress('decode', 0.7);
      const document = createImageDocument({
        source: {
          kind: asset.sourceKind,
          id: asset.id,
          url: asset.objectUrl,
          name: asset.name,
          mimeType: asset.mimeType,
        },
        sourceSize: {
          width: asset.naturalWidth,
          height: asset.naturalHeight,
        },
      });

      revokeAsset(previous);
      this.commands.clearHistory();
      this.comparingOriginal = false;
      this.renderer.setCompareOriginal?.(null);
      this.store.setAsset(asset);
      this.store.setDocument(document);
      this.store.setBaseline(structuredClone(document));
      this.store.setHistory(this.commands.getHistorySnapshot());
      this.store.setPreview(null);
      this.store.markClean();
      this.applyFit(document, true);
      this.renderer.render(document);
      this.store.setStatus('ready');
      this.emitLoadProgress('complete', 1);
      this.emitChanged();
    } catch (error) {
      const typed = toImageEditorError(error, 'IMAGE_LOAD_FAILED', 'Failed to load image');
      this.store.setStatus('error', typed.message);
      throw typed;
    }
  }

  async execute(
    commandId: string,
    payload: unknown = undefined,
    options?: ExecuteCommandOptions,
  ): Promise<void> {
    this.assertAlive();
    const document = this.store.document();
    if (!document || !this.renderer) {
      throw new Error('No document loaded');
    }

    this.store.setStatus('busy');
    try {
      const generationBefore = this.store.documentGeneration();
      const result = this.commands.execute(commandId, payload, document, generationBefore, options);
      if (!result.entry) {
        // No-op: leave history/dirty/generation untouched.
        this.store.setPreview(null);
        this.store.setStatus('ready');
        return;
      }
      this.store.setDocument(result.document);
      this.store.setHistory(this.commands.getHistorySnapshot());
      this.store.setPreview(null);
      this.applyFit(result.document, this.store.viewport().fitMode === 'contain');
      this.renderer.render(result.document);
      this.store.setStatus('ready');
      this.emitChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed';
      this.store.setStatus('error', message);
      throw error;
    }
  }

  sealHistoryCoalescing(): void {
    if (this.destroyed) {
      return;
    }
    this.commands.sealCoalescing();
  }

  undo(): void {
    this.assertAlive();
    const entry = this.commands.undo();
    if (!entry || !this.renderer) {
      return;
    }
    const document = this.resolveHistoryDocument(entry, 'undo');
    if (!document) {
      return;
    }
    this.store.setDocument(document, { generation: entry.generationBefore });
    this.store.setHistory(this.commands.getHistorySnapshot());
    this.store.setPreview(null);
    this.applyFit(document, this.store.viewport().fitMode === 'contain');
    this.renderer.render(document);
    this.emitChanged();
  }

  redo(): void {
    this.assertAlive();
    const entry = this.commands.redo();
    if (!entry || !this.renderer) {
      return;
    }
    const document = this.resolveHistoryDocument(entry, 'redo');
    if (!document) {
      return;
    }
    this.store.setDocument(document, { generation: entry.generationAfter });
    this.store.setHistory(this.commands.getHistorySnapshot());
    this.store.setPreview(null);
    this.applyFit(document, this.store.viewport().fitMode === 'contain');
    this.renderer.render(document);
    this.emitChanged();
  }

  jumpToHistoryIndex(targetIndex: number): void {
    this.assertAlive();
    if (!this.renderer) {
      return;
    }

    const snapshot = this.commands.getHistorySnapshot();
    const currentIndex = snapshot.past.length;
    const maxIndex = currentIndex + snapshot.future.length;
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > maxIndex) {
      return;
    }

    const delta = currentIndex - targetIndex;
    if (delta === 0) {
      return;
    }

    const steps = Math.abs(delta);
    const direction = delta > 0 ? 'undo' : 'redo';
    for (let i = 0; i < steps; i++) {
      const entry = direction === 'undo' ? this.commands.undo() : this.commands.redo();
      if (!entry) {
        break;
      }
      const document = this.resolveHistoryDocument(entry, direction);
      if (!document) {
        break;
      }
      const generation = direction === 'undo' ? entry.generationBefore : entry.generationAfter;
      this.store.setDocument(document, { generation });
    }

    this.store.setHistory(this.commands.getHistorySnapshot());
    this.store.setPreview(null);
    const finalDoc = this.store.document();
    if (finalDoc) {
      this.applyFit(finalDoc, this.store.viewport().fitMode === 'contain');
      this.renderer.render(finalDoc);
    }
    this.emitChanged();
  }

  reset(): void {
    this.assertAlive();
    const baseline = this.store.baseline();
    if (!baseline || !this.renderer) {
      return;
    }
    const document = structuredClone(baseline);
    this.commands.clearHistory();
    this.comparingOriginal = false;
    this.renderer.setCompareOriginal?.(null);
    this.store.setDocument(document);
    this.store.setHistory(this.commands.getHistorySnapshot());
    this.store.setPreview(null);
    this.store.markClean();
    this.applyFit(document, true);
    this.renderer.render(document);
    this.store.setStatus('ready');
    this.emitChanged();
  }

  fitViewport(): void {
    this.assertAlive();
    const document = this.store.document();
    if (!document) {
      return;
    }
    this.applyFit(document, true);
  }

  centerViewport(): void {
    this.assertAlive();
    const document = this.store.document();
    if (!document) {
      return;
    }
    const viewport = this.store.viewport();
    const target = this.resolveViewportFitTarget(document);
    const pan = computeCenteredPan(target.size, viewport, target.rotationDegrees);
    const fit = computeContainFit(target.size, viewport, target.rotationDegrees, {
      maxZoom: target.maxZoom,
    });
    const zoomMatchesFit = Math.abs(viewport.zoom - fit.zoom) < 1e-4;
    this.store.setViewport({
      ...viewport,
      panX: pan.panX,
      panY: pan.panY,
      fitMode: zoomMatchesFit ? 'contain' : 'manual',
    });
    this.renderer?.updateViewport(this.store.viewport());
  }

  /** Whether a Pintura-style recenter control should be shown. */
  needsViewportRecenter(): boolean {
    if (this.destroyed) {
      return false;
    }
    const document = this.store.document();
    if (!document) {
      return false;
    }
    const viewport = this.store.viewport();
    if (viewport.fitMode !== 'manual') {
      return false;
    }
    const target = this.resolveViewportFitTarget(document);
    return !isViewportCentered(viewport, target.size, target.rotationDegrees);
  }

  setZoom(zoom: number, pointX?: number, pointY?: number): void {
    this.assertAlive();
    const viewport = this.store.viewport();
    const nextZoom = clampZoom(zoom, this.viewportConfig.minZoom, this.viewportConfig.maxZoom);
    const cx = pointX ?? viewport.width / 2;
    const cy = pointY ?? viewport.height / 2;
    const next = zoomAtPoint(viewport, nextZoom, cx, cy);
    this.store.setViewport({ ...viewport, ...next });
    this.renderer?.updateViewport(this.store.viewport());
  }

  panBy(dx: number, dy: number): void {
    this.assertAlive();
    const viewport = this.store.viewport();
    this.store.setViewport({
      ...viewport,
      panX: viewport.panX + dx,
      panY: viewport.panY + dy,
      fitMode: 'manual',
    });
    this.renderer?.updateViewport(this.store.viewport());
  }

  setPreview(preview: ReadonlyEditorPreview | null): void {
    this.assertAlive();
    this.store.setPreview(preview);
    if (this.comparingOriginal) {
      return;
    }
    this.renderer?.renderPreview(preview);
    const document = this.store.document();
    if (document && this.store.viewport().fitMode === 'contain') {
      this.applyFit(document, true);
    }
  }

  setActiveTool(toolId: string | null): void {
    this.assertAlive();
    this.store.setActiveTool(toolId);
    const document = this.store.document();
    if (document && this.store.viewport().fitMode === 'contain') {
      this.applyFit(document, true);
    }
  }

  setCompareOriginal(active: boolean): void {
    this.assertAlive();
    if (this.comparingOriginal === active) {
      return;
    }
    this.comparingOriginal = active;
    if (!this.renderer) {
      return;
    }

    if (active) {
      const baseline = this.store.baseline();
      if (!baseline) {
        this.comparingOriginal = false;
        return;
      }
      this.renderer.setCompareOriginal?.(structuredClone(baseline));
    } else {
      this.renderer.setCompareOriginal?.(null);
      const document = this.store.document();
      if (document) {
        this.renderer.render(document);
        const preview = this.store.preview();
        if (preview) {
          this.renderer.renderPreview(preview);
        }
      }
    }
    this.emitChanged();
  }

  isComparingOriginal(): boolean {
    return this.comparingOriginal;
  }

  async export(options: PublicExportOptions = { format: 'png' }): Promise<ImageEditorExportResult> {
    this.assertAlive();
    const document = this.store.document();
    if (!this.renderer || !document) {
      throw new ImageEditorError('EXPORT_FAILED', 'Nothing to export');
    }

    const width = document.output.width;
    const height = document.output.height;
    if (width < 1 || height < 1) {
      throw new ImageEditorError('EXPORT_FAILED', 'Export dimensions are invalid');
    }

    const format = normalizeExportFormat(options.format);
    const quality = options.quality ?? (format === 'jpeg' || format === 'webp' ? 0.92 : 1);
    const exportSize = resolveExportDimensions(width, height, options);
    if (exportSize.width > MAX_EXPORT_DIMENSION || exportSize.height > MAX_EXPORT_DIMENSION) {
      throw new ImageEditorError(
        'EXPORT_FAILED',
        `Export dimensions exceed ${MAX_EXPORT_DIMENSION}px guardrail`,
      );
    }

    const rasterOptions: RasterExportOptions = {
      format,
      quality,
      multiplier: options.multiplier,
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor ?? (format === 'jpeg' ? '#ffffff' : undefined),
    };

    const timeoutMs =
      typeof options.timeoutMs === 'number' && Number.isFinite(options.timeoutMs)
        ? options.timeoutMs
        : DEFAULT_EXPORT_TIMEOUT_MS;

    this.store.setStatus('busy');
    this.emitExportProgress('start', 0);
    await yieldForUiPaint();
    this.assertAlive();

    try {
      this.emitExportProgress('rasterize', 0.45);
      const blob = await withTimeout(
        this.renderer.exportRaster(rasterOptions),
        timeoutMs,
        () =>
          new ImageEditorError(
            'EXPORT_FAILED',
            `Export timed out after ${Math.round(timeoutMs)}ms`,
          ),
      );
      const extension = fileExtensionForExportFormat(format);
      const mime = mimeTypeForExportFormat(format);
      const fileName = options.fileName ?? `fluxio-export.${extension}`;
      const file =
        options.asFile === false
          ? undefined
          : new File([blob], fileName, {
              type: blob.type || mime,
            });

      this.store.markClean();
      this.store.setStatus('ready');
      this.emitExportProgress('complete', 1);
      this.emitChanged();

      return {
        blob,
        file,
        format,
        width: exportSize.width,
        height: exportSize.height,
        fileName,
      };
    } catch (error) {
      if (this.store.status() === 'busy') {
        this.store.setStatus('ready');
      }
      throw toImageEditorError(error, 'EXPORT_FAILED', 'Export failed');
    }
  }

  /**
   * Generate Pintura-style filter preset thumbnail data-URLs via the renderer.
   * Returns `{}` when the renderer does not implement the optional hook.
   */
  async generateFilterThumbnails(
    options?: FilterThumbnailOptions,
  ): Promise<Readonly<Partial<Record<FilterPresetId, string>>>> {
    this.assertAlive();
    if (!this.renderer?.generateFilterThumbnails) {
      return {};
    }
    return this.renderer.generateFilterThumbnails({
      ...options,
      presets: options?.presets ?? this.hostFilterPresets ?? undefined,
    });
  }

  /**
   * Snapshot the committed document into a durable design envelope (JSON-safe).
   * Does not include decoded pixels; host re-binds the image source on load.
   */
  exportDesignState(): DesignStateEnvelope {
    this.assertAlive();
    const document = this.store.document();
    if (!document) {
      throw new ImageEditorError('DESIGN_STATE_INVALID', 'Nothing to export');
    }
    return serializeDesignState(document);
  }

  /**
   * Apply a previously exported design onto the currently loaded image.
   * Clears undo history. Rejects unsupported schema versions (no migrations yet).
   */
  async loadDesignState(input: unknown, options: LoadDesignStateOptions = {}): Promise<void> {
    this.assertAlive();
    const live = this.store.document();
    if (!live || !this.renderer) {
      throw new ImageEditorError('DESIGN_STATE_INVALID', 'No document loaded');
    }

    this.store.setStatus('busy');
    try {
      const envelope = parseDesignState(input);
      const persistedSize = envelope.document.sourceSize;
      if (
        !options.allowSourceMismatch &&
        (persistedSize.width !== live.sourceSize.width ||
          persistedSize.height !== live.sourceSize.height)
      ) {
        throw new ImageEditorError(
          'DESIGN_STATE_INVALID',
          `Design source size ${persistedSize.width}×${persistedSize.height} does not match loaded image ${live.sourceSize.width}×${live.sourceSize.height}`,
        );
      }

      const document = mergeDesignOntoDocument(envelope.document, live);
      this.commands.clearHistory();
      this.store.setDocument(document);
      this.store.setHistory(this.commands.getHistorySnapshot());
      this.store.setPreview(null);
      this.store.setActiveTool(null);
      this.applyFit(document, true);
      this.renderer.render(document);
      this.store.setStatus('ready');
      this.emitChanged();
    } catch (error) {
      const typed = toImageEditorError(
        error,
        'DESIGN_STATE_INVALID',
        'Failed to load design state',
      );
      this.store.setStatus('error', typed.message);
      throw typed;
    }
  }

  getSnapshot() {
    return {
      ...this.store.snapshot(),
      comparingOriginal: this.comparingOriginal,
    };
  }

  isDirty(): boolean {
    return this.store.isDirty();
  }

  getToolbarActions() {
    return this.plugins.getToolbarActions();
  }

  getToolbarGroups() {
    return this.plugins.getToolbarGroups();
  }

  getTools() {
    return this.plugins.getTools();
  }

  getPanels() {
    return this.plugins.getPanels();
  }

  getRegisteredPluginIds() {
    return this.plugins.getRegisteredPluginIds();
  }

  applyConfig(config: ImageEditorConfig): void {
    let localeChanged = false;
    if (config.locale) {
      this.locales.setLocale(config.locale);
      localeChanged = true;
    }
    let hostLocaleChanged = false;
    if (config.messages !== undefined) {
      this.hostLocaleMerge = { ...this.hostLocaleMerge, messages: config.messages };
      hostLocaleChanged = true;
    }
    if (config.locales !== undefined) {
      this.hostLocaleMerge = { ...this.hostLocaleMerge, locales: config.locales };
      hostLocaleChanged = true;
    }
    if (localeChanged || hostLocaleChanged) {
      this.pushHostLocaleMessages();
    }
    if (config.filters !== undefined) {
      this.applyFiltersConfig(config.filters);
      this.pushHostFilterFunctions();
    }
  }

  /** Effective Filters panel preset order (built-ins + host registry). */
  getFilterPresetIds(): readonly FilterPresetId[] {
    return this.hostFilterPresets ?? resolveFilterPresetIds(null);
  }

  /** PV49: push preview-only grid / guide chrome to the renderer. */
  setMarkupSnapChrome(chrome: MarkupSnapChrome | null): void {
    this.markupSnapChrome = chrome;
    this.renderer?.setMarkupSnapChrome?.(chrome);
  }

  /** PV49: snap settings used during annotation create / drag. */
  setMarkupSnapConfig(config: MarkupSnapConfig | null): void {
    this.markupSnapConfig = config;
    this.renderer?.setMarkupSnapConfig?.(config);
  }

  private pushHostLocaleMessages(): void {
    this.locales.setHostMessages(
      resolveHostLocaleMessages(this.hostLocaleMerge, this.locales.getLocale()),
    );
  }

  private applyFiltersConfig(config?: Partial<FiltersPluginConfig> | null): void {
    const functions = config?.filterFunctions;
    this.hostFilterFunctions = functions && Object.keys(functions).length > 0 ? functions : null;
    this.hostFilterPresets = resolveFilterPresetIds(config ?? null);
  }

  private pushHostFilterFunctions(): void {
    this.renderer?.setHostFilterFunctions?.(this.hostFilterFunctions);
  }

  private pushMarkupSnapState(): void {
    this.renderer?.setMarkupSnapChrome?.(this.markupSnapChrome);
    this.renderer?.setMarkupSnapConfig?.(this.markupSnapConfig);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.comparingOriginal = false;
    this.markupSnapChrome = null;
    this.markupSnapConfig = null;
    if (this.host && this.wheelHandler) {
      this.host.removeEventListener('wheel', this.wheelHandler);
    }
    this.wheelHandler = null;
    this.unbindPinch();
    this.drawPointHandler = null;
    this.drawingStrokeWidthProvider = null;
    this.pathVertexHandler = null;
    this.pathVertexMoveHandler = null;
    this.pathVertexInsertHandler = null;
    this.pathVertexSelectHandler = null;
    this.pathVertexDeleteHandler = null;
    this.pathSelectedVertexIndexProvider = null;
    this.pathActivePointsProvider = null;
    this.pathActiveStrokeProvider = null;
    this.pathActiveClosedProvider = null;
    this.pathDrawingActiveProvider = null;
    this.colorPickerActiveProvider = null;
    this.colorSampleHandler = null;
    this.annotationBridge = null;
    this.watermarkBridge = null;
    this.designImageBridge = null;
    this.focusChangeHandler = null;
    this.cropMaskChangeHandler = null;
    this.frameChangeHandler = null;
    this.redactionAddHandler = null;
    this.redactionChangeHandler = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer?.setInteractionHandlers?.(null);
    this.renderer?.destroy();
    this.renderer = null;
    this.plugins.destroy();
    revokeAsset(this.store.asset());
    this.store.reset();
    this.host = null;
  }

  /**
   * Exclusive tools that own the pointer — annotation Select mode is suspended.
   * `null` (ready/select), object tools, and drawing keep the bridge active.
   */
  private isAnnotationSelectBlocked(): boolean {
    const tool = this.store.activeTool();
    return (
      tool === 'crop' ||
      tool === 'watermark' ||
      tool === 'adjustments' ||
      tool === 'effects' ||
      tool === 'filters' ||
      tool === 'rotate' ||
      tool === 'resize'
    );
  }

  /** Exclusive tools that own the pointer — design-image move is suspended. */
  private isDesignImageInteractionBlocked(): boolean {
    const tool = this.store.activeTool();
    return (
      tool === 'crop' ||
      tool === 'templates' ||
      tool === 'watermark' ||
      tool === 'drawing' ||
      tool === 'path' ||
      tool === 'focus' ||
      tool === 'crop-mask'
    );
  }

  /**
   * Resolve the document for an undo/redo step.
   * Compact entries replay inverse/forward commands; snapshot entries restore before/after.
   */
  private resolveHistoryDocument(
    entry: HistoryEntry,
    direction: 'undo' | 'redo',
  ): ReadonlyImageDocument | null {
    const descriptor = direction === 'undo' ? entry.inverse : entry.forward;
    if (descriptor) {
      const current = this.store.document();
      if (!current) {
        return null;
      }
      return this.commands.executeNoHistory(descriptor.commandId, descriptor.payload, current)
        .document;
    }
    const snapshot = direction === 'undo' ? entry.before : entry.after;
    return snapshot;
  }

  private applyFit(document: ReadonlyImageDocument, forceContain: boolean): void {
    const viewport = this.store.viewport();
    if (!forceContain && viewport.fitMode === 'manual') {
      this.renderer?.updateViewport(viewport);
      return;
    }

    const target = this.resolveViewportFitTarget(document);
    const fit = computeContainFit(target.size, viewport, target.rotationDegrees, {
      maxZoom: target.maxZoom,
    });
    this.store.setViewport({
      ...viewport,
      zoom: fit.zoom,
      panX: fit.panX,
      panY: fit.panY,
      fitMode: 'contain',
    });
    this.renderer?.updateViewport(this.store.viewport());
  }

  /**
   * Content size used for fit / center: crop preview uses oriented source;
   * otherwise composed output (already oriented) with optional maxZoom after resize.
   */
  private resolveViewportFitTarget(document: ReadonlyImageDocument): {
    readonly size: { readonly width: number; readonly height: number };
    readonly rotationDegrees: number;
    readonly maxZoom: number | undefined;
  } {
    const tool = this.store.activeTool();
    const cropMode = (tool === 'crop' || tool === 'templates') && !!this.store.preview()?.crop;
    if (cropMode) {
      return {
        size: document.sourceSize,
        rotationDegrees: document.transform.rotationDegrees,
        maxZoom: undefined,
      };
    }

    const oriented = getOrientedContentSize(document);
    const resized =
      document.output.width !== oriented.width || document.output.height !== oriented.height;
    return {
      size: document.output,
      rotationDegrees: 0,
      maxZoom: resized ? 1 : undefined,
    };
  }

  private onHostResize(): void {
    if (!this.host || !this.renderer || this.destroyed) {
      return;
    }
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 1);
    const height = Math.max(Math.floor(rect.height), 1);
    this.renderer.resize(width, height);
    this.store.patchViewport({ width, height });
    const document = this.store.document();
    if (document && this.store.viewport().fitMode === 'contain') {
      this.applyFit(document, true);
    } else {
      this.renderer.updateViewport(this.store.viewport());
    }
  }

  private bindWheel(host: HTMLElement): void {
    if (!this.viewportConfig.wheelZoom) {
      return;
    }
    this.wheelHandler = (event: WheelEvent) => {
      if (!this.store.document()) {
        return;
      }
      event.preventDefault();
      const rect = host.getBoundingClientRect();
      const pointX = event.clientX - rect.left;
      const pointY = event.clientY - rect.top;
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      this.setZoom(this.store.viewport().zoom * factor, pointX, pointY);
    };
    host.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  /**
   * Two-finger pinch-zoom + pan on touch/pen pointers.
   * Capture-phase so Fabric single-finger tools do not fight the gesture.
   */
  private bindPinch(host: HTMLElement): void {
    if (!this.viewportConfig.pinchZoom) {
      return;
    }

    const toLocal = (event: PointerEvent): PinchPoint => {
      const rect = host.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const readPair = (): { a: PinchPoint; b: PinchPoint } | null => {
      if (this.pinchPointers.size < 2) {
        return null;
      }
      const points = [...this.pinchPointers.values()];
      return { a: points[0]!, b: points[1]! };
    };

    const endPinch = (): void => {
      this.pinchActive = false;
      this.pinchPrevPair = null;
    };

    this.pinchPointerDownHandler = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        return;
      }
      if (!this.store.document()) {
        return;
      }
      this.pinchPointers.set(event.pointerId, toLocal(event));
      if (this.pinchPointers.size === 2) {
        this.pinchActive = true;
        this.pinchPrevPair = readPair();
        this.cancelActiveGesture();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    this.pinchPointerMoveHandler = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        return;
      }
      if (!this.pinchPointers.has(event.pointerId)) {
        return;
      }
      this.pinchPointers.set(event.pointerId, toLocal(event));
      if (this.pinchPointers.size < 2) {
        return;
      }

      if (!this.pinchActive) {
        this.pinchActive = true;
        this.pinchPrevPair = readPair();
        this.cancelActiveGesture();
      }

      const prev = this.pinchPrevPair;
      const next = readPair();
      if (!prev || !next) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const viewport = this.store.viewport();
      const nextViewport = applyPinchViewport(
        viewport,
        prev.a,
        prev.b,
        next.a,
        next.b,
        this.viewportConfig.minZoom,
        this.viewportConfig.maxZoom,
      );
      this.store.setViewport({ ...viewport, ...nextViewport });
      this.renderer?.updateViewport(this.store.viewport());
      this.pinchPrevPair = next;
    };

    this.pinchPointerUpHandler = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        return;
      }
      if (!this.pinchPointers.has(event.pointerId)) {
        return;
      }
      const wasPinching = this.pinchActive;
      this.pinchPointers.delete(event.pointerId);
      if (this.pinchPointers.size < 2) {
        endPinch();
      } else {
        this.pinchPrevPair = readPair();
      }
      if (wasPinching) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    host.addEventListener('pointerdown', this.pinchPointerDownHandler, {
      capture: true,
      passive: false,
    });
    host.addEventListener('pointermove', this.pinchPointerMoveHandler, {
      capture: true,
      passive: false,
    });
    host.addEventListener('pointerup', this.pinchPointerUpHandler, { capture: true });
    host.addEventListener('pointercancel', this.pinchPointerUpHandler, { capture: true });
  }

  private unbindPinch(): void {
    if (this.host) {
      if (this.pinchPointerDownHandler) {
        this.host.removeEventListener('pointerdown', this.pinchPointerDownHandler, true);
      }
      if (this.pinchPointerMoveHandler) {
        this.host.removeEventListener('pointermove', this.pinchPointerMoveHandler, true);
      }
      if (this.pinchPointerUpHandler) {
        this.host.removeEventListener('pointerup', this.pinchPointerUpHandler, true);
        this.host.removeEventListener('pointercancel', this.pinchPointerUpHandler, true);
      }
    }
    this.pinchPointerDownHandler = null;
    this.pinchPointerMoveHandler = null;
    this.pinchPointerUpHandler = null;
    this.pinchPointers.clear();
    this.pinchPrevPair = null;
    this.pinchActive = false;
  }

  private emitChanged(): void {
    this.onChanged?.();
  }

  private emitLoadProgress(
    stage: 'start' | 'normalize' | 'decode' | 'complete',
    progress: number,
  ): void {
    this.onLoadProgress?.(createEditorProgressEvent('load', stage, progress));
  }

  private emitExportProgress(stage: 'start' | 'rasterize' | 'complete', progress: number): void {
    this.onExportProgress?.(createEditorProgressEvent('export', stage, progress));
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('EditorSession has been destroyed');
    }
  }
}

/** Double rAF so the busy overlay can paint before sync Canvas2d work. */
function yieldForUiPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
