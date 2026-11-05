import { expect, test, type Page } from '@playwright/test';

import { openUtilibarTool, clickToolDone } from './helpers';

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

interface TextAnn {
  id: string;
  kind: 'text';
  x: number;
  y: number;
  fontSize: number;
  text: string;
}

interface RectAnn {
  id: string;
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnapshotLite {
  status: string;
  document: {
    output: { width: number; height: number };
    annotations: ReadonlyArray<TextAnn | RectAnn | { kind: string }>;
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

async function textAnnotations(page: Page): Promise<TextAnn[]> {
  const snap = await getSnapshot(page);
  return (snap.document?.annotations ?? []).filter(
    (item): item is TextAnn => item.kind === 'text',
  );
}

async function rectAnnotations(page: Page): Promise<RectAnn[]> {
  const snap = await getSnapshot(page);
  return (snap.document?.annotations ?? []).filter(
    (item): item is RectAnn => item.kind === 'rect',
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
      return {
        x: rect.left + x * snap.viewport.zoom + snap.viewport.panX,
        y: rect.top + y * snap.viewport.zoom + snap.viewport.panY,
      };
    },
    { sceneX, sceneY },
  );
}

test.describe('UX-I2 text & shapes canvas interaction', () => {
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

  test('text click-place → move → shapes drag-create → resize → undo → export', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.setZoom(handle.getSnapshot().viewport.zoom * 1.05);
    });

    await openUtilibarTool(page, 'Text');
    await expect(page.getByRole('group', { name: 'Text' })).toBeVisible();

    const output = (await getSnapshot(page)).document!.output;
    const place = await sceneToClient(page, output.width * 0.35, output.height * 0.3);
    await page.mouse.click(place.x, place.y);
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.some((a: { kind: string }) => a.kind === 'text');
    });

    // Click-to-place opens in-place edit; dismiss via Escape on the editor
    // (document Escape would also exit the Text tool).
    const inplace = page.locator('textarea.fluxio-text-inplace-editor');
    await expect(inplace).toBeVisible();
    await inplace.press('Escape');
    await expect(inplace).toHaveCount(0);

    // Option accessible name includes the Delete control ("Text Delete").
    const textChip = page
      .getByRole('group', { name: 'Text', exact: true })
      .getByRole('listbox')
      .getByRole('option')
      .first();
    await expect(textChip).toBeVisible();
    await textChip.click();

    let texts = await textAnnotations(page);
    expect(texts).toHaveLength(1);
    const before = { ...texts[0]! };
    const textCenter = await sceneToClient(
      page,
      before.x + 30,
      before.y + before.fontSize * 0.5,
    );
    await page.mouse.move(textCenter.x, textCenter.y);
    await page.mouse.down();
    await page.mouse.move(textCenter.x - 40, textCenter.y - 28, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(
      ({ id, x, y }) => {
        const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
        const text = anns.find((a: { kind: string; id?: string }) => a.kind === 'text' && a.id === id) as
          | { x: number; y: number }
          | undefined;
        return !!text && (Math.abs(text.x - x) > 2 || Math.abs(text.y - y) > 2);
      },
      { id: before.id, x: before.x, y: before.y },
    );

    texts = await textAnnotations(page);
    expect(texts[0]!.x !== before.x || texts[0]!.y !== before.y).toBe(true);

    await clickToolDone(page);
    await expect(page.getByRole('group', { name: 'Text' })).toHaveCount(0);

    await openUtilibarTool(page, 'Shapes');
    await expect(page.getByRole('group', { name: 'Shapes' })).toBeVisible();

    const dragStart = await sceneToClient(page, output.width * 0.2, output.height * 0.2);
    const dragEnd = await sceneToClient(page, output.width * 0.45, output.height * 0.42);
    await page.mouse.move(dragStart.x, dragStart.y);
    await page.mouse.down();
    await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.some((a: { kind: string }) => a.kind === 'rect');
    });

    let rects = await rectAnnotations(page);
    expect(rects).toHaveLength(1);
    const rectBefore = { ...rects[0]! };
    const se = await sceneToClient(
      page,
      rectBefore.x + rectBefore.width,
      rectBefore.y + rectBefore.height,
    );
    await page.mouse.move(se.x, se.y);
    await page.mouse.down();
    await page.mouse.move(se.x + 36, se.y + 24, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(
      ({ id, width }) => {
        const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
        const rect = anns.find(
          (a: { kind: string; id?: string }) => a.kind === 'rect' && a.id === id,
        ) as { width: number } | undefined;
        return !!rect && rect.width > width + 2;
      },
      { id: rectBefore.id, width: rectBefore.width },
    );

    const historyBeforeUndo = (await getSnapshot(page)).history.past.length;
    expect(historyBeforeUndo).toBeGreaterThanOrEqual(2);

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    await page.waitForFunction(
      ({ id, width }) => {
        const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
        const rect = anns.find(
          (a: { kind: string; id?: string }) => a.kind === 'rect' && a.id === id,
        ) as { width: number } | undefined;
        return !rect || rect.width <= width + 1;
      },
      { id: rectBefore.id, width: rectBefore.width },
    );

    const exported = await page.evaluate(async () => {
      const result = await window.__FLUXIO_E2E__!.getHandle!()!.export({ format: 'png' });
      return { width: result.width, height: result.height, size: result.blob.size };
    });
    expect(exported.width).toBeGreaterThan(0);
    expect(exported.size).toBeGreaterThan(100);

    await page.getByRole('group', { name: 'Shapes' }).getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Destroy editor' }).click();
    await expect(page.locator('fluxio-image-editor')).toHaveCount(0);
  });
});
