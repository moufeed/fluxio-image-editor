import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  ANNOTATIONS_SET_COMMAND,
  EditorSession,
  annotationsEqual,
  applyGroupTransformableDrag,
  boundsFromShape,
  createDefaultPathAnnotation,
  createDefaultShapeAnnotation,
  createDefaultTextAnnotation,
  hitTestInteractiveAnnotations,
  normalizeAnnotations,
  type Annotation,
  type ShapeAnnotation,
} from 'fluxio-image-editor/core';
import {
  MAX_PREVIEW_LONG_EDGE,
  computePreviewMaxLongEdge,
  resolvePreviewOutputSize,
} from '../../../renderer-fabric/src/preview-compose';
import { FakeRendererAdapter } from '../../../core/src/testing/fake-renderer.adapter';

/** Soft CI ceilings (ms) — catch pathological regressions, not machine noise. */
const SOFT = {
  normalize500: 80,
  equal500: 120,
  hitTest500: 40,
  groupDrag50: 40,
  annotationsSet200: 250,
} as const;

interface BenchRow {
  readonly id: string;
  readonly label: string;
  readonly ms: number;
  readonly iterations: number;
  readonly meta?: Record<string, number | string | boolean>;
}

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function timeMedian(iterations: number, fn: () => void, runs = 7): number {
  const samples: number[] = [];
  fn();
  for (let r = 0; r < runs; r += 1) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      fn();
    }
    samples.push(performance.now() - t0);
  }
  return median(samples);
}

function denseRects(count: number, output = { width: 4000, height: 3000 }): ShapeAnnotation[] {
  const cols = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, i) => {
    const base = createDefaultShapeAnnotation('rect', output);
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...base,
      x: 8 + col * 48,
      y: 8 + row * 40,
      width: 36,
      height: 28,
    };
  });
}

function mixedAnnotations(count: number, output = { width: 4000, height: 3000 }): Annotation[] {
  return Array.from({ length: count }, (_, i) => {
    const mod = i % 3;
    if (mod === 0) {
      const shape = createDefaultShapeAnnotation(i % 2 === 0 ? 'rect' : 'ellipse', output);
      if (shape.kind === 'polygon') {
        return shape;
      }
      return {
        ...shape,
        x: (i * 37) % (output.width - 80),
        y: (i * 53) % (output.height - 60),
      };
    }
    if (mod === 1) {
      const text = createDefaultTextAnnotation(output);
      return { ...text, x: (i * 41) % (output.width - 120), y: (i * 29) % (output.height - 40) };
    }
    const path = createDefaultPathAnnotation(output);
    return {
      ...path,
      points: path.points.map((_, pi) => ({
        x: ((i * 17 + pi * 11) % (output.width - 40)) + 8,
        y: ((i * 19 + pi * 13) % (output.height - 40)) + 8,
      })),
    };
  });
}

function createFixtureDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

function installSessionStubs(): void {
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
    naturalWidth = 4000;
    naturalHeight = 3000;
    alt = '';
    crossOrigin = '';
    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'));
      });
    }
  }
  (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;
}

describe('PV45 core performance baseline', () => {
  const rows: BenchRow[] = [];

  it('times preview sizing for large sources', () => {
    const full = { width: 7952, height: 5304 };
    const sized = resolvePreviewOutputSize(full.width, full.height, MAX_PREVIEW_LONG_EDGE);
    const fittedZoom = 1000 / full.width;
    const edgeFit = computePreviewMaxLongEdge({
      fullWidth: full.width,
      fullHeight: full.height,
      canvasWidth: 1000,
      canvasHeight: 700,
      zoom: fittedZoom,
      devicePixelRatio: 1,
    });
    const edgeZoomed = computePreviewMaxLongEdge({
      fullWidth: full.width,
      fullHeight: full.height,
      canvasWidth: 1000,
      canvasHeight: 700,
      zoom: 2,
      devicePixelRatio: 2,
    });

    const ms = timeMedian(2000, () => {
      resolvePreviewOutputSize(full.width, full.height, MAX_PREVIEW_LONG_EDGE);
      computePreviewMaxLongEdge({
        fullWidth: full.width,
        fullHeight: full.height,
        canvasWidth: 1000,
        canvasHeight: 700,
        zoom: fittedZoom,
        devicePixelRatio: 1,
      });
    });

    rows.push({
      id: 'preview_sizing_8k',
      label: 'resolvePreviewOutputSize + computePreviewMaxLongEdge (8K)',
      ms,
      iterations: 2000,
      meta: {
        previewW: sized.width,
        previewH: sized.height,
        scale: Number(sized.scale.toFixed(4)),
        edgeFit,
        edgeZoomed,
        maxLongEdge: MAX_PREVIEW_LONG_EDGE,
      },
    });

    expect(sized.width).toBeLessThanOrEqual(MAX_PREVIEW_LONG_EDGE);
    expect(edgeFit).toBeLessThanOrEqual(MAX_PREVIEW_LONG_EDGE);
    expect(edgeZoomed).toBe(MAX_PREVIEW_LONG_EDGE);
  });

  it('times dense annotation normalize / equal / hit-test / group drag', () => {
    const shapes500 = denseRects(500);
    const mixed500 = mixedAnnotations(500);
    const bounds500 = shapes500.map((s) => ({ id: s.id, ...boundsFromShape(s) }));
    const lastBounds = boundsFromShape(shapes500[499]!);
    const point = { x: lastBounds.x + 10, y: lastBounds.y + 10 };
    const dragStarts = shapes500.slice(0, 50);
    const output = { width: 4000, height: 3000 };

    const normalizeMs = timeMedian(20, () => {
      normalizeAnnotations(mixed500);
    });
    const equalMs = timeMedian(10, () => {
      annotationsEqual(mixed500, mixed500);
    });
    const hitMs = timeMedian(50, () => {
      hitTestInteractiveAnnotations(bounds500, point, 8, shapes500[499]!.id);
    });
    const dragMs = timeMedian(30, () => {
      applyGroupTransformableDrag(
        dragStarts,
        'move',
        { x: 100, y: 100 },
        { x: 140, y: 130 },
        output,
      );
    });

    rows.push(
      {
        id: 'normalize_500',
        label: 'normalizeAnnotations (500 mixed)',
        ms: normalizeMs,
        iterations: 20,
      },
      {
        id: 'annotations_equal_500',
        label: 'annotationsEqual (500 mixed, identical)',
        ms: equalMs,
        iterations: 10,
      },
      {
        id: 'hit_test_500',
        label: 'hitTestInteractiveAnnotations (500)',
        ms: hitMs,
        iterations: 50,
      },
      {
        id: 'group_drag_50',
        label: 'applyGroupTransformableDrag (50 selection)',
        ms: dragMs,
        iterations: 30,
      },
    );

    expect(normalizeMs).toBeLessThan(SOFT.normalize500);
    expect(equalMs).toBeLessThan(SOFT.equal500);
    expect(hitMs).toBeLessThan(SOFT.hitTest500);
    expect(dragMs).toBeLessThan(SOFT.groupDrag50);
  });

  it('times ANNOTATIONS_SET commit with 200 shapes via FakeRenderer', async () => {
    installSessionStubs();
    const host = document.createElement('div');
    host.style.width = '800px';
    host.style.height = '600px';
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    document.body.appendChild(host);

    const session = new EditorSession({ plugins: [] });
    const renderer = new FakeRendererAdapter();
    await session.attach(host, renderer);
    await session.load(createFixtureDataUrl());

    const annotations = denseRects(200, { width: 4000, height: 3000 });
    const samples: number[] = [];
    for (let r = 0; r < 5; r += 1) {
      const t0 = performance.now();
      await session.execute(ANNOTATIONS_SET_COMMAND, { annotations });
      samples.push(performance.now() - t0);
    }
    const ms = median(samples);

    rows.push({
      id: 'annotations_set_200',
      label: 'EditorSession.execute(ANNOTATIONS_SET) × 200 shapes',
      ms,
      iterations: 1,
      meta: { runs: 5, renderCalls: renderer.renderCalls },
    });

    expect(ms).toBeLessThan(SOFT.annotationsSet200);
    expect(session.getSnapshot().document?.annotations.length).toBe(200);

    session.destroy();
    host.remove();
  });

  afterAll(() => {
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const payload = {
      generatedAt: new Date().toISOString(),
      environment: {
        runner: 'vitest+jsdom (FakeRenderer; not Fabric compose)',
      },
      notes: [
        'Preview long edge capped at MAX_PREVIEW_LONG_EDGE (2048) for interactive compose.',
        'Fabric full-compose / export timing is out of scope for this core microbench — re-run with Playwright when optimizing.',
        'ms values are median wall time for the listed iterations (except annotations_set which is median of single executes).',
      ],
      rows,
    };
    const docsDir = join(process.cwd(), 'docs');
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'perf-pv45-core.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  });
});
