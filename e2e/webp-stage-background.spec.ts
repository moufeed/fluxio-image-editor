import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => { status: string };
        export: (options: {
          format: 'png' | 'jpeg' | 'webp';
          quality?: number;
        }) => Promise<{
          blob: Blob;
          format: string;
        }>;
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

test.describe('WebP export + stage background', () => {
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

  test('host canvasBackground on stage; WebP export has RIFF/WEBP header', async ({ page }) => {
    const viewport = page.locator('.fluxio-image-editor__viewport');
    await expect(viewport).toHaveClass(/fluxio-image-editor__viewport--custom-stage/);
    const bg = await viewport.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toMatch(/rgb\(\s*18,\s*22,\s*28\s*\)/);

    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'WebP', exact: true })).toBeVisible();

    const result = await page.evaluate(async () => {
      const handle = window.__FLUXIO_E2E__?.getHandle?.();
      if (!handle) {
        throw new Error('E2E handle missing');
      }
      handle.fitViewport();
      const exported = await handle.export({ format: 'webp', quality: 0.9 });
      const bytes = new Uint8Array(await exported.blob.arrayBuffer());
      return {
        format: exported.format,
        size: bytes.length,
        header: String.fromCharCode(...bytes.slice(0, 4)),
        fourcc: String.fromCharCode(...bytes.slice(8, 12)),
        mime: exported.blob.type,
      };
    });

    expect(result.format).toBe('webp');
    expect(result.size).toBeGreaterThan(32);
    expect(result.header).toBe('RIFF');
    expect(result.fourcc).toBe('WEBP');
    expect(result.mime).toMatch(/webp/i);
  });
});
