import {
  Canvas,
  Canvas2dFilterBackend,
  Circle,
  Ellipse,
  FabricImage,
  Line,
  Pattern,
  Path,
  Point,
  Rect,
  Shadow,
  config,
  filters,
  getFilterBackend,
  setFilterBackend,
} from 'fabric';

import {
  DEFAULT_FILTER_PRESETS,
  ImageEditorError,
  applyCropDrag,
  applyCropMaskDrag,
  applyDesignImageDrag,
  applyFocusDrag,
  applyFrameDrag,
  applyRedactionDrag,
  applyGroupTransformableDrag,
  applyWatermarkDrag,
  boundsFromTransformable,
  createInitialAdjustments,
  createInitialAnnotations,
  createInitialColorOverlay,
  createInitialFill,
  createInitialCropMask,
  createInitialDesignImage,
  createInitialEffects,
  createInitialFilters,
  createInitialFocus,
  createInitialFrame,
  createInitialRedactions,
  createInitialWatermark,
  createRedactionId,
  createShapeFromDrag,
  cropMaskChromeLayout,
  cropProfileCircleMaskPath,
  cursorForAnnotationHandle,
  cursorForCropMaskHandle,
  cursorForRedactionHandle,
  cursorForFocusHandle,
  designImageBounds,
  estimateWatermarkBounds,
  focusChromeLayout,
  layoutCropGuides,
  applyMarkupSnapToDesignImage,
  applyMarkupSnapToGroupDrag,
  markupGridVisible,
  resolveMarkupSnapConfig,
  snapMarkupPoint,
  frameChromeLayout,
  hitTestCropHandle,
  hitTestCropMaskHandle,
  hitTestDesignImageBody,
  hitTestDesignImageHandle,
  hitTestFocusHandle,
  hitTestFrameHandle,
  hitTestInteractiveAnnotations,
  hitTestRedactions,
  hitTestWatermarkHandle,
  redactionCornerHandles,
  interactionBoundsFromTransformable,
  isCssColorTransparent,
  isEllipticalCrop,
  isFrameEdgeInteractive,
  isIdentityAdjustments,
  isIdentityEffects,
  isIdentityFilters,
  isIdentityRedactions,
  isIdentityWatermark,
  isShapeCreateDragMeaningful,
  normalizeAdjustments,
  normalizeAnnotations,
  normalizeColorOverlay,
  normalizeFill,
  normalizeCropMask,
  normalizeDesignImage,
  normalizeEffects,
  normalizeFilters,
  normalizeFocus,
  normalizeFrame,
  normalizeRedactions,
  normalizeSelectedAnnotationIds,
  normalizeWatermark,
  placeTextAnnotationAt,
  resolveDesignImage,
  resolveExportDimensions,
  resolveWatermarkPlacement,
  ANNOTATION_ROTATE_HANDLE_OFFSET,
  ROTATE_HANDLE_OFFSET,
  rotateHandlePoint,
  unionBounds,
  type AdjustmentsState,
  type Annotation,
  type AnnotationCreateKind,
  type AnnotationHandle,
  type ColorOverlayState,
  type FillState,
  type CropHandle,
  type CropMaskHandle,
  type CropMaskState,
  type CropState,
  type DesignImageState,
  type EffectsState,
  type FilterColorMatrixSource,
  type FilterPresetId,
  type FilterThumbnailOptions,
  type FiltersState,
  resolveHostFilterMatrix,
  type FocusHandle,
  type FocusState,
  type FrameHandle,
  type FrameState,
  type ImageSize,
  type InteractiveBounds,
  type LineEndStyle,
  type MarkupSnapChrome,
  type MarkupSnapConfig,
  type NormalizedImageAsset,
  type RasterExportOptions,
  type ReadonlyEditorPreview,
  type ReadonlyImageDocument,
  type ReadonlyViewportState,
  type RedactionHandle,
  type RedactionRegion,
  type RendererMountOptions,
  type RenderingEnginePort,
  type RgbaColor,
  type TransformableAnnotation,
  type ViewportInteractionHandlers,
  type WatermarkState,
} from 'fluxio-image-editor/core';

import { applyColorOverlayEffect } from './color-overlay-compositing';
import { applyFillEffect } from './fill-compositing';
import { applyCropMaskEffect } from './crop-mask-compositing';
import { applyFocusEffect } from './focus-compositing';
import { applyFrameEffect } from './frame-compositing';
import { applyGammaCanvas, applyVignetteCanvas } from './adjustment-compositing';
import { applyRedactionsEffect } from './redaction-compositing';
import {
  cloneCanvas,
  computePreviewMaxLongEdge,
  coverToSize,
  coverToSquare,
  resolvePreviewOutputSize,
} from './preview-compose';

const FILTER_THUMB_SIZE = 72;

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }
  const reason = signal.reason;
  if (reason instanceof DOMException && reason.name === 'AbortError') {
    throw reason;
  }
  throw new DOMException('Filter thumbnail generation aborted', 'AbortError');
}

const HANDLE_SCREEN_PX = 20;
const HANDLE_VISUAL_PX = 12;
/** Shared crop / annotation transform chrome (single dashed accent). */
const INTERACTIVE_CHROME_STROKE = '#8ec8ff';
/** Redact chrome reads as a warning so censored areas stand out from other tools. */
const REDACT_CHROME_STROKE = '#ff6b6b';
const REDACT_CHROME_FILL = 'rgba(255, 107, 107, 0.16)';
const INTERACTIVE_HANDLE_FILL = '#ffffff';
const INTERACTIVE_HANDLE_STROKE = '#2b6cb0';
const INTERACTIVE_CHROME_DASH: [number, number] = [6, 4];

/** Soft drop shadow for circular transform / rotate knobs (scene units via /zoom). */
function interactiveHandleShadow(zoom: number): Shadow {
  const z = Math.max(zoom, 0.001);
  return new Shadow({
    color: 'rgba(15, 23, 42, 0.32)',
    blur: 6 / z,
    offsetX: 0,
    offsetY: 1.5 / z,
    affectStroke: true,
  });
}

function createInteractiveHandle(zoom: number): Circle {
  const z = Math.max(zoom, 0.001);
  return new Circle({
    fill: INTERACTIVE_HANDLE_FILL,
    stroke: INTERACTIVE_HANDLE_STROKE,
    strokeWidth: 1.25 / z,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
    shadow: interactiveHandleShadow(z),
  });
}

function styleInteractiveHandle(
  handle: Circle,
  opts: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly size: number;
    readonly rotate?: boolean;
    /** When false, rotate knob matches corner size (annotation chrome). */
    readonly enlargeRotate?: boolean;
  },
): void {
  const isRotate = !!opts.rotate;
  const enlargeRotate = opts.enlargeRotate !== false && isRotate;
  const z = Math.max(opts.zoom, 0.001);
  handle.set({
    left: opts.x,
    top: opts.y,
    radius: enlargeRotate ? opts.size * 0.65 : opts.size / 2,
    fill: isRotate ? '#f0f7ff' : INTERACTIVE_HANDLE_FILL,
    stroke: isRotate ? INTERACTIVE_CHROME_STROKE : INTERACTIVE_HANDLE_STROKE,
    strokeWidth: (isRotate ? 2 : 1.25) / z,
    shadow: interactiveHandleShadow(z),
  });
}

function syncRotateStemLine(
  existing: Line | null,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
  zoom: number,
  canvas: Canvas,
): Line {
  const z = Math.max(zoom, 0.001);
  const strokeWidth = 1.5 / z;
  if (!existing) {
    const stem = new Line([from.x, from.y, to.x, to.y], {
      stroke: INTERACTIVE_CHROME_STROKE,
      strokeWidth,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });
    canvas.add(stem);
    canvas.bringObjectToFront(stem);
    return stem;
  }
  existing.set({
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    stroke: INTERACTIVE_CHROME_STROKE,
    strokeWidth,
  });
  existing.setCoords();
  canvas.bringObjectToFront(existing);
  return existing;
}

interface ComposeLayerCache {
  readonly geometryKey: string;
  readonly base: HTMLCanvasElement;
  fxKey: string;
  fx: HTMLCanvasElement;
  focusKey: string;
  focus: HTMLCanvasElement;
  redactKey: string;
  redact: HTMLCanvasElement;
}

function cursorForCropHandle(handle: CropHandle): string {
  switch (handle) {
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'move':
    default:
      return 'move';
  }
}

/**
 * Pintura-style brush ring cursor. Diameter is screen pixels; hotspot is the center.
 * Dual stroke keeps the ring visible on both light and dark image areas.
 */
function buildDrawingBrushCursor(screenDiameter: number): string {
  const diameter = Math.max(8, Math.min(48, Math.round(screenDiameter)));
  const size = diameter + 4;
  const c = size / 2;
  const r = diameter / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ffffff" stroke-width="2.5"/>` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#111111" stroke-width="1.25"/>` +
    `<circle cx="${c}" cy="${c}" r="1.25" fill="#111111" stroke="#ffffff" stroke-width="0.75"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`;
}

/**
 * Fabric.js adapter. Fabric types stay inside this entry point only.
 */
export class FabricRendererAdapter implements RenderingEnginePort {
  private canvas: Canvas | null = null;
  /** Original loaded source (never scaled to output). */
  private sourceImage: FabricImage | null = null;
  /** Currently displayed object (source while cropping, composed otherwise). */
  private displayImage: FabricImage | null = null;
  /** Scene-only checkerboard plate behind the composed display (not exported). */
  private documentPlate: Rect | FabricImage | null = null;
  private cropOverlay: Rect | Ellipse | null = null;
  /** Dimmed regions outside the active crop frame (top / right / bottom / left). */
  private cropShade: Rect[] = [];
  private cropHandles: Circle[] = [];
  /** PV04: profile-circle dim mask (even-odd hole) + circle outline. */
  private cropGuideCircleMask: Path | null = null;
  private cropGuideCircleOutline: Ellipse | null = null;
  private cropGuideCircleMaskPath = '';
  /** PV04: bleed inset outline. */
  private cropGuideBleed: Rect | Ellipse | null = null;
  private focusRing: Ellipse | Rect | null = null;
  private focusHandles: Circle[] = [];
  private cropMaskOutline: Rect | null = null;
  private cropMaskHandles: Circle[] = [];
  private frameOutline: Rect | null = null;
  private frameHandles: Circle[] = [];
  /** Redact tool chrome: one dashed box per region + the live drag marquee. */
  private redactOutlines: Rect[] = [];
  private redactHandles: Circle[] = [];
  private redactMarquee: Rect | null = null;
  /** Connector from crop-mask top edge to the rotate knob. */
  private cropMaskRotateStem: Line | null = null;
  private focusRotateStem: Line | null = null;
  private annotationOverlay: Rect | null = null;
  /** Phase 4.8.1: secondary outlines for non-primary multi-selected items. */
  private annotationMemberOutlines: Rect[] = [];
  private annotationHandles: Circle[] = [];
  /** Connector from selection box bottom-center to the rotate knob. */
  private annotationRotateStem: Line | null = null;
  private host: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private currentDocument: ReadonlyImageDocument | null = null;
  private preview: ReadonlyEditorPreview | null = null;
  /** Phase 4.8.5: when set, display this instead of currentDocument+preview (export ignores). */
  private compareDocument: ReadonlyImageDocument | null = null;
  /** PV19: host color-matrix filters (Pintura filterFunctions parity). */
  private hostFilterFunctions: Readonly<Record<string, FilterColorMatrixSource>> | null = null;
  /** PV49: preview-only grid + guide lines. */
  private markupSnapChrome: MarkupSnapChrome | null = null;
  private markupSnapConfig: MarkupSnapConfig | null = null;
  private markupGridLines: Line[] = [];
  private markupGuideLines: Line[] = [];
  private asset: NormalizedImageAsset | null = null;
  private handlers: ViewportInteractionHandlers | null = null;
  /** Coalesce render/renderPreview into one compose per animation frame. */
  private refreshRafId: number | null = null;
  private viewportZoom = 1;
  private layerCache: ComposeLayerCache | null = null;
  private panning = false;
  private lastPointer: { x: number; y: number } | null = null;
  private cropGesture: {
    handle: CropHandle;
    startCrop: CropState;
    startPoint: { x: number; y: number };
  } | null = null;
  private focusGesture: {
    handle: FocusHandle;
    startFocus: FocusState;
    startPoint: { x: number; y: number };
  } | null = null;
  private cropMaskGesture: {
    handle: CropMaskHandle;
    startMask: CropMaskState;
    startPoint: { x: number; y: number };
  } | null = null;
  private frameGesture: {
    handle: FrameHandle;
    startFrame: FrameState;
    startPoint: { x: number; y: number };
  } | null = null;
  private annotationGesture: {
    id: string;
    handle: AnnotationHandle;
    startAnnotations: readonly TransformableAnnotation[];
    startPoint: { x: number; y: number };
  } | null = null;
  private annotationCreateGesture: {
    kind: AnnotationCreateKind;
    startPoint: { x: number; y: number };
    /** Null until drag exceeds threshold (shapes) or set immediately (text). */
    annotation: TransformableAnnotation | null;
    /** Snapshot of polygon sides at gesture start. */
    polygonSides: number;
  } | null = null;
  private watermarkGesture: {
    handle: AnnotationHandle;
    startWatermark: WatermarkState;
    startBounds: InteractiveBounds;
    startPoint: { x: number; y: number };
  } | null = null;
  private designImageGesture: {
    handle: AnnotationHandle;
    startDesignImage: DesignImageState;
    startPoint: { x: number; y: number };
  } | null = null;
  private drawingStroke = false;
  /** Redact tool: drag rectangle in document pixels. */
  private redactGesture: {
    readonly start: { readonly x: number; readonly y: number };
    current: { x: number; y: number };
  } | null = null;
  /** Redact tool: move / resize an existing region. */
  private redactTransformGesture: {
    readonly handle: RedactionHandle;
    readonly startRegion: RedactionRegion;
    readonly startPoint: { readonly x: number; readonly y: number };
  } | null = null;
  /** Path tool: pending empty-canvas click (mouseup without drag → vertex). */
  private pathVertexPending: {
    readonly startClient: { readonly x: number; readonly y: number };
    readonly startScene: { readonly x: number; readonly y: number };
  } | null = null;
  /** Path tool: drag an existing in-progress vertex handle. */
  private pathVertexDrag: {
    readonly index: number;
    readonly startClient: { readonly x: number; readonly y: number };
    moved: boolean;
    /** True when this drag started from a segment insert. */
    readonly fromInsert: boolean;
  } | null = null;
  /** Path tool: anchor-point handle overlays while drawing. */
  private pathVertexHandles: Circle[] = [];
  /** Path tool: dashed rubber-band from last vertex to cursor. */
  private pathRubberBandLine: Line | null = null;
  /** Path tool: latest mouse position in scene space. */
  private lastPathMouseScene: { x: number; y: number } | null = null;
  private drawingCursorCache: { key: string; value: string } | null = null;
  /** Space held → left-drag pans even when a create/draw/crop tool owns the pointer. */
  private spacePanActive = false;
  private readonly overlayImageCache = new Map<string, HTMLImageElement | 'loading' | 'error'>();

  private readonly onMouseDown = (opt: { e: Event }) => {
    const event = opt.e as MouseEvent;
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    // Middle-click, Space, Alt, or Ctrl/Meta: pan instead of tool gestures (create/draw/crop).
    if (this.wantsForcedPan(event)) {
      this.panning = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.setCanvasCursor('grabbing');
      event.preventDefault();
      return;
    }

    if (this.handlers?.isColorPickerActive?.() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        this.panning = false;
        this.lastPointer = null;
        this.handlers.onColorSample?.({ x: scenePoint.x, y: scenePoint.y });
        this.setCanvasCursor('crosshair');
        event.preventDefault();
        return;
      }
    }

    if (this.handlers?.isRedactActive?.() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (scenePoint && output) {
        this.panning = false;
        this.lastPointer = null;
        const regions = this.activeRedactions();
        const hit = hitTestRedactions(regions, scenePoint, output, this.handleHitSize());
        const startRegion = hit ? regions.find((region) => region.id === hit.id) : undefined;
        if (hit && startRegion) {
          this.redactTransformGesture = {
            handle: hit.handle,
            startRegion,
            startPoint: { x: scenePoint.x, y: scenePoint.y },
          };
          this.setCanvasCursor(cursorForRedactionHandle(hit.handle));
        } else {
          this.redactGesture = {
            start: { x: scenePoint.x, y: scenePoint.y },
            current: { x: scenePoint.x, y: scenePoint.y },
          };
          this.setCanvasCursor('crosshair');
        }
        event.preventDefault();
        return;
      }
    }

    if (this.isCropInteractive()) {
      const scenePoint = this.scenePointFromEvent(event);
      const crop = this.activeCrop();
      if (scenePoint && crop) {
        const hit = hitTestCropHandle(crop, scenePoint, this.handleHitSize());
        if (hit) {
          this.cropGesture = {
            handle: hit,
            startCrop: { ...crop },
            startPoint: scenePoint,
          };
          this.panning = false;
          this.lastPointer = null;
          this.setCanvasCursor(cursorForCropHandle(hit));
          event.preventDefault();
          return;
        }
      }
    }

    if (this.isFocusInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      const focus = this.activeFocus();
      const output = this.currentDocument?.output;
      if (scenePoint && output && focus.mode !== 'none') {
        const hit = hitTestFocusHandle(
          focus,
          scenePoint,
          output,
          this.handleHitSize(),
          this.rotateHandleOffset(),
        );
        if (hit) {
          this.focusGesture = {
            handle: hit,
            startFocus: { ...focus },
            startPoint: scenePoint,
          };
          this.panning = false;
          this.lastPointer = null;
          this.setCanvasCursor(hit === 'move' ? 'grabbing' : cursorForFocusHandle(hit));
          event.preventDefault();
          return;
        }
      }
    }

    if (this.isCropMaskInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      const cropMask = this.activeCropMask();
      const output = this.currentDocument?.output;
      if (scenePoint && output && cropMask.shape !== 'none') {
        const hit = hitTestCropMaskHandle(
          cropMask,
          scenePoint,
          output,
          this.handleHitSize(),
          this.rotateHandleOffset(),
        );
        if (hit) {
          this.cropMaskGesture = {
            handle: hit,
            startMask: { ...cropMask },
            startPoint: scenePoint,
          };
          this.panning = false;
          this.lastPointer = null;
          this.setCanvasCursor(hit === 'move' ? 'grabbing' : cursorForCropMaskHandle(hit));
          event.preventDefault();
          return;
        }
      }
    }

    if (this.isFrameInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      const frame = this.activeFrame();
      const output = this.currentDocument?.output;
      if (scenePoint && output && isFrameEdgeInteractive(frame)) {
        const hit = hitTestFrameHandle(frame, scenePoint, output, this.handleHitSize());
        if (hit) {
          this.frameGesture = {
            handle: hit,
            startFrame: { ...frame },
            startPoint: scenePoint,
          };
          this.panning = false;
          this.lastPointer = null;
          this.setCanvasCursor('ew-resize');
          event.preventDefault();
          return;
        }
      }
    }

    // Path vertex handles: drag anchors while drawing OR while a finished path is selected.
    // Click-to-place / close only while actively drawing.
    if (event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        const points = this.handlers?.getActivePathPoints?.() ?? null;
        if (points && points.length > 0) {
          const vertexIndex = this.hitTestPathVertex(points, scenePoint);
          if (vertexIndex >= 0) {
            this.pathVertexDrag = {
              index: vertexIndex,
              startClient: { x: event.clientX, y: event.clientY },
              moved: false,
              fromInsert: false,
            };
            this.pathVertexPending = null;
            this.panning = false;
            this.lastPointer = null;
            this.lastPathMouseScene = scenePoint;
            this.setCanvasCursor('move');
            event.preventDefault();
            return;
          }
          if (this.isPathDrawingActive()) {
            this.pathVertexPending = {
              startClient: { x: event.clientX, y: event.clientY },
              startScene: { x: scenePoint.x, y: scenePoint.y },
            };
            this.panning = false;
            this.lastPointer = null;
            this.lastPathMouseScene = scenePoint;
            this.setCanvasCursor('crosshair');
            event.preventDefault();
            return;
          }

          // Finished-path edit: click a segment to insert a vertex at the click point.
          const closed = this.handlers?.getActivePathClosed?.() ?? false;
          const segment = this.hitTestPathSegment(points, closed, scenePoint);
          if (segment && this.handlers?.onPathVertexInsert) {
            this.handlers.onPathVertexInsert({
              afterIndex: segment.afterIndex,
              x: segment.x,
              y: segment.y,
            });
            const newIndex = segment.afterIndex + 1;
            this.pathVertexDrag = {
              index: newIndex,
              startClient: { x: event.clientX, y: event.clientY },
              moved: false,
              fromInsert: true,
            };
            this.pathVertexPending = null;
            this.panning = false;
            this.lastPointer = null;
            this.lastPathMouseScene = scenePoint;
            this.handlers.onPathVertexMove?.({
              phase: 'start',
              index: newIndex,
              x: segment.x,
              y: segment.y,
            });
            this.syncPathToolOverlay();
            this.setCanvasCursor('move');
            event.preventDefault();
            return;
          }

          // Clicked empty space on the selected path chrome area — clear vertex selection.
          if (this.handlers?.getSelectedPathVertexIndex?.() != null) {
            this.handlers.onPathVertexSelect?.(null);
            this.syncPathToolOverlay();
          }
        }
      }
    }

    if (this.isAnnotationInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        const items = this.interactiveAnnotations();
        const selectedIds = this.selectedAnnotationIds();
        const additive = event.shiftKey || event.ctrlKey || event.metaKey;
        const boundsItems = items.map((item) => {
          const chrome = boundsFromTransformable(item);
          if (selectedIds.includes(item.id)) {
            return { id: item.id, ...chrome };
          }
          return { id: item.id, ...interactionBoundsFromTransformable(item) };
        });

        if (selectedIds.length > 1) {
          const selectedBounds = selectedIds
            .map((id) => items.find((item) => item.id === id))
            .filter((item): item is NonNullable<typeof item> => !!item)
            .map((item) => ({
              id: item.id,
              ...boundsFromTransformable(item),
            }));
          const group = unionBounds(selectedBounds);
          if (group) {
            const groupHandle = hitTestInteractiveAnnotations(
              [{ id: '__group__', ...group }],
              scenePoint,
              this.handleHitSize(),
              '__group__',
              this.annotationRotateHandleOffset(),
            )?.handle;
            if (groupHandle && groupHandle !== 'move') {
              const startAnnotations = items.filter((item) => selectedIds.includes(item.id));
              const primaryId = selectedIds[selectedIds.length - 1]!;
              this.annotationGesture = {
                id: primaryId,
                handle: groupHandle,
                startAnnotations,
                startPoint: scenePoint,
              };
              this.panning = false;
              this.lastPointer = null;
              this.emitAnnotationTransform('start', primaryId, startAnnotations);
              this.setCanvasCursor(cursorForAnnotationHandle(groupHandle));
              event.preventDefault();
              return;
            }
          }
        }

        const hit = hitTestInteractiveAnnotations(
          boundsItems,
          scenePoint,
          this.handleHitSize(),
          selectedIds,
          this.annotationRotateHandleOffset(),
        );
        if (hit) {
          if (additive) {
            this.handlers?.onAnnotationSelect?.(hit.id, { additive: true });
            this.panning = false;
            this.lastPointer = null;
            event.preventDefault();
            return;
          }

          const inMulti = selectedIds.includes(hit.id) && selectedIds.length > 1;
          if (inMulti) {
            const startAnnotations = items.filter((item) => selectedIds.includes(item.id));
            const primaryId = selectedIds[selectedIds.length - 1]!;
            this.annotationGesture = {
              id: primaryId,
              handle: 'move',
              startAnnotations,
              startPoint: scenePoint,
            };
            this.panning = false;
            this.lastPointer = null;
            this.emitAnnotationTransform('start', primaryId, startAnnotations);
            this.setCanvasCursor(cursorForAnnotationHandle('move'));
            event.preventDefault();
            return;
          }

          const target = items.find((item) => item.id === hit.id);
          if (target) {
            if (selectedIds.length !== 1 || selectedIds[0] !== hit.id) {
              this.handlers?.onAnnotationSelect?.(hit.id);
            }
            this.annotationGesture = {
              id: hit.id,
              handle: hit.handle,
              startAnnotations: [target],
              startPoint: scenePoint,
            };
            this.panning = false;
            this.lastPointer = null;
            this.emitAnnotationTransform('start', hit.id, [target]);
            this.setCanvasCursor(cursorForAnnotationHandle(hit.handle));
            event.preventDefault();
            return;
          }
        }

        if (selectedIds.length > 1) {
          const selectedBounds = selectedIds
            .map((id) => items.find((item) => item.id === id))
            .filter((item): item is NonNullable<typeof item> => !!item)
            .map((item) => ({
              id: item.id,
              ...boundsFromTransformable(item),
            }));
          const group = unionBounds(selectedBounds);
          if (group) {
            const groupBody = hitTestInteractiveAnnotations(
              [{ id: '__group__', ...group }],
              scenePoint,
              this.handleHitSize(),
              '__group__',
              this.annotationRotateHandleOffset(),
            )?.handle;
            if (groupBody === 'move') {
              const startAnnotations = items.filter((item) => selectedIds.includes(item.id));
              const primaryId = selectedIds[selectedIds.length - 1]!;
              this.annotationGesture = {
                id: primaryId,
                handle: 'move',
                startAnnotations,
                startPoint: scenePoint,
              };
              this.panning = false;
              this.lastPointer = null;
              this.emitAnnotationTransform('start', primaryId, startAnnotations);
              this.setCanvasCursor(cursorForAnnotationHandle('move'));
              event.preventDefault();
              return;
            }
          }
        }

        const createKind = this.handlers?.getAnnotationCreateKind?.() ?? null;
        if (createKind) {
          const polygonSides = this.handlers?.getPolygonSides?.() ?? 3;
          const origin = this.snapScenePoint(scenePoint, event);
          // Text: click-to-place. Shapes: Pintura-style — pending until drag; click unselects.
          if (createKind === 'text') {
            const created = this.buildCreatedAnnotation(createKind, origin, origin);
            this.annotationCreateGesture = {
              kind: createKind,
              startPoint: origin,
              annotation: created,
              polygonSides,
            };
            this.handlers?.onAnnotationCreate?.({
              phase: 'start',
              kind: createKind,
              annotation: created,
            });
          } else {
            this.annotationCreateGesture = {
              kind: createKind,
              startPoint: origin,
              annotation: null,
              polygonSides,
            };
          }
          this.panning = false;
          this.lastPointer = null;
          this.setCanvasCursor(createKind === 'text' ? 'text' : 'crosshair');
          event.preventDefault();
          return;
        }

        // Empty canvas without create mode: clear selection; allow pan.
        if (selectedIds.length > 0) {
          this.handlers?.onAnnotationSelect?.(null);
        }
      }
    }

    if (this.isDesignImageInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      const designImage = this.interactiveDesignImage();
      if (scenePoint) {
        const handle =
          hitTestDesignImageHandle(
            designImage,
            scenePoint,
            this.handleHitSize(),
            this.annotationRotateHandleOffset(),
          ) ?? (hitTestDesignImageBody(designImage, scenePoint) ? 'move' : null);
        if (handle) {
          this.designImageGesture = {
            handle,
            startDesignImage: designImage,
            startPoint: scenePoint,
          };
          this.panning = false;
          this.lastPointer = null;
          this.handlers?.onDesignImageTransform?.({
            phase: 'start',
            designImage,
          });
          this.syncDesignImageOverlay();
          this.setCanvasCursor(cursorForAnnotationHandle(handle));
          event.preventDefault();
          return;
        }
      }
    }

    if (this.isWatermarkInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      const watermark = this.interactiveWatermark();
      const bounds = watermark ? this.measureInteractiveWatermarkBounds(watermark) : null;
      if (scenePoint && watermark && bounds) {
        const handle = hitTestWatermarkHandle(
          bounds,
          scenePoint,
          this.handleHitSize(),
          this.annotationRotateHandleOffset(),
        );
        if (handle) {
          this.watermarkGesture = {
            handle,
            startWatermark: watermark,
            startBounds: bounds,
            startPoint: scenePoint,
          };
          this.panning = false;
          this.lastPointer = null;
          this.handlers?.onWatermarkTransform?.({
            phase: 'start',
            watermark,
          });
          this.setCanvasCursor(cursorForAnnotationHandle(handle));
          event.preventDefault();
          return;
        }
      }
    }

    if (this.isDrawingInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        this.drawingStroke = true;
        this.panning = false;
        this.lastPointer = null;
        this.handlers?.onDrawPoint?.({
          phase: 'start',
          x: scenePoint.x,
          y: scenePoint.y,
        });
        this.setCanvasCursor(this.drawingCursor());
        event.preventDefault();
        return;
      }
    }

    if (this.isPathToolInteractive() && event.button === 0) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        this.pathVertexPending = {
          startClient: { x: event.clientX, y: event.clientY },
          startScene: { x: scenePoint.x, y: scenePoint.y },
        };
        this.panning = false;
        this.lastPointer = null;
        this.setCanvasCursor('crosshair');
        event.preventDefault();
        return;
      }
    }

    this.panning = true;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.setCanvasCursor('grabbing');
    event.preventDefault();
  };

  private readonly onMouseMove = (opt: { e: Event }) => {
    const event = opt.e as MouseEvent;

    if (this.cropGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const sourceSize = this.currentDocument?.sourceSize;
      if (!scenePoint || !sourceSize) {
        return;
      }
      const next = applyCropDrag(
        this.cropGesture.startCrop,
        this.cropGesture.handle,
        this.cropGesture.startPoint,
        scenePoint,
        sourceSize,
      );
      this.handlers?.onCropChange?.(next);
      this.setCanvasCursor(cursorForCropHandle(this.cropGesture.handle));
      event.preventDefault();
      return;
    }

    if (this.focusGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      const next = applyFocusDrag(
        this.focusGesture.startFocus,
        this.focusGesture.handle,
        this.focusGesture.startPoint,
        scenePoint,
        output,
      );
      this.handlers?.onFocusChange?.(next);
      // Prefer grabbing while dragging so preview rebuilds cannot flash back to default/move.
      this.setCanvasCursor(
        this.focusGesture.handle === 'move'
          ? 'grabbing'
          : cursorForFocusHandle(this.focusGesture.handle),
      );
      event.preventDefault();
      return;
    }

    if (this.cropMaskGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      const next = applyCropMaskDrag(
        this.cropMaskGesture.startMask,
        this.cropMaskGesture.handle,
        this.cropMaskGesture.startPoint,
        scenePoint,
        output,
      );
      this.handlers?.onCropMaskChange?.(next);
      this.setCanvasCursor(
        this.cropMaskGesture.handle === 'move'
          ? 'grabbing'
          : cursorForCropMaskHandle(this.cropMaskGesture.handle),
      );
      event.preventDefault();
      return;
    }

    if (this.frameGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      const next = applyFrameDrag(
        this.frameGesture.startFrame,
        this.frameGesture.handle,
        scenePoint,
        output,
      );
      this.handlers?.onFrameChange?.(next);
      this.setCanvasCursor(
        this.frameGesture.handle === 'n' || this.frameGesture.handle === 's'
          ? 'ns-resize'
          : 'ew-resize',
      );
      event.preventDefault();
      return;
    }

    if (this.annotationGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      let next = applyGroupTransformableDrag(
        this.annotationGesture.startAnnotations,
        this.annotationGesture.handle,
        this.annotationGesture.startPoint,
        scenePoint,
        output,
      );
      next = applyMarkupSnapToGroupDrag(
        next,
        this.annotationGesture.handle,
        output,
        this.markupSnapConfig,
        { enabled: this.isMarkupSnapEnabled(event) },
      );
      this.emitAnnotationTransform('move', this.annotationGesture.id, next);
      this.setCanvasCursor(cursorForAnnotationHandle(this.annotationGesture.handle));
      event.preventDefault();
      return;
    }

    if (this.designImageGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      let next = applyDesignImageDrag(
        this.designImageGesture.startDesignImage,
        this.designImageGesture.handle,
        this.designImageGesture.startPoint,
        scenePoint,
        output,
      );
      next = applyMarkupSnapToDesignImage(
        next,
        this.designImageGesture.handle,
        output,
        this.markupSnapConfig,
        { enabled: this.isMarkupSnapEnabled(event) },
      );
      this.handlers?.onDesignImageTransform?.({
        phase: 'move',
        designImage: next,
      });
      this.syncDesignImageOverlay();
      this.setCanvasCursor(cursorForAnnotationHandle(this.designImageGesture.handle));
      event.preventDefault();
      return;
    }

    if (this.watermarkGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      const next = applyWatermarkDrag(
        this.watermarkGesture.startWatermark,
        this.watermarkGesture.startBounds,
        this.watermarkGesture.handle,
        this.watermarkGesture.startPoint,
        scenePoint,
        output,
      );
      this.handlers?.onWatermarkTransform?.({
        phase: 'move',
        watermark: next,
      });
      this.setCanvasCursor(cursorForAnnotationHandle(this.watermarkGesture.handle));
      event.preventDefault();
      return;
    }

    if (this.annotationCreateGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (!scenePoint || !output) {
        return;
      }
      const pointer = this.snapScenePoint(scenePoint, event);
      const gesture = this.annotationCreateGesture;
      if (!gesture.annotation) {
        // Pending shape create: wait for a meaningful drag before inserting.
        if (!isShapeCreateDragMeaningful(gesture.startPoint, pointer)) {
          this.setCanvasCursor('crosshair');
          event.preventDefault();
          return;
        }
        const created = this.buildCreatedAnnotation(
          gesture.kind,
          gesture.startPoint,
          pointer,
          undefined,
          gesture.polygonSides,
        );
        this.annotationCreateGesture = { ...gesture, annotation: created };
        this.handlers?.onAnnotationCreate?.({
          phase: 'start',
          kind: gesture.kind,
          annotation: created,
        });
        this.setCanvasCursor(gesture.kind === 'text' ? 'text' : 'crosshair');
        event.preventDefault();
        return;
      }
      const next = this.buildCreatedAnnotation(
        gesture.kind,
        gesture.startPoint,
        pointer,
        gesture.annotation.id,
        gesture.polygonSides,
      );
      this.annotationCreateGesture = { ...gesture, annotation: next };
      this.handlers?.onAnnotationCreate?.({
        phase: 'move',
        kind: gesture.kind,
        annotation: next,
      });
      this.setCanvasCursor(gesture.kind === 'text' ? 'text' : 'crosshair');
      event.preventDefault();
      return;
    }

    if (this.drawingStroke) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        this.handlers?.onDrawPoint?.({
          phase: 'move',
          x: scenePoint.x,
          y: scenePoint.y,
        });
      }
      this.setCanvasCursor(this.drawingCursor());
      event.preventDefault();
      return;
    }

    if (this.redactTransformGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      const output = this.currentDocument?.output;
      if (scenePoint && output) {
        const gesture = this.redactTransformGesture;
        this.handlers?.onRedactionChange?.(
          applyRedactionDrag(
            gesture.startRegion,
            gesture.handle,
            gesture.startPoint,
            scenePoint,
            output,
          ),
        );
      }
      this.setCanvasCursor(cursorForRedactionHandle(this.redactTransformGesture.handle));
      event.preventDefault();
      return;
    }

    if (this.redactGesture) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        this.redactGesture.current = { x: scenePoint.x, y: scenePoint.y };
        this.syncRedactOverlay();
        this.canvas?.requestRenderAll();
      }
      this.setCanvasCursor('crosshair');
      event.preventDefault();
      return;
    }

    if (this.pathVertexDrag) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        const drag = this.pathVertexDrag;
        const dx = event.clientX - drag.startClient.x;
        const dy = event.clientY - drag.startClient.y;
        if (!drag.moved && dx * dx + dy * dy > 9) {
          drag.moved = true;
          this.handlers?.onPathVertexMove?.({
            phase: 'start',
            index: drag.index,
            x: scenePoint.x,
            y: scenePoint.y,
          });
        }
        if (drag.moved) {
          this.handlers?.onPathVertexMove?.({
            phase: 'move',
            index: drag.index,
            x: scenePoint.x,
            y: scenePoint.y,
          });
        }
        this.lastPathMouseScene = scenePoint;
        this.syncPathToolOverlay();
        this.setCanvasCursor('move');
      }
      event.preventDefault();
      return;
    }

    const pathPoints = !this.panning ? (this.handlers?.getActivePathPoints?.() ?? null) : null;
    const pathDrawing = this.isPathDrawingActive();
    if ((this.isPathToolInteractive() || (pathPoints && pathPoints.length > 0)) && !this.panning) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        this.lastPathMouseScene = scenePoint;
        this.syncPathToolOverlay();
      }
    }

    if (pathPoints && pathPoints.length > 0) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        const vertexIndex = this.hitTestPathVertex(pathPoints, scenePoint);
        if (vertexIndex >= 0) {
          this.setCanvasCursor('move');
        } else if (pathDrawing) {
          this.setCanvasCursor('crosshair');
        } else {
          const closed = this.handlers?.getActivePathClosed?.() ?? false;
          const segment = this.hitTestPathSegment(pathPoints, closed, scenePoint);
          this.setCanvasCursor(segment ? 'copy' : 'default');
        }
      }
    } else if (this.hasActivePointerGesture() || this.panning) {
      // Keep gesture cursor; skip hover hit-tests that fight mid-drag updates.
    } else if (this.handlers?.isColorPickerActive?.()) {
      this.setCanvasCursor('crosshair');
    } else if (this.isRedactInteractive()) {
      this.updateRedactHoverCursor(event);
    } else if (this.isCropInteractive()) {
      this.updateCropHoverCursor(event);
    } else if (this.isFocusInteractive()) {
      this.updateFocusHoverCursor(event);
    } else if (this.isCropMaskInteractive()) {
      this.updateCropMaskHoverCursor(event);
    } else if (this.isFrameInteractive()) {
      this.updateFrameHoverCursor(event);
    } else if (
      this.isAnnotationInteractive() ||
      this.isDesignImageInteractive() ||
      this.isWatermarkInteractive()
    ) {
      this.updateInteractiveSelectionHoverCursor(event);
    } else if (this.isDrawingInteractive()) {
      this.setCanvasCursor(this.drawingCursor());
    } else if (this.isPathToolInteractive()) {
      this.setCanvasCursor('crosshair');
    }

    if (!this.panning || !this.lastPointer) {
      return;
    }
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.handlers?.onPan?.({ dx, dy });
    this.setCanvasCursor('grabbing');
  };

  private readonly onMouseUp = (opt?: { e?: Event }) => {
    if (this.pathVertexDrag) {
      const drag = this.pathVertexDrag;
      this.pathVertexDrag = null;
      const event = opt?.e as MouseEvent | undefined;
      const scenePoint = event ? this.scenePointFromEvent(event) : null;
      const points = this.handlers?.getActivePathPoints?.() ?? null;

      if (
        !drag.moved &&
        drag.index === 0 &&
        points &&
        points.length >= 3 &&
        this.isPathDrawingActive()
      ) {
        // Click (no drag) on the first vertex closes the in-progress path.
        const first = points[0]!;
        this.handlers?.onPathVertex?.({
          type: 'click',
          x: first.x,
          y: first.y,
        });
      } else if (!drag.moved && !this.isPathDrawingActive()) {
        // Click (no drag) selects the vertex and shows the delete control.
        if (drag.fromInsert && points && drag.index >= 0 && drag.index < points.length) {
          const point = points[drag.index]!;
          this.handlers?.onPathVertexMove?.({
            phase: 'end',
            index: drag.index,
            x: point.x,
            y: point.y,
          });
        }
        this.handlers?.onPathVertexSelect?.(drag.index);
      } else if (drag.moved && scenePoint) {
        this.handlers?.onPathVertexMove?.({
          phase: 'end',
          index: drag.index,
          x: scenePoint.x,
          y: scenePoint.y,
        });
        if (!this.isPathDrawingActive()) {
          this.handlers?.onPathVertexSelect?.(drag.index);
        }
      } else if (points && drag.index >= 0 && drag.index < points.length) {
        const point = points[drag.index]!;
        this.handlers?.onPathVertexMove?.({
          phase: 'end',
          index: drag.index,
          x: point.x,
          y: point.y,
        });
        if (!this.isPathDrawingActive()) {
          this.handlers?.onPathVertexSelect?.(drag.index);
        }
      }

      if (scenePoint) {
        this.lastPathMouseScene = scenePoint;
      }
      this.syncPathToolOverlay();
      this.setCanvasCursor(this.isPathToolInteractive() ? 'crosshair' : 'grab');
      return;
    }

    if (this.pathVertexPending) {
      const pending = this.pathVertexPending;
      this.pathVertexPending = null;
      const event = opt?.e as MouseEvent | undefined;
      if (event) {
        const dx = event.clientX - pending.startClient.x;
        const dy = event.clientY - pending.startClient.y;
        if (dx * dx + dy * dy <= 25) {
          this.handlers?.onPathVertex?.({
            type: 'click',
            x: pending.startScene.x,
            y: pending.startScene.y,
          });
          this.lastPathMouseScene = {
            x: pending.startScene.x,
            y: pending.startScene.y,
          };
          this.syncPathToolOverlay();
        }
      }
      this.setCanvasCursor(this.isPathToolInteractive() ? 'crosshair' : 'grab');
      return;
    }

    if (this.drawingStroke) {
      const event = opt?.e as MouseEvent | undefined;
      const scenePoint = event ? this.scenePointFromEvent(event) : null;
      this.handlers?.onDrawPoint?.({
        phase: 'end',
        x: scenePoint?.x ?? 0,
        y: scenePoint?.y ?? 0,
      });
      this.drawingStroke = false;
      this.setCanvasCursor(this.isDrawingInteractive() ? this.drawingCursor() : 'grab');
      return;
    }

    if (this.redactGesture) {
      const gesture = this.redactGesture;
      this.redactGesture = null;
      const output = this.currentDocument?.output;
      if (output && output.width > 0 && output.height > 0) {
        const x0 = Math.min(gesture.start.x, gesture.current.x);
        const y0 = Math.min(gesture.start.y, gesture.current.y);
        const x1 = Math.max(gesture.start.x, gesture.current.x);
        const y1 = Math.max(gesture.start.y, gesture.current.y);
        const width = x1 - x0;
        const height = y1 - y0;
        if (width >= 2 && height >= 2) {
          this.handlers?.onRedactionAdd?.({
            id: createRedactionId(),
            x: x0 / output.width,
            y: y0 / output.height,
            width: width / output.width,
            height: height / output.height,
          });
        }
      }
      this.syncRedactOverlay();
      this.canvas?.requestRenderAll();
      this.setCanvasCursor(this.handlers?.isRedactActive?.() ? 'crosshair' : 'grab');
      return;
    }

    if (this.redactTransformGesture) {
      this.redactTransformGesture = null;
      this.syncRedactOverlay();
      this.canvas?.requestRenderAll();
      const event = opt?.e as MouseEvent | undefined;
      if (event) {
        this.updateRedactHoverCursor(event);
      } else {
        this.setCanvasCursor(this.handlers?.isRedactActive?.() ? 'crosshair' : 'grab');
      }
      return;
    }

    if (this.annotationCreateGesture) {
      const event = opt?.e as MouseEvent | undefined;
      const scenePoint = event ? this.scenePointFromEvent(event) : null;
      const gesture = this.annotationCreateGesture;
      this.annotationCreateGesture = null;

      // Shape click without drag → clear selection (Pintura-style); do not place a shape.
      if (!gesture.annotation) {
        this.handlers?.onAnnotationSelect?.(null);
        this.panning = false;
        this.lastPointer = null;
        if (opt?.e) {
          this.updateAnnotationHoverCursor(opt.e as MouseEvent);
        } else {
          this.setCanvasCursor('default');
        }
        return;
      }

      let annotation = gesture.annotation;
      if (scenePoint) {
        const pointer = this.snapScenePoint(scenePoint, event);
        annotation = this.buildCreatedAnnotation(
          gesture.kind,
          gesture.startPoint,
          pointer,
          gesture.annotation.id,
          gesture.polygonSides,
        );
      }
      this.handlers?.onAnnotationCreate?.({
        phase: 'end',
        kind: gesture.kind,
        annotation,
      });
      this.panning = false;
      this.lastPointer = null;
      if (opt?.e) {
        this.updateAnnotationHoverCursor(opt.e as MouseEvent);
      } else {
        this.setCanvasCursor('default');
      }
      return;
    }

    if (this.annotationGesture) {
      const event = opt?.e as MouseEvent | undefined;
      const scenePoint = event ? this.scenePointFromEvent(event) : null;
      const output = this.currentDocument?.output;
      const gesture = this.annotationGesture;
      let annotations = gesture.startAnnotations;
      if (scenePoint && output) {
        annotations = applyGroupTransformableDrag(
          gesture.startAnnotations,
          gesture.handle,
          gesture.startPoint,
          scenePoint,
          output,
        );
        annotations = applyMarkupSnapToGroupDrag(
          annotations,
          gesture.handle,
          output,
          this.markupSnapConfig,
          { enabled: this.isMarkupSnapEnabled(event) },
        );
      }
      this.annotationGesture = null;
      this.emitAnnotationTransform('end', gesture.id, annotations);
      this.panning = false;
      this.lastPointer = null;
      if (opt?.e) {
        this.updateAnnotationHoverCursor(opt.e as MouseEvent);
      } else {
        this.setCanvasCursor('default');
      }
      return;
    }

    if (this.designImageGesture) {
      const event = opt?.e as MouseEvent | undefined;
      const scenePoint = event ? this.scenePointFromEvent(event) : null;
      const output = this.currentDocument?.output;
      const gesture = this.designImageGesture;
      let designImage = gesture.startDesignImage;
      if (scenePoint && output) {
        designImage = applyDesignImageDrag(
          gesture.startDesignImage,
          gesture.handle,
          gesture.startPoint,
          scenePoint,
          output,
        );
        designImage = applyMarkupSnapToDesignImage(
          designImage,
          gesture.handle,
          output,
          this.markupSnapConfig,
          { enabled: this.isMarkupSnapEnabled(event) },
        );
      }
      this.designImageGesture = null;
      this.handlers?.onDesignImageTransform?.({
        phase: 'end',
        designImage,
      });
      this.panning = false;
      this.lastPointer = null;
      this.syncInteractiveSelectionChrome();
      if (opt?.e) {
        this.updateInteractiveSelectionHoverCursor(opt.e as MouseEvent);
      } else {
        this.setCanvasCursor(this.isDesignImageInteractive() ? 'move' : 'grab');
      }
      return;
    }

    if (this.watermarkGesture) {
      const event = opt?.e as MouseEvent | undefined;
      const scenePoint = event ? this.scenePointFromEvent(event) : null;
      const output = this.currentDocument?.output;
      const gesture = this.watermarkGesture;
      let watermark = gesture.startWatermark;
      if (scenePoint && output) {
        watermark = applyWatermarkDrag(
          gesture.startWatermark,
          gesture.startBounds,
          gesture.handle,
          gesture.startPoint,
          scenePoint,
          output,
        );
      }
      this.watermarkGesture = null;
      this.handlers?.onWatermarkTransform?.({
        phase: 'end',
        watermark,
      });
      this.panning = false;
      this.lastPointer = null;
      if (opt?.e) {
        this.updateWatermarkHoverCursor(opt.e as MouseEvent);
      } else {
        this.setCanvasCursor(this.isWatermarkInteractive() ? 'move' : 'grab');
      }
      return;
    }

    this.cropGesture = null;
    this.focusGesture = null;
    this.cropMaskGesture = null;
    this.frameGesture = null;
    this.panning = false;
    this.lastPointer = null;
    if (this.isCropInteractive() && opt?.e) {
      this.updateCropHoverCursor(opt.e as MouseEvent);
      return;
    }
    if (this.isFocusInteractive() && opt?.e) {
      this.updateFocusHoverCursor(opt.e as MouseEvent);
      return;
    }
    if (this.isCropMaskInteractive() && opt?.e) {
      this.updateCropMaskHoverCursor(opt.e as MouseEvent);
      return;
    }
    if (
      opt?.e &&
      (this.isAnnotationInteractive() ||
        this.isDesignImageInteractive() ||
        this.isWatermarkInteractive())
    ) {
      this.updateInteractiveSelectionHoverCursor(opt.e as MouseEvent);
      return;
    }
    this.setCanvasCursor(this.idleInteractionCursor());
  };

  async mount(host: HTMLElement, options: RendererMountOptions): Promise<void> {
    this.destroyCanvasOnly();
    this.host = host;

    const canvasEl = document.createElement('canvas');
    canvasEl.width = options.width;
    canvasEl.height = options.height;
    canvasEl.style.display = 'block';
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    host.replaceChildren(canvasEl);
    this.canvasEl = canvasEl;

    this.canvas = new Canvas(canvasEl, {
      width: options.width,
      height: options.height,
      selection: false,
      // Avoid extra paints while swapping the composed display image.
      renderOnAddRemove: false,
      // Transparent so host stage CSS (checkerboard / canvasBackground) shows through.
      backgroundColor: options.backgroundColor ?? 'transparent',
      defaultCursor: 'grab',
    });

    this.canvas.on('mouse:down', this.onMouseDown);
    this.canvas.on('mouse:move', this.onMouseMove);
    this.canvas.on('mouse:up', this.onMouseUp);
    this.canvas.on('mouse:dblclick', this.onDoubleClick);
    globalThis.addEventListener?.('keydown', this.onPanKeyDown, true);
    globalThis.addEventListener?.('keyup', this.onPanKeyUp, true);
    globalThis.addEventListener?.('blur', this.onPanKeyBlur);
    this.setCanvasCursor('grab');
  }

  setInteractionHandlers(handlers: ViewportInteractionHandlers | null): void {
    this.handlers = handlers;
    this.syncInteractiveSelectionChrome();
  }

  cancelActiveGesture(): void {
    if (this.redactGesture || this.redactTransformGesture) {
      const transform = this.redactTransformGesture;
      this.redactGesture = null;
      this.redactTransformGesture = null;
      if (transform) {
        this.handlers?.onRedactionChange?.(transform.startRegion);
      }
      this.syncRedactOverlay();
      this.canvas?.requestRenderAll();
      this.setCanvasCursor(this.handlers?.isRedactActive?.() ? 'crosshair' : 'grab');
      return;
    }
    if (this.annotationCreateGesture) {
      const gesture = this.annotationCreateGesture;
      this.annotationCreateGesture = null;
      if (gesture.annotation) {
        this.handlers?.onAnnotationCreate?.({
          phase: 'cancel',
          kind: gesture.kind,
          annotation: gesture.annotation,
        });
      }
      this.setCanvasCursor(this.idleInteractionCursor());
      return;
    }
    if (this.annotationGesture) {
      const gesture = this.annotationGesture;
      this.annotationGesture = null;
      this.emitAnnotationTransform('cancel', gesture.id, gesture.startAnnotations);
      this.setCanvasCursor(this.idleInteractionCursor());
      return;
    }
    if (this.designImageGesture) {
      const gesture = this.designImageGesture;
      this.designImageGesture = null;
      this.handlers?.onDesignImageTransform?.({
        phase: 'cancel',
        designImage: gesture.startDesignImage,
      });
      this.setCanvasCursor(this.isDesignImageInteractive() ? 'move' : 'grab');
      return;
    }
    if (this.watermarkGesture) {
      const gesture = this.watermarkGesture;
      this.watermarkGesture = null;
      this.handlers?.onWatermarkTransform?.({
        phase: 'cancel',
        watermark: gesture.startWatermark,
      });
      this.setCanvasCursor(this.isWatermarkInteractive() ? 'move' : 'grab');
      return;
    }
    if (this.drawingStroke) {
      this.drawingStroke = false;
      this.setCanvasCursor(this.isDrawingInteractive() ? this.drawingCursor() : 'grab');
      return;
    }
    if (this.redactGesture || this.redactTransformGesture) {
      this.redactGesture = null;
      this.redactTransformGesture = null;
      this.syncRedactOverlay();
      this.canvas?.requestRenderAll();
      this.setCanvasCursor(this.handlers?.isRedactActive?.() ? 'crosshair' : 'grab');
      return;
    }
    if (this.pathVertexDrag) {
      const drag = this.pathVertexDrag;
      this.pathVertexDrag = null;
      const points = this.handlers?.getActivePathPoints?.() ?? null;
      if (points && drag.index >= 0 && drag.index < points.length) {
        const point = points[drag.index]!;
        this.handlers?.onPathVertexMove?.({
          phase: 'end',
          index: drag.index,
          x: point.x,
          y: point.y,
        });
      }
      this.syncPathToolOverlay();
      this.setCanvasCursor(this.idleInteractionCursor());
      return;
    }
    if (this.pathVertexPending) {
      this.pathVertexPending = null;
      this.setCanvasCursor(this.idleInteractionCursor());
      return;
    }
    this.cropGesture = null;
    this.focusGesture = null;
    this.cropMaskGesture = null;
    this.frameGesture = null;
    this.panning = false;
    this.lastPointer = null;
  }

  async loadSource(asset: NormalizedImageAsset): Promise<void> {
    if (!this.canvas) {
      throw new Error('Renderer is not mounted');
    }

    // HTMLImageElement decode (used by Fabric) already applies EXIF in modern browsers.
    const image = await FabricImage.fromURL(asset.objectUrl, {
      crossOrigin: 'anonymous',
    });

    image.set({
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      left: asset.naturalWidth / 2,
      top: asset.naturalHeight / 2,
      angle: 0,
      flipX: false,
      flipY: false,
    });

    this.canvas.clear();
    this.disposeDisplayImage();
    this.documentPlate = null;
    this.sourceImage?.dispose();
    this.removeCropOverlay();
    this.removeAnnotationOverlay();
    this.clearPathToolOverlay();
    this.clearLayerCache();
    this.sourceImage = image;
    this.displayImage = image;
    this.asset = asset;
    this.canvas.add(image);
    this.canvas.requestRenderAll();
  }

  render(snapshot: ReadonlyImageDocument): void {
    this.currentDocument = snapshot;
    // Commits replace live preview; clear so adapter state matches the store.
    this.preview = null;
    this.scheduleRefresh();
  }

  renderPreview(preview: ReadonlyEditorPreview | null): void {
    this.preview = preview;
    if (this.compareDocument) {
      return;
    }
    this.scheduleRefresh();
  }

  setCompareOriginal(baseline: ReadonlyImageDocument | null): void {
    this.compareDocument = baseline;
    this.clearLayerCache();
    this.scheduleRefresh();
  }

  setHostFilterFunctions(
    functions: Readonly<Record<string, FilterColorMatrixSource>> | null,
  ): void {
    this.hostFilterFunctions = functions;
    this.clearLayerCache();
    this.scheduleRefresh();
  }

  setMarkupSnapChrome(chrome: MarkupSnapChrome | null): void {
    this.markupSnapChrome = chrome;
    this.syncMarkupSnapOverlay();
    this.canvas?.requestRenderAll();
  }

  setMarkupSnapConfig(config: MarkupSnapConfig | null): void {
    this.markupSnapConfig = config;
  }

  updateViewport(viewport: ReadonlyViewportState): void {
    if (!this.canvas) {
      return;
    }
    const previousZoom = this.viewportZoom;
    this.viewportZoom = viewport.zoom;
    this.canvas.setViewportTransform([
      viewport.zoom,
      0,
      0,
      viewport.zoom,
      viewport.panX,
      viewport.panY,
    ]);
    if (this.isCropInteractive()) {
      this.syncCropOverlay();
    } else if (this.isFocusInteractive()) {
      this.syncFocusOverlay();
    } else if (this.isCropMaskInteractive()) {
      this.syncCropMaskOverlay();
    } else if (this.isFrameInteractive()) {
      this.syncFrameOverlay();
    } else if (
      this.isAnnotationInteractive() ||
      this.isDesignImageInteractive() ||
      this.isWatermarkInteractive()
    ) {
      this.syncInteractiveSelectionChrome();
    }
    this.syncMarkupSnapOverlay();
    // Recompose when zoom rises enough that the current preview budget is too low.
    if (
      this.displayImage &&
      this.displayImage !== this.sourceImage &&
      this.currentDocument &&
      viewport.zoom > previousZoom * 1.25
    ) {
      this.scheduleRefresh();
      return;
    }
    this.canvas.requestRenderAll();
  }

  resize(width: number, height: number): void {
    this.canvas?.setDimensions({ width, height });
  }

  async exportRaster(options: RasterExportOptions): Promise<Blob> {
    if (!this.sourceImage || !this.currentDocument) {
      throw new ImageEditorError('EXPORT_FAILED', 'No image loaded');
    }

    const format = options.format === 'jpeg' ? 'jpeg' : options.format === 'webp' ? 'webp' : 'png';
    const quality = options.quality ?? 1;
    const doc = this.currentDocument;
    const crop = this.preview?.crop !== undefined ? this.preview.crop : doc.crop;
    const output = this.composeDocumentCanvas({
      document: doc,
      crop,
      adjustments: this.activeAdjustments(doc),
      effects: this.activeEffects(doc),
      filters: this.activeFilters(doc),
      focus: this.activeFocus(doc),
      cropMask: this.activeCropMask(doc),
      colorOverlay: this.activeColorOverlay(doc),
      fill: this.activeFill(doc),
      frame: this.activeFrame(doc),
      annotations: this.activeAnnotations(doc),
      watermark: this.activeWatermark(doc),
      // Stage canvasBackground is never applied here (Phase 4.8.6).
      backgroundColor:
        format === 'jpeg' ? (options.backgroundColor ?? '#ffffff') : options.backgroundColor,
    });

    const exportSize = resolveExportDimensions(output.width, output.height, options);
    const rasterCanvas =
      exportSize.width === output.width && exportSize.height === output.height
        ? output
        : coverToSize(output, exportSize.width, exportSize.height);

    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    try {
      // Prefer toBlob — avoids fetch(data:) which strict connect-src CSP often blocks.
      const blob = await canvasToBlob(rasterCanvas, mime, quality);
      if (blob) {
        return blob;
      }
      const dataUrl = rasterCanvas.toDataURL(mime, quality);
      const response = await fetch(dataUrl);
      return response.blob();
    } catch (error) {
      if (isSecurityError(error)) {
        throw new ImageEditorError(
          'TAINTED_CANVAS',
          'Canvas is tainted and cannot be exported. Use a same-origin or CORS-enabled image source.',
          { cause: error },
        );
      }
      throw new ImageEditorError('EXPORT_FAILED', 'Failed to export raster image', {
        cause: error,
      });
    }
  }

  /**
   * Pintura-style filter preset thumbnails: square JPEG data-URLs from the
   * current document (crop + adjustments + effects, no annotations/watermark).
   */
  async generateFilterThumbnails(
    options: FilterThumbnailOptions = {},
  ): Promise<Readonly<Partial<Record<FilterPresetId, string>>>> {
    if (!this.sourceImage || !this.currentDocument) {
      return {};
    }

    const signal = options.signal;
    throwIfAborted(signal);

    const size = Math.max(24, Math.round(options.size ?? FILTER_THUMB_SIZE));
    const presets = options.presets ?? DEFAULT_FILTER_PRESETS;
    const doc = this.currentDocument;

    // Compose near thumb resolution — thumbs are tiny previews, not export quality.
    const composed = this.composeDocumentCanvas({
      document: doc,
      crop: doc.crop,
      adjustments: normalizeAdjustments(doc.adjustments),
      effects: normalizeEffects(doc.effects),
      filters: createInitialFilters(),
      focus: createInitialFocus(),
      redactions: createInitialRedactions(),
      cropMask: createInitialCropMask(),
      colorOverlay: createInitialColorOverlay(),
      fill: createInitialFill(),
      frame: createInitialFrame(),
      annotations: [],
      watermark: createInitialWatermark(),
      maxLongEdge: size,
      backgroundColor: '#ffffff',
    });
    throwIfAborted(signal);
    const baseThumb = coverToSquare(composed, size);
    const thumbs: Partial<Record<FilterPresetId, string>> = {};

    for (const preset of presets) {
      throwIfAborted(signal);
      const filtered =
        preset === 'none'
          ? baseThumb
          : this.applyFilterPresetToCanvas(cloneCanvas(baseThumb), { preset });
      thumbs[preset] = filtered.toDataURL('image/jpeg', 0.65);
      // Yield so opening Filters stays responsive while thumbs bake.
      await Promise.resolve();
    }

    return thumbs;
  }

  /**
   * Sample one composed-document pixel (export-quality) at scene/output coords.
   */
  async samplePixelAtScenePoint(x: number, y: number): Promise<RgbaColor | null> {
    if (!this.sourceImage || !this.currentDocument) {
      return null;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    const doc = this.currentDocument;
    const composed = this.composeDocumentCanvas({
      document: doc,
      crop: this.preview?.crop !== undefined ? this.preview.crop : doc.crop,
      adjustments: this.activeAdjustments(doc),
      effects: this.activeEffects(doc),
      filters: this.activeFilters(doc),
      focus: this.activeFocus(doc),
      cropMask: this.activeCropMask(doc),
      colorOverlay: this.activeColorOverlay(doc),
      fill: this.activeFill(doc),
      frame: this.activeFrame(doc),
      annotations: this.activeAnnotations(doc),
      watermark: this.activeWatermark(doc),
      backgroundColor: undefined,
    });

    const px = Math.max(0, Math.min(composed.width - 1, Math.floor(x)));
    const py = Math.max(0, Math.min(composed.height - 1, Math.floor(y)));

    try {
      const ctx = composed.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return null;
      }
      const data = ctx.getImageData(px, py, 1, 1).data;
      return {
        r: data[0] ?? 0,
        g: data[1] ?? 0,
        b: data[2] ?? 0,
        a: (data[3] ?? 0) / 255,
      };
    } catch (error) {
      if (isSecurityError(error)) {
        throw new ImageEditorError(
          'TAINTED_CANVAS',
          'Canvas is tainted and cannot be sampled. Use a same-origin or CORS-enabled image source.',
          { cause: error },
        );
      }
      throw error;
    }
  }

  clear(): void {
    this.cancelScheduledRefresh();
    this.disposeDisplayImage();
    this.removeDocumentPlate();
    this.sourceImage?.dispose();
    this.sourceImage = null;
    this.removeCropOverlay();
    this.removeFocusOverlay();
    this.removeCropMaskOverlay();
    this.removeAnnotationOverlay();
    this.removeRedactOverlay();
    this.clearPathToolOverlay();
    this.clearMarkupSnapOverlay();
    this.clearLayerCache();
    this.currentDocument = null;
    this.compareDocument = null;
    this.preview = null;
    this.asset = null;
    this.cropGesture = null;
    this.focusGesture = null;
    this.cropMaskGesture = null;
    this.frameGesture = null;
    this.annotationGesture = null;
    this.annotationCreateGesture = null;
    this.designImageGesture = null;
    this.watermarkGesture = null;
    this.drawingStroke = false;
    this.redactGesture = null;
    this.redactTransformGesture = null;
    this.pathVertexPending = null;
    this.pathVertexDrag = null;
    this.canvas?.clear();
  }

  destroy(): void {
    this.destroyCanvasOnly();
    this.host?.replaceChildren();
    this.host = null;
    this.handlers = null;
  }

  /** Test helper — must not be used by Core. */
  getImagePointForTests(): Point | null {
    return this.displayImage
      ? new Point(this.displayImage.left ?? 0, this.displayImage.top ?? 0)
      : null;
  }

  private scheduleRefresh(): void {
    if (this.refreshRafId != null) {
      return;
    }
    this.refreshRafId = requestAnimationFrame(() => {
      this.refreshRafId = null;
      this.refreshDisplay();
      this.canvas?.requestRenderAll();
    });
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshRafId == null) {
      return;
    }
    cancelAnimationFrame(this.refreshRafId);
    this.refreshRafId = null;
  }

  private clearLayerCache(): void {
    this.layerCache = null;
  }

  private refreshDisplay(): void {
    if (!this.canvas || !this.sourceImage || !this.currentDocument) {
      return;
    }

    if (this.compareDocument) {
      this.removeCropOverlay();
      this.removeFocusOverlay();
      this.removeCropMaskOverlay();
      this.removeAnnotationOverlay();
      this.removeRedactOverlay();
      this.clearPathToolOverlay();
      this.clearMarkupSnapOverlay();
      this.showComposedOutput();
      return;
    }

    if (this.isCropInteractive()) {
      this.showSourceForCrop();
      this.syncCropOverlay();
      this.removeFocusOverlay();
      this.removeCropMaskOverlay();
      this.removeAnnotationOverlay();
      this.removeRedactOverlay();
      this.clearPathToolOverlay();
      return;
    }

    this.removeCropOverlay();
    this.showComposedOutput();
    this.syncRedactOverlay();
    if (this.isFocusInteractive()) {
      this.syncFocusOverlay();
      this.removeCropMaskOverlay();
      this.removeFrameOverlay();
      this.removeAnnotationOverlay();
    } else if (this.isCropMaskInteractive()) {
      this.syncCropMaskOverlay();
      this.removeFocusOverlay();
      this.removeFrameOverlay();
      this.removeAnnotationOverlay();
    } else if (this.isFrameInteractive()) {
      this.syncFrameOverlay();
      this.removeFocusOverlay();
      this.removeCropMaskOverlay();
      this.removeAnnotationOverlay();
    } else if (
      this.isAnnotationInteractive() ||
      this.isDesignImageInteractive() ||
      this.isWatermarkInteractive()
    ) {
      this.removeFocusOverlay();
      this.removeCropMaskOverlay();
      this.removeFrameOverlay();
      this.syncInteractiveSelectionChrome();
    } else {
      this.removeFocusOverlay();
      this.removeCropMaskOverlay();
      this.removeAnnotationOverlay();
    }
    if (this.shouldShowPathVertexOverlay()) {
      this.syncPathToolOverlay();
    } else {
      this.clearPathToolOverlay();
    }
    this.syncMarkupSnapOverlay();
  }

  private isMarkupSnapEnabled(event?: MouseEvent | PointerEvent | null): boolean {
    if (!event) {
      return true;
    }
    // Pintura parity: Ctrl/Cmd temporarily disables snap.
    return !(event.ctrlKey || event.metaKey);
  }

  private snapScenePoint(
    point: { readonly x: number; readonly y: number },
    event?: MouseEvent | PointerEvent | null,
  ): { readonly x: number; readonly y: number } {
    const output = this.currentDocument?.output;
    if (!output) {
      return point;
    }
    const snapped = snapMarkupPoint(point, output, this.markupSnapConfig, {
      enabled: this.isMarkupSnapEnabled(event),
    });
    return { x: snapped.x, y: snapped.y };
  }

  private syncMarkupSnapOverlay(): void {
    if (!this.canvas) {
      this.clearMarkupSnapOverlay();
      return;
    }
    const chrome = this.markupSnapChrome;
    if (!chrome || this.compareDocument || this.isCropInteractive()) {
      this.clearMarkupSnapOverlay();
      return;
    }

    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 1 / zoom;
    const { width, height } = chrome.output;
    const nextGrid: Line[] = [];
    const nextGuides: Line[] = [];

    if (
      markupGridVisible(
        resolveMarkupSnapConfig({
          gridSize: chrome.gridSize,
          showGrid: chrome.showGrid,
        }),
      )
    ) {
      const step = chrome.gridSize;
      for (let x = 0; x <= width + 0.5; x += step) {
        nextGrid.push(
          new Line([x, 0, x, height], {
            stroke: 'rgba(255, 255, 255, 0.18)',
            strokeWidth,
            selectable: false,
            evented: false,
            objectCaching: false,
          }),
        );
      }
      for (let y = 0; y <= height + 0.5; y += step) {
        nextGrid.push(
          new Line([0, y, width, y], {
            stroke: 'rgba(255, 255, 255, 0.18)',
            strokeWidth,
            selectable: false,
            evented: false,
            objectCaching: false,
          }),
        );
      }
    }

    for (const guide of chrome.guides) {
      if (guide.axis === 'x') {
        nextGuides.push(
          new Line([guide.position, 0, guide.position, height], {
            stroke: 'rgba(64, 196, 255, 0.85)',
            strokeWidth: 1.25 / zoom,
            strokeDashArray: [6 / zoom, 4 / zoom],
            selectable: false,
            evented: false,
            objectCaching: false,
          }),
        );
      } else {
        nextGuides.push(
          new Line([0, guide.position, width, guide.position], {
            stroke: 'rgba(64, 196, 255, 0.85)',
            strokeWidth: 1.25 / zoom,
            strokeDashArray: [6 / zoom, 4 / zoom],
            selectable: false,
            evented: false,
            objectCaching: false,
          }),
        );
      }
    }

    this.clearMarkupSnapOverlay();
    this.markupGridLines = nextGrid;
    this.markupGuideLines = nextGuides;
    for (const line of nextGrid) {
      this.canvas.add(line);
    }
    for (const line of nextGuides) {
      this.canvas.add(line);
    }
    for (const line of nextGuides) {
      this.canvas.bringObjectToFront(line);
    }
  }

  private clearMarkupSnapOverlay(): void {
    if (!this.canvas) {
      this.markupGridLines = [];
      this.markupGuideLines = [];
      return;
    }
    for (const line of this.markupGridLines) {
      this.canvas.remove(line);
    }
    for (const line of this.markupGuideLines) {
      this.canvas.remove(line);
    }
    this.markupGridLines = [];
    this.markupGuideLines = [];
  }

  private showSourceForCrop(): void {
    if (!this.canvas || !this.sourceImage || !this.currentDocument) {
      return;
    }

    this.removeDocumentPlate();

    if (this.displayImage !== this.sourceImage) {
      this.disposeDisplayImage();
      this.displayImage = this.sourceImage;
      this.canvas.add(this.sourceImage);
    }

    const transform = this.currentDocument.transform;
    const rotation = this.preview?.transform?.rotationDegrees ?? transform.rotationDegrees;
    const flipX = this.preview?.transform?.flipX ?? transform.flipX;
    const flipY = this.preview?.transform?.flipY ?? transform.flipY;

    this.sourceImage.set({
      angle: rotation,
      flipX,
      flipY,
      scaleX: 1,
      scaleY: 1,
      left: this.currentDocument.sourceSize.width / 2,
      top: this.currentDocument.sourceSize.height / 2,
      originX: 'center',
      originY: 'center',
    });
    this.sourceImage.setCoords();
    this.canvas.bringObjectToFront(this.sourceImage);
  }

  private showComposedOutput(): void {
    if (!this.canvas || !this.sourceImage || !this.currentDocument) {
      return;
    }

    const doc = this.compareDocument ?? this.currentDocument;
    const comparing = this.compareDocument != null;
    const fullW = Math.max(1, Math.round(doc.output.width));
    const fullH = Math.max(1, Math.round(doc.output.height));
    const maxLongEdge = computePreviewMaxLongEdge({
      fullWidth: fullW,
      fullHeight: fullH,
      canvasWidth: this.canvas.getWidth(),
      canvasHeight: this.canvas.getHeight(),
      zoom: this.viewportZoom,
      devicePixelRatio:
        typeof globalThis.devicePixelRatio === 'number' ? globalThis.devicePixelRatio : 1,
    });

    const designImage = comparing ? resolveDesignImage(doc) : this.activeDesignImage(doc);

    const composed = this.composeDocumentCanvas({
      document: doc,
      crop: doc.crop,
      designImage,
      adjustments: comparing
        ? normalizeAdjustments(doc.adjustments ?? createInitialAdjustments())
        : this.activeAdjustments(),
      effects: comparing
        ? normalizeEffects(doc.effects ?? createInitialEffects())
        : this.activeEffects(),
      filters: comparing
        ? normalizeFilters(doc.filters ?? createInitialFilters())
        : this.activeFilters(),
      focus: comparing ? normalizeFocus(doc.focus ?? createInitialFocus()) : this.activeFocus(),
      redactions: comparing
        ? normalizeRedactions(doc.redactions ?? createInitialRedactions())
        : this.activeRedactions(),
      cropMask: comparing
        ? normalizeCropMask(doc.cropMask ?? createInitialCropMask())
        : this.activeCropMask(),
      colorOverlay: comparing
        ? normalizeColorOverlay(doc.colorOverlay ?? createInitialColorOverlay())
        : this.activeColorOverlay(),
      fill: comparing ? normalizeFill(doc.fill ?? createInitialFill()) : this.activeFill(),
      frame: comparing ? normalizeFrame(doc.frame ?? createInitialFrame()) : this.activeFrame(),
      annotations: comparing
        ? normalizeAnnotations(doc.annotations ?? createInitialAnnotations())
        : this.activeAnnotations(),
      watermark: comparing
        ? normalizeWatermark(doc.watermark ?? createInitialWatermark())
        : this.activeWatermark(),
      maxLongEdge,
      useCache: !comparing,
      cropMaskOutsideOpacity: comparing ? undefined : this.previewCropMaskOutsideOpacity(),
    });

    const scaleX = fullW / composed.width;
    const scaleY = fullH / composed.height;

    this.ensureDocumentPlate(doc.output);

    if (this.displayImage && this.displayImage !== this.sourceImage) {
      this.displayImage.setElement(composed, {
        width: composed.width,
        height: composed.height,
      });
      this.displayImage.set({
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        angle: 0,
        flipX: false,
        flipY: false,
        scaleX,
        scaleY,
      });
      this.displayImage.setCoords();
      this.canvas.bringObjectToFront(this.displayImage);
      if (this.documentPlate) {
        this.canvas.sendObjectToBack(this.documentPlate);
      }
      return;
    }

    const next = new FabricImage(composed, {
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
      angle: 0,
      flipX: false,
      flipY: false,
      scaleX,
      scaleY,
      width: composed.width,
      height: composed.height,
      objectCaching: false,
    });

    if (this.displayImage === this.sourceImage) {
      this.canvas.remove(this.sourceImage);
    }

    this.displayImage = next;
    this.canvas.add(next);
    this.canvas.bringObjectToFront(next);
    if (this.documentPlate) {
      this.canvas.sendObjectToBack(this.documentPlate);
    }
  }

  private composeDocumentCanvas(options: {
    readonly document: ReadonlyImageDocument;
    readonly crop?: CropState | null;
    readonly designImage?: DesignImageState | null;
    readonly adjustments?: AdjustmentsState | null;
    readonly effects?: EffectsState | null;
    readonly filters?: FiltersState | null;
    readonly focus?: FocusState | null;
    readonly redactions?: readonly RedactionRegion[] | null;
    readonly cropMask?: CropMaskState | null;
    readonly colorOverlay?: ColorOverlayState | null;
    readonly fill?: FillState | null;
    readonly frame?: FrameState | null;
    readonly annotations?: readonly Annotation[] | null;
    readonly watermark?: WatermarkState | null;
    /**
     * Preview-only outside visibility for crop-mask (0–1).
     * Omit / 0 for hard clip (Apply / export).
     */
    readonly cropMaskOutsideOpacity?: number;
    readonly backgroundColor?: string;
    /** Cap long edge for display previews. Omit for full-resolution export. */
    readonly maxLongEdge?: number;
    /** Reuse crop/transform (+ fx) bitmaps across preview frames. */
    readonly useCache?: boolean;
  }): HTMLCanvasElement {
    if (!this.sourceImage) {
      throw new Error('No source image');
    }

    const doc = options.document;
    const crop = options.crop !== undefined ? options.crop : doc.crop;
    const designImage =
      options.designImage !== undefined && options.designImage !== null
        ? normalizeDesignImage(options.designImage, doc.output)
        : this.activeDesignImage(doc);
    const adjustments =
      options.adjustments !== undefined
        ? normalizeAdjustments(options.adjustments)
        : normalizeAdjustments(doc.adjustments);
    const effects =
      options.effects !== undefined
        ? normalizeEffects(options.effects)
        : normalizeEffects(doc.effects);
    const filtersState =
      options.filters !== undefined
        ? normalizeFilters(options.filters)
        : normalizeFilters(doc.filters);
    const focusState =
      options.focus !== undefined ? normalizeFocus(options.focus) : normalizeFocus(doc.focus);
    const redactionsState =
      options.redactions !== undefined
        ? normalizeRedactions(options.redactions)
        : this.activeRedactions(doc);
    const cropMaskState =
      options.cropMask !== undefined
        ? normalizeCropMask(options.cropMask)
        : normalizeCropMask(doc.cropMask);
    const colorOverlayState =
      options.colorOverlay !== undefined
        ? normalizeColorOverlay(options.colorOverlay)
        : normalizeColorOverlay(doc.colorOverlay);
    const fillState =
      options.fill !== undefined ? normalizeFill(options.fill) : normalizeFill(doc.fill);
    const frameState =
      options.frame !== undefined ? normalizeFrame(options.frame) : normalizeFrame(doc.frame);
    const annotations =
      options.annotations !== undefined
        ? normalizeAnnotations(options.annotations)
        : normalizeAnnotations(doc.annotations);
    const watermark =
      options.watermark !== undefined
        ? normalizeWatermark(options.watermark)
        : normalizeWatermark(doc.watermark);

    const fullOutW = Math.max(1, Math.round(doc.output.width));
    const fullOutH = Math.max(1, Math.round(doc.output.height));
    const previewSize = resolvePreviewOutputSize(fullOutW, fullOutH, options.maxLongEdge);
    const outW = previewSize.width;
    const outH = previewSize.height;
    const geometryScale = previewSize.scale;

    const geometryKey = this.geometryCacheKey(doc, crop, designImage, outW, outH);
    const fxKey = JSON.stringify({ adjustments, effects, filters: filtersState });
    const focusKey = JSON.stringify(focusState);
    const redactKey = JSON.stringify(redactionsState);

    let base: HTMLCanvasElement;
    let withFx: HTMLCanvasElement;
    let withFocus: HTMLCanvasElement;
    let withRedact: HTMLCanvasElement;

    if (options.useCache && this.layerCache?.geometryKey === geometryKey) {
      base = this.layerCache.base;
      if (this.layerCache.fxKey === fxKey) {
        withFx = this.layerCache.fx;
      } else {
        withFx = this.applyPixelEffects(base, adjustments, filtersState, effects);
        this.layerCache.fxKey = fxKey;
        this.layerCache.fx = withFx;
        // FX changed — invalidate focus / redact layers.
        this.layerCache.focusKey = '';
        this.layerCache.redactKey = '';
      }
      if (this.layerCache.focusKey === focusKey) {
        withFocus = this.layerCache.focus;
      } else {
        withFocus = applyFocusEffect(withFx, focusState, applyFabricFiltersToCanvas);
        this.layerCache.focusKey = focusKey;
        this.layerCache.focus = withFocus;
        this.layerCache.redactKey = '';
      }
      if (this.layerCache.redactKey === redactKey) {
        withRedact = this.layerCache.redact;
      } else {
        withRedact = applyRedactionsEffect(withFocus, redactionsState);
        this.layerCache.redactKey = redactKey;
        this.layerCache.redact = withRedact;
      }
    } else {
      base = this.rasterizeGeometry({
        document: doc,
        crop,
        designImage,
        outW,
        outH,
        geometryScale,
        backgroundColor: options.backgroundColor,
      });
      withFx = this.applyPixelEffects(base, adjustments, filtersState, effects);
      withFocus = applyFocusEffect(withFx, focusState, applyFabricFiltersToCanvas);
      withRedact = applyRedactionsEffect(withFocus, redactionsState);
      if (options.useCache) {
        this.layerCache = {
          geometryKey,
          base,
          fxKey,
          fx: withFx,
          focusKey,
          focus: withFocus,
          redactKey,
          redact: withRedact,
        };
      }
    }

    const withOverlay = applyColorOverlayEffect(withRedact, colorOverlayState);
    // Mask the photo stack only — annotations / watermark draw on top unclipped (CM04).
    const maskedPhoto = applyCropMaskEffect(
      withOverlay === withRedact ? withRedact : withOverlay,
      cropMaskState,
      {
        outsideOpacity: options.cropMaskOutsideOpacity,
      },
    );
    // PV25: fill transparent pixels behind the photo (Pintura Fill).
    const withFill = applyFillEffect(maskedPhoto, fillState, (src) =>
      this.resolveOverlayImage(src),
    );
    const result = cloneCanvas(withFill);
    drawAnnotationsOnCanvas(
      result,
      annotations,
      (src) => this.resolveOverlayImage(src),
      geometryScale,
    );
    drawWatermarkOnCanvas(result, watermark, (src) => this.resolveOverlayImage(src), geometryScale);
    return applyFrameEffect(result, frameState, (src) => this.resolveOverlayImage(src));
  }

  private geometryCacheKey(
    doc: ReadonlyImageDocument,
    crop: CropState | null | undefined,
    designImage: DesignImageState,
    outW: number,
    outH: number,
  ): string {
    return JSON.stringify({
      asset: this.asset?.id ?? null,
      crop: crop ?? null,
      designImage,
      rotation: doc.transform.rotationDegrees,
      flipX: doc.transform.flipX,
      flipY: doc.transform.flipY,
      sourceW: doc.sourceSize.width,
      sourceH: doc.sourceSize.height,
      outputW: doc.output.width,
      outputH: doc.output.height,
      outW,
      outH,
    });
  }

  /**
   * Crop + transform + scale into the target preview/export bitmap.
   * Avoids allocating a full-resolution source-sized intermediate canvas.
   */
  private rasterizeGeometry(options: {
    readonly document: ReadonlyImageDocument;
    readonly crop?: CropState | null;
    readonly designImage?: DesignImageState | null;
    readonly outW: number;
    readonly outH: number;
    readonly geometryScale: number;
    readonly backgroundColor?: string;
  }): HTMLCanvasElement {
    if (!this.sourceImage) {
      throw new Error('No source image');
    }

    const doc = options.document;
    const crop = options.crop !== undefined ? options.crop : doc.crop;
    const cropRect = crop ?? {
      x: 0,
      y: 0,
      width: doc.sourceSize.width,
      height: doc.sourceSize.height,
    };
    const s = options.geometryScale;
    const element = this.sourceImage.getElement() as HTMLImageElement | HTMLCanvasElement;

    const croppedW = Math.max(1, Math.round(cropRect.width * s));
    const croppedH = Math.max(1, Math.round(cropRect.height * s));
    const cropped = globalThis.document.createElement('canvas');
    cropped.width = croppedW;
    cropped.height = croppedH;
    const cropCtx = cropped.getContext('2d');
    if (!cropCtx) {
      throw new Error('2D context unavailable');
    }
    cropCtx.drawImage(
      element,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      croppedW,
      croppedH,
    );

    if (isEllipticalCrop(crop)) {
      cropCtx.globalCompositeOperation = 'destination-in';
      cropCtx.beginPath();
      cropCtx.ellipse(
        cropped.width / 2,
        cropped.height / 2,
        cropped.width / 2,
        cropped.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      cropCtx.fill();
      cropCtx.globalCompositeOperation = 'source-over';
    }

    const rotation = doc.transform.rotationDegrees;
    const flipX = doc.transform.flipX;
    const flipY = doc.transform.flipY;
    const normalized = ((rotation % 360) + 360) % 360;
    const swapped = normalized === 90 || normalized === 270;
    const contentW = swapped ? cropped.height : cropped.width;
    const contentH = swapped ? cropped.width : cropped.height;

    const transformed = globalThis.document.createElement('canvas');
    transformed.width = contentW;
    transformed.height = contentH;
    const ctx = transformed.getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable');
    }
    ctx.translate(contentW / 2, contentH / 2);
    ctx.rotate((normalized * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(cropped, -cropped.width / 2, -cropped.height / 2);

    const designImage = options.designImage ?? resolveDesignImage(doc);
    const output = globalThis.document.createElement('canvas');
    output.width = options.outW;
    output.height = options.outH;
    const outCtx = output.getContext('2d');
    if (!outCtx) {
      throw new Error('2D context unavailable');
    }
    if (options.backgroundColor) {
      outCtx.fillStyle = options.backgroundColor;
      outCtx.fillRect(0, 0, options.outW, options.outH);
    }
    if (designImage.visible === false) {
      return output;
    }
    // designImage is in full output pixels; geometryScale maps to preview/export bitmap.
    const placeX = designImage.x * s;
    const placeY = designImage.y * s;
    const placeW = designImage.width * s;
    const placeH = designImage.height * s;
    const angle = designImage.angle || 0;
    if (angle === 0) {
      outCtx.drawImage(transformed, placeX, placeY, placeW, placeH);
    } else {
      const cx = placeX + placeW / 2;
      const cy = placeY + placeH / 2;
      outCtx.save();
      outCtx.translate(cx, cy);
      outCtx.rotate((angle * Math.PI) / 180);
      outCtx.drawImage(transformed, -placeW / 2, -placeH / 2, placeW, placeH);
      outCtx.restore();
    }
    return output;
  }

  private applyPixelEffects(
    base: HTMLCanvasElement,
    adjustments: AdjustmentsState,
    filtersState: FiltersState,
    effects: EffectsState,
  ): HTMLCanvasElement {
    if (
      isIdentityAdjustments(adjustments) &&
      isIdentityFilters(filtersState) &&
      isIdentityEffects(effects)
    ) {
      return base;
    }

    let result = cloneCanvas(base);
    result = this.applyAdjustmentsToCanvas(result, adjustments);
    result = this.applyFilterPresetToCanvas(result, filtersState);
    result = this.applyEffectsToCanvas(result, effects);
    return result;
  }

  private resolveOverlayImage(src: string): HTMLImageElement | null {
    if (!src) {
      return null;
    }
    const cached = this.overlayImageCache.get(src);
    if (cached instanceof HTMLImageElement) {
      return cached;
    }
    if (cached === 'loading' || cached === 'error') {
      return null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    this.overlayImageCache.set(src, 'loading');
    img.onload = () => {
      this.overlayImageCache.set(src, img);
      // Defer: data URLs / HTTP cache fire onload synchronously while compose
      // is still running. A sync refreshDisplay() would paint the overlay, then
      // the outer compose (which got null) would overwrite it without the image.
      this.scheduleRefresh();
    };
    img.onerror = () => {
      this.overlayImageCache.set(src, 'error');
    };
    img.src = src;
    // Cached/data-URL images may already be complete after assigning src.
    if (img.complete && (img.naturalWidth > 0 || img.naturalHeight > 0)) {
      this.overlayImageCache.set(src, img);
      return img;
    }
    return null;
  }

  private activeAdjustments(document?: ReadonlyImageDocument | null): AdjustmentsState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'adjustments' in this.preview && this.preview.adjustments != null) {
      return normalizeAdjustments(this.preview.adjustments);
    }
    return normalizeAdjustments(doc?.adjustments ?? createInitialAdjustments());
  }

  private activeEffects(document?: ReadonlyImageDocument | null): EffectsState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'effects' in this.preview && this.preview.effects != null) {
      return normalizeEffects(this.preview.effects);
    }
    return normalizeEffects(doc?.effects ?? createInitialEffects());
  }

  private activeFocus(document?: ReadonlyImageDocument | null): FocusState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'focus' in this.preview && this.preview.focus != null) {
      return normalizeFocus(this.preview.focus);
    }
    return normalizeFocus(doc?.focus ?? createInitialFocus());
  }

  private activeRedactions(document?: ReadonlyImageDocument | null): readonly RedactionRegion[] {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'redactions' in this.preview && this.preview.redactions != null) {
      return normalizeRedactions(this.preview.redactions);
    }
    return normalizeRedactions(doc?.redactions ?? createInitialRedactions());
  }

  private activeCropMask(document?: ReadonlyImageDocument | null): CropMaskState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'cropMask' in this.preview && this.preview.cropMask != null) {
      return normalizeCropMask(this.preview.cropMask);
    }
    return normalizeCropMask(doc?.cropMask ?? createInitialCropMask());
  }

  private activeColorOverlay(document?: ReadonlyImageDocument | null): ColorOverlayState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'colorOverlay' in this.preview && this.preview.colorOverlay != null) {
      return normalizeColorOverlay(this.preview.colorOverlay);
    }
    return normalizeColorOverlay(doc?.colorOverlay ?? createInitialColorOverlay());
  }

  private activeFill(document?: ReadonlyImageDocument | null): FillState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'fill' in this.preview && this.preview.fill != null) {
      return normalizeFill(this.preview.fill);
    }
    return normalizeFill(doc?.fill ?? createInitialFill());
  }

  private activeFrame(document?: ReadonlyImageDocument | null): FrameState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'frame' in this.preview && this.preview.frame != null) {
      return normalizeFrame(this.preview.frame);
    }
    return normalizeFrame(doc?.frame ?? createInitialFrame());
  }

  private activeFilters(document?: ReadonlyImageDocument | null): FiltersState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'filters' in this.preview && this.preview.filters != null) {
      return normalizeFilters(this.preview.filters);
    }
    return normalizeFilters(doc?.filters ?? createInitialFilters());
  }

  private activeAnnotations(document?: ReadonlyImageDocument | null): readonly Annotation[] {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'annotations' in this.preview && this.preview.annotations != null) {
      return normalizeAnnotations(this.preview.annotations);
    }
    return normalizeAnnotations(doc?.annotations ?? createInitialAnnotations());
  }

  private activeWatermark(document?: ReadonlyImageDocument | null): WatermarkState {
    const doc = document ?? this.currentDocument;
    if (this.preview && 'watermark' in this.preview && this.preview.watermark != null) {
      return normalizeWatermark(this.preview.watermark);
    }
    return normalizeWatermark(doc?.watermark ?? createInitialWatermark());
  }

  private activeDesignImage(document?: ReadonlyImageDocument | null): DesignImageState {
    const doc = document ?? this.currentDocument;
    const output = doc?.output ?? { width: 1, height: 1 };
    if (this.preview && 'designImage' in this.preview && this.preview.designImage != null) {
      return normalizeDesignImage(this.preview.designImage, output);
    }
    if (doc) {
      return resolveDesignImage(doc);
    }
    return createInitialDesignImage(output);
  }

  private applyAdjustmentsToCanvas(
    canvas: HTMLCanvasElement,
    adjustments: AdjustmentsState,
  ): HTMLCanvasElement {
    if (isIdentityAdjustments(adjustments)) {
      return canvas;
    }
    let result = applyFabricFiltersToCanvas(canvas, buildFabricAdjustmentFilters(adjustments));
    if (adjustments.gamma !== 0) {
      result = applyGammaCanvas(result, adjustments.gamma);
    }
    if (adjustments.vignette > 0) {
      result = applyVignetteCanvas(result, adjustments.vignette);
    }
    return result;
  }

  private applyFilterPresetToCanvas(
    canvas: HTMLCanvasElement,
    filtersState: FiltersState,
  ): HTMLCanvasElement {
    if (isIdentityFilters(filtersState)) {
      return canvas;
    }

    const fabricFilter = createFabricPresetFilter(filtersState.preset, this.hostFilterFunctions);
    if (!fabricFilter) {
      return canvas;
    }

    return applyFabricFiltersToCanvas(canvas, [fabricFilter]);
  }

  private applyEffectsToCanvas(
    canvas: HTMLCanvasElement,
    effects: EffectsState,
  ): HTMLCanvasElement {
    if (isIdentityEffects(effects)) {
      return canvas;
    }

    let current = canvas;
    if (effects.threshold > 0) {
      current = applyThresholdCanvas(current, effects.threshold);
    }
    if (effects.posterize > 0) {
      const levels = Math.max(2, Math.round(2 + effects.posterize * 30));
      current = applyPosterizeCanvas(current, levels);
    }

    const fabricFilters = buildFabricEffectFilters(effects);
    if (fabricFilters.length === 0) {
      return current;
    }

    return applyFabricFiltersToCanvas(current, fabricFilters);
  }

  private disposeDisplayImage(): void {
    if (!this.displayImage) {
      return;
    }
    if (this.displayImage !== this.sourceImage) {
      this.canvas?.remove(this.displayImage);
      this.displayImage.dispose();
    } else {
      this.canvas?.remove(this.displayImage);
    }
    this.displayImage = null;
  }

  private createDocumentPlateFill(): Pattern {
    const tile = document.createElement('canvas');
    tile.width = 20;
    tile.height = 20;
    const ctx = tile.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#14181f';
      ctx.fillRect(0, 0, 20, 20);
      ctx.fillStyle = '#1a1f27';
      ctx.fillRect(0, 0, 10, 10);
      ctx.fillRect(10, 10, 10, 10);
    }
    return new Pattern({ source: tile, repeat: 'repeat' });
  }

  private ensureDocumentPlate(output: ImageSize): void {
    if (!this.canvas) {
      return;
    }
    const width = Math.max(1, Math.round(output.width));
    const height = Math.max(1, Math.round(output.height));

    if (!this.documentPlate) {
      this.documentPlate = new Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill: this.createDocumentPlateFill(),
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
        objectCaching: false,
      });
      this.canvas.add(this.documentPlate);
    } else {
      this.documentPlate.set({
        left: 0,
        top: 0,
        width,
        height,
        visible: true,
        selectable: false,
        evented: false,
      });
      this.documentPlate.setCoords();
    }
    this.canvas.sendObjectToBack(this.documentPlate);
  }

  private removeDocumentPlate(): void {
    if (!this.documentPlate) {
      return;
    }
    this.canvas?.remove(this.documentPlate);
    this.documentPlate = null;
  }

  private activeCrop(): CropState | null {
    if (!this.currentDocument) {
      return null;
    }
    if (this.preview && 'crop' in this.preview) {
      return this.preview.crop ?? null;
    }
    return this.currentDocument.crop;
  }

  private isCropInteractive(): boolean {
    return !!(this.preview && this.preview.crop);
  }

  private isFocusInteractive(): boolean {
    return !!(this.preview && this.preview.focus && this.preview.focus.mode !== 'none');
  }

  private isCropMaskInteractive(): boolean {
    return !!(this.preview && this.preview.cropMask && this.preview.cropMask.shape !== 'none');
  }

  private isFrameInteractive(): boolean {
    const frame = this.preview?.frame;
    return !!(frame && isFrameEdgeInteractive(frame));
  }

  /** Preview-only outside dim while Mask tool is open; Apply/export hard-clip. */
  private previewCropMaskOutsideOpacity(): number | undefined {
    if (!this.isCropMaskInteractive()) {
      return undefined;
    }
    const value = this.preview?.cropMaskOutsideOpacity;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.min(1, value));
    }
    return 0.35;
  }

  private isDrawingInteractive(): boolean {
    return !!this.handlers?.isDrawingActive?.();
  }

  private isPathToolInteractive(): boolean {
    return !!this.handlers?.isPathToolActive?.();
  }

  private isPathDrawingActive(): boolean {
    return !!this.handlers?.isPathDrawingActive?.();
  }

  private shouldShowPathVertexOverlay(): boolean {
    if (this.isPathToolInteractive()) {
      return true;
    }
    const points = this.handlers?.getActivePathPoints?.() ?? null;
    return !!points && points.length > 0;
  }

  private isAnnotationInteractive(): boolean {
    return !!this.handlers?.isAnnotationInteractionActive?.();
  }

  private isWatermarkInteractive(): boolean {
    return !!this.handlers?.isWatermarkInteractionActive?.();
  }

  private isDesignImageInteractive(): boolean {
    return this.handlers?.isDesignImageInteractionActive?.() === true;
  }

  private interactiveDesignImage(): DesignImageState {
    const fromHandler = this.handlers?.getInteractiveDesignImage?.() ?? null;
    if (fromHandler) {
      return normalizeDesignImage(
        fromHandler,
        this.currentDocument?.output ?? { width: 1, height: 1 },
      );
    }
    return this.activeDesignImage();
  }

  private interactiveWatermark(): WatermarkState | null {
    const watermark = this.handlers?.getInteractiveWatermark?.() ?? null;
    if (!watermark || watermark.mode === 'none') {
      return null;
    }
    if (watermark.mode === 'image' && !watermark.imageSrc) {
      return null;
    }
    return normalizeWatermark(watermark);
  }

  private interactiveAnnotations(): readonly TransformableAnnotation[] {
    return this.handlers?.getInteractiveAnnotations?.() ?? [];
  }

  private selectedAnnotationIds(): readonly string[] {
    const ids = this.handlers?.getSelectedAnnotationIds?.();
    if (ids) {
      return normalizeSelectedAnnotationIds(ids);
    }
    const primary = this.handlers?.getSelectedAnnotationId?.() ?? null;
    return normalizeSelectedAnnotationIds(primary);
  }

  private emitAnnotationTransform(
    phase: 'start' | 'move' | 'end' | 'cancel',
    id: string,
    annotations: readonly TransformableAnnotation[],
  ): void {
    const primary =
      annotations.find((item) => item.id === id) ?? annotations[annotations.length - 1];
    if (!primary) {
      return;
    }
    this.handlers?.onAnnotationTransform?.({
      phase,
      id: primary.id,
      annotation: primary,
      annotations,
    });
  }

  private buildCreatedAnnotation(
    kind: AnnotationCreateKind,
    start: { x: number; y: number },
    current: { x: number; y: number },
    reuseId?: string,
    polygonSides?: number,
  ): TransformableAnnotation {
    const output = this.currentDocument?.output ?? { width: 1, height: 1 };
    if (kind === 'text') {
      if (reuseId) {
        const existing = this.interactiveAnnotations().find(
          (item) => item.id === reuseId && item.kind === 'text',
        );
        if (existing && existing.kind === 'text') {
          return existing;
        }
        return { ...placeTextAnnotationAt(start, output), id: reuseId };
      }
      const others = this.interactiveAnnotations().filter(
        (item): item is Extract<TransformableAnnotation, { kind: 'text' }> => item.kind === 'text',
      );
      return placeTextAnnotationAt(start, output, others);
    }
    const sides = polygonSides ?? this.handlers?.getPolygonSides?.() ?? 3;
    const created = createShapeFromDrag(kind, start, current, output, {
      polygonSides: sides,
    });
    return reuseId ? ({ ...created, id: reuseId } as TransformableAnnotation) : created;
  }

  private updateAnnotationHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    if (!scenePoint) {
      this.setCanvasCursor(this.isDrawingInteractive() ? this.drawingCursor() : 'default');
      return;
    }
    const items = this.interactiveAnnotations();
    const selectedIds = this.selectedAnnotationIds();
    const boundsItems = items.map((item) => {
      const chrome = boundsFromTransformable(item);
      if (selectedIds.includes(item.id)) {
        return { id: item.id, ...chrome };
      }
      return { id: item.id, ...interactionBoundsFromTransformable(item) };
    });

    if (selectedIds.length > 1) {
      const group = unionBounds(
        selectedIds
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is NonNullable<typeof item> => !!item)
          .map(boundsFromTransformable),
      );
      if (group) {
        const groupHandle = hitTestInteractiveAnnotations(
          [{ id: '__group__', ...group }],
          scenePoint,
          this.handleHitSize(),
          '__group__',
          this.annotationRotateHandleOffset(),
        )?.handle;
        if (groupHandle) {
          this.setCanvasCursor(cursorForAnnotationHandle(groupHandle));
          return;
        }
      }
    }

    const hit = hitTestInteractiveAnnotations(
      boundsItems,
      scenePoint,
      this.handleHitSize(),
      selectedIds,
      this.annotationRotateHandleOffset(),
    );
    if (hit) {
      this.setCanvasCursor(cursorForAnnotationHandle(hit.handle));
      return;
    }
    const createKind = this.handlers?.getAnnotationCreateKind?.() ?? null;
    if (createKind) {
      this.setCanvasCursor(createKind === 'text' ? 'text' : 'crosshair');
      return;
    }
    // Drawing mode: empty canvas uses brush ring cursor (Pintura-style).
    this.setCanvasCursor(this.isDrawingInteractive() ? this.drawingCursor() : 'default');
  }

  /** True when at least one interactive annotation is currently selected. */
  private hasSelectedAnnotations(): boolean {
    const selectedIds = this.selectedAnnotationIds();
    if (selectedIds.length === 0) {
      return false;
    }
    const items = this.interactiveAnnotations();
    return items.some((item) => selectedIds.includes(item.id));
  }

  /**
   * Selection chrome priority:
   * 1) active design-image drag
   * 2) selected annotation(s)
   * 3) unlocked base photo (show transform handles)
   * 4) watermark tool
   */
  private syncInteractiveSelectionChrome(): void {
    if (this.designImageGesture && this.isDesignImageInteractive()) {
      this.syncDesignImageOverlay();
      return;
    }
    if (this.isAnnotationInteractive() && this.hasSelectedAnnotations()) {
      this.syncAnnotationOverlay();
      return;
    }
    if (this.isDesignImageInteractive()) {
      this.syncDesignImageOverlay();
      return;
    }
    if (this.isWatermarkInteractive()) {
      this.syncWatermarkOverlay();
      return;
    }
    this.removeAnnotationOverlay();
  }

  private updateInteractiveSelectionHoverCursor(event: MouseEvent): void {
    if (this.isAnnotationInteractive() && this.hasSelectedAnnotations()) {
      this.updateAnnotationHoverCursor(event);
      return;
    }
    if (this.isDesignImageInteractive()) {
      const scenePoint = this.scenePointFromEvent(event);
      if (scenePoint) {
        const designImage = this.interactiveDesignImage();
        const handle =
          hitTestDesignImageHandle(
            designImage,
            scenePoint,
            this.handleHitSize(),
            this.annotationRotateHandleOffset(),
          ) ?? (hitTestDesignImageBody(designImage, scenePoint) ? 'move' : null);
        if (handle) {
          this.setCanvasCursor(cursorForAnnotationHandle(handle));
          return;
        }
      }
    }
    if (this.isAnnotationInteractive()) {
      this.updateAnnotationHoverCursor(event);
      return;
    }
    if (this.isWatermarkInteractive()) {
      this.updateWatermarkHoverCursor(event);
      return;
    }
    this.setCanvasCursor(this.idleInteractionCursor());
  }

  private syncAnnotationOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isAnnotationInteractive()) {
      if (!this.isWatermarkInteractive() && !this.isDesignImageInteractive()) {
        this.removeAnnotationOverlay();
      }
      return;
    }

    const selectedIds = this.selectedAnnotationIds();
    const items = this.interactiveAnnotations();
    const selected = items.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) {
      // Unlocked photo may own the chrome when nothing is selected.
      if (this.isDesignImageInteractive()) {
        this.syncDesignImageOverlay();
        return;
      }
      this.removeAnnotationOverlay();
      return;
    }

    const memberBounds = selected.map(boundsFromTransformable);
    const chromeBounds =
      selected.length > 1 ? unionBounds(memberBounds) : (memberBounds[0] ?? null);
    if (!chromeBounds) {
      this.removeAnnotationOverlay();
      return;
    }

    this.paintMemberOutlines(selected.length > 1 ? memberBounds : []);
    this.paintAnnotationChrome(chromeBounds);
  }

  private syncWatermarkOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isWatermarkInteractive()) {
      if (!this.isAnnotationInteractive() && !this.isDesignImageInteractive()) {
        this.removeAnnotationOverlay();
      }
      return;
    }

    const watermark = this.interactiveWatermark();
    const bounds = watermark ? this.measureInteractiveWatermarkBounds(watermark) : null;
    if (!bounds) {
      this.removeAnnotationOverlay();
      return;
    }

    this.paintAnnotationChrome(bounds);
  }

  private syncDesignImageOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isDesignImageInteractive()) {
      if (!this.isAnnotationInteractive() && !this.isWatermarkInteractive()) {
        this.removeAnnotationOverlay();
      }
      return;
    }

    const designImage = this.interactiveDesignImage();
    this.paintAnnotationChrome(designImageBounds(designImage), designImage.angle);
  }

  private measureInteractiveWatermarkBounds(watermark: WatermarkState): InteractiveBounds | null {
    const output = this.currentDocument?.output;
    if (!output) {
      return null;
    }

    if (watermark.mode === 'text') {
      const minEdge = Math.min(output.width, output.height);
      const fontSize = Math.max(10, Math.round(minEdge * 0.06 * watermark.scale));
      const probe = document.createElement('canvas').getContext('2d');
      let width = Math.max(16, watermark.text.length * fontSize * 0.55);
      if (probe) {
        probe.font = `${fontSize}px ${watermark.fontFamily}`;
        width = Math.max(16, probe.measureText(watermark.text || 'W').width);
      }
      const box = { width, height: Math.max(16, fontSize * 1.2) };
      const origin = resolveWatermarkPlacement(output, box, watermark);
      return { x: origin.x, y: origin.y, width: box.width, height: box.height };
    }

    if (watermark.mode === 'image' && watermark.imageSrc) {
      const img = this.resolveOverlayImage(watermark.imageSrc);
      const natural = img
        ? {
            width: img.naturalWidth || img.width || 128,
            height: img.naturalHeight || img.height || 128,
          }
        : null;
      return estimateWatermarkBounds(watermark, output, natural);
    }

    return estimateWatermarkBounds(watermark, output);
  }

  private updateWatermarkHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const watermark = this.interactiveWatermark();
    const bounds = watermark ? this.measureInteractiveWatermarkBounds(watermark) : null;
    if (!scenePoint || !bounds) {
      this.setCanvasCursor(this.isWatermarkInteractive() ? 'move' : 'grab');
      return;
    }
    const handle = hitTestWatermarkHandle(
      bounds,
      scenePoint,
      this.handleHitSize(),
      this.annotationRotateHandleOffset(),
    );
    this.setCanvasCursor(handle ? cursorForAnnotationHandle(handle) : 'default');
  }

  private updateDesignImageHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const designImage = this.interactiveDesignImage();
    if (!scenePoint) {
      this.setCanvasCursor(this.isDesignImageInteractive() ? 'move' : 'grab');
      return;
    }
    const handle =
      hitTestDesignImageHandle(
        designImage,
        scenePoint,
        this.handleHitSize(),
        this.annotationRotateHandleOffset(),
      ) ?? (hitTestDesignImageBody(designImage, scenePoint) ? 'move' : null);
    this.setCanvasCursor(handle ? cursorForAnnotationHandle(handle) : 'default');
  }

  private paintMemberOutlines(boundsList: readonly InteractiveBounds[]): void {
    if (!this.canvas) {
      return;
    }

    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 1.5 / zoom;

    while (this.annotationMemberOutlines.length < boundsList.length) {
      const outline = new Rect({
        fill: 'rgba(0,0,0,0)',
        stroke: INTERACTIVE_CHROME_STROKE,
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      });
      this.canvas.add(outline);
      this.annotationMemberOutlines.push(outline);
    }

    for (let i = 0; i < boundsList.length; i += 1) {
      const outline = this.annotationMemberOutlines[i]!;
      const bounds = boundsList[i]!;
      outline.set({
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
        angle: 0,
      });
      outline.setCoords();
      this.canvas.bringObjectToFront(outline);
    }

    while (this.annotationMemberOutlines.length > boundsList.length) {
      const extra = this.annotationMemberOutlines.pop();
      if (extra) {
        this.canvas.remove(extra);
      }
    }
  }

  private clearMemberOutlines(): void {
    if (!this.canvas) {
      this.annotationMemberOutlines = [];
      return;
    }
    for (const outline of this.annotationMemberOutlines) {
      this.canvas.remove(outline);
    }
    this.annotationMemberOutlines = [];
  }

  private paintAnnotationChrome(bounds: InteractiveBounds, angleDegrees = 0): void {
    if (!this.canvas) {
      return;
    }

    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 2 / zoom;
    const angle = Number.isFinite(angleDegrees) ? angleDegrees : 0;
    const useCenter = Math.abs(angle) > 0.001;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    if (!this.annotationOverlay) {
      this.annotationOverlay = new Rect({
        fill: 'rgba(0,0,0,0)',
        stroke: INTERACTIVE_CHROME_STROKE,
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      });
      this.canvas.add(this.annotationOverlay);
    }

    this.annotationOverlay.set({
      left: useCenter ? cx : bounds.x,
      top: useCenter ? cy : bounds.y,
      width: bounds.width,
      height: bounds.height,
      angle,
      originX: useCenter ? 'center' : 'left',
      originY: useCenter ? 'center' : 'top',
      strokeWidth,
      strokeDashArray: INTERACTIVE_CHROME_DASH,
    });
    this.annotationOverlay.setCoords();
    this.canvas.bringObjectToFront(this.annotationOverlay);
    this.syncAnnotationHandles(bounds, angle);

    if (
      !this.annotationGesture &&
      !this.annotationCreateGesture &&
      !this.designImageGesture &&
      !this.watermarkGesture &&
      !this.panning &&
      !this.drawingStroke
    ) {
      if (this.isDrawingInteractive()) {
        // Keep brush cursor while drawing tool is open (preview sync must not reset to default).
        return;
      }
      if (!this.canvas.defaultCursor || this.canvas.defaultCursor === 'grab') {
        this.setCanvasCursor('default');
      }
    }
  }

  private syncAnnotationHandles(bounds: InteractiveBounds, angleDegrees = 0): void {
    if (!this.canvas) {
      return;
    }

    // Drop legacy square Rect chrome after HMR / older sessions.
    if (this.annotationHandles.some((h) => !(h instanceof Circle))) {
      this.clearAnnotationHandles();
    }

    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const size = this.handleVisualSize();
    const angle = Number.isFinite(angleDegrees) ? angleDegrees : 0;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const rotate = rotateHandlePoint(bounds, this.annotationRotateHandleOffset());
    const stemFrom = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height,
    };
    const localAnchors = [
      { x: bounds.x, y: bounds.y, kind: 'corner' as const },
      { x: bounds.x + bounds.width, y: bounds.y, kind: 'corner' as const },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, kind: 'corner' as const },
      { x: bounds.x, y: bounds.y + bounds.height, kind: 'corner' as const },
      { x: rotate.x, y: rotate.y, kind: 'rotate' as const },
    ];

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const mapPoint = (point: { x: number; y: number }) => {
      if (Math.abs(angle) <= 0.001) {
        return point;
      }
      const dx = point.x - cx;
      const dy = point.y - cy;
      return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos,
      };
    };
    const anchors =
      Math.abs(angle) <= 0.001
        ? localAnchors
        : localAnchors.map((anchor) => ({ ...mapPoint(anchor), kind: anchor.kind }));
    const stemStart = mapPoint(stemFrom);
    const stemEnd = mapPoint(rotate);

    this.annotationRotateStem = syncRotateStemLine(
      this.annotationRotateStem,
      stemStart,
      stemEnd,
      zoom,
      this.canvas,
    );

    while (this.annotationHandles.length < anchors.length) {
      const handle = createInteractiveHandle(zoom);
      this.canvas.add(handle);
      this.annotationHandles.push(handle);
    }

    for (let i = 0; i < anchors.length; i += 1) {
      const handle = this.annotationHandles[i]!;
      const anchor = anchors[i]!;
      styleInteractiveHandle(handle, {
        x: anchor.x,
        y: anchor.y,
        zoom,
        size,
        rotate: anchor.kind === 'rotate',
        enlargeRotate: false,
      });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }

    while (this.annotationHandles.length > anchors.length) {
      const extra = this.annotationHandles.pop();
      if (extra) {
        this.canvas.remove(extra);
      }
    }
  }

  private clearAnnotationHandles(): void {
    if (!this.canvas) {
      this.annotationHandles = [];
      this.annotationRotateStem = null;
      return;
    }
    for (const handle of this.annotationHandles) {
      this.canvas.remove(handle);
    }
    this.annotationHandles = [];
    if (this.annotationRotateStem) {
      this.canvas.remove(this.annotationRotateStem);
      this.annotationRotateStem = null;
    }
  }

  private removeAnnotationOverlay(): void {
    this.clearAnnotationHandles();
    this.clearMemberOutlines();
    if (this.annotationOverlay && this.canvas) {
      this.canvas.remove(this.annotationOverlay);
    }
    this.annotationOverlay = null;
  }

  private updateCropHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const crop = this.activeCrop();
    if (!scenePoint || !crop) {
      this.setCanvasCursor('default');
      return;
    }
    const hit = hitTestCropHandle(crop, scenePoint, this.handleHitSize());
    this.setCanvasCursor(hit ? cursorForCropHandle(hit) : 'default');
  }

  private updateFocusHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const output = this.currentDocument?.output;
    const focus = this.activeFocus();
    if (!scenePoint || !output || focus.mode === 'none') {
      this.setCanvasCursor('default');
      return;
    }
    const hit = hitTestFocusHandle(
      focus,
      scenePoint,
      output,
      this.handleHitSize(),
      this.rotateHandleOffset(),
    );
    this.setCanvasCursor(hit ? cursorForFocusHandle(hit) : 'default');
  }

  private updateCropMaskHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const output = this.currentDocument?.output;
    const cropMask = this.activeCropMask();
    if (!scenePoint || !output || cropMask.shape === 'none') {
      this.setCanvasCursor('default');
      return;
    }
    const hit = hitTestCropMaskHandle(
      cropMask,
      scenePoint,
      output,
      this.handleHitSize(),
      this.rotateHandleOffset(),
    );
    this.setCanvasCursor(hit ? cursorForCropMaskHandle(hit) : 'default');
  }

  private updateFrameHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const output = this.currentDocument?.output;
    const frame = this.activeFrame();
    if (!scenePoint || !output || !isFrameEdgeInteractive(frame)) {
      this.setCanvasCursor('default');
      return;
    }
    const hit = hitTestFrameHandle(frame, scenePoint, output, this.handleHitSize());
    if (!hit) {
      this.setCanvasCursor('default');
      return;
    }
    this.setCanvasCursor(hit === 'n' || hit === 's' ? 'ns-resize' : 'ew-resize');
  }

  private setCanvasCursor(cursor: string): void {
    if (!this.canvas) {
      return;
    }
    this.canvas.defaultCursor = cursor;
    this.canvas.hoverCursor = cursor;
    this.canvas.setCursor(cursor);
    if (this.canvasEl) {
      this.canvasEl.style.cursor = cursor;
    }
    // Fabric keeps interaction cursors on the upper canvas element.
    const upper = (this.canvas as unknown as { upperCanvasEl?: HTMLCanvasElement }).upperCanvasEl;
    if (upper) {
      upper.style.cursor = cursor;
    }
  }

  /** Freehand brush ring sized to stroke width × zoom (fallback: crosshair). */
  private drawingCursor(): string {
    const docWidth = Math.max(1, this.handlers?.getDrawingStrokeWidth?.() ?? 4);
    const zoom = this.canvas?.getZoom() ?? 1;
    const screen = Math.max(8, Math.min(48, Math.round(docWidth * zoom)));
    const key = String(screen);
    if (this.drawingCursorCache?.key === key) {
      return this.drawingCursorCache.value;
    }
    const value = buildDrawingBrushCursor(screen);
    this.drawingCursorCache = { key, value };
    return value;
  }

  /** Idle cursor when not mid-gesture: brush in draw mode, else annotation/pan default. */
  private idleInteractionCursor(): string {
    if (this.spacePanActive) {
      return 'grab';
    }
    if (this.isDrawingInteractive()) {
      return this.drawingCursor();
    }
    if (this.isPathToolInteractive()) {
      return 'crosshair';
    }
    if (this.isDesignImageInteractive()) {
      return 'move';
    }
    if (this.isWatermarkInteractive()) {
      return 'move';
    }
    if (
      this.isCropInteractive() ||
      this.isFocusInteractive() ||
      this.isCropMaskInteractive() ||
      this.isAnnotationInteractive()
    ) {
      return 'default';
    }
    return 'grab';
  }

  /** Middle-click, Space, Alt, or Ctrl/Meta force viewport pan over tool gestures. */
  private wantsForcedPan(event: MouseEvent): boolean {
    return (
      event.button === 1 || event.altKey || event.ctrlKey || event.metaKey || this.spacePanActive
    );
  }

  private readonly onPanKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }
    if (!this.shouldCaptureSpacePan(event.target)) {
      return;
    }
    if (!this.spacePanActive) {
      this.spacePanActive = true;
      if (
        !this.panning &&
        !this.cropGesture &&
        !this.annotationGesture &&
        !this.annotationCreateGesture &&
        !this.designImageGesture &&
        !this.watermarkGesture &&
        !this.drawingStroke
      ) {
        this.setCanvasCursor('grab');
      }
    }
    event.preventDefault();
  };

  private readonly onPanKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }
    if (!this.spacePanActive) {
      return;
    }
    this.spacePanActive = false;
    if (
      !this.panning &&
      !this.cropGesture &&
      !this.annotationGesture &&
      !this.annotationCreateGesture &&
      !this.designImageGesture &&
      !this.watermarkGesture &&
      !this.drawingStroke
    ) {
      this.setCanvasCursor(this.idleInteractionCursor());
    }
  };

  private readonly onPanKeyBlur = (): void => {
    if (!this.spacePanActive) {
      return;
    }
    this.spacePanActive = false;
    if (!this.panning) {
      this.setCanvasCursor(this.idleInteractionCursor());
    }
  };

  private shouldCaptureSpacePan(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return true;
    }
    if (this.isEditableKeyboardTarget(target)) {
      return false;
    }
    // Keep Space for focused chrome controls (activate buttons, etc.).
    if (
      target.closest(
        'button, a, input, textarea, select, [role="button"], [role="menuitem"], fluxio-controls-panel, fluxio-utilibar',
      )
    ) {
      return false;
    }
    return true;
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

  private handleHitSize(): number {
    const zoom = this.canvas?.getZoom() ?? 1;
    return HANDLE_SCREEN_PX / Math.max(zoom, 0.001);
  }

  private handleVisualSize(): number {
    const zoom = this.canvas?.getZoom() ?? 1;
    return HANDLE_VISUAL_PX / Math.max(zoom, 0.001);
  }

  /** Scene-space gap from box edge to rotate knob (keeps ~ROTATE_HANDLE_OFFSET screen px). */
  private rotateHandleOffset(): number {
    const zoom = this.canvas?.getZoom() ?? 1;
    return ROTATE_HANDLE_OFFSET / Math.max(zoom, 0.001);
  }

  /** Closer gap for annotation / watermark / design-image chrome. */
  private annotationRotateHandleOffset(): number {
    const zoom = this.canvas?.getZoom() ?? 1;
    return ANNOTATION_ROTATE_HANDLE_OFFSET / Math.max(zoom, 0.001);
  }

  private scenePointFromEvent(event: MouseEvent): { x: number; y: number } | null {
    if (!this.canvas) {
      return null;
    }
    const point = this.canvas.getScenePoint(event);
    return { x: point.x, y: point.y };
  }

  private readonly onDoubleClick = (opt: { e: Event }) => {
    const event = opt.e as MouseEvent;
    const scenePoint = this.scenePointFromEvent(event);
    if (!scenePoint) {
      return;
    }

    if (this.isPathToolInteractive() && this.handlers?.onPathVertex) {
      event.preventDefault();
      this.pathVertexPending = null;
      this.handlers.onPathVertex({
        type: 'dblclick',
        x: scenePoint.x,
        y: scenePoint.y,
      });
      this.syncPathToolOverlay();
      return;
    }

    if (!this.isAnnotationInteractive() || !this.handlers?.onAnnotationEditRequest) {
      return;
    }
    const texts = this.interactiveAnnotations().filter((item) => item.kind === 'text');
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      const item = texts[i]!;
      const bounds = boundsFromTransformable(item);
      if (
        scenePoint.x >= bounds.x &&
        scenePoint.x <= bounds.x + bounds.width &&
        scenePoint.y >= bounds.y &&
        scenePoint.y <= bounds.y + bounds.height
      ) {
        event.preventDefault();
        this.handlers.onAnnotationEditRequest(item.id);
        return;
      }
    }
  };

  getViewportZoom(): number {
    return this.canvas?.getZoom() ?? 1;
  }

  mapScenePointToClient(point: {
    readonly x: number;
    readonly y: number;
  }): { readonly x: number; readonly y: number } | null {
    if (!this.canvas) {
      return null;
    }
    const element = this.canvas.getElement();
    const rect = element.getBoundingClientRect();
    const mapped = new Point(point.x, point.y).transform(this.canvas.viewportTransform);
    return {
      x: rect.left + mapped.x,
      y: rect.top + mapped.y,
    };
  }

  private syncCropOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isCropInteractive()) {
      this.removeCropOverlay();
      return;
    }
    const crop = this.activeCrop();
    if (!crop) {
      this.removeCropOverlay();
      return;
    }

    const strokeWidth = 2 / Math.max(this.canvas.getZoom(), 0.001);
    const elliptical = isEllipticalCrop(crop);

    if (this.cropOverlay) {
      const isEllipseOverlay = this.cropOverlay instanceof Ellipse;
      if (isEllipseOverlay !== elliptical) {
        this.canvas.remove(this.cropOverlay);
        this.cropOverlay = null;
      }
    }

    if (!this.cropOverlay) {
      this.cropOverlay = elliptical
        ? new Ellipse({
            fill: 'rgba(0,0,0,0)',
            stroke: INTERACTIVE_CHROME_STROKE,
            strokeWidth,
            strokeDashArray: INTERACTIVE_CHROME_DASH,
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top',
          })
        : new Rect({
            fill: 'rgba(0,0,0,0)',
            stroke: INTERACTIVE_CHROME_STROKE,
            strokeWidth,
            strokeDashArray: INTERACTIVE_CHROME_DASH,
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top',
          });
      this.canvas.add(this.cropOverlay);
    }

    if (this.cropOverlay instanceof Ellipse) {
      this.cropOverlay.set({
        left: crop.x,
        top: crop.y,
        rx: crop.width / 2,
        ry: crop.height / 2,
        strokeWidth,
      });
    } else {
      this.cropOverlay.set({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
        strokeWidth,
      });
    }
    this.cropOverlay.setCoords();
    this.canvas.bringObjectToFront(this.cropOverlay);
    this.syncCropShade(crop);
    this.syncCropGuides(crop);
    this.syncCropHandles(crop);

    if (!this.cropGesture && !this.panning && !this.hasActivePointerGesture()) {
      if (!this.canvas.defaultCursor || this.canvas.defaultCursor === 'grab') {
        this.setCanvasCursor('default');
      }
    }
  }

  private syncCropGuides(crop: CropState): void {
    if (!this.canvas) {
      this.clearCropGuides();
      return;
    }

    const layout = layoutCropGuides(crop, this.preview?.cropGuides);
    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 1.25 / zoom;
    const elliptical = isEllipticalCrop(crop);

    if (layout.profileCircle) {
      const pathData = cropProfileCircleMaskPath(crop, layout.profileCircle);
      if (!this.cropGuideCircleMask || this.cropGuideCircleMaskPath !== pathData) {
        if (this.cropGuideCircleMask) {
          this.canvas.remove(this.cropGuideCircleMask);
        }
        this.cropGuideCircleMask = new Path(pathData, {
          fill: 'rgba(0, 0, 0, 0.35)',
          fillRule: 'evenodd',
          strokeWidth: 0,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        this.cropGuideCircleMaskPath = pathData;
        this.canvas.add(this.cropGuideCircleMask);
      }

      if (!this.cropGuideCircleOutline) {
        this.cropGuideCircleOutline = new Ellipse({
          fill: 'rgba(0,0,0,0)',
          stroke: 'rgba(255, 255, 255, 0.85)',
          strokeWidth,
          strokeDashArray: [4 / zoom, 3 / zoom],
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        this.canvas.add(this.cropGuideCircleOutline);
      }
      this.cropGuideCircleOutline.set({
        left: layout.profileCircle.cx,
        top: layout.profileCircle.cy,
        rx: layout.profileCircle.r,
        ry: layout.profileCircle.r,
        strokeWidth,
        strokeDashArray: [4 / zoom, 3 / zoom],
      });
      this.cropGuideCircleOutline.setCoords();
    } else {
      this.clearCropGuideCircle();
    }

    if (layout.bleed) {
      if (this.cropGuideBleed) {
        const isEllipseBleed = this.cropGuideBleed instanceof Ellipse;
        if (isEllipseBleed !== elliptical) {
          this.canvas.remove(this.cropGuideBleed);
          this.cropGuideBleed = null;
        }
      }
      if (!this.cropGuideBleed) {
        this.cropGuideBleed = elliptical
          ? new Ellipse({
              fill: 'rgba(0,0,0,0)',
              stroke: 'rgba(255, 210, 120, 0.95)',
              strokeWidth,
              strokeDashArray: [5 / zoom, 4 / zoom],
              selectable: false,
              evented: false,
              originX: 'left',
              originY: 'top',
            })
          : new Rect({
              fill: 'rgba(0,0,0,0)',
              stroke: 'rgba(255, 210, 120, 0.95)',
              strokeWidth,
              strokeDashArray: [5 / zoom, 4 / zoom],
              selectable: false,
              evented: false,
              originX: 'left',
              originY: 'top',
            });
        this.canvas.add(this.cropGuideBleed);
      }
      if (this.cropGuideBleed instanceof Ellipse) {
        this.cropGuideBleed.set({
          left: layout.bleed.x,
          top: layout.bleed.y,
          rx: layout.bleed.width / 2,
          ry: layout.bleed.height / 2,
          strokeWidth,
          strokeDashArray: [5 / zoom, 4 / zoom],
        });
      } else {
        this.cropGuideBleed.set({
          left: layout.bleed.x,
          top: layout.bleed.y,
          width: layout.bleed.width,
          height: layout.bleed.height,
          strokeWidth,
          strokeDashArray: [5 / zoom, 4 / zoom],
        });
      }
      this.cropGuideBleed.setCoords();
    } else {
      this.clearCropGuideBleed();
    }

    // Keep guides above shade, below crop outline + handles.
    if (this.cropGuideCircleMask) {
      this.canvas.bringObjectToFront(this.cropGuideCircleMask);
    }
    if (this.cropGuideCircleOutline) {
      this.canvas.bringObjectToFront(this.cropGuideCircleOutline);
    }
    if (this.cropGuideBleed) {
      this.canvas.bringObjectToFront(this.cropGuideBleed);
    }
    if (this.cropOverlay) {
      this.canvas.bringObjectToFront(this.cropOverlay);
    }
  }

  private clearCropGuideCircle(): void {
    if (!this.canvas) {
      this.cropGuideCircleMask = null;
      this.cropGuideCircleOutline = null;
      this.cropGuideCircleMaskPath = '';
      return;
    }
    if (this.cropGuideCircleMask) {
      this.canvas.remove(this.cropGuideCircleMask);
      this.cropGuideCircleMask = null;
    }
    if (this.cropGuideCircleOutline) {
      this.canvas.remove(this.cropGuideCircleOutline);
      this.cropGuideCircleOutline = null;
    }
    this.cropGuideCircleMaskPath = '';
  }

  private clearCropGuideBleed(): void {
    if (!this.canvas) {
      this.cropGuideBleed = null;
      return;
    }
    if (this.cropGuideBleed) {
      this.canvas.remove(this.cropGuideBleed);
      this.cropGuideBleed = null;
    }
  }

  private clearCropGuides(): void {
    this.clearCropGuideCircle();
    this.clearCropGuideBleed();
  }

  private syncCropShade(crop: CropState): void {
    if (!this.canvas || !this.currentDocument) {
      this.clearCropShade();
      return;
    }

    const source = this.currentDocument.sourceSize;
    const regions = [
      { left: 0, top: 0, width: source.width, height: Math.max(0, crop.y) },
      {
        left: 0,
        top: crop.y + crop.height,
        width: source.width,
        height: Math.max(0, source.height - (crop.y + crop.height)),
      },
      {
        left: 0,
        top: crop.y,
        width: Math.max(0, crop.x),
        height: Math.max(0, crop.height),
      },
      {
        left: crop.x + crop.width,
        top: crop.y,
        width: Math.max(0, source.width - (crop.x + crop.width)),
        height: Math.max(0, crop.height),
      },
    ];

    while (this.cropShade.length < regions.length) {
      const shade = new Rect({
        fill: 'rgba(0, 0, 0, 0.55)',
        strokeWidth: 0,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      });
      this.cropShade.push(shade);
      this.canvas.add(shade);
    }

    for (let i = 0; i < regions.length; i += 1) {
      const shade = this.cropShade[i]!;
      const region = regions[i]!;
      shade.set({
        left: region.left,
        top: region.top,
        width: Math.max(region.width, 0.0001),
        height: Math.max(region.height, 0.0001),
        opacity: region.width > 0.5 && region.height > 0.5 ? 1 : 0,
      });
      shade.setCoords();
      this.canvas.bringObjectToFront(shade);
    }

    // Keep the crop outline + handles above the shade.
    if (this.cropOverlay) {
      this.canvas.bringObjectToFront(this.cropOverlay);
    }
  }

  private clearCropShade(): void {
    if (!this.canvas) {
      this.cropShade = [];
      return;
    }
    for (const shade of this.cropShade) {
      this.canvas.remove(shade);
    }
    this.cropShade = [];
  }

  private syncCropHandles(crop: CropState): void {
    if (!this.canvas) {
      return;
    }

    if (this.cropHandles.some((h) => !(h instanceof Circle))) {
      this.clearCropHandles();
    }

    const size = this.handleVisualSize();
    const anchors = [
      { x: crop.x, y: crop.y },
      { x: crop.x + crop.width / 2, y: crop.y },
      { x: crop.x + crop.width, y: crop.y },
      { x: crop.x + crop.width, y: crop.y + crop.height / 2 },
      { x: crop.x + crop.width, y: crop.y + crop.height },
      { x: crop.x + crop.width / 2, y: crop.y + crop.height },
      { x: crop.x, y: crop.y + crop.height },
      { x: crop.x, y: crop.y + crop.height / 2 },
    ];

    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    while (this.cropHandles.length < anchors.length) {
      const handle = createInteractiveHandle(zoom);
      this.cropHandles.push(handle);
      this.canvas.add(handle);
    }

    for (let i = 0; i < anchors.length; i += 1) {
      const handle = this.cropHandles[i]!;
      handle.set({
        left: anchors[i]!.x,
        top: anchors[i]!.y,
        radius: size / 2,
        strokeWidth: 1.25 / zoom,
        shadow: interactiveHandleShadow(zoom),
      });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }
  }

  private clearCropHandles(): void {
    if (!this.canvas) {
      this.cropHandles = [];
      return;
    }
    for (const handle of this.cropHandles) {
      this.canvas.remove(handle);
    }
    this.cropHandles = [];
  }

  private removeCropOverlay(): void {
    this.clearCropHandles();
    this.clearCropShade();
    this.clearCropGuides();
    if (this.cropOverlay && this.canvas) {
      this.canvas.remove(this.cropOverlay);
    }
    this.cropOverlay = null;
    if (!this.panning && !this.hasActivePointerGesture()) {
      this.setCanvasCursor(this.idleInteractionCursor());
    }
  }

  /** True while a tool-owned drag (crop / focus / mask / annotation / …) is in progress. */
  private hasActivePointerGesture(): boolean {
    return !!(
      this.cropGesture ||
      this.focusGesture ||
      this.cropMaskGesture ||
      this.annotationGesture ||
      this.annotationCreateGesture ||
      this.designImageGesture ||
      this.watermarkGesture ||
      this.drawingStroke ||
      this.redactGesture ||
      this.redactTransformGesture ||
      this.pathVertexDrag
    );
  }

  private isRedactInteractive(): boolean {
    return this.handlers?.isRedactActive?.() === true;
  }

  /**
   * Outline every draft region plus the in-progress drag so the user can see
   * what is censored — the scramble alone is hard to spot on busy photos.
   */
  private syncRedactOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isRedactInteractive()) {
      this.removeRedactOverlay();
      return;
    }

    const output = this.currentDocument.output;
    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 2 / zoom;
    const regions = this.activeRedactions();

    while (this.redactOutlines.length < regions.length) {
      const outline = new Rect({
        fill: REDACT_CHROME_FILL,
        stroke: REDACT_CHROME_STROKE,
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      });
      this.canvas.add(outline);
      this.redactOutlines.push(outline);
    }
    while (this.redactOutlines.length > regions.length) {
      const outline = this.redactOutlines.pop();
      if (outline) {
        this.canvas.remove(outline);
      }
    }
    for (let i = 0; i < regions.length; i += 1) {
      const region = regions[i]!;
      const outline = this.redactOutlines[i]!;
      outline.set({
        left: region.x * output.width,
        top: region.y * output.height,
        width: Math.max(region.width * output.width, strokeWidth),
        height: Math.max(region.height * output.height, strokeWidth),
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
      });
      outline.setCoords();
      this.canvas.bringObjectToFront(outline);
    }

    const anchors = regions.flatMap((region) => redactionCornerHandles(region, output));
    const handleSize = this.handleVisualSize();
    while (this.redactHandles.length < anchors.length) {
      const handle = createInteractiveHandle(zoom);
      this.canvas.add(handle);
      this.redactHandles.push(handle);
    }
    while (this.redactHandles.length > anchors.length) {
      const handle = this.redactHandles.pop();
      if (handle) {
        this.canvas.remove(handle);
      }
    }
    for (let i = 0; i < anchors.length; i += 1) {
      const handle = this.redactHandles[i]!;
      const anchor = anchors[i]!;
      styleInteractiveHandle(handle, {
        x: anchor.x,
        y: anchor.y,
        zoom,
        size: handleSize * 0.7,
      });
      handle.set({ stroke: REDACT_CHROME_STROKE });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }

    const gesture = this.redactGesture;
    if (!gesture) {
      if (this.redactMarquee) {
        this.canvas.remove(this.redactMarquee);
        this.redactMarquee = null;
      }
      return;
    }

    if (!this.redactMarquee) {
      this.redactMarquee = new Rect({
        fill: REDACT_CHROME_FILL,
        stroke: REDACT_CHROME_STROKE,
        strokeWidth,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      });
      this.canvas.add(this.redactMarquee);
    }
    this.redactMarquee.set({
      left: Math.min(gesture.start.x, gesture.current.x),
      top: Math.min(gesture.start.y, gesture.current.y),
      width: Math.abs(gesture.current.x - gesture.start.x),
      height: Math.abs(gesture.current.y - gesture.start.y),
      strokeWidth,
    });
    this.redactMarquee.setCoords();
    this.canvas.bringObjectToFront(this.redactMarquee);
  }

  private removeRedactOverlay(): void {
    if (!this.canvas) {
      this.redactOutlines = [];
      this.redactHandles = [];
      this.redactMarquee = null;
      return;
    }
    for (const outline of this.redactOutlines) {
      this.canvas.remove(outline);
    }
    this.redactOutlines = [];
    for (const handle of this.redactHandles) {
      this.canvas.remove(handle);
    }
    this.redactHandles = [];
    if (this.redactMarquee) {
      this.canvas.remove(this.redactMarquee);
      this.redactMarquee = null;
    }
  }

  /** Move cursor inside a region, resize cursor on a corner, crosshair elsewhere. */
  private updateRedactHoverCursor(event: MouseEvent): void {
    const scenePoint = this.scenePointFromEvent(event);
    const output = this.currentDocument?.output;
    if (!scenePoint || !output) {
      this.setCanvasCursor('crosshair');
      return;
    }
    const hit = hitTestRedactions(
      this.activeRedactions(),
      scenePoint,
      output,
      this.handleHitSize(),
    );
    this.setCanvasCursor(hit ? cursorForRedactionHandle(hit.handle) : 'crosshair');
  }

  private syncFocusOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isFocusInteractive()) {
      this.removeFocusOverlay();
      return;
    }
    const focus = this.activeFocus();
    if (focus.mode === 'none') {
      this.removeFocusOverlay();
      return;
    }
    const layout = focusChromeLayout(focus, this.currentDocument.output, this.rotateHandleOffset());
    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 2 / zoom;
    const size = this.handleVisualSize();

    if (focus.mode === 'radial') {
      if (this.focusRing && !(this.focusRing instanceof Ellipse)) {
        this.canvas.remove(this.focusRing);
        this.focusRing = null;
      }
      if (!this.focusRing) {
        this.focusRing = new Ellipse({
          fill: 'rgba(0,0,0,0)',
          stroke: INTERACTIVE_CHROME_STROKE,
          strokeWidth,
          strokeDashArray: INTERACTIVE_CHROME_DASH,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        this.canvas.add(this.focusRing);
      }
      this.focusRing.set({
        left: layout.cx,
        top: layout.cy,
        rx: layout.radius,
        ry: layout.radius,
        angle: 0,
        strokeWidth,
      });
    } else {
      if (this.focusRing && !(this.focusRing instanceof Rect)) {
        this.canvas.remove(this.focusRing);
        this.focusRing = null;
      }
      if (!this.focusRing) {
        this.focusRing = new Rect({
          fill: 'rgba(43, 108, 176, 0.08)',
          stroke: INTERACTIVE_CHROME_STROKE,
          strokeWidth,
          strokeDashArray: INTERACTIVE_CHROME_DASH,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        this.canvas.add(this.focusRing);
      }
      const bandW = layout.diagonal * 1.2;
      this.focusRing.set({
        left: layout.cx,
        top: layout.cy,
        width: bandW,
        height: layout.radius * 2,
        angle: focus.angle,
        strokeWidth,
      });
    }
    this.focusRing.setCoords();
    this.canvas.bringObjectToFront(this.focusRing);

    if (this.focusHandles.some((h) => !(h instanceof Circle))) {
      for (const handle of this.focusHandles) {
        this.canvas.remove(handle);
      }
      this.focusHandles = [];
    }

    const anchors = [{ x: layout.sizeHandle.x, y: layout.sizeHandle.y, rotate: false }];
    if (layout.rotateHandle) {
      anchors.push({
        x: layout.rotateHandle.x,
        y: layout.rotateHandle.y,
        rotate: true,
      });
      this.focusRotateStem = syncRotateStemLine(
        this.focusRotateStem,
        { x: layout.cx, y: layout.cy },
        layout.rotateHandle,
        zoom,
        this.canvas,
      );
    } else if (this.focusRotateStem) {
      this.canvas.remove(this.focusRotateStem);
      this.focusRotateStem = null;
    }
    while (this.focusHandles.length < anchors.length) {
      const handle = createInteractiveHandle(zoom);
      this.canvas.add(handle);
      this.focusHandles.push(handle);
    }
    while (this.focusHandles.length > anchors.length) {
      const handle = this.focusHandles.pop();
      if (handle) {
        this.canvas.remove(handle);
      }
    }
    for (let i = 0; i < anchors.length; i += 1) {
      const handle = this.focusHandles[i]!;
      const anchor = anchors[i]!;
      styleInteractiveHandle(handle, {
        x: anchor.x,
        y: anchor.y,
        zoom,
        size,
        rotate: anchor.rotate,
      });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }
  }

  private removeFocusOverlay(): void {
    if (!this.canvas) {
      this.focusRing = null;
      this.focusHandles = [];
      this.focusRotateStem = null;
      return;
    }
    if (this.focusRing) {
      this.canvas.remove(this.focusRing);
      this.focusRing = null;
    }
    for (const handle of this.focusHandles) {
      this.canvas.remove(handle);
    }
    this.focusHandles = [];
    if (this.focusRotateStem) {
      this.canvas.remove(this.focusRotateStem);
      this.focusRotateStem = null;
    }
  }

  private syncCropMaskOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isCropMaskInteractive()) {
      this.removeCropMaskOverlay();
      return;
    }
    const cropMask = this.activeCropMask();
    if (cropMask.shape === 'none') {
      this.removeCropMaskOverlay();
      return;
    }
    const layout = cropMaskChromeLayout(
      cropMask,
      this.currentDocument.output,
      this.rotateHandleOffset(),
    );
    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 2 / zoom;
    const size = this.handleVisualSize();

    if (!this.cropMaskOutline) {
      this.cropMaskOutline = new Rect({
        fill: 'rgba(0,0,0,0)',
        stroke: INTERACTIVE_CHROME_STROKE,
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      this.canvas.add(this.cropMaskOutline);
    }
    this.cropMaskOutline.set({
      left: layout.cx,
      top: layout.cy,
      width: layout.boxW,
      height: layout.boxH,
      angle: cropMask.angle,
      strokeWidth,
    });
    this.cropMaskOutline.setCoords();
    this.canvas.bringObjectToFront(this.cropMaskOutline);

    if (this.cropMaskHandles.some((h) => !(h instanceof Circle))) {
      for (const handle of this.cropMaskHandles) {
        this.canvas.remove(handle);
      }
      this.cropMaskHandles = [];
    }

    const north = layout.edgeHandles.find((edge) => edge.id === 'n') ?? {
      x: layout.cx,
      y: layout.top,
    };
    this.cropMaskRotateStem = syncRotateStemLine(
      this.cropMaskRotateStem,
      { x: north.x, y: north.y },
      layout.rotateHandle,
      zoom,
      this.canvas,
    );

    const anchors = [
      ...layout.edgeHandles.map((edge) => ({ x: edge.x, y: edge.y, rotate: false })),
      { x: layout.rotateHandle.x, y: layout.rotateHandle.y, rotate: true },
    ];
    while (this.cropMaskHandles.length < anchors.length) {
      const handle = createInteractiveHandle(zoom);
      this.canvas.add(handle);
      this.cropMaskHandles.push(handle);
    }
    while (this.cropMaskHandles.length > anchors.length) {
      const handle = this.cropMaskHandles.pop();
      if (handle) {
        this.canvas.remove(handle);
      }
    }
    for (let i = 0; i < anchors.length; i += 1) {
      const handle = this.cropMaskHandles[i]!;
      const anchor = anchors[i]!;
      styleInteractiveHandle(handle, {
        x: anchor.x,
        y: anchor.y,
        zoom,
        size,
        rotate: anchor.rotate,
      });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }
  }

  private removeCropMaskOverlay(): void {
    if (!this.canvas) {
      this.cropMaskOutline = null;
      this.cropMaskHandles = [];
      this.cropMaskRotateStem = null;
      return;
    }
    if (this.cropMaskOutline) {
      this.canvas.remove(this.cropMaskOutline);
      this.cropMaskOutline = null;
    }
    for (const handle of this.cropMaskHandles) {
      this.canvas.remove(handle);
    }
    this.cropMaskHandles = [];
    if (this.cropMaskRotateStem) {
      this.canvas.remove(this.cropMaskRotateStem);
      this.cropMaskRotateStem = null;
    }
  }

  private syncFrameOverlay(): void {
    if (!this.canvas || !this.currentDocument || !this.isFrameInteractive()) {
      this.removeFrameOverlay();
      return;
    }
    const frame = this.activeFrame();
    if (!isFrameEdgeInteractive(frame)) {
      this.removeFrameOverlay();
      return;
    }
    const layout = frameChromeLayout(frame, this.currentDocument.output);
    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const strokeWidth = 2 / zoom;
    const width = layout.right - layout.left;
    const height = layout.bottom - layout.top;
    const cx = (layout.left + layout.right) / 2;
    const cy = (layout.top + layout.bottom) / 2;

    if (!this.frameOutline) {
      this.frameOutline = new Rect({
        fill: 'rgba(0,0,0,0)',
        stroke: INTERACTIVE_CHROME_STROKE,
        strokeWidth,
        strokeDashArray: INTERACTIVE_CHROME_DASH,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      this.canvas.add(this.frameOutline);
    }
    this.frameOutline.set({
      left: cx,
      top: cy,
      width,
      height,
      strokeWidth,
    });
    this.frameOutline.setCoords();
    this.canvas.bringObjectToFront(this.frameOutline);

    if (this.frameHandles.some((h) => !(h instanceof Circle))) {
      for (const handle of this.frameHandles) {
        this.canvas.remove(handle);
      }
      this.frameHandles = [];
    }

    const anchors = layout.edgeHandles;
    while (this.frameHandles.length < anchors.length) {
      const handle = createInteractiveHandle(zoom);
      this.canvas.add(handle);
      this.frameHandles.push(handle);
    }
    while (this.frameHandles.length > anchors.length) {
      const handle = this.frameHandles.pop();
      if (handle) {
        this.canvas.remove(handle);
      }
    }
    for (let i = 0; i < anchors.length; i += 1) {
      const handle = this.frameHandles[i]!;
      const anchor = anchors[i]!;
      handle.set({ left: anchor.x, top: anchor.y });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }
  }

  private removeFrameOverlay(): void {
    if (!this.canvas) {
      this.frameOutline = null;
      this.frameHandles = [];
      return;
    }
    if (this.frameOutline) {
      this.canvas.remove(this.frameOutline);
      this.frameOutline = null;
    }
    for (const handle of this.frameHandles) {
      this.canvas.remove(handle);
    }
    this.frameHandles = [];
  }

  /**
   * Path tool interactive chrome: vertex anchor circles + rubber-band to cursor.
   * Overlay-only — never part of composed export output.
   */
  private syncPathToolOverlay(): void {
    if (!this.canvas || !this.shouldShowPathVertexOverlay()) {
      this.clearPathToolOverlay();
      return;
    }

    const points = this.handlers?.getActivePathPoints?.() ?? null;
    if (!points || points.length === 0) {
      // Keep last mouse position so rubber-band appears as soon as the first vertex lands.
      this.clearPathToolOverlayVisuals();
      return;
    }

    const drawing = this.isPathDrawingActive();
    const selectedIndex = drawing ? null : (this.handlers?.getSelectedPathVertexIndex?.() ?? null);
    const zoom = Math.max(this.canvas.getZoom(), 0.001);
    const stroke = this.handlers?.getActivePathStroke?.() ?? INTERACTIVE_CHROME_STROKE;
    const baseRadius = 5 / zoom;
    const firstRadius = 7 / zoom;
    const selectedRadius = 6.5 / zoom;
    const handleStroke = 1.5 / zoom;

    while (this.pathVertexHandles.length < points.length) {
      const handle = new Circle({
        fill: INTERACTIVE_HANDLE_FILL,
        stroke: INTERACTIVE_HANDLE_STROKE,
        strokeWidth: handleStroke,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      });
      this.canvas.add(handle);
      this.pathVertexHandles.push(handle);
    }

    for (let i = 0; i < points.length; i += 1) {
      const handle = this.pathVertexHandles[i]!;
      const point = points[i]!;
      const isCloseTarget = drawing && i === 0 && points.length >= 3;
      const isSelected = selectedIndex === i;
      handle.set({
        left: point.x,
        top: point.y,
        radius: isSelected ? selectedRadius : isCloseTarget ? firstRadius : baseRadius,
        strokeWidth: isSelected ? 2 / zoom : handleStroke,
        stroke: isSelected
          ? '#c53030'
          : isCloseTarget
            ? INTERACTIVE_CHROME_STROKE
            : INTERACTIVE_HANDLE_STROKE,
        fill: isSelected ? '#fff5f5' : INTERACTIVE_HANDLE_FILL,
      });
      handle.setCoords();
      this.canvas.bringObjectToFront(handle);
    }

    while (this.pathVertexHandles.length > points.length) {
      const extra = this.pathVertexHandles.pop();
      if (extra) {
        this.canvas.remove(extra);
      }
    }

    // Delete control is DOM (`fluxio-canvas-selection-toolbar`); canvas only highlights selection.

    const mouse = this.lastPathMouseScene;
    if (drawing && mouse) {
      const last = points[points.length - 1]!;
      const lineStroke = Math.max(1.5 / zoom, 2 / zoom);
      if (this.pathRubberBandLine) {
        this.canvas.remove(this.pathRubberBandLine);
        this.pathRubberBandLine = null;
      }
      this.pathRubberBandLine = new Line([last.x, last.y, mouse.x, mouse.y], {
        stroke,
        strokeWidth: lineStroke,
        strokeDashArray: [8 / zoom, 6 / zoom],
        selectable: false,
        evented: false,
        objectCaching: false,
      });
      this.canvas.add(this.pathRubberBandLine);
      this.canvas.bringObjectToFront(this.pathRubberBandLine);
    } else if (this.pathRubberBandLine) {
      this.canvas.remove(this.pathRubberBandLine);
      this.pathRubberBandLine = null;
    }

    for (const handle of this.pathVertexHandles) {
      this.canvas.bringObjectToFront(handle);
    }

    this.canvas.requestRenderAll();
  }

  private hitTestPathVertex(
    points: readonly { readonly x: number; readonly y: number }[],
    scenePoint: { readonly x: number; readonly y: number },
  ): number {
    const hitR = Math.max(this.handleHitSize(), this.handleVisualSize() * 1.25);
    const hitR2 = hitR * hitR;
    let best = -1;
    let bestDist = hitR2;
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i]!;
      const dx = scenePoint.x - point.x;
      const dy = scenePoint.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist <= bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  /**
   * Hit-test path segments for insert-vertex. Ignores hits too close to endpoints
   * so existing vertex handles keep priority.
   */
  private hitTestPathSegment(
    points: readonly { readonly x: number; readonly y: number }[],
    closed: boolean,
    scenePoint: { readonly x: number; readonly y: number },
  ): { afterIndex: number; x: number; y: number } | null {
    if (points.length < 2) {
      return null;
    }
    const hitR = Math.max(this.handleHitSize(), this.handleVisualSize() * 1.1);
    const hitR2 = hitR * hitR;
    let best: { afterIndex: number; x: number; y: number; dist2: number } | null = null;
    const segmentCount = closed ? points.length : points.length - 1;

    for (let i = 0; i < segmentCount; i += 1) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const len2 = abx * abx + aby * aby;
      if (len2 < 1e-6) {
        continue;
      }
      const t = ((scenePoint.x - a.x) * abx + (scenePoint.y - a.y) * aby) / len2;
      if (t < 0.12 || t > 0.88) {
        continue;
      }
      const x = a.x + t * abx;
      const y = a.y + t * aby;
      const dx = scenePoint.x - x;
      const dy = scenePoint.y - y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > hitR2) {
        continue;
      }
      if (!best || dist2 < best.dist2) {
        best = { afterIndex: i, x, y, dist2 };
      }
    }
    return best ? { afterIndex: best.afterIndex, x: best.x, y: best.y } : null;
  }

  private clearPathToolOverlayVisuals(): void {
    if (!this.canvas) {
      this.pathVertexHandles = [];
      this.pathRubberBandLine = null;
      return;
    }
    for (const handle of this.pathVertexHandles) {
      this.canvas.remove(handle);
    }
    this.pathVertexHandles = [];
    if (this.pathRubberBandLine) {
      this.canvas.remove(this.pathRubberBandLine);
      this.pathRubberBandLine = null;
    }
  }

  private clearPathToolOverlay(): void {
    this.clearPathToolOverlayVisuals();
    this.lastPathMouseScene = null;
  }

  private destroyCanvasOnly(): void {
    this.cancelScheduledRefresh();
    globalThis.removeEventListener?.('keydown', this.onPanKeyDown, true);
    globalThis.removeEventListener?.('keyup', this.onPanKeyUp, true);
    globalThis.removeEventListener?.('blur', this.onPanKeyBlur);
    this.spacePanActive = false;
    if (this.canvas) {
      this.canvas.off('mouse:down', this.onMouseDown);
      this.canvas.off('mouse:move', this.onMouseMove);
      this.canvas.off('mouse:up', this.onMouseUp);
      this.canvas.off('mouse:dblclick', this.onDoubleClick);
    }
    this.disposeDisplayImage();
    this.documentPlate = null;
    this.sourceImage?.dispose();
    this.sourceImage = null;
    this.removeCropOverlay();
    this.removeFocusOverlay();
    this.removeCropMaskOverlay();
    this.removeAnnotationOverlay();
    this.clearPathToolOverlay();
    this.clearMarkupSnapOverlay();
    this.clearLayerCache();
    this.cropGesture = null;
    this.focusGesture = null;
    this.cropMaskGesture = null;
    this.frameGesture = null;
    this.annotationGesture = null;
    this.annotationCreateGesture = null;
    this.designImageGesture = null;
    this.watermarkGesture = null;
    this.drawingStroke = false;
    this.pathVertexPending = null;
    this.pathVertexDrag = null;
    if (this.canvas) {
      void this.canvas.dispose();
      this.canvas = null;
    }
    this.canvasEl = null;
    this.currentDocument = null;
    this.preview = null;
    this.asset = null;
  }
}

/**
 * Fabric's default WebGL filter backend uses a 4096×4096 drawing buffer.
 * Images larger than that (e.g. 7952×5304) get clamped to a square tile and
 * shrink on screen after effects/filters/adjustments. Use Canvas2d when the
 * source exceeds the active WebGL tile size.
 */
function ensureSafeFilterBackend(width: number, height: number): void {
  const needed = Math.max(1, Math.ceil(Math.max(width, height)));
  const current = getFilterBackend(false) as
    { tileSize?: number; dispose?: () => void } | null | undefined;

  if (!current) {
    if (needed > config.textureSize) {
      setFilterBackend(new Canvas2dFilterBackend());
    } else {
      getFilterBackend(true);
    }
    return;
  }

  if (typeof current.tileSize === 'number' && current.tileSize < needed) {
    current.dispose?.();
    setFilterBackend(new Canvas2dFilterBackend());
  }
}

function applyFabricFiltersToCanvas(
  source: HTMLCanvasElement,
  fabricFilters: NonNullable<FabricImage['filters']>,
): HTMLCanvasElement {
  if (fabricFilters.length === 0) {
    return source;
  }

  ensureSafeFilterBackend(source.width, source.height);

  const image = new FabricImage(source, {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    width: source.width,
    height: source.height,
  });
  image.filters = fabricFilters;
  image.applyFilters();
  const out = image.toCanvasElement({
    withoutTransform: true,
    enableRetinaScaling: false,
  });
  image.dispose();

  if (out.width === source.width && out.height === source.height) {
    return out;
  }

  // Force Canvas2d and retry once — never stretch a wrong-sized result.
  const current = getFilterBackend(false) as { dispose?: () => void } | null | undefined;
  current?.dispose?.();
  setFilterBackend(new Canvas2dFilterBackend());

  const retry = new FabricImage(source, {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    width: source.width,
    height: source.height,
  });
  retry.filters = fabricFilters;
  retry.applyFilters();
  const fixed = retry.toCanvasElement({
    withoutTransform: true,
    enableRetinaScaling: false,
  });
  retry.dispose();

  if (fixed.width === source.width && fixed.height === source.height) {
    return fixed;
  }
  return source;
}

function buildFabricAdjustmentFilters(adjustments: AdjustmentsState) {
  const list = [];

  if (adjustments.brightness !== 0) {
    list.push(new filters.Brightness({ brightness: adjustments.brightness }));
  }
  if (adjustments.contrast !== 0) {
    list.push(new filters.Contrast({ contrast: adjustments.contrast }));
  }
  if (adjustments.saturation !== 0) {
    list.push(new filters.Saturation({ saturation: adjustments.saturation }));
  }
  if (adjustments.hue !== 0) {
    list.push(new filters.HueRotation({ rotation: adjustments.hue }));
  }
  if (adjustments.value !== 0) {
    const scale = 1 + adjustments.value;
    list.push(
      new filters.ColorMatrix({
        matrix: [scale, 0, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, 1, 0],
      }),
    );
  }
  if (adjustments.warmth !== 0) {
    // Warm shifts toward orange; cool toward blue (offset channel in 0–255 space).
    const offset = adjustments.warmth * 48;
    list.push(
      new filters.ColorMatrix({
        matrix: [1, 0, 0, 0, offset, 0, 1, 0, 0, offset * 0.35, 0, 0, 1, 0, -offset, 0, 0, 0, 1, 0],
      }),
    );
  }
  if (adjustments.blur > 0) {
    list.push(new filters.Blur({ blur: adjustments.blur }));
  }
  if (adjustments.exposure !== 0) {
    // Multiplicative EV-like gain (2^exposure); distinct from Brightness offset.
    const gain = Math.pow(2, adjustments.exposure);
    list.push(
      new filters.ColorMatrix({
        matrix: [gain, 0, 0, 0, 0, 0, gain, 0, 0, 0, 0, 0, gain, 0, 0, 0, 0, 0, 1, 0],
      }),
    );
  }
  if (adjustments.sharpen > 0) {
    // Blend identity → classic sharpen kernel by amount t ∈ (0, 1].
    const t = adjustments.sharpen;
    list.push(
      new filters.Convolute({
        matrix: [0, -t, 0, -t, 1 + 4 * t, -t, 0, -t, 0],
      }),
    );
  }
  if (adjustments.clarity > 0) {
    // Cheap local midtone contrast (mild unsharp).
    const t = adjustments.clarity * 0.4;
    list.push(
      new filters.Convolute({
        matrix: [0, -t, 0, -t, 1 + 4 * t, -t, 0, -t, 0],
      }),
    );
  }

  return list;
}

function buildFabricEffectFilters(effects: EffectsState) {
  const list = [];
  if (effects.pixelate > 0) {
    const blocksize = Math.max(2, Math.round(2 + effects.pixelate * 48));
    list.push(new filters.Pixelate({ blocksize }));
  }
  if (effects.noise > 0) {
    list.push(new filters.Noise({ noise: Math.round(effects.noise * 1000) }));
  }
  return list;
}

function createFabricPresetFilter(
  preset: FilterPresetId,
  hostFilterFunctions?: Readonly<Record<string, FilterColorMatrixSource>> | null,
) {
  const hostMatrix = resolveHostFilterMatrix(preset, hostFilterFunctions);
  if (hostMatrix) {
    return new filters.ColorMatrix({ matrix: [...hostMatrix] });
  }

  switch (preset) {
    case 'grayscale':
      return new filters.Grayscale();
    case 'sepia':
      return new filters.Sepia();
    case 'invert':
      return new filters.Invert();
    case 'blackWhite':
      return new filters.BlackWhite();
    case 'brownie':
      return new filters.Brownie();
    case 'vintage':
      return new filters.Vintage();
    case 'kodachrome':
      return new filters.Kodachrome();
    case 'technicolor':
      return new filters.Technicolor();
    case 'polaroid':
      return new filters.Polaroid();
    case 'none':
    default:
      return null;
  }
}

function applyThresholdCanvas(canvas: HTMLCanvasElement, level: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const cutoff = level * 255;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    const value = luminance >= cutoff ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function applyPosterizeCanvas(canvas: HTMLCanvasElement, levels: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const step = 255 / Math.max(levels - 1, 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i]! / step) * step;
    data[i + 1] = Math.round(data[i + 1]! / step) * step;
    data[i + 2] = Math.round(data[i + 2]! / step) * step;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function drawAnnotationsOnCanvas(
  canvas: HTMLCanvasElement,
  annotations: readonly Annotation[],
  resolveImage: (src: string) => HTMLImageElement | null,
  /** Maps document/output coordinates onto a downsampled preview canvas. */
  geometryScale = 1,
): void {
  if (annotations.length === 0) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.save();
  if (geometryScale !== 1) {
    ctx.scale(geometryScale, geometryScale);
  }

  for (const item of annotations) {
    if (item.visible === false) {
      continue;
    }
    ctx.save();
    const layerOpacity =
      typeof item.opacity === 'number' && Number.isFinite(item.opacity)
        ? Math.max(0, Math.min(1, item.opacity))
        : 1;
    if (layerOpacity < 1) {
      ctx.globalAlpha = layerOpacity;
    }
    const blend = item.blendMode && item.blendMode !== 'normal' ? item.blendMode : null;
    if (blend) {
      ctx.globalCompositeOperation = blend as GlobalCompositeOperation;
    }
    switch (item.kind) {
      case 'text': {
        // Rotate around the interactive-bounds center (same pivot as the
        // selection chrome and rotate gesture), not the top-left corner.
        const textBounds = boundsFromTransformable(item);
        const pivotX = textBounds.x + textBounds.width / 2;
        const pivotY = textBounds.y + textBounds.height / 2;
        ctx.translate(pivotX, pivotY);
        ctx.rotate((item.angle * Math.PI) / 180);
        ctx.translate(item.x - pivotX, item.y - pivotY);
        const lines = item.text.length > 0 ? item.text.split('\n') : [''];
        const lineHeight = item.fontSize * (item.lineHeight > 0 ? item.lineHeight : 1.2);
        ctx.font = `${item.fontStyle} ${item.fontWeight} ${item.fontSize}px ${item.fontFamily}`;
        ctx.textBaseline = 'top';
        const lineWidths = lines.map((line) => ctx.measureText(line).width);
        const maxLineWidth = Math.max(1, ...lineWidths);
        const contentWidth = Math.max(maxLineWidth, item.boxWidth > 0 ? item.boxWidth : 0);
        const hasBackground = !isCssColorTransparent(item.backgroundColor);
        const pad = hasBackground ? item.padding : 0;
        if (hasBackground) {
          ctx.fillStyle = item.backgroundColor;
          ctx.fillRect(0, 0, contentWidth + pad * 2, lines.length * lineHeight + pad * 2);
        }
        ctx.fillStyle = item.fill;
        for (let i = 0; i < lines.length; i += 1) {
          const lineWidth = lineWidths[i] ?? 0;
          let offsetX = pad;
          if (item.textAlign === 'center') {
            offsetX = pad + (contentWidth - lineWidth) / 2;
          } else if (item.textAlign === 'right') {
            offsetX = pad + (contentWidth - lineWidth);
          }
          const textY = pad + i * lineHeight;
          const line = lines[i] ?? '';
          ctx.fillText(line, offsetX, textY);
          if ((item.underline || item.linethrough) && lineWidth > 0) {
            const thickness = Math.max(1, item.fontSize / 16);
            if (item.underline) {
              const underlineY = textY + item.fontSize * 0.89;
              ctx.fillRect(offsetX, underlineY, lineWidth, thickness);
            }
            if (item.linethrough) {
              const strikeY = textY + item.fontSize * 0.5 - thickness / 2;
              ctx.fillRect(offsetX, strikeY, lineWidth, thickness);
            }
          }
        }
        break;
      }
      case 'rect': {
        ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
        ctx.rotate((item.angle * Math.PI) / 180);
        if (!isCssColorTransparent(item.fill)) {
          ctx.fillStyle = item.fill;
          ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
        }
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.strokeWidth;
        ctx.strokeRect(-item.width / 2, -item.height / 2, item.width, item.height);
        break;
      }
      case 'ellipse': {
        ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
        ctx.rotate((item.angle * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
        if (!isCssColorTransparent(item.fill)) {
          ctx.fillStyle = item.fill;
          ctx.fill();
        }
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.strokeWidth;
        ctx.stroke();
        break;
      }
      case 'polygon': {
        if (item.points.length < 2) {
          break;
        }
        ctx.beginPath();
        ctx.moveTo(item.points[0]!.x, item.points[0]!.y);
        for (let i = 1; i < item.points.length; i += 1) {
          ctx.lineTo(item.points[i]!.x, item.points[i]!.y);
        }
        ctx.closePath();
        if (!isCssColorTransparent(item.fill)) {
          ctx.fillStyle = item.fill;
          ctx.fill();
        }
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.strokeWidth;
        ctx.stroke();
        break;
      }
      case 'line':
      case 'arrow': {
        const lineStart = item.lineStart ?? 'none';
        const lineEnd = item.lineEnd ?? (item.kind === 'arrow' ? 'arrowSolid' : 'none');
        ctx.strokeStyle = item.stroke;
        ctx.fillStyle = item.stroke;
        ctx.lineWidth = item.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.x1, item.y1);
        ctx.lineTo(item.x2, item.y2);
        ctx.stroke();
        const angleEnd = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
        const angleStart = angleEnd + Math.PI;
        drawLineEndMarker(ctx, item.x1, item.y1, angleStart, lineStart, item.strokeWidth);
        drawLineEndMarker(ctx, item.x2, item.y2, angleEnd, lineEnd, item.strokeWidth);
        break;
      }
      case 'path': {
        if (item.points.length === 0) {
          break;
        }
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.points[0]!.x, item.points[0]!.y);
        for (let i = 1; i < item.points.length; i += 1) {
          ctx.lineTo(item.points[i]!.x, item.points[i]!.y);
        }
        if (item.closed && item.points.length >= 3) {
          ctx.closePath();
        } else if (item.points.length === 1) {
          ctx.lineTo(item.points[0]!.x + 0.01, item.points[0]!.y);
        }
        ctx.stroke();
        break;
      }
      case 'image': {
        const img = resolveImage(item.src);
        if (!img) {
          break;
        }
        // Layer opacity already applied via globalAlpha above.
        ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
        ctx.rotate((item.angle * Math.PI) / 180);
        ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
        break;
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Pintura-compatible line/arrow endpoint markers. Angle points along the shaft toward the tip. */
function drawLineEndMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  style: LineEndStyle,
  strokeWidth: number,
): void {
  if (style === 'none') {
    return;
  }
  const size = Math.max(8, strokeWidth * 4);

  switch (style) {
    case 'bar': {
      const half = size * 0.45;
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      ctx.beginPath();
      ctx.moveTo(x + nx * half, y + ny * half);
      ctx.lineTo(x - nx * half, y - ny * half);
      ctx.stroke();
      break;
    }
    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(
        x - size * Math.cos(angle - Math.PI / 6),
        y - size * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(x, y);
      ctx.lineTo(
        x - size * Math.cos(angle + Math.PI / 6),
        y - size * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
      break;
    }
    case 'arrowSolid': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - size * Math.cos(angle - Math.PI / 6),
        y - size * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        x - size * Math.cos(angle + Math.PI / 6),
        y - size * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'circle':
    case 'circleSolid': {
      const r = size * 0.28;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (style === 'circleSolid') {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;
    }
    case 'square':
    case 'squareSolid': {
      const half = size * 0.28;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.rect(-half, -half, half * 2, half * 2);
      if (style === 'squareSolid') {
        ctx.fill();
      } else {
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }
}

function drawWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  watermark: WatermarkState,
  resolveImage: (src: string) => HTMLImageElement | null,
  /** Maps document/output coordinates onto a downsampled preview canvas. */
  geometryScale = 1,
): void {
  if (isIdentityWatermark(watermark)) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const scale = geometryScale > 0 ? geometryScale : 1;
  const output = { width: canvas.width / scale, height: canvas.height / scale };
  const minEdge = Math.min(output.width, output.height);

  ctx.save();
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }
  ctx.globalAlpha = watermark.opacity;

  if (watermark.mode === 'text') {
    const fontSize = Math.max(10, Math.round(minEdge * 0.06 * watermark.scale));
    ctx.font = `${fontSize}px ${watermark.fontFamily}`;
    ctx.fillStyle = watermark.fill;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(watermark.text);
    const box = {
      width: Math.max(1, metrics.width),
      height: Math.max(1, fontSize * 1.2),
    };
    placeWatermarkBox(ctx, resolveWatermarkPlacement(output, box, watermark), box, watermark.angle);
    ctx.fillText(watermark.text, 0, 0);
  } else if (watermark.mode === 'image' && watermark.imageSrc) {
    const img = resolveImage(watermark.imageSrc);
    if (img) {
      const natW = img.naturalWidth || img.width || 1;
      const natH = img.naturalHeight || img.height || 1;
      const maxEdge = Math.max(24, minEdge * 0.35 * watermark.scale);
      const fit = Math.min(maxEdge / natW, maxEdge / natH);
      const box = {
        width: Math.max(1, Math.round(natW * fit)),
        height: Math.max(1, Math.round(natH * fit)),
      };
      placeWatermarkBox(
        ctx,
        resolveWatermarkPlacement(output, box, watermark),
        box,
        watermark.angle,
      );
      ctx.drawImage(img, 0, 0, box.width, box.height);
    }
  }

  ctx.restore();
}

/** Move the origin to the watermark box top-left, spinning around its centre. */
function placeWatermarkBox(
  ctx: CanvasRenderingContext2D,
  origin: { readonly x: number; readonly y: number },
  box: ImageSize,
  angle: number,
): void {
  ctx.translate(origin.x + box.width / 2, origin.y + box.height / 2);
  if (angle) {
    ctx.rotate((angle * Math.PI) / 180);
  }
  ctx.translate(-box.width / 2, -box.height / 2);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    } catch (error) {
      reject(error);
    }
  });
}

function isSecurityError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'SecurityError') ||
    (error instanceof Error && error.name === 'SecurityError')
  );
}
