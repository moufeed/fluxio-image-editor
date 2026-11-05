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
        fitViewport: () => void;
        destroy: () => void;
      } | null;
      destroyEditor: () => void;
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
    annotations: ReadonlyArray<ImageAnn | { kind: string; id?: string }>;
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

test.describe('UX-I4 a11y / keyboard / z-order', () => {
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

  test('nudge + numeric + z-order + delete + export', async ({ page }) => {
    await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.fitViewport();
    });

    await openUtilibarTool(page, 'Overlay');
    await expect(page.getByRole('group', { name: 'Overlay' })).toBeVisible();
    await expect(page.getByText('Arrows nudge', { exact: false })).toBeVisible();

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

    await overlayObjectOption(page, 1).click();

    const beforeNudge = (await imageAnnotations(page))[0]!;
    await page.locator('.fluxio-image-editor__viewport').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((prevX) => {
      const images =
        window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations?.filter(
          (a: { kind: string }) => a.kind === 'image',
        ) ?? [];
      const first = images[0] as ImageAnn | undefined;
      return !!first && first.x === prevX + 2;
    }, beforeNudge.x);

    await page.keyboard.press('Shift+ArrowDown');
    await page.waitForFunction((prevY) => {
      const images =
        window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations?.filter(
          (a: { kind: string }) => a.kind === 'image',
        ) ?? [];
      const first = images[0] as ImageAnn | undefined;
      return !!first && first.y === prevY + 10;
    }, beforeNudge.y);

    const afterNudge = (await imageAnnotations(page))[0]!;
    const xField = page
      .getByRole('group', { name: 'Overlay', exact: true })
      .getByRole('spinbutton', { name: 'X', exact: true });
    await xField.fill(String(Math.round(afterNudge.x + 15)));
    await xField.press('Tab');
    await page.waitForFunction((prevX) => {
      const images =
        window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations?.filter(
          (a: { kind: string }) => a.kind === 'image',
        ) ?? [];
      const first = images[0] as ImageAnn | undefined;
      return !!first && Math.abs(first.x - (prevX + 15)) < 1;
    }, afterNudge.x);

    const orderBefore = (await imageAnnotations(page)).map((item) => item.id);
    await page
      .locator('fluxio-controls-panel fluxio-order-actions')
      .getByRole('button', { name: 'Bring forward', exact: true })
      .click();
    await page.waitForFunction((ids) => {
      const images =
        window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations?.filter(
          (a: { kind: string }) => a.kind === 'image',
        ) ?? [];
      return images.length === 2 && images[0]?.id === ids[1] && images[1]?.id === ids[0];
    }, orderBefore);

    const orderAfter = (await imageAnnotations(page)).map((item) => item.id);
    expect(orderAfter).toEqual([orderBefore[1], orderBefore[0]]);

    await overlayObjectOption(page, 1).click();
    const countBeforeDelete = (await imageAnnotations(page)).length;
    await page.locator('.fluxio-image-editor__viewport').focus();
    await page.keyboard.press('Delete');
    await page.waitForFunction((prev) => {
      const images =
        window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations?.filter(
          (a: { kind: string }) => a.kind === 'image',
        ) ?? [];
      return images.length === prev - 1;
    }, countBeforeDelete);

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
