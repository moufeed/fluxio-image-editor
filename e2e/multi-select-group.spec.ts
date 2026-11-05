import { expect, test, type Page } from '@playwright/test';

import { openUtilibarTool, overlayObjectOption } from './helpers';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => SnapshotLite;
        undo: () => void;
        setZoom: (zoom: number) => void;
        panBy: (dx: number, dy: number) => void;
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
      return {
        x: rect.left + x * snap.viewport.zoom + snap.viewport.panX,
        y: rect.top + y * snap.viewport.zoom + snap.viewport.panY,
      };
    },
    { sceneX, sceneY },
  );
}

test.describe('multi-select / group transform', () => {
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

  test('Shift+chip multi-select; arrow nudge moves group as one history entry', async ({
    page,
  }) => {
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

    const chip1 = overlayObjectOption(page, 1);
    const chip2 = overlayObjectOption(page, 2);
    await chip1.click();
    await chip2.click({
      modifiers: ['Shift'],
    });

    await expect(page.getByText('2 selected', { exact: true })).toBeVisible();

    let images = await imageAnnotations(page);
    expect(images).toHaveLength(2);
    const before = images.map((item) => ({ id: item.id, x: item.x, y: item.y }));
    const dx = before[1]!.x - before[0]!.x;
    const dy = before[1]!.y - before[0]!.y;
    const historyBefore = (await getSnapshot(page)).history.past.length;

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    await page.waitForFunction(
      (ids) => {
        const anns = (
          window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? []
        ).filter((a: { kind: string }) => a.kind === 'image') as ImageAnn[];
        const a = anns.find((item) => item.id === ids[0]);
        return !!a && a.x !== ids[2];
      },
      [before[0]!.id, before[1]!.id, before[0]!.x] as const,
    );

    images = await imageAnnotations(page);
    const after0 = images.find((item) => item.id === before[0]!.id)!;
    const after1 = images.find((item) => item.id === before[1]!.id)!;
    expect(after0.x).toBe(before[0]!.x + 2);
    expect(after0.y).toBe(before[0]!.y + 1);
    expect(after1.x).toBe(before[1]!.x + 2);
    expect(after1.y).toBe(before[1]!.y + 1);
    expect(after1.x - after0.x).toBeCloseTo(dx, 5);
    expect(after1.y - after0.y).toBeCloseTo(dy, 5);
    expect((await getSnapshot(page)).history.past.length).toBe(historyBefore + 3);

    // Canvas group drag after multi-select keeps relative layout.
    const center = await sceneToClient(page, after0.x + after0.width / 2, after0.y + after0.height / 2);
    const historyDrag = (await getSnapshot(page)).history.past.length;
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 20, { steps: 8 });
    await page.mouse.up();

    await page.waitForFunction(
      (payload) => {
        const anns = (
          window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? []
        ).filter((a: { kind: string }) => a.kind === 'image') as ImageAnn[];
        const a = anns.find((item) => item.id === payload.id);
        return !!a && (a.x !== payload.x || a.y !== payload.y);
      },
      { id: after0.id, x: after0.x, y: after0.y },
    );

    images = await imageAnnotations(page);
    const dragged0 = images.find((item) => item.id === before[0]!.id)!;
    const dragged1 = images.find((item) => item.id === before[1]!.id)!;
    expect(dragged0.x).not.toBe(after0.x);
    expect(dragged1.x).not.toBe(after1.x);
    expect(dragged1.x - dragged0.x).toBeCloseTo(dx, 0);
    expect(dragged1.y - dragged0.y).toBeCloseTo(dy, 0);
    expect((await getSnapshot(page)).history.past.length).toBe(historyDrag + 1);

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    const undone = await imageAnnotations(page);
    expect(undone.find((item) => item.id === before[0]!.id)!.x).toBeCloseTo(after0.x, 0);
    expect(undone.find((item) => item.id === before[1]!.id)!.x).toBeCloseTo(after1.x, 0);
  });
});
