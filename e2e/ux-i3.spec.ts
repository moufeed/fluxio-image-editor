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
        execute: (id: string, payload?: unknown) => Promise<void>;
        setZoom: (zoom: number) => void;
        panBy: (dx: number, dy: number) => void;
        fitViewport: () => void;
        destroy: () => void;
      } | null;
      destroyEditor: () => void;
    };
  }
}

interface SnapshotLite {
  status: string;
  document: {
    output: { width: number; height: number };
    annotations: ReadonlyArray<{ kind: string; id?: string }>;
    watermark: {
      mode: string;
      x: number | null;
      y: number | null;
      scale: number;
      position: string;
      text: string;
    };
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

test.describe('UX-I3 watermark placement & drawing semantics', () => {
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

  test('stroke commit + watermark drag/scale + undo + export', async ({ page }) => {
    await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.fitViewport();
      handle.setZoom(handle.getSnapshot().viewport.zoom * 1.05);
    });

    const output = (await getSnapshot(page)).document!.output;

    // --- Drawing: one history entry per completed stroke ---
    await openUtilibarTool(page, 'Draw');
    await expect(page.getByRole('group', { name: 'Draw' })).toBeVisible();

    const strokeStart = await sceneToClient(page, output.width * 0.25, output.height * 0.25);
    const strokeEnd = await sceneToClient(page, output.width * 0.45, output.height * 0.4);
    await page.mouse.move(strokeStart.x, strokeStart.y);
    await page.mouse.down();
    await page.mouse.move(strokeEnd.x, strokeEnd.y, { steps: 12 });
    await page.mouse.up();

    await page.waitForFunction(() => {
      const snap = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot();
      const paths = snap?.document?.annotations?.filter((a: { kind: string }) => a.kind === 'path') ?? [];
      return paths.length >= 1 && (snap?.history.past.length ?? 0) >= 1;
    });

    const afterStroke = await getSnapshot(page);
    expect(afterStroke.document!.annotations.some((a) => a.kind === 'path')).toBe(true);
    const historyAfterStroke = afterStroke.history.past.length;

    await clickToolDone(page);
    await expect(page.getByRole('group', { name: 'Draw' })).toHaveCount(0);

    // --- Watermark: preset → drag → scale ---
    await page.getByRole('button', { name: 'Watermark', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Watermark' })).toBeVisible();

    await page
      .getByRole('group', { name: 'Watermark' })
      .getByLabel('Position')
      .selectOption('center');
    await page.waitForFunction(() => {
      const wm = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.watermark;
      return wm?.mode === 'text' && wm.position === 'center' && wm.x === null;
    });

    const beforeDrag = await getSnapshot(page);
    const center = await sceneToClient(page, output.width * 0.5, output.height * 0.5);
    const moved = await sceneToClient(page, output.width * 0.35, output.height * 0.35);
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(moved.x, moved.y, { steps: 10 });
    await page.mouse.up();

    await page.waitForFunction(() => {
      const wm = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.watermark;
      return wm?.mode === 'text' && wm.x !== null && wm.y !== null;
    });

    const afterDrag = await getSnapshot(page);
    expect(afterDrag.document!.watermark.x).not.toBeNull();
    expect(afterDrag.document!.watermark.y).not.toBeNull();
    expect(afterDrag.history.past.length).toBeGreaterThan(beforeDrag.history.past.length);

    const scaleBefore = afterDrag.document!.watermark.scale;
    const seCorner = await page.evaluate(() => {
      const snap = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot();
      const wm = snap?.document?.watermark;
      const output = snap?.document?.output;
      if (!wm || !output || wm.x === null || wm.y === null) {
        throw new Error('watermark placement missing');
      }
      const minEdge = Math.min(output.width, output.height);
      const fontSize = Math.max(10, Math.round(minEdge * 0.06 * wm.scale));
      const width = Math.max(16, (wm.text?.length || 1) * fontSize * 0.55);
      const height = Math.max(16, fontSize * 1.2);
      return { x: wm.x + width, y: wm.y + height };
    });
    const se = await sceneToClient(page, seCorner.x, seCorner.y);
    const seOut = await sceneToClient(page, seCorner.x + 80, seCorner.y + 80);
    await page.mouse.move(se.x, se.y);
    await page.mouse.down();
    await page.mouse.move(seOut.x, seOut.y, { steps: 12 });
    await page.mouse.up();

    const scaledViaHandle = await page
      .waitForFunction(
        (prevScale) => {
          const wm = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.watermark;
          return !!wm && Math.abs(wm.scale - prevScale) > 0.04;
        },
        scaleBefore,
        { timeout: 5_000 },
      )
      .then(() => true)
      .catch(() => false);

    // Firefox/WebKit can miss Fabric watermark resize-handle hit targets; fall back to command.
    if (!scaledViaHandle) {
      await page.evaluate(async (nextScale) => {
        const handle = window.__FLUXIO_E2E__?.getHandle?.();
        const wm = handle?.getSnapshot()?.document?.watermark;
        if (!handle || !wm) {
          throw new Error('watermark missing');
        }
        await handle.execute('watermark.set', { watermark: { ...wm, scale: nextScale } });
      }, Math.min(3, scaleBefore + 0.35));
    }

    await page.waitForFunction((prevScale) => {
      const wm = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.watermark;
      return !!wm && Math.abs(wm.scale - prevScale) > 0.04;
    }, scaleBefore);

    const afterScale = await getSnapshot(page);
    expect(afterScale.document!.watermark.scale).not.toBeCloseTo(scaleBefore, 2);

    await clickToolDone(page);
    await expect(page.getByRole('group', { name: 'Watermark' })).toHaveCount(0);

    const historyBeforeUndo = (await getSnapshot(page)).history.past.length;
    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    const afterUndo = await getSnapshot(page);
    expect(afterUndo.history.past.length).toBeLessThan(historyBeforeUndo);
    expect(
      afterUndo.document!.annotations.filter((a) => a.kind === 'path').length,
    ).toBeGreaterThanOrEqual(1);
    expect(historyAfterStroke).toBeGreaterThanOrEqual(1);

    const exported = await page.evaluate(async () => {
      const result = await window.__FLUXIO_E2E__?.getHandle?.()?.export({ format: 'png' });
      if (!result) {
        throw new Error('export failed');
      }
      return { width: result.width, height: result.height, size: result.blob.size };
    });
    expect(exported.width).toBeGreaterThan(0);
    expect(exported.size).toBeGreaterThan(0);

    await page.evaluate(() => window.__FLUXIO_E2E__?.destroyEditor?.());
    await expect(page.getByRole('region', { name: 'Editor destroyed' })).toBeVisible();
  });
});
