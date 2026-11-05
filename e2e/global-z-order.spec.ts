import { expect, test, type Page } from '@playwright/test';

import { openUtilibarTool, clickToolDone } from './helpers';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => SnapshotLite;
        undo: () => void;
      } | null;
    };
  }
}

interface SnapshotLite {
  status: string;
  document: {
    annotations: ReadonlyArray<{ kind: string; id: string; text?: string }>;
  } | null;
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

test.describe('Global annotation z-order', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('fluxio-image-editor')).toBeVisible();
    await waitForReady(page);
  });

  test('Arrange bring-to-front moves text above image across kinds', async ({ page }) => {
    await openUtilibarTool(page, 'Text');
    await page.getByRole('button', { name: 'Add text', exact: true }).click();
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.some((a) => a.kind === 'text');
    });
    await clickToolDone(page, 'Text');

    await openUtilibarTool(page, 'Overlay');
    await page.locator('.fluxio-overlay-gallery__item').first().click();
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.some((a) => a.kind === 'image');
    });
    await clickToolDone(page, 'Overlay');

    const before = await getSnapshot(page);
    expect(before.document?.annotations.map((a) => a.kind)).toEqual(['text', 'image']);
    const textId = before.document!.annotations.find((a) => a.kind === 'text')!.id;

    await openUtilibarTool(page, 'Text');
    const orderActions = page.locator('fluxio-controls-panel fluxio-order-actions');
    const bringToFront = orderActions.getByRole('button', { name: 'Bring to front', exact: true });
    await expect(bringToFront).toBeEnabled();
    const pastBefore = (await getSnapshot(page)).history.past.length;
    await bringToFront.click();

    await page.waitForFunction((id) => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns.length === 2 && anns[1]?.id === id;
    }, textId);

    const after = await getSnapshot(page);
    expect(after.document?.annotations.map((a) => a.kind)).toEqual(['image', 'text']);
    expect(after.history.past.length).toBe(pastBefore + 1);

    await expect(orderActions.getByRole('button', { name: 'Bring to front', exact: true })).toBeDisabled();
    await expect(orderActions.getByRole('button', { name: 'Bring forward', exact: true })).toBeDisabled();

    await page.evaluate(() => window.__FLUXIO_E2E__?.getHandle?.()?.undo());
    await page.waitForFunction(() => {
      const anns = window.__FLUXIO_E2E__?.getHandle?.()?.getSnapshot()?.document?.annotations ?? [];
      return anns[0]?.kind === 'text' && anns[1]?.kind === 'image';
    });
  });
});
