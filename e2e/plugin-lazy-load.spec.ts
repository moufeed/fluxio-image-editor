import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __FLUXIO_E2E__?: {
      getHandle: () => {
        getSnapshot: () => { status: string };
      } | null;
      loadWithPlugins: (plugins: readonly string[]) => void;
      loadWithHostPluginInstances: () => void;
      getToolbarActionIds: () => readonly string[];
    };
  }
}

async function waitForReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const handle = window.__FLUXIO_E2E__?.getHandle?.();
    return handle?.getSnapshot()?.status === 'ready';
  });
}

test.describe('Plugin lazy loading (Phase A)', () => {
  test('subset config omits unloaded toolbar actions and plugin chunks', async ({ page }) => {
    const pluginChunkRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (
        url.includes('plugins/text') ||
        url.includes('plugins/watermark') ||
        url.includes('text.plugin') ||
        url.includes('watermark.plugin')
      ) {
        pluginChunkRequests.push(url);
      }
    });

    await page.goto('/');
    await waitForReady(page);

    await page.evaluate(() => {
      window.__FLUXIO_E2E__?.loadWithPlugins(['crop', 'transform']);
    });
    await page.waitForFunction(() => window.__FLUXIO_E2E__?.getHandle?.() != null);
    await waitForReady(page);

    const actionIds = await page.evaluate(() => window.__FLUXIO_E2E__?.getToolbarActionIds() ?? []);
    expect(actionIds).not.toContain('text.tool');
    expect(actionIds).not.toContain('watermark.tool');
    expect(actionIds).toContain('crop.tool');
    expect(actionIds).toContain('transform.rotate-tool');
    expect(pluginChunkRequests).toHaveLength(0);
  });

  test('default host load keeps full toolbar (backward compatible)', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    const actionIds = await page.evaluate(() => window.__FLUXIO_E2E__?.getToolbarActionIds() ?? []);
    expect(actionIds).toContain('text.tool');
    expect(actionIds).toContain('watermark.tool');
    expect(actionIds).toContain('adjustments.tool');
  });

  test('host plugin instances via [plugins] input register only passed plugins', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    await page.evaluate(() => {
      window.__FLUXIO_E2E__?.loadWithHostPluginInstances();
    });
    await page.waitForFunction(() => window.__FLUXIO_E2E__?.getHandle?.() != null);
    await waitForReady(page);

    const actionIds = await page.evaluate(() => window.__FLUXIO_E2E__?.getToolbarActionIds() ?? []);
    expect(actionIds).toContain('adjustments.tool');
    expect(actionIds).toContain('filters.tool');
    expect(actionIds).not.toContain('text.tool');
    expect(actionIds).not.toContain('watermark.tool');
  });
});
