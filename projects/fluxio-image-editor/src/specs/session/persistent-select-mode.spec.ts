import { TestBed } from '@angular/core/testing';

import {
  ANNOTATIONS_SET_COMMAND,
  EditorSession,
  applyTransformableDrag,
  createDefaultImageAnnotation,
  createDefaultShapeAnnotation,
  createDefaultTextAnnotation,
  isImageAnnotation,
  isShapeAnnotation,
  isTextAnnotation,
} from 'fluxio-image-editor/core';
import {
  ImageOverlayPlugin,
  IMAGE_OVERLAY_SET_COMMAND,
} from 'fluxio-image-editor/plugins/image-overlay';
import { ShapesPlugin, SHAPES_SET_COMMAND } from 'fluxio-image-editor/plugins/shapes';
import { TextPlugin, TEXT_SET_COMMAND } from 'fluxio-image-editor/plugins/text';
import { ViewportPlugin } from 'fluxio-image-editor/plugins/viewport';

import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';
import { AnnotationInteractionController } from '../../lib/editor-shell/annotation-interaction.controller';
import { EditorModeCoordinator } from '../../lib/editor-shell/editor-mode.coordinator';
import { EditorShellContext } from '../../lib/editor-shell/editor-shell.context';
import { EditorUiStore } from '../../lib/editor-shell/editor-ui.store';
import { WatermarkTool } from '../../lib/editor-shell/tools/watermark.tool';

function createFixtureDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

describe('Persistent canvas Select mode', () => {
  let host: HTMLDivElement;
  let session: EditorSession;
  let renderer: FakeRendererAdapter;
  let ui: EditorUiStore;
  let annotations: AnnotationInteractionController;
  let shell: EditorShellContext;

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

    await TestBed.configureTestingModule({
      providers: [
        EditorUiStore,
        EditorShellContext,
        EditorModeCoordinator,
        AnnotationInteractionController,
        WatermarkTool,
      ],
    }).compileComponents();

    ui = TestBed.inject(EditorUiStore);
    shell = TestBed.inject(EditorShellContext);
    annotations = TestBed.inject(AnnotationInteractionController);
    TestBed.inject(WatermarkTool).configure({
      crop: () => undefined,
      rotate: () => undefined,
      resize: () => undefined,
      adjustments: () => undefined,
      effects: () => undefined,
      filters: () => undefined,
      focus: () => undefined,
      redact: () => undefined,
      cropMask: () => undefined,
      colorOverlay: () => undefined,
      fill: () => undefined,
      frame: () => undefined,
      text: () => undefined,
      shapes: () => undefined,
      drawing: () => undefined,
      path: () => undefined,
      imageOverlay: () => undefined,
      watermark: () => undefined,
      templates: () => undefined,
      rulers: () => undefined,
    });

    session = new EditorSession({
      plugins: [
        new ViewportPlugin(),
        new TextPlugin(),
        new ShapesPlugin(),
        new ImageOverlayPlugin(),
      ],
    });
    renderer = new FakeRendererAdapter();
    shell.session.set(session);
    shell.config = () => ({});
    shell.source = () => null;
    shell.plugins = () => [];
    shell.viewportElement = () => host;
    shell.translate = (key) => key;
    shell.reportError = () => undefined;

    annotations.configure({
      commitActiveDraft: () => annotations.commitSelectMode(),
      activeStrokeId: () => null,
      onAnnotationEditRequest: () => undefined,
    });

    await session.attach(host, renderer);
    await session.load(createFixtureDataUrl());
    annotations.syncAllDraftsFromDocument();
    annotations.bind(session);
  });

  afterEach(() => {
    session.destroy();
    host.remove();
  });

  function handlers() {
    return renderer.handlers!;
  }

  it('keeps annotation interaction active after Done (activeTool null)', async () => {
    const output = session.getSnapshot().document!.output;
    const overlay = createDefaultImageAnnotation(output, 'data:image/png;base64,aa');
    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [overlay] });
    annotations.syncAllDraftsFromDocument();
    annotations.bind(session);

    session.setActiveTool('image-overlay');
    expect(handlers().isAnnotationInteractionActive?.()).toBe(true);

    // Simulate Done: close panel, return to Select mode, keep bridge.
    session.setActiveTool(null);
    annotations.syncAllDraftsFromDocument();
    ui.selectedImageIds.set([overlay.id]);

    expect(handlers().isAnnotationInteractionActive?.()).toBe(true);
    expect(handlers().getInteractiveAnnotations?.().map((item) => item.id)).toContain(overlay.id);
    expect(handlers().getSelectedAnnotationId?.()).toBe(overlay.id);
  });

  it('selects a committed overlay after Done via onAnnotationSelect', async () => {
    const output = session.getSnapshot().document!.output;
    const overlay = createDefaultImageAnnotation(output, 'data:image/png;base64,aa');
    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [overlay] });
    annotations.syncAllDraftsFromDocument();
    annotations.clearSelection();
    session.setActiveTool(null);

    handlers().onAnnotationSelect?.(overlay.id);
    expect(annotations.primaryId()).toBe(overlay.id);
    expect(ui.selectedImageIds()).toEqual([overlay.id]);
  });

  it('commits one history entry when moving text after Done', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedTextIds.set([text.id]);
    session.setActiveTool(null);
    const pastBefore = session.getSnapshot().history.past.length;

    const moved = applyTransformableDrag(
      text,
      'move',
      { x: text.x + 10, y: text.y + 10 },
      { x: text.x + 30, y: text.y + 30 },
      output,
    );
    handlers().onAnnotationTransform?.({
      phase: 'start',
      id: text.id,
      annotation: text,
      annotations: [text],
    });
    handlers().onAnnotationTransform?.({
      phase: 'move',
      id: text.id,
      annotation: moved,
      annotations: [moved],
    });
    handlers().onAnnotationTransform?.({
      phase: 'end',
      id: text.id,
      annotation: moved,
      annotations: [moved],
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(session.getSnapshot().history.past.length).toBe(pastBefore + 1);
    const committed = session.getSnapshot().document?.annotations.find(isTextAnnotation);
    expect(committed?.x).toBe(moved.kind === 'text' ? moved.x : text.x);
  });

  it('preserves image aspect ratio on resize after Done with one history entry', async () => {
    const output = session.getSnapshot().document!.output;
    const overlay = createDefaultImageAnnotation(output, 'data:image/png;base64,aa', {
      width: 80,
      height: 40,
    });
    await session.execute(IMAGE_OVERLAY_SET_COMMAND, { images: [overlay] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedImageIds.set([overlay.id]);
    session.setActiveTool(null);
    const pastBefore = session.getSnapshot().history.past.length;

    const resized = applyTransformableDrag(
      overlay,
      'se',
      { x: overlay.x + overlay.width, y: overlay.y + overlay.height },
      { x: overlay.x + overlay.width + 40, y: overlay.y + overlay.height + 20 },
      output,
    );
    handlers().onAnnotationTransform?.({
      phase: 'start',
      id: overlay.id,
      annotation: overlay,
      annotations: [overlay],
    });
    handlers().onAnnotationTransform?.({
      phase: 'end',
      id: overlay.id,
      annotation: resized,
      annotations: [resized],
    });
    await Promise.resolve();
    await Promise.resolve();

    const committed = session.getSnapshot().document?.annotations.find(isImageAnnotation);
    expect(committed).toBeTruthy();
    if (committed && isImageAnnotation(committed)) {
      expect(committed.width / committed.height).toBeCloseTo(2, 5);
    }
    expect(session.getSnapshot().history.past.length).toBe(pastBefore + 1);
  });

  it('deletes a committed object and restores it on undo', async () => {
    const output = session.getSnapshot().document!.output;
    const shape = createDefaultShapeAnnotation('rect', output);
    await session.execute(SHAPES_SET_COMMAND, { shapes: [shape] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedShapeIds.set([shape.id]);
    session.setActiveTool(null);

    expect(annotations.deleteSelected()).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(session.getSnapshot().document?.annotations.find((item) => item.id === shape.id)).toBeUndefined();

    session.undo();
    annotations.syncAfterDocumentChange();
    expect(session.getSnapshot().document?.annotations.find(isShapeAnnotation)?.id).toBe(shape.id);
  });

  it('duplicates a committed object with a new id and undo removes the copy', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedTextIds.set([text.id]);
    session.setActiveTool(null);

    annotations.duplicate();
    await Promise.resolve();
    await Promise.resolve();

    const texts = session.getSnapshot().document?.annotations.filter(isTextAnnotation) ?? [];
    expect(texts).toHaveLength(2);
    expect(texts[0]!.id).not.toBe(texts[1]!.id);
    expect(annotations.primaryId()).not.toBe(text.id);

    session.undo();
    annotations.syncAfterDocumentChange();
    expect(session.getSnapshot().document?.annotations.filter(isTextAnnotation)).toHaveLength(1);
  });

  it('cancels an in-progress move without a history entry', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedTextIds.set([text.id]);
    session.setActiveTool(null);
    const pastBefore = session.getSnapshot().history.past.length;

    const moved = { ...text, x: text.x + 50, y: text.y + 40 };
    handlers().onAnnotationTransform?.({
      phase: 'start',
      id: text.id,
      annotation: text,
      annotations: [text],
    });
    handlers().onAnnotationTransform?.({
      phase: 'move',
      id: text.id,
      annotation: moved,
      annotations: [moved],
    });
    handlers().onAnnotationTransform?.({
      phase: 'cancel',
      id: text.id,
      annotation: moved,
      annotations: [moved],
    });
    await Promise.resolve();

    expect(session.getSnapshot().history.past.length).toBe(pastBefore);
    const committed = session.getSnapshot().document?.annotations.find(isTextAnnotation);
    expect(committed?.x).toBe(text.x);
    expect(committed?.y).toBe(text.y);
  });

  it('blocks annotation select while crop is active and restores after', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    annotations.syncAllDraftsFromDocument();
    annotations.bind(session);
    session.setActiveTool(null);
    expect(handlers().isAnnotationInteractionActive?.()).toBe(true);

    session.setActiveTool('crop');
    expect(handlers().isAnnotationInteractionActive?.()).toBe(false);

    session.setActiveTool(null);
    expect(handlers().isAnnotationInteractionActive?.()).toBe(true);
  });

  it('clears stale selection after load and destroy clears the bridge', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedTextIds.set([text.id]);

    await session.load(createFixtureDataUrl());
    annotations.syncAfterDocumentChange();
    expect(annotations.primaryId()).toBeNull();

    session.destroy();
    expect(renderer.handlers).toBeNull();
  });

  it('export options include committed annotations without selection chrome state', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    ui.selectedTextIds.set([text.id]);
    session.setActiveTool(null);

    const result = await session.export({ format: 'png' });
    expect(result.format).toBe('png');
    expect(session.getSnapshot().document?.annotations.some((item) => item.id === text.id)).toBe(
      true,
    );
    const envelope = session.exportDesignState();
    expect(JSON.stringify(envelope)).not.toContain('selectedTextIds');
    expect(JSON.stringify(envelope)).not.toContain('"selection"');
  });

  it('does not create a duplicate when reopening the shapes inspector for the same id', async () => {
    const output = session.getSnapshot().document!.output;
    const shape = createDefaultShapeAnnotation('ellipse', output);
    await session.execute(SHAPES_SET_COMMAND, { shapes: [shape] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedShapeIds.set([shape.id]);
    session.setActiveTool(null);

    // Simulate Edit → open shapes inspector for the same object.
    ui.shapesMode.set(true);
    session.setActiveTool('shapes');
    annotations.bind(session);
    annotations.applySelection('shape', shape.id, false);
    annotations.pushPreview();

    expect(session.getSnapshot().document?.annotations.filter(isShapeAnnotation)).toHaveLength(1);
    expect(ui.draftShapes()).toHaveLength(1);
    expect(ui.selectedShapeId()).toBe(shape.id);
  });

  it('keeps ANNOTATIONS_SET_COMMAND payloads renderer-neutral', async () => {
    const output = session.getSnapshot().document!.output;
    const text = createDefaultTextAnnotation(output);
    await session.execute(TEXT_SET_COMMAND, { texts: [text] });
    annotations.syncAllDraftsFromDocument();
    ui.selectedTextIds.set([text.id]);
    const moved = { ...text, x: text.x + 12 };
    ui.draftTexts.set([moved]);
    await session.execute(ANNOTATIONS_SET_COMMAND, {
      annotations: [moved],
      label: 'Update annotation',
    });
    const committed = session.getSnapshot().document?.annotations[0];
    expect(committed).toMatchObject({ id: text.id, kind: 'text', x: moved.x });
    expect(Object.keys(committed ?? {})).not.toContain('canvas');
    expect(Object.keys(committed ?? {})).not.toContain('fabric');
  });
});
