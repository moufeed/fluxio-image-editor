import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => {
          status: string;
          comparingOriginal?: boolean;
          document: { transform: { rotationDegrees: number } } | null;
        };
        setCompareOriginal: (active: boolean) => void;
        isComparingOriginal: () => boolean;
        execute: (id: string, payload?: unknown) => Promise<void>;
        fitViewport: () => void;
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

test.describe('live original compare', () => {
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

  test('Compare control toggles original view; Esc clears; document unchanged', async ({
    page,
  }) => {
    const compare = page.getByRole('button', { name: 'Compare', exact: true });
    await expect(compare).toBeVisible();

    await page.evaluate(async () => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      await handle.execute('transform.rotate', { degrees: 90 });
    });

    await compare.click();
    await expect(page.getByText('Original', { exact: true })).toBeVisible();

    const whileComparing = await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      return {
        comparing: handle.isComparingOriginal(),
        snapComparing: handle.getSnapshot().comparingOriginal,
        rotation: handle.getSnapshot().document?.transform.rotationDegrees,
      };
    });
    expect(whileComparing.comparing).toBe(true);
    expect(whileComparing.snapComparing).toBe(true);
    expect(whileComparing.rotation).toBe(90);

    await page.keyboard.press('Escape');
    await expect(page.getByText('Original', { exact: true })).toHaveCount(0);

    const afterEsc = await page.evaluate(() => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      return {
        comparing: handle.isComparingOriginal(),
        rotation: handle.getSnapshot().document?.transform.rotationDegrees,
      };
    });
    expect(afterEsc.comparing).toBe(false);
    expect(afterEsc.rotation).toBe(90);
  });
});
