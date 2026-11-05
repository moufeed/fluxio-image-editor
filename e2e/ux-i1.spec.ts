import { expect, test, type Page } from '@playwright/test';

import { openUtilibarTool, overlayObjectOption } from './helpers';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => SnapshotLite;
        export: (options: {
          format: 'png' | 'jpeg';
          quality?: number;
        }) => Promise<{
          blob: Blob;
          width: number;
          height: number;
          fileName: string;
        }>;
        undo: () => void;
        redo: () => void;
        setZoom: (zoom: number) => void;
        panBy: (dx: number, dy: number) => void;
        destroy: () => void;
      } | null;
    };
  }
}

interface ImageAnn {
  id: string;
  kind: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnapshotLite {
  status: string;
  document: {
    output: { width: number; height: number };
    annotations: ReadonlyArray<ImageAnn | { kind: string }>;
  } | null;
  viewport: { zoom: number; panX: number; panY: number };
  history: { past: unknown[] };
}

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const handle = window.__FLUXIO_E2E__?.getHandle?.();
    return handle?.getSnapshot()?.status === 'ready';
  });
}

async function getSnapshot(page: Page): Promise<SnapshotLite> {
  return page.evaluate(() => {
    const handle = window.__FLUXIO_E2E__?.getHandle?.();
    if (!handle) {
      throw new Error('E2E handle missing');
    }
    return handle.getSnapshot() as SnapshotLite;
  });
}

async function imageAnnotations(page: Page): Promise<ImageAnn[]> {
  const snap = await getSnapshot(page);
  return (snap.document?.annotations ?? []).filter(
    (item): item is ImageAnn => item.kind === 'image',
  );
}

async function sceneToClient(
  page: Page,
  sceneX: number,
  sceneY: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ sceneX: x, sceneY: y }) => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      const snap = handle.getSnapshot();
      const canvas =
        (document.querySelector(
          '.fluxio-image-editor__viewport .upper-canvas',
        ) as HTMLCanvasElement | null) ??
        (document.querySelector(
          '.fluxio-image-editor__viewport canvas',
        ) as HTMLCanvasElement | null);
      if (!canvas) {
        throw new Error('viewport canvas missing');
      }
      const rect = canvas.getBoundingClientRect();
      // Fabric scene space maps through viewportTransform on the CSS box.
      return {
        x: rect.left + x * snap.viewport.zoom + snap.viewport.panX,
        y: rect.top + y * snap.viewport.zoom + snap.viewport.panY,
      };
    },
    { sceneX, sceneY },
  );
}

async function exportDigest(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const handle = window.__FLUXIO_E2E__?.getHandle?.();
    if (!handle) {
      throw new Error('E2E handle missing');
    }
    const result = await handle.export({ format: 'png' });
    const buffer = await result.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let hash = 2166136261;
    for (let i = 0; i < bytes.length; i += 1) {
      hash ^= bytes[i]!;
      hash = Math.imul(hash, 16777619);
    }
    return `${result.width}x${result.height}:${(hash >>> 0).toString(16)}:${bytes.length}`;
  });
}

test.describe('UX-I1 image-overlay canvas interaction', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    (page as Page & { __uncaught?: string[] }).__uncaught = errors;
    await page.goto('/');
    await expect(page.locator('fluxio-image-editor')).toBeVisible();
    await waitForReady(page);
  });

  test.afterEach(async ({ page }) => {
    const errors = (page as Page & { __uncaught?: string[] }).__uncaught ?? [];
    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('add A/B → move → resize → undo/redo → export → destroy', async ({ page }) => {
    await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.setZoom(handle.getSnapshot().viewport.zoom * 1.1);
      handle.panBy(10, -8);
    });
    expect((await getSnapshot(page)).history.past).toHaveLength(0);

    await openUtilibarTool(page, 'Overlay');
    await expect(page.getByRole('group', { name: 'Overlay' })).toBeVisible();

    const gallery = page.locator('.fluxio-overlay-gallery__item').first();
    await gallery.click();
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.filter((a: { kind: string }) => a.kind === 'image').length >= 1;
    });

    await gallery.click();
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.filter((a: { kind: string }) => a.kind === 'image').length >= 2;
    });

    let images = await imageAnnotations(page);
    expect(images).toHaveLength(2);
    expect(images[0]!.x !== images[1]!.x || images[0]!.y !== images[1]!.y).toBe(true);

    // Select first overlay via chip so hit-testing prefers it under the cascaded stack.
    await overlayObjectOption(page, 1).click();

    const target = images[0]!;
    const before = { x: target.x, y: target.y, width: target.width, height: target.height };
    const center = await sceneToClient(
      page,
      target.x + target.width / 2,
      target.y + target.height / 2,
    );
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    // Move up-left so later NW resize stays clear of the bottom tool panel.
    await page.mouse.move(center.x - 56, center.y - 40, { steps: 10 });
    await page.mouse.up();

    await page.waitForFunction(
      ({ id, x, y }) => {
        const anns = (
          window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? []
        ).filter((a: { kind: string; id?: string }) => a.kind === 'image' && a.id === id) as ImageAnn[];
        return !!anns[0] && (anns[0].x !== x || anns[0].y !== y);
      },
      { id: target.id, x: before.x, y: before.y },
    );

    images = await imageAnnotations(page);
    const moved = images.find((item) => item.id === target.id)!;
    expect(moved.x).not.toBe(before.x);
    expect(moved.y).not.toBe(before.y);
    const historyAfterMove = (await getSnapshot(page)).history.past.length;
    expect(historyAfterMove).toBeGreaterThanOrEqual(3);

    const nw = await sceneToClient(page, moved.x, moved.y);
    await page.mouse.move(nw.x, nw.y);
    await page.mouse.down();
    await page.mouse.move(nw.x - 70, nw.y - 35, { steps: 12 });
    await page.mouse.up();

    await page.waitForFunction(
      ({ id, w, h }) => {
        const anns = (
          window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? []
        ).filter((a: { kind: string; id?: string }) => a.kind === 'image' && a.id === id) as ImageAnn[];
        return !!anns[0] && (anns[0].width !== w || anns[0].height !== h);
      },
      { id: moved.id, w: moved.width, h: moved.height },
      { timeout: 15_000 },
    );

    images = await imageAnnotations(page);
    const resized = images.find((item) => item.id === moved.id)!;
    expect(resized.width / resized.height).toBeCloseTo(moved.width / moved.height, 1);
    expect((await getSnapshot(page)).history.past.length).toBe(historyAfterMove + 1);

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    const afterUndo = (await imageAnnotations(page)).find((item) => item.id === moved.id)!;
    expect(afterUndo.width).toBeCloseTo(moved.width, 0);

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.redo());
    const afterRedo = (await imageAnnotations(page)).find((item) => item.id === moved.id)!;
    expect(afterRedo.width).toBeCloseTo(resized.width, 0);

    const digest = await exportDigest(page);
    expect(digest.length).toBeGreaterThan(0);

    await page.getByRole('group', { name: 'Overlay' }).getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Destroy editor' }).click();
    await expect(page.locator('fluxio-image-editor')).toHaveCount(0);
  });
});
