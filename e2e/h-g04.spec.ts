import { expect, test, type Page } from '@playwright/test';

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
        execute: (id: string, payload?: unknown) => Promise<void>;
        undo: () => void;
        redo: () => void;
        setZoom: (zoom: number) => void;
        panBy: (dx: number, dy: number) => void;
      } | null;
      getLastError: () => string | null;
      destroyEditor: () => void;
      reopenEditor: () => void;
      loadBrokenRemote: () => void;
      loadSameOriginFixture: () => void;
    };
  }
}

type SnapshotLite = {
  status: string;
  dirty: boolean;
  history: { past: unknown[]; future: unknown[]; canUndo: boolean; canRedo: boolean };
  document: {
    sourceSize: { width: number; height: number };
    output: { width: number; height: number };
    crop: { width: number; height: number } | null;
    transform: { rotationDegrees: number };
  } | null;
  viewport: { zoom: number; fitMode: string; offsetX: number; offsetY: number };
};

type ExportLite = {
  size: number;
  type: string;
  width: number;
  height: number;
  fileName: string;
  digest: string;
};

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const bridge = window.__FLUXIO_E2E__;
    const handle = bridge?.getHandle?.();
    if (!handle) {
      return false;
    }
    const snap = handle.getSnapshot() as SnapshotLite;
    return snap.status === 'ready' && !!snap.document;
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

async function exportViaHandle(
  page: Page,
  format: 'png' | 'jpeg',
): Promise<ExportLite> {
  return page.evaluate(async (fmt) => {
    const handle = window.__FLUXIO_E2E__?.getHandle?.();
    if (!handle) {
      throw new Error('E2E handle missing');
    }
    const result = await handle.export({ format: fmt, quality: 0.92 });
    const buffer = await result.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let hash = 2166136261;
    for (let i = 0; i < bytes.length; i += 1) {
      hash ^= bytes[i]!;
      hash = Math.imul(hash, 16777619);
    }
    return {
      size: result.blob.size,
      type: result.blob.type,
      width: result.width,
      height: result.height,
      fileName: result.fileName,
      digest: (hash >>> 0).toString(16),
    };
  }, format);
}

async function countEditorCanvases(page: Page): Promise<number> {
  return page.locator('fluxio-image-editor canvas').count();
}

test.describe('H-G04 Chromium critical path', () => {
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

  test('crop → rotate → undo/redo → PNG/JPEG → destroy', async ({ page }) => {
    const initial = await getSnapshot(page);
    expect(initial.status).toBe('ready');
    expect(initial.document).toBeTruthy();
    expect(initial.viewport.fitMode).toBe('contain');
    expect(initial.viewport.zoom).toBeGreaterThan(0);
    expect(initial.history.past).toHaveLength(0);

    const baselinePng = await exportViaHandle(page, 'png');
    expect(baselinePng.size).toBeGreaterThan(0);
    expect(baselinePng.type).toMatch(/png/i);
    expect(baselinePng.width).toBe(initial.document!.output.width);
    expect(baselinePng.height).toBe(initial.document!.output.height);

    // Zoom/pan must not create history entries.
    await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.setZoom(handle.getSnapshot().viewport.zoom * 1.25);
      handle.panBy(24, -18);
    });
    const afterViewport = await getSnapshot(page);
    expect(afterViewport.history.past).toHaveLength(0);

    // Pointer crop: open tool, drag bottom-right handle region, apply.
    await page.getByRole('button', { name: 'Crop', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Apply crop' })).toBeVisible();

    const canvas = page.locator('.fluxio-image-editor__viewport canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    const startX = box!.x + box!.width * 0.78;
    const startY = box!.y + box!.height * 0.78;
    const endX = box!.x + box!.width * 0.55;
    const endY = box!.y + box!.height * 0.55;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 12 });
    await page.mouse.up();

    await page.getByRole('button', { name: 'Apply crop' }).click();
    await page.waitForFunction(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      const snap = handle?.getSnapshot() as SnapshotLite | undefined;
      return !!snap?.document?.crop || (snap?.history.past.length ?? 0) > 0;
    });

    const afterCrop = await getSnapshot(page);
    expect(afterCrop.history.past.length).toBeGreaterThanOrEqual(1);
    expect(afterCrop.document?.crop).toBeTruthy();

    const croppedPng = await exportViaHandle(page, 'png');
    expect(croppedPng.size).toBeGreaterThan(0);
    expect(
      croppedPng.width !== baselinePng.width ||
        croppedPng.height !== baselinePng.height ||
        croppedPng.digest !== baselinePng.digest,
    ).toBe(true);

    const historyBeforeRotate = afterCrop.history.past.length;
    await page.evaluate(async () => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      await handle.execute('transform.rotate', { degrees: 90 });
    });

    const afterRotate = await getSnapshot(page);
    expect(afterRotate.document?.transform.rotationDegrees).toBe(90);
    expect(afterRotate.history.past.length).toBe(historyBeforeRotate + 1);

    const rotatedPng = await exportViaHandle(page, 'png');
    expect(rotatedPng.size).toBeGreaterThan(0);
    expect(rotatedPng.digest).not.toBe(croppedPng.digest);

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    expect((await getSnapshot(page)).document?.transform.rotationDegrees).toBe(0);

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.redo());
    expect((await getSnapshot(page)).document?.transform.rotationDegrees).toBe(90);

    const jpeg = await exportViaHandle(page, 'jpeg');
    expect(jpeg.size).toBeGreaterThan(0);
    expect(jpeg.type).toMatch(/jpeg|jpg/i);
    expect(jpeg.width).toBe(rotatedPng.width);
    expect(jpeg.height).toBe(rotatedPng.height);

    await page.getByRole('button', { name: 'Destroy editor' }).click();
    await expect(page.locator('fluxio-image-editor')).toHaveCount(0);
    expect(await countEditorCanvases(page)).toBe(0);
    await expect(page.getByRole('region', { name: 'Editor destroyed' })).toBeVisible();
  });

  test('typed CORS/load failure for blocked remote source', async ({ page }) => {
    await page.getByRole('button', { name: 'Broken remote URL' }).click();
    await expect(page.locator('.demo__error')).toBeVisible({ timeout: 30_000 });
    const message = await page.locator('.demo__error').innerText();
    expect(message).toMatch(/\[(CORS_FAILED|IMAGE_LOAD_FAILED)\]/);
  });

  test('repeated destroy/reopen does not accumulate canvases', async ({ page }) => {
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: 'Destroy editor' }).click();
      await expect(page.locator('fluxio-image-editor')).toHaveCount(0);
      expect(await countEditorCanvases(page)).toBe(0);

      await page.getByRole('button', { name: 'Reopen editor' }).click();
      await expect(page.locator('fluxio-image-editor')).toBeVisible();
      await waitForReady(page);
      expect(await countEditorCanvases(page)).toBeGreaterThan(0);
    }

    expect(await countEditorCanvases(page)).toBeLessThanOrEqual(2);
  });
});
