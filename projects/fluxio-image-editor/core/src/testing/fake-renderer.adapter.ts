import type { RgbaColor } from '../models/color';
import type { ReadonlyImageDocument } from '../models/image-document';
import type { NormalizedImageAsset } from '../models/source';
import type { ReadonlyViewportState } from '../models/viewport-state';
import type {
  RasterExportOptions,
  ReadonlyEditorPreview,
  RendererMountOptions,
  RenderingEnginePort,
  ViewportInteractionHandlers,
} from '../ports/rendering-engine.port';

/** In-memory renderer for Core vertical-slice tests (no Fabric / canvas). */
export class FakeRendererAdapter implements RenderingEnginePort {
  mounted = false;
  destroyed = false;
  loadedAsset: NormalizedImageAsset | null = null;
  lastDocument: ReadonlyImageDocument | null = null;
  lastViewport: ReadonlyViewportState | null = null;
  preview: ReadonlyEditorPreview | null = null;
  compareDocument: ReadonlyImageDocument | null = null;
  exportCalls: RasterExportOptions[] = [];
  /** When set, `exportRaster` waits this many ms before resolving (timeout tests). */
  exportDelayMs = 0;
  handlers: ViewportInteractionHandlers | null = null;
  renderCalls = 0;

  async mount(_host: HTMLElement, _options: RendererMountOptions): Promise<void> {
    this.mounted = true;
  }

  async loadSource(asset: NormalizedImageAsset): Promise<void> {
    this.loadedAsset = asset;
  }

  render(snapshot: ReadonlyImageDocument): void {
    this.renderCalls += 1;
    this.lastDocument = snapshot;
  }

  renderPreview(preview: ReadonlyEditorPreview | null): void {
    this.preview = preview;
  }

  updateViewport(viewport: ReadonlyViewportState): void {
    this.lastViewport = viewport;
  }

  resize(_width: number, _height: number): void {
    // no-op for tests
  }

  setInteractionHandlers(handlers: ViewportInteractionHandlers | null): void {
    this.handlers = handlers;
  }

  cancelActiveGesture(): void {
    // no-op for Core unit tests
  }

  setCompareOriginal(baseline: ReadonlyImageDocument | null): void {
    this.compareDocument = baseline;
  }

  async exportRaster(options: RasterExportOptions): Promise<Blob> {
    this.exportCalls.push(options);
    if (this.exportDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.exportDelayMs));
    }
    const rotation = this.lastDocument?.transform.rotationDegrees ?? 0;
    const flip = `${this.lastDocument?.transform.flipX ? 'H' : ''}${this.lastDocument?.transform.flipY ? 'V' : ''}`;
    const crop = this.lastDocument?.crop
      ? `crop-${Math.round(this.lastDocument.crop.width)}x${Math.round(this.lastDocument.crop.height)}`
      : 'nocrop';
    const type =
      options.format === 'jpeg'
        ? 'image/jpeg'
        : options.format === 'webp'
          ? 'image/webp'
          : 'image/png';
    const prefix = options.format === 'jpeg' ? 'jpeg' : options.format === 'webp' ? 'webp' : 'png';
    return new Blob([`${prefix}-rot-${rotation}-${flip}-${crop}`], { type });
  }

  async samplePixelAtScenePoint(_x: number, _y: number): Promise<RgbaColor | null> {
    return { r: 255, g: 0, b: 0, a: 1 };
  }

  clear(): void {
    this.lastDocument = null;
    this.loadedAsset = null;
    this.compareDocument = null;
    this.preview = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.mounted = false;
    this.clear();
  }
}
