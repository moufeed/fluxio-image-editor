import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => {
          status: string;
          document: {
            adjustments: {
              exposure: number;
              sharpen: number;
              brightness: number;
            };
          } | null;
          preview: {
            adjustments?: {
              exposure?: number;
              sharpen?: number;
            } | null;
          } | null;
        };
        setPreview: (preview: {
          adjustments: Record<string, number>;
        }) => void;
        setActiveTool: (id: string | null) => void;
        execute: (id: string, payload?: unknown) => Promise<void>;
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

test.describe('exposure / sharpen', () => {
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

  test('Finetune shows Exposure and Sharpen; commit persists both', async ({ page }) => {
    await page.getByRole('button', { name: 'Finetune', exact: true }).click();
    await expect(page.getByText('Exposure', { exact: true })).toBeVisible();
    await expect(page.getByText('Sharpen', { exact: true })).toBeVisible();

    const result = await page.evaluate(async () => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.setActiveTool('adjustments');
      const adjustments = {
        brightness: 0,
        contrast: 0,
        hue: 0,
        saturation: 0,
        value: 0,
        warmth: 0,
        blur: 0,
        exposure: 0.35,
        sharpen: 0.55,
      };
      handle.setPreview({ adjustments });
      await handle.execute('adjustments.set', { adjustments });
      handle.setPreview({ adjustments: handle.getSnapshot().document!.adjustments });
      const doc = handle.getSnapshot().document!.adjustments;
      return { exposure: doc.exposure, sharpen: doc.sharpen };
    });

    expect(result.exposure).toBe(0.35);
    expect(result.sharpen).toBe(0.55);
  });
});
