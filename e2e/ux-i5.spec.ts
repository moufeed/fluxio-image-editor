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
    annotations: ReadonlyArray<{
      kind: string;
      id?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      angle?: number;
      points?: ReadonlyArray<{ x: number; y: number }>;
    }>;
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

function pathBounds(path: {
  points?: ReadonlyArray<{ x: number; y: number }>;
}): { x: number; y: number; width: number; height: number } {
  const pts = path.points ?? [];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

test.describe('UX-I5 annotation interaction completion', () => {
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

  test('drawing path select/move + overlay rotate + undo/export', async ({ page }) => {
    await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.fitViewport();
    });

    const output = (await getSnapshot(page)).document!.output;

    // --- Drawing: stroke → canvas move (not a new stroke) ---
    await openUtilibarTool(page, 'Draw');
    const strokeStart = await sceneToClient(page, output.width * 0.3, output.height * 0.3);
    const strokeEnd = await sceneToClient(page, output.width * 0.55, output.height * 0.5);
    await page.mouse.move(strokeStart.x, strokeStart.y);
    await page.mouse.down();
    await page.mouse.move(strokeEnd.x, strokeEnd.y, { steps: 10 });
    await page.mouse.up();

    await page.waitForFunction(() => {
      const snap = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot();
      return (snap?.document?.annotations?.filter((a) => a.kind === 'path').length ?? 0) >= 1;
    });

    const afterStroke = await getSnapshot(page);
    const path = afterStroke.document!.annotations.find((a) => a.kind === 'path')!;
    const before = pathBounds(path);
    const historyAfterStroke = afterStroke.history.past.length;

    const body = await sceneToClient(
      page,
      before.x + before.width / 2,
      before.y + before.height / 2,
    );
    const movedTo = await sceneToClient(
      page,
      before.x + before.width / 2 + 36,
      before.y + before.height / 2 + 24,
    );
    await page.mouse.move(body.x, body.y);
    await page.mouse.down();
    await page.mouse.move(movedTo.x, movedTo.y, { steps: 8 });
    await page.mouse.up();

    await page.waitForFunction(
      (prevLen) => {
        const snap = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot();
        return (snap?.history.past.length ?? 0) > prevLen;
      },
      historyAfterStroke,
    );

    const afterMove = await getSnapshot(page);
    const movedPath = afterMove.document!.annotations.find((a) => a.kind === 'path')!;
    const after = pathBounds(movedPath);
    expect(after.x).toBeGreaterThan(before.x + 5);
    expect(after.y).toBeGreaterThan(before.y + 5);
    expect(afterMove.document!.annotations.filter((a) => a.kind === 'path')).toHaveLength(1);

    await clickToolDone(page);

    // --- Overlay: known AABB → rotate handle ---
    await openUtilibarTool(page, 'Overlay');
    await expect(page.getByRole('group', { name: 'Overlay' })).toBeVisible();
    await page.locator('.fluxio-overlay-gallery__item').first().click();

    await page.waitForFunction(() => {
      const snap = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot();
      return (snap?.document?.annotations?.filter((a) => a.kind === 'image').length ?? 0) >= 1;
    });

    const withOverlay = await getSnapshot(page);
    const image = withOverlay.document!.annotations.find((a) => a.kind === 'image')!;
    const ix = image.x ?? 0;
    const iy = image.y ?? 0;
    const iw = image.width ?? 80;
    const ih = image.height ?? 80;
    const historyBeforeRotate = withOverlay.history.past.length;

    // Rotate handle is below bottom-center (~24 screen px for annotations → scene via /zoom).
    const rotateOffset = 24 / Math.max(withOverlay.viewport.zoom, 0.001);
    const rotateHandle = await sceneToClient(page, ix + iw / 2, iy + ih + rotateOffset);
    const rotateDrag = await sceneToClient(page, ix + iw / 2 + 40, iy + ih - 10);
    await page.mouse.move(rotateHandle.x, rotateHandle.y);
    await page.mouse.down();
    await page.mouse.move(rotateDrag.x, rotateDrag.y, { steps: 10 });
    await page.mouse.up();

    await page.waitForFunction(
      (prevLen) => {
        const snap = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot();
        const img = snap?.document?.annotations?.find((a) => a.kind === 'image');
        return (
          (snap?.history.past.length ?? 0) > prevLen &&
          !!img &&
          typeof img.angle === 'number' &&
          Math.abs(img.angle) > 1
        );
      },
      historyBeforeRotate,
    );

    const afterRotate = await getSnapshot(page);
    const rotated = afterRotate.document!.annotations.find((a) => a.kind === 'image')!;
    expect(Math.abs(rotated.angle ?? 0)).toBeGreaterThan(1);

    // Undo while still in overlay tool (same pattern as UX-I1): gesture already committed history.
    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    await page.waitForFunction(() => {
      const img = window.__FLUXIO_E2E__?.getHandle
        ?.()
        ?.getSnapshot()
        ?.document?.annotations?.find((a) => a.kind === 'image');
      return !!img && Math.abs(img.angle ?? 0) < 0.5;
    });

    await page.getByRole('group', { name: 'Overlay' }).getByRole('button', { name: 'Done', exact: true }).click();

    const exported = await page.evaluate(async () => {
      const result = await window.__FLUXIO_E2E__?.getHandle?.()?.export({ format: 'png' });
      return { size: result?.blob.size ?? 0, width: result?.width ?? 0, height: result?.height ?? 0 };
    });
    expect(exported.size).toBeGreaterThan(100);
    expect(exported.width).toBe(output.width);
    expect(exported.height).toBe(output.height);
  });
});
