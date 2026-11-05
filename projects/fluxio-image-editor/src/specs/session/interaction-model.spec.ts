import { EditorSession } from 'fluxio-image-editor/core';
import {
  AdjustmentsPlugin,
  ADJUSTMENTS_SET_COMMAND,
} from 'fluxio-image-editor/plugins/adjustments';
import { CropPlugin, CROP_SET_COMMAND } from 'fluxio-image-editor/plugins/crop';
import {
  DrawingPlugin,
  DRAWING_SET_COMMAND,
} from 'fluxio-image-editor/plugins/drawing';
import { TextPlugin, TEXT_SET_COMMAND } from 'fluxio-image-editor/plugins/text';
import {
  WatermarkPlugin,
  WATERMARK_SET_COMMAND,
} from 'fluxio-image-editor/plugins/watermark';
import {
  TRANSFORM_ROTATE_COMMAND,
  TransformPlugin,
} from 'fluxio-image-editor/plugins/transform';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';
import {
  createDefaultPathAnnotation,
  createDefaultTextAnnotation,
  createInitialAdjustments,
  createInitialWatermark,
  normalizeAdjustments,
  normalizeWatermark,
} from 'fluxio-image-editor/core';

import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';

function createFixtureDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

describe('Tool interaction model', () => {
  let host: HTMLDivElement;
  let session: EditorSession;

  beforeEach(async () => {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;

    class MockImage {
      onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
      onerror: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
      naturalWidth = 100;
      naturalHeight = 100;
      alt = '';
      crossOrigin = '';
      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'));
        });
      }
    }
    (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;

    host = document.createElement('div');
    host.style.width = '400px';
    host.style.height = '300px';
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({
        width: 400,
        height: 300,
        top: 0,
        left: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(host);

    session = new EditorSession({
      plugins: [
        new ViewportPlugin(),
        new TransformPlugin(),
        new CropPlugin(),
        new AdjustmentsPlugin(),
        new TextPlugin(),
        new DrawingPlugin(),
        new WatermarkPlugin(),
      ],
    });
    await session.attach(host, new FakeRendererAdapter());
    await session.load(createFixtureDataUrl());
  });

  afterEach(() => {
    session.destroy();
    host.remove();
  });

  describe('raster preview tools', () => {
    it('keeps slider changes preview-only until Apply creates one history entry', async () => {
      session.setActiveTool('adjustments');
      const preview = normalizeAdjustments({
        ...createInitialAdjustments(),
        brightness: 0.35,
      });
      session.setPreview({ adjustments: preview });

      expect(session.getSnapshot().history.past.length).toBe(0);
      expect(session.getSnapshot().document?.adjustments.brightness).toBe(0);
      expect(session.getSnapshot().preview?.adjustments?.brightness).toBe(0.35);

      await session.execute(ADJUSTMENTS_SET_COMMAND, { adjustments: preview });
      session.setPreview(null);

      expect(session.getSnapshot().history.past.length).toBe(1);
      expect(session.getSnapshot().document?.adjustments.brightness).toBe(0.35);
    });

    it('Cancel clears preview without a history entry', () => {
      session.setActiveTool('adjustments');
      session.setPreview({
        adjustments: normalizeAdjustments({
          ...createInitialAdjustments(),
          contrast: 0.5,
        }),
      });
      expect(session.getSnapshot().preview?.adjustments?.contrast).toBe(0.5);

      session.setPreview(null);
      session.setActiveTool(null);

      expect(session.getSnapshot().history.past.length).toBe(0);
      expect(session.getSnapshot().document?.adjustments.contrast).toBe(0);
      expect(session.getSnapshot().preview).toBeNull();
    });

    it('Reset preview draft does not commit; Apply after reset commits only when document changes', async () => {
      session.setActiveTool('adjustments');
      const edited = normalizeAdjustments({
        ...createInitialAdjustments(),
        brightness: 0.4,
      });
      await session.execute(ADJUSTMENTS_SET_COMMAND, { adjustments: edited });
      expect(session.getSnapshot().history.past.length).toBe(1);

      const resetDraft = createInitialAdjustments();
      session.setPreview({ adjustments: resetDraft });
      expect(session.getSnapshot().history.past.length).toBe(1);

      await session.execute(ADJUSTMENTS_SET_COMMAND, { adjustments: resetDraft });
      session.setPreview(null);

      expect(session.getSnapshot().history.past.length).toBe(2);
      expect(session.getSnapshot().document?.adjustments).toEqual(resetDraft);

      // Applying identity again is a no-op — no extra history entry.
      await session.execute(ADJUSTMENTS_SET_COMMAND, { adjustments: resetDraft });
      expect(session.getSnapshot().history.past.length).toBe(2);
    });

    it('commits crop preview as one undo entry', async () => {
      session.setActiveTool('crop');
      const crop = { x: 5, y: 5, width: 40, height: 40, aspectRatio: null as number | null };
      session.setPreview({ crop });
      expect(session.getSnapshot().history.past.length).toBe(0);

      await session.execute(CROP_SET_COMMAND, { crop });
      session.setPreview(null);

      expect(session.getSnapshot().history.past.length).toBe(1);
      expect(session.getSnapshot().document?.crop?.width).toBe(40);
    });
  });

  describe('immediate transform tools', () => {
    it('commits rotate immediately and Done exit adds no history entry', async () => {
      await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
      expect(session.getSnapshot().history.past.length).toBe(1);
      expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);

      session.setActiveTool('rotate');
      session.setActiveTool(null);

      expect(session.getSnapshot().history.past.length).toBe(1);
      session.undo();
      expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(0);
    });
  });

  describe('viewport tools', () => {
    it('does not record zoom or pan in document history', () => {
      const zoom = session.getSnapshot().viewport.zoom;
      session.setZoom(zoom * 1.5, 50, 50);
      session.panBy(12, -8);
      expect(session.getSnapshot().history.past.length).toBe(0);
      expect(session.isDirty()).toBe(false);
    });
  });

  describe('canvas object tools', () => {
    it('commits text edits per gesture; exiting tool does not revert committed work', async () => {
      const output = session.getSnapshot().document!.output;
      const text = createDefaultTextAnnotation(output);
      await session.execute(TEXT_SET_COMMAND, { texts: [text] });
      expect(session.getSnapshot().history.past.length).toBe(1);

      const moved = { ...text, x: text.x + 20, y: text.y + 10 };
      await session.execute(TEXT_SET_COMMAND, { texts: [moved] });
      expect(session.getSnapshot().history.past.length).toBe(2);

      session.setActiveTool('text');
      session.setPreview({ annotations: [moved] });
      session.setPreview(null);
      session.setActiveTool(null);

      expect(session.getSnapshot().document?.annotations[0]).toMatchObject({
        x: moved.x,
        y: moved.y,
      });
      expect(session.getSnapshot().history.past.length).toBe(2);
    });

    it('Delete removes selected text with one history entry', async () => {
      const output = session.getSnapshot().document!.output;
      const text = createDefaultTextAnnotation(output);
      await session.execute(TEXT_SET_COMMAND, { texts: [text] });
      await session.execute(TEXT_SET_COMMAND, { texts: [] });
      expect(session.getSnapshot().history.past.length).toBe(2);
      expect(session.getSnapshot().document?.annotations).toEqual([]);
    });
  });

  describe('drawing tool', () => {
    it('commits each stroke as one semantic operation', async () => {
      const output = session.getSnapshot().document!.output;
      const stroke = createDefaultPathAnnotation(output);
      await session.execute(DRAWING_SET_COMMAND, { paths: [stroke] });
      expect(session.getSnapshot().history.past.length).toBe(1);

      const stroke2 = { ...createDefaultPathAnnotation(output), id: 'stroke-2' };
      await session.execute(DRAWING_SET_COMMAND, { paths: [stroke, stroke2] });
      expect(session.getSnapshot().history.past.length).toBe(2);

      session.undo();
      expect(session.getSnapshot().document?.annotations.filter((a) => a.kind === 'path')).toHaveLength(
        1,
      );
    });

    it('clear drawing commits empty paths once', async () => {
      const output = session.getSnapshot().document!.output;
      const stroke = createDefaultPathAnnotation(output);
      await session.execute(DRAWING_SET_COMMAND, { paths: [stroke] });
      const pastBefore = session.getSnapshot().history.past.length;

      await session.execute(DRAWING_SET_COMMAND, { paths: [] });
      expect(session.getSnapshot().history.past.length).toBe(pastBefore + 1);
      expect(session.getSnapshot().document?.annotations).toEqual([]);
    });
  });

  describe('watermark tool', () => {
    it('Done commits panel draft when it differs from document', async () => {
      const draft = normalizeWatermark({
        ...createInitialWatermark(),
        mode: 'text',
        text: 'Draft',
        opacity: 0.6,
      });
      session.setActiveTool('watermark');
      session.setPreview({ watermark: draft });
      await session.execute(WATERMARK_SET_COMMAND, { watermark: draft });
      session.setPreview(null);
      session.setActiveTool(null);

      expect(session.getSnapshot().history.past.length).toBe(1);
      expect(session.getSnapshot().document?.watermark.text).toBe('Draft');
    });

    it('remove watermark commits mode none', async () => {
      await session.execute(WATERMARK_SET_COMMAND, {
        watermark: normalizeWatermark({ ...createInitialWatermark(), mode: 'text', text: 'Mark' }),
      });
      await session.execute(WATERMARK_SET_COMMAND, { watermark: createInitialWatermark() });
      expect(session.getSnapshot().document?.watermark.mode).toBe('none');
      expect(session.getSnapshot().history.past.length).toBe(2);
    });
  });
});
