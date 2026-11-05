import { expect, test, type Page } from '@playwright/test';

import { openUtilibarTool, clickToolDone } from './helpers';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => {
          status: string;
          document: {
            annotations: readonly { kind: string; src?: string }[];
          } | null;
        };
        execute: (id: string, payload?: unknown) => Promise<void>;
        setActiveTool: (id: string | null) => void;
      } | null;
    };
  }
}

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const handle = window.__FLUXIO_E2E__?.getHandle?.();
    return handle?.getSnapshot()?.status === 'ready';
  });
}

test.describe('stickers', () => {
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

  test('Stickers tool shows gallery; placing star adds image annotation', async ({ page }) => {
    await openUtilibarTool(page, 'Stickers');
    const star = page.getByRole('listitem', { name: 'Star', exact: true });
    await expect(star).toBeVisible();
    await star.click();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const handle = window.__FLUXIO_E2E__?.getHandle?.();
          const images =
            handle?.getSnapshot()?.document?.annotations.filter((a) => a.kind === 'image') ?? [];
          return images.length;
        });
      })
      .toBeGreaterThan(0);

    await clickToolDone(page);
    await expect(page.getByRole('listitem', { name: 'Star', exact: true })).toHaveCount(0);

    const count = await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      return (
        handle?.getSnapshot()?.document?.annotations.filter((a) => a.kind === 'image').length ?? 0
      );
    });
    expect(count).toBeGreaterThan(0);
  });
});
