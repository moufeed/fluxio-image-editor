import { EditorSession } from 'fluxio-image-editor/core';
import { CropPlugin, CROP_SET_COMMAND } from 'fluxio-image-editor/plugins/crop';
import {
  AdjustmentsPlugin,
  ADJUSTMENTS_SET_COMMAND,
} from 'fluxio-image-editor/plugins/adjustments';
import { EffectsPlugin, EFFECTS_SET_COMMAND } from 'fluxio-image-editor/plugins/effects';
import { FiltersPlugin, FILTERS_SET_COMMAND } from 'fluxio-image-editor/plugins/filters';
import { FocusPlugin, FOCUS_SET_COMMAND } from 'fluxio-image-editor/plugins/focus';
import { TextPlugin, TEXT_SET_COMMAND } from 'fluxio-image-editor/plugins/text';
import { ShapesPlugin, SHAPES_SET_COMMAND } from 'fluxio-image-editor/plugins/shapes';
import { DrawingPlugin, DRAWING_SET_COMMAND } from 'fluxio-image-editor/plugins/drawing';
import {
  ImageOverlayPlugin,
  IMAGE_OVERLAY_SET_COMMAND,
} from 'fluxio-image-editor/plugins/image-overlay';
import { StickersPlugin, DEFAULT_STICKER_GALLERY } from 'fluxio-image-editor/plugins/stickers';
import { EmojiPlugin, DEFAULT_EMOJI_GALLERY, EMOJI_FONT_FAMILY } from 'fluxio-image-editor/plugins/emoji';
import {
  WatermarkPlugin,
  WATERMARK_SET_COMMAND,
} from 'fluxio-image-editor/plugins/watermark';
import { PersistencePlugin } from 'fluxio-image-editor/plugins/persistence';
import { ComparePlugin } from 'fluxio-image-editor/plugins/compare';
import { ExportPlugin } from 'fluxio-image-editor/plugins/export';
import {
  createDefaultTextAnnotation,
  createDefaultShapeAnnotation,
  createDefaultPathAnnotation,
  createDefaultImageAnnotation,
  createInitialWatermark,
  DESIGN_STATE_KIND,
  DESIGN_STATE_SCHEMA_VERSION,
  ImageEditorError,
  isImageAnnotation,
  parseDesignState,
  ANNOTATIONS_SET_COMMAND,
  reorderAnnotationById,
} from 'fluxio-image-editor/core';
import {
  TRANSFORM_FLIP_H_COMMAND,
  TRANSFORM_RESIZE_COMMAND,
  TRANSFORM_ROTATE_COMMAND,
  TransformPlugin,
} from 'fluxio-image-editor/plugins/transform';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';

import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';

function createFixtureDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

describe('EditorSession vertical slice', () => {
  let host: HTMLDivElement;
  let session: EditorSession;
  let renderer: FakeRendererAdapter;

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
        new EffectsPlugin(),
        new FiltersPlugin(),
        new FocusPlugin(),
        new TextPlugin(),
        new ShapesPlugin(),
        new DrawingPlugin(),
        new ImageOverlayPlugin(),
        new StickersPlugin(),
        new EmojiPlugin(),
        new WatermarkPlugin(),
        new PersistencePlugin(),
        new ComparePlugin(),
        new ExportPlugin(),
      ],
    });
    renderer = new FakeRendererAdapter();
    await session.attach(host, renderer);
  });

  afterEach(() => {
    session.destroy();
    host.remove();
  });

  it('loads, fits, rotates, undoes, redoes, exports PNG, and destroys', async () => {
    await session.load(createFixtureDataUrl());

    const afterLoad = session.getSnapshot();
    expect(afterLoad.status).toBe('ready');
    expect(afterLoad.document?.transform.rotationDegrees).toBe(0);
    expect(afterLoad.viewport.fitMode).toBe('contain');
    expect(afterLoad.viewport.zoom).toBeGreaterThan(0);
    expect(afterLoad.dirty).toBe(false);
    expect(afterLoad.comparingOriginal).toBe(false);
    expect(renderer.mounted).toBe(true);
    expect(renderer.lastDocument).toBeTruthy();
    expect(renderer.lastViewport?.fitMode).toBe('contain');

    await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);
    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.isDirty()).toBe(true);
    expect(renderer.lastDocument?.transform.rotationDegrees).toBe(90);

    session.undo();
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(0);
    expect(session.isDirty()).toBe(false);

    session.redo();
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);

    const result = await session.export({ format: 'png' });
    expect(result.blob.type).toContain('png');
    expect(result.blob.size).toBeGreaterThan(0);
    expect(await result.blob.text()).toContain('png-rot-90');
    expect(session.isDirty()).toBe(false);

    expect(session.getRegisteredPluginIds()).toEqual([
      'viewport',
      'transform',
      'crop',
      'adjustments',
      'effects',
      'filters',
      'focus',
      'text',
      'shapes',
      'drawing',
      'image-overlay',
      'stickers',
      'emoji',
      'watermark',
      'persistence',
      'compare',
      'export',
    ]);

    session.destroy();
    expect(renderer.destroyed).toBe(true);
    expect(() => session.undo()).toThrow(/destroyed/);
  });

  it('jumpToHistoryIndex navigates across multiple undo/redo steps with one render', async () => {
    await session.load(createFixtureDataUrl());
    await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
    await session.execute(TRANSFORM_FLIP_H_COMMAND);
    await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
    expect(session.getSnapshot().history.past.length).toBe(3);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(180);

    const rendersBefore = renderer.renderCalls;
    session.jumpToHistoryIndex(1);
    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);
    expect(session.getSnapshot().history.future.length).toBe(2);
    expect(renderer.renderCalls - rendersBefore).toBe(1);

    session.jumpToHistoryIndex(0);
    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(0);
    expect(session.isDirty()).toBe(false);

    session.jumpToHistoryIndex(3);
    expect(session.getSnapshot().history.past.length).toBe(3);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(180);
    expect(session.getSnapshot().history.future.length).toBe(0);
  });

  it('compares against loaded baseline without mutating document or dirty', async () => {
    await session.load(createFixtureDataUrl());
    await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);
    expect(session.isDirty()).toBe(true);

    session.setCompareOriginal(true);
    expect(session.isComparingOriginal()).toBe(true);
    expect(session.getSnapshot().comparingOriginal).toBe(true);
    expect(renderer.compareDocument?.transform.rotationDegrees).toBe(0);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);
    expect(session.isDirty()).toBe(true);
    expect(session.getSnapshot().history.past.length).toBe(1);

    session.setCompareOriginal(false);
    expect(session.isComparingOriginal()).toBe(false);
    expect(renderer.compareDocument).toBeNull();
    expect(renderer.lastDocument?.transform.rotationDegrees).toBe(90);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);
  });

  it('keeps zoom/pan out of history and supports reset', async () => {
    await session.load(createFixtureDataUrl());
    const zoomBefore = session.getSnapshot().viewport.zoom;
    session.setZoom(zoomBefore * 2, 100, 100);
    session.panBy(10, 20);
    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().viewport.fitMode).toBe('manual');
    expect(session.needsViewportRecenter()).toBe(true);

    const zoomAfterPan = session.getSnapshot().viewport.zoom;
    session.centerViewport();
    const afterCenter = session.getSnapshot().viewport;
    expect(afterCenter.zoom).toBe(zoomAfterPan);
    expect(session.needsViewportRecenter()).toBe(false);

    await session.execute(TRANSFORM_FLIP_H_COMMAND);
    expect(session.getSnapshot().document?.transform.flipX).toBe(true);
    session.reset();
    expect(session.getSnapshot().document?.transform.flipX).toBe(false);
    expect(session.getSnapshot().history.past.length).toBe(0);
  });

  it('applies crop then rotate deterministically', async () => {
    await session.load(createFixtureDataUrl());
    await session.execute(CROP_SET_COMMAND, {
      crop: { x: 10, y: 10, width: 40, height: 40, aspectRatio: 1 },
    });
    await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
    await session.execute(TRANSFORM_RESIZE_COMMAND, { width: 40, height: 20 });

    const document = session.getSnapshot().document!;
    expect(document.crop?.width).toBe(40);
    expect(document.transform.rotationDegrees).toBe(90);
    expect(document.output).toEqual({ width: 40, height: 20 });

    const jpeg = await session.export({ format: 'jpeg', quality: 0.8, asFile: true });
    expect(jpeg.format).toBe('jpeg');
    expect(jpeg.file).toBeTruthy();
    expect(await jpeg.blob.text()).toContain('jpeg-rot-90');

    const webp = await session.export({ format: 'webp', quality: 0.85, asFile: true });
    expect(webp.format).toBe('webp');
    expect(webp.fileName).toMatch(/\.webp$/);
    expect(webp.file?.type).toBe('image/webp');
    expect(await webp.blob.text()).toContain('webp-rot-90');
    expect(renderer.exportCalls.at(-1)?.format).toBe('webp');
  });

  it('keeps continuous crop pointer updates in preview and commits one undo entry', async () => {
    await session.load(createFixtureDataUrl());
    const startCrop = { x: 10, y: 10, width: 50, height: 50, aspectRatio: null as number | null };
    session.setActiveTool('crop');
    session.setPreview({ crop: startCrop });

    expect(renderer.handlers?.onCropChange).toBeTypeOf('function');
    renderer.handlers?.onCropChange?.({ x: 12, y: 14, width: 50, height: 50, aspectRatio: null });
    renderer.handlers?.onCropChange?.({ x: 18, y: 20, width: 48, height: 46, aspectRatio: null });
    renderer.handlers?.onCropChange?.({ x: 20, y: 22, width: 40, height: 40, aspectRatio: null });

    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().preview?.crop).toEqual({
      x: 20,
      y: 22,
      width: 40,
      height: 40,
      aspectRatio: null,
    });
    expect(session.getSnapshot().document?.crop).toBeNull();

    await session.execute(CROP_SET_COMMAND, {
      crop: session.getSnapshot().preview!.crop,
    });

    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.crop?.width).toBe(40);
    expect(session.getSnapshot().preview).toBeNull();

    session.undo();
    expect(session.getSnapshot().document?.crop).toBeNull();
    expect(session.getSnapshot().history.past.length).toBe(0);
  });

  it('previews adjustments live and commits one undo entry on set', async () => {
    await session.load(createFixtureDataUrl());

    session.setActiveTool('adjustments');
    session.setPreview({ adjustments: { ...session.getSnapshot().document!.adjustments, brightness: 0.3 } });
    session.setPreview({
      adjustments: {
        brightness: 0.4,
        contrast: 0.1,
        hue: 0,
        saturation: -0.2,
        value: 0,
        warmth: 0.15,
        blur: 0.1,
        exposure: 0.25,
        sharpen: 0.4,
        gamma: 0,
        vignette: 0,
        clarity: 0,
      },
    });

    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.adjustments.brightness).toBe(0);
    expect(session.getSnapshot().preview?.adjustments?.brightness).toBe(0.4);
    expect(session.getSnapshot().preview?.adjustments?.exposure).toBe(0.25);
    expect(session.getSnapshot().preview?.adjustments?.sharpen).toBe(0.4);

    await session.execute(ADJUSTMENTS_SET_COMMAND, {
      adjustments: session.getSnapshot().preview!.adjustments,
    });
    session.setPreview(null);

    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.adjustments.brightness).toBe(0.4);
    expect(session.getSnapshot().document?.adjustments.saturation).toBe(-0.2);
    expect(session.getSnapshot().document?.adjustments.exposure).toBe(0.25);
    expect(session.getSnapshot().document?.adjustments.sharpen).toBe(0.4);
    expect(session.getSnapshot().preview).toBeNull();

    session.undo();
    expect(session.getSnapshot().document?.adjustments.brightness).toBe(0);
    expect(session.getSnapshot().document?.adjustments.exposure).toBe(0);
    expect(session.getSnapshot().document?.adjustments.sharpen).toBe(0);
  });

  it('previews effects live and commits one undo entry on set', async () => {
    await session.load(createFixtureDataUrl());

    session.setActiveTool('effects');
    session.setPreview({
      effects: {
        threshold: 0.4,
        posterize: 0.5,
        pixelate: 0.2,
        noise: 0.1,
      },
    });

    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.effects.threshold).toBe(0);
    expect(session.getSnapshot().preview?.effects?.threshold).toBe(0.4);

    await session.execute(EFFECTS_SET_COMMAND, {
      effects: session.getSnapshot().preview!.effects,
    });
    session.setPreview(null);

    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.effects.threshold).toBe(0.4);
    expect(session.getSnapshot().document?.effects.pixelate).toBe(0.2);
    expect(session.getSnapshot().preview).toBeNull();

    session.undo();
    expect(session.getSnapshot().document?.effects.threshold).toBe(0);
  });

  it('previews focus live and commits one undo entry on set', async () => {
    await session.load(createFixtureDataUrl());

    session.setActiveTool('focus');
    session.setPreview({
      focus: {
        mode: 'radial',
        centerX: 0.4,
        centerY: 0.6,
        blur: 0.7,
        size: 0.25,
        feather: 0.35,
        angle: 0,
      },
    });

    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.focus.mode).toBe('none');
    expect(session.getSnapshot().preview?.focus?.mode).toBe('radial');
    expect(session.getSnapshot().preview?.focus?.blur).toBe(0.7);

    await session.execute(FOCUS_SET_COMMAND, {
      focus: session.getSnapshot().preview!.focus,
    });
    session.setPreview(null);

    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.focus.mode).toBe('radial');
    expect(session.getSnapshot().document?.focus.blur).toBe(0.7);
    expect(session.getSnapshot().document?.focus.centerX).toBe(0.4);
    expect(session.getSnapshot().preview).toBeNull();

    session.undo();
    expect(session.getSnapshot().document?.focus.mode).toBe('none');
  });

  it('previews filter presets and commits one undo entry on set', async () => {
    await session.load(createFixtureDataUrl());

    session.setActiveTool('filters');
    session.setPreview({ filters: { preset: 'sepia' } });

    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.filters.preset).toBe('none');
    expect(session.getSnapshot().preview?.filters?.preset).toBe('sepia');

    await session.execute(FILTERS_SET_COMMAND, {
      filters: session.getSnapshot().preview!.filters,
    });
    session.setPreview(null);

    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.filters.preset).toBe('sepia');

    session.undo();
    expect(session.getSnapshot().document?.filters.preset).toBe('none');
  });

  it('previews text and shapes annotations and commits one undo entry each', async () => {
    await session.load(createFixtureDataUrl());
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    const shape = createDefaultShapeAnnotation('rect', output);

    session.setActiveTool('text');
    session.setPreview({ annotations: [text] });
    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.annotations).toEqual([]);

    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    session.setPreview(null);
    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.annotations).toHaveLength(1);
    expect(session.getSnapshot().document?.annotations[0]?.kind).toBe('text');

    // Gesture-style second commit (move) adds exactly one history entry.
    const movedText = { ...text, x: text.x + 16, y: text.y + 10 };
    await session.execute(TEXT_SET_COMMAND, { texts: [movedText] });
    expect(session.getSnapshot().history.past.length).toBe(2);

    session.setActiveTool('shapes');
    session.setPreview({ annotations: [movedText, shape] });
    await session.execute(SHAPES_SET_COMMAND, { shapes: [shape] });
    session.setPreview(null);
    expect(session.getSnapshot().document?.annotations).toHaveLength(2);
    expect(session.getSnapshot().history.past.length).toBe(3);

    const movedShape =
      shape.kind === 'rect' ? { ...shape, x: shape.x + 8, y: shape.y + 6 } : shape;
    await session.execute(SHAPES_SET_COMMAND, { shapes: [movedShape] });
    expect(session.getSnapshot().history.past.length).toBe(4);

    session.undo();
    session.undo();
    expect(session.getSnapshot().document?.annotations).toHaveLength(1);
    session.undo();
    session.undo();
    expect(session.getSnapshot().document?.annotations).toEqual([]);
  });

  it('previews drawing and image overlays and commits one undo entry each', async () => {
    await session.load(createFixtureDataUrl());
    const output = session.getSnapshot().document!.output;
    const path = createDefaultPathAnnotation(output);
    const path2 = createDefaultPathAnnotation(output);
    const image = createDefaultImageAnnotation(output, createFixtureDataUrl(), {
      width: 200,
      height: 100,
    });
    expect(image.width).toBe(2 * image.height);

    session.setActiveTool('drawing');
    session.setPreview({ annotations: [path] });
    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.annotations).toEqual([]);

    // UX-I3: each completed stroke is one history entry.
    await session.execute(DRAWING_SET_COMMAND, { paths: [path] });
    expect(session.getSnapshot().history.past.length).toBe(1);
    await session.execute(DRAWING_SET_COMMAND, { paths: [path, path2] });
    session.setPreview(null);
    expect(session.getSnapshot().history.past.length).toBe(2);
    expect(session.getSnapshot().document?.annotations.filter((a) => a.kind === 'path')).toHaveLength(
      2,
    );

    session.undo();
    expect(session.getSnapshot().document?.annotations.filter((a) => a.kind === 'path')).toHaveLength(
      1,
    );

    session.setActiveTool('image-overlay');
    session.setPreview({ annotations: [path, image] });
    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [image] });
    session.setPreview(null);
    expect(session.getSnapshot().document?.annotations).toHaveLength(2);
    expect(session.getSnapshot().history.past.length).toBe(2);

    // Second overlay set (gesture-style commit) adds exactly one history entry.
    const moved = { ...image, x: image.x + 12, y: image.y + 8 };
    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [moved] });
    expect(session.getSnapshot().history.past.length).toBe(3);
    expect(session.getSnapshot().document?.annotations.find((a) => a.kind === 'image')).toMatchObject({
      x: moved.x,
      y: moved.y,
    });

    session.undo();
    expect(session.getSnapshot().document?.annotations.find((a) => a.kind === 'image')).toMatchObject({
      x: image.x,
      y: image.y,
    });
    session.undo();
    expect(session.getSnapshot().document?.annotations).toHaveLength(1);
    session.undo();
    expect(session.getSnapshot().document?.annotations).toEqual([]);
  });

  it('reorders image overlays (z-order) with one history entry', async () => {
    await session.load(createFixtureDataUrl());
    const first = createDefaultImageAnnotation(
      session.getSnapshot().document!.output,
      'data:image/png;base64,aaa',
    );
    const second = {
      ...createDefaultImageAnnotation(
        session.getSnapshot().document!.output,
        'data:image/png;base64,bbb',
      ),
      id: 'overlay-b',
      x: first.x + 20,
      y: first.y + 20,
    };

    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [first, second] });
    expect(
      session
        .getSnapshot()
        .document?.annotations.filter((a) => a.kind === 'image')
        .map((a) => a.id),
    ).toEqual([first.id, second.id]);

    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [second, first] });
    expect(session.getSnapshot().history.past.length).toBe(2);
    expect(
      session
        .getSnapshot()
        .document?.annotations.filter((a) => a.kind === 'image')
        .map((a) => a.id),
    ).toEqual([second.id, first.id]);

    session.undo();
    expect(
      session
        .getSnapshot()
        .document?.annotations.filter((a) => a.kind === 'image')
        .map((a) => a.id),
    ).toEqual([first.id, second.id]);
  });

  it('reorders across annotation kinds with one history entry', async () => {
    await session.load(createFixtureDataUrl());
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    const shape = createDefaultShapeAnnotation('rect', output);
    const image = createDefaultImageAnnotation(output, 'data:image/png;base64,ccc');

    await session.execute(ANNOTATIONS_SET_COMMAND, {
      annotations: [text, shape, image],
      label: 'Seed stack',
    });
    expect(session.getSnapshot().document?.annotations.map((a) => a.kind)).toEqual([
      'text',
      'rect',
      'image',
    ]);

    const pastBefore = session.getSnapshot().history.past.length;
    const next = reorderAnnotationById(
      session.getSnapshot().document!.annotations,
      text.id,
      'front',
    );
    await session.execute(ANNOTATIONS_SET_COMMAND, {
      annotations: next,
      label: 'Bring to front',
    });
    expect(session.getSnapshot().history.past.length).toBe(pastBefore + 1);
    expect(session.getSnapshot().document?.annotations.map((a) => a.id)).toEqual([
      shape.id,
      image.id,
      text.id,
    ]);

    await session.execute(TEXT_SET_COMMAND, {
      texts: [{ ...text, text: 'Updated' }],
    });
    expect(session.getSnapshot().document?.annotations.map((a) => a.id)).toEqual([
      shape.id,
      image.id,
      text.id,
    ]);
    expect(
      session.getSnapshot().document?.annotations.find((a) => a.id === text.id),
    ).toMatchObject({ text: 'Updated' });

    session.undo();
    session.undo();
    expect(session.getSnapshot().document?.annotations.map((a) => a.id)).toEqual([
      text.id,
      shape.id,
      image.id,
    ]);
  });

  it('places stickers as image annotations via shared overlay command', async () => {
    await session.load(createFixtureDataUrl());
    const sticker = DEFAULT_STICKER_GALLERY[0]!;
    const output = session.getSnapshot().document!.output;
    const placed = createDefaultImageAnnotation(output, sticker.src, { width: 64, height: 64 });

    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [placed] });
    expect(session.getSnapshot().document?.annotations.filter(isImageAnnotation)).toHaveLength(1);
    expect(session.getSnapshot().document?.annotations.find(isImageAnnotation)?.src).toBe(
      sticker.src,
    );
    expect(session.getRegisteredPluginIds()).toContain('stickers');
  });

  it('places emoji as text annotations via text.set', async () => {
    await session.load(createFixtureDataUrl());
    const item = DEFAULT_EMOJI_GALLERY[0]!;
    const output = session.getSnapshot().document!.output;
    const placed = {
      ...createDefaultTextAnnotation(output),
      text: item.emoji,
      fontFamily: EMOJI_FONT_FAMILY,
      fontSize: 48,
      fill: '#000000',
    };

    await session.execute(TEXT_SET_COMMAND, { texts: [placed] });
    const texts = session.getSnapshot().document?.annotations.filter((a) => a.kind === 'text');
    expect(texts).toHaveLength(1);
    expect(texts?.[0]?.text).toBe(item.emoji);
    expect(session.getRegisteredPluginIds()).toContain('emoji');
  });

  it('previews watermark and commits one undo entry on set', async () => {
    await session.load(createFixtureDataUrl());

    session.setActiveTool('watermark');
    const draft = {
      ...createInitialWatermark(),
      mode: 'text' as const,
      text: '© fluxio',
      position: 'center' as const,
      x: 64,
      y: 48,
      opacity: 0.4,
      scale: 1.2,
    };
    session.setPreview({ watermark: draft });
    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.getSnapshot().document?.watermark.mode).toBe('none');

    await session.execute(WATERMARK_SET_COMMAND, { watermark: draft });
    session.setPreview(null);
    expect(session.getSnapshot().history.past.length).toBe(1);
    expect(session.getSnapshot().document?.watermark.mode).toBe('text');
    expect(session.getSnapshot().document?.watermark.text).toBe('© fluxio');
    expect(session.getSnapshot().document?.watermark.x).toBe(64);
    expect(session.getSnapshot().document?.watermark.y).toBe(48);

    // Gesture-style placement commit.
    await session.execute(WATERMARK_SET_COMMAND, {
      watermark: { ...draft, x: 90, y: 70, scale: 1.5 },
    });
    expect(session.getSnapshot().history.past.length).toBe(2);
    expect(session.getSnapshot().document?.watermark.x).toBe(90);

    session.undo();
    expect(session.getSnapshot().document?.watermark.x).toBe(64);
    session.undo();
    expect(session.getSnapshot().document?.watermark.mode).toBe('none');
  });

  it('exports and reloads design state without migrations', async () => {
    await session.load(createFixtureDataUrl());
    await session.execute(TRANSFORM_ROTATE_COMMAND, { degrees: 90 });
    await session.execute(WATERMARK_SET_COMMAND, {
      watermark: {
        ...createInitialWatermark(),
        mode: 'text',
        text: 'persist-me',
        position: 'center',
      },
    });

    const envelope = session.exportDesignState();
    expect(envelope.kind).toBe(DESIGN_STATE_KIND);
    expect(envelope.schemaVersion).toBe(DESIGN_STATE_SCHEMA_VERSION);
    expect(envelope.document.transform.rotationDegrees).toBe(90);
    expect(envelope.document.watermark.text).toBe('persist-me');

    const json = JSON.stringify(envelope);
    expect(json).not.toMatch(/fabric\.Canvas|FabricObject|FabricImage/i);

    session.reset();
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(0);
    expect(session.getSnapshot().document?.watermark.mode).toBe('none');

    await session.loadDesignState(json);
    expect(session.getSnapshot().document?.transform.rotationDegrees).toBe(90);
    expect(session.getSnapshot().document?.watermark.mode).toBe('text');
    expect(session.getSnapshot().document?.watermark.text).toBe('persist-me');
    expect(session.getSnapshot().history.past.length).toBe(0);
    expect(session.isDirty()).toBe(true);

    expect(() => parseDesignState({ ...envelope, schemaVersion: 99 })).toThrow(ImageEditorError);
    try {
      parseDesignState({ ...envelope, schemaVersion: 99 });
    } catch (error) {
      expect(error).toBeInstanceOf(ImageEditorError);
      expect((error as ImageEditorError).code).toBe('DESIGN_STATE_UNSUPPORTED_VERSION');
    }
  });
});
