import type {
  AnnotationCreateKind,
  TransformableAnnotation,
} from '../geometry/annotation-transform';
import type { CropGuidesConfig } from '../geometry/crop-guides';
import type { MarkupSnapChrome, MarkupSnapConfig } from '../geometry/markup-snap';
import type { RgbaColor } from '../models/color';
import type { FilterColorMatrixSource } from '../models/filter-registry';
import type {
  AdjustmentsState,
  Annotation,
  ColorOverlayState,
  FillState,
  CropMaskState,
  CropState,
  DesignImageState,
  EffectsState,
  FilterPresetId,
  FiltersState,
  FocusState,
  FrameState,
  ReadonlyImageDocument,
  RedactionRegion,
  WatermarkState,
} from '../models/image-document';
import type { NormalizedImageAsset } from '../models/source';
import type { ReadonlyViewportState } from '../models/viewport-state';

/** Options for Pintura-style filter preset thumbnail generation. */
export interface FilterThumbnailOptions {
  /** Square thumb edge in CSS pixels (default ~72). */
  readonly size?: number;
  /** Presets to render; defaults to all built-in presets. */
  readonly presets?: readonly FilterPresetId[];
  /** When aborted, generation stops between presets and rejects with `AbortError`. */
  readonly signal?: AbortSignal;
}

export interface RendererMountOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
}

export interface ReadonlyEditorPreview {
  readonly transform?: {
    readonly rotationDegrees?: number;
    readonly flipX?: boolean;
    readonly flipY?: boolean;
  };
  readonly crop?: CropState | null;
  /**
   * Preview-only crop guide overlays (profile circle / bleed).
   * Ignored outside crop / templates crop preview.
   */
  readonly cropGuides?: CropGuidesConfig | null;
  /** Live finetune preview (not committed to history until Apply). */
  readonly adjustments?: AdjustmentsState | null;
  /** Live effects preview (not committed until Apply). */
  readonly effects?: EffectsState | null;
  /** Live filter-preset preview (not committed until Apply). */
  readonly filters?: FiltersState | null;
  /** Live focus / tilt-shift preview (not committed until Apply). */
  readonly focus?: FocusState | null;
  /** Live redaction regions preview (not committed until Apply). */
  readonly redactions?: readonly RedactionRegion[] | null;
  /** Live crop-mask preview (not committed until Apply). */
  readonly cropMask?: CropMaskState | null;
  /**
   * Outside visibility (0–1) while editing a crop-mask draft.
   * Preview-only — Apply / export always hard-clip (transparent outside).
   */
  readonly cropMaskOutsideOpacity?: number;
  /** Live solid / gradient color overlay preview (not committed until Apply). */
  readonly colorOverlay?: ColorOverlayState | null;
  /** Live transparent-pixel fill preview (PV25; not committed until Apply). */
  readonly fill?: FillState | null;
  /** Live frame / border preview (not committed until Apply). */
  readonly frame?: FrameState | null;
  /** Live watermark preview (not committed until Apply). */
  readonly watermark?: WatermarkState | null;
  /** Live annotation preview (not committed until Apply). */
  readonly annotations?: readonly Annotation[] | null;
  /** Live design-image placement preview (not committed until gesture end). */
  readonly designImage?: DesignImageState | null;
  readonly output?: {
    readonly width?: number;
    readonly height?: number;
  };
}

export interface RasterExportOptions {
  readonly format: 'png' | 'jpeg' | 'webp';
  readonly quality?: number;
  /** Scale factor relative to document output size (applied when width/height omitted). */
  readonly multiplier?: number;
  /** Target export width in pixels (optional; paired with height for cover-fit). */
  readonly width?: number;
  /** Target export height in pixels (optional; paired with width for cover-fit). */
  readonly height?: number;
  /** CSS color used when flattening alpha for JPEG (and optionally WebP). */
  readonly backgroundColor?: string;
}

/**
 * UX-I0 annotation transform / create gesture. Geometry is **document/output pixels**.
 * `start`/`move` are preview-only; `end` commits; `cancel` restores baseline.
 */
export type AnnotationGesturePhase = 'start' | 'move' | 'end' | 'cancel';

export interface AnnotationTransformEvent {
  readonly phase: AnnotationGesturePhase;
  readonly id: string;
  /** Updated annotation in document/output pixels (primary / last selected). */
  readonly annotation: TransformableAnnotation;
  /**
   * Phase 4.8.1: all annotations updated by this gesture (length ≥ 1).
   * When omitted, callers treat `[annotation]` as the full set.
   */
  readonly annotations?: readonly TransformableAnnotation[];
}

/** Phase 4.8.1: additive (Shift/Ctrl/Meta) multi-select options. */
export interface AnnotationSelectOptions {
  readonly additive?: boolean;
}

export interface AnnotationCreateEvent {
  readonly phase: AnnotationGesturePhase;
  readonly kind: AnnotationCreateKind;
  readonly annotation: TransformableAnnotation;
}

/** UX-I3: single watermark drag / scale gesture (document/output pixels). */
export interface WatermarkTransformEvent {
  readonly phase: AnnotationGesturePhase;
  readonly watermark: WatermarkState;
}

/** Base photo placement drag / scale gesture (document/output pixels). */
export interface DesignImageTransformEvent {
  readonly phase: AnnotationGesturePhase;
  readonly designImage: DesignImageState;
}

export interface ViewportInteractionHandlers {
  readonly onWheelZoom?: (event: {
    readonly deltaY: number;
    readonly pointX: number;
    readonly pointY: number;
  }) => void;
  readonly onPan?: (event: { readonly dx: number; readonly dy: number }) => void;
  /** Preview-only crop updates during interactive handle/move gestures. */
  readonly onCropChange?: (crop: CropState) => void;
  /** Preview-only focus updates during interactive canvas handle gestures. */
  readonly onFocusChange?: (focus: FocusState) => void;
  /** Preview-only crop-mask updates during interactive canvas handle gestures. */
  readonly onCropMaskChange?: (cropMask: CropMaskState) => void;
  /** Preview-only frame thickness updates during interactive edge-handle gestures. */
  readonly onFrameChange?: (frame: FrameState) => void;
  /** When true, left-drag draws a freehand stroke instead of panning. */
  readonly isDrawingActive?: () => boolean;
  /** When true, left-drag creates a redaction rectangle instead of panning. */
  readonly isRedactActive?: () => boolean;
  /** Commit a new redaction region (normalized 0–1) from a canvas drag. */
  readonly onRedactionAdd?: (region: RedactionRegion) => void;
  /** Move / resize an existing draft region (same id, new bounds). */
  readonly onRedactionChange?: (region: RedactionRegion) => void;
  /**
   * Document-space stroke width for the freehand brush cursor (Pintura-style circle).
   * Screen size is derived with viewport zoom in the renderer.
   */
  readonly getDrawingStrokeWidth?: () => number;
  /** Freehand stroke samples in output/scene pixel space. */
  readonly onDrawPoint?: (event: {
    readonly phase: 'start' | 'move' | 'end';
    readonly x: number;
    readonly y: number;
  }) => void;
  /**
   * When true, empty-canvas click places Path tool vertices (polyline) instead of panning.
   */
  readonly isPathToolActive?: () => boolean;
  /** Path tool vertex events in output/scene pixel space. */
  readonly onPathVertex?: (event: {
    readonly type: 'click' | 'dblclick';
    readonly x: number;
    readonly y: number;
  }) => void;
  /**
   * Drag a Path vertex (anchor handle) in output/scene pixel space.
   * Applies while drawing or while a finished path is selected for edit.
   */
  readonly onPathVertexMove?: (event: {
    readonly phase: 'start' | 'move' | 'end';
    readonly index: number;
    readonly x: number;
    readonly y: number;
  }) => void;
  /**
   * Insert a vertex on an existing Path segment while editing a finished path.
   * `afterIndex` is the segment start vertex; the new point is inserted at `afterIndex + 1`.
   */
  readonly onPathVertexInsert?: (event: {
    readonly afterIndex: number;
    readonly x: number;
    readonly y: number;
  }) => void;
  /** Currently selected Path vertex index (finished-path edit); null when none. */
  readonly getSelectedPathVertexIndex?: () => number | null;
  /** Select / clear a Path vertex for edit actions (e.g. delete). */
  readonly onPathVertexSelect?: (index: number | null) => void;
  /** Delete the currently selected Path vertex. */
  readonly onPathVertexDelete?: () => void;
  /**
   * Vertices of the editable Path polyline (in-progress or selected finished).
   * Used by the renderer for anchor-point handles (+ rubber-band while drawing).
   */
  readonly getActivePathPoints?: () => readonly { readonly x: number; readonly y: number }[] | null;
  /** Stroke color of the editable Path polyline. */
  readonly getActivePathStroke?: () => string;
  /** Whether the editable Path is closed (last segment connects to first). */
  readonly getActivePathClosed?: () => boolean;
  /**
   * True while the Path tool is placing new vertices (rubber-band + click-to-add).
   * False while editing a finished/selected path's anchors.
   */
  readonly isPathDrawingActive?: () => boolean;
  /**
   * UX-I0: when true, pointer hit-tests interactive annotations (output pixels)
   * instead of starting a pan on empty canvas clicks that clear selection.
   */
  readonly isAnnotationInteractionActive?: () => boolean;
  /**
   * Live interactive annotations (image / text / shapes / paths) in document/output pixels.
   */
  readonly getInteractiveAnnotations?: () => readonly TransformableAnnotation[];
  /**
   * Session/UI selection ids — never part of design-state persistence.
   * Prefer this over the single-id getter when multi-select is active.
   */
  readonly getSelectedAnnotationIds?: () => readonly string[];
  /** Primary selection id (last selected); null when empty. */
  readonly getSelectedAnnotationId?: () => string | null;
  readonly onAnnotationSelect?: (
    id: string | null,
    options?: AnnotationSelectOptions,
  ) => void;
  readonly onAnnotationTransform?: (event: AnnotationTransformEvent) => void;
  /** When set, empty-canvas gestures create a new annotation of this kind. */
  readonly getAnnotationCreateKind?: () => AnnotationCreateKind | null;
  /** Side count used when creating polygons (3–12). */
  readonly getPolygonSides?: () => number;
  readonly onAnnotationCreate?: (event: AnnotationCreateEvent) => void;
  /** Double-click on an interactive text annotation requests in-place editing. */
  readonly onAnnotationEditRequest?: (id: string) => void;
  /** UX-I3: watermark drag / scale while watermark tool is active. */
  readonly isWatermarkInteractionActive?: () => boolean;
  readonly getInteractiveWatermark?: () => WatermarkState | null;
  readonly onWatermarkTransform?: (event: WatermarkTransformEvent) => void;
  /**
   * When true, unlocked base photo can be moved/resized (document plate stays fixed).
   * Preview-only until `end` commits via the host.
   */
  readonly isDesignImageInteractionActive?: () => boolean;
  readonly getInteractiveDesignImage?: () => DesignImageState | null;
  readonly onDesignImageTransform?: (event: DesignImageTransformEvent) => void;
  /** When true, left-click samples a pixel instead of pan / draw / annotate. */
  readonly isColorPickerActive?: () => boolean;
  /** Scene/output-space sample request from an eyedropper click. */
  readonly onColorSample?: (event: { readonly x: number; readonly y: number }) => void;
}

/**
 * Renderer-neutral port. Fabric types must never appear here.
 */
export interface RenderingEnginePort {
  mount(host: HTMLElement, options: RendererMountOptions): Promise<void>;
  loadSource(asset: NormalizedImageAsset): Promise<void>;
  render(snapshot: ReadonlyImageDocument): void;
  renderPreview(preview: ReadonlyEditorPreview | null): void;
  updateViewport(viewport: ReadonlyViewportState): void;
  resize(width: number, height: number): void;
  setInteractionHandlers?(handlers: ViewportInteractionHandlers | null): void;
  /** Cancel in-progress pointer gesture (crop / draw / annotation) if any. */
  cancelActiveGesture?(): void;
  /** Current viewport zoom (scene → screen scale). */
  getViewportZoom?(): number;
  /**
   * Map a scene/output-space point to viewport client coordinates
   * (`getBoundingClientRect` space) for positioning DOM overlays.
   */
  mapScenePointToClient?(point: { readonly x: number; readonly y: number }): {
    readonly x: number;
    readonly y: number;
  } | null;
  /**
   * Phase 4.8.5: temporarily display the loaded baseline (or null to restore).
   * Does not mutate the committed document or preview; ignored by exportRaster.
   */
  setCompareOriginal?(baseline: ReadonlyImageDocument | null): void;
  /**
   * Host color-matrix filters (PV19). Used when composing / thumbnailing
   * presets not covered by built-in Fabric filters (or to override them).
   */
  setHostFilterFunctions?(
    functions: Readonly<Record<string, FilterColorMatrixSource>> | null,
  ): void;
  /**
   * PV49 / NF02: preview-only markup grid + guide lines (not exported).
   * Pass `null` to clear. Snap behavior uses {@link setMarkupSnapConfig}.
   */
  setMarkupSnapChrome?(chrome: MarkupSnapChrome | null): void;
  /**
   * PV49: active snap settings for annotation create / move / resize.
   * Hold Ctrl/Cmd during a gesture to temporarily disable (renderer-side).
   */
  setMarkupSnapConfig?(config: MarkupSnapConfig | null): void;
  exportRaster(options: RasterExportOptions): Promise<Blob>;
  /**
   * Optional: small JPEG data-URLs for each filter preset (Pintura-style thumbs).
   * Uses current document geometry + adjustments/effects, ignoring live filter preview.
   */
  generateFilterThumbnails?(
    options?: FilterThumbnailOptions,
  ): Promise<Readonly<Partial<Record<FilterPresetId, string>>>>;
  /**
   * Sample a composed document pixel at scene/output coordinates (same space as export).
   * Returns null when nothing is loaded or coords are invalid; may throw TAINTED_CANVAS.
   */
  samplePixelAtScenePoint?(x: number, y: number): Promise<RgbaColor | null>;
  clear(): void;
  destroy(): void;
}

export const RENDERING_ENGINE = 'fluxio.imageEditor.renderingEngine' as const;
