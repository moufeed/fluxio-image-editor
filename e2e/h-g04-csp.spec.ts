import { expect, test } from '@playwright/test';

/**
 * Strict-CSP path must avoid page.evaluate / waitForFunction — those inject eval
 * and violate script-src without unsafe-eval. Drive the demo via UI locators only.
 */
test.describe('H-G04 strict CSP basic path', () => {
  test('load → rotate → export PNG under CSP meta (UI)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.locator('.demo__csp-banner')).toBeVisible();
    await expect(page.locator('fluxio-image-editor')).toBeVisible();
    await expect(page.locator('.fluxio-image-editor__viewport canvas').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('.demo__footer')).toContainText(/ready|changed/, {
      timeout: 30_000,
    });

    // Open rotate tool, then commit a 90° rotate from the controls panel.
    await page.locator('.fluxio-image-editor__utilibar').getByRole('button', { name: 'Rotate' }).click();
    await page
      .locator('.fluxio-image-editor__controls')
      .getByRole('button', { name: 'Rotate', exact: true })
      .click();
    await expect(page.locator('.demo__footer')).toContainText('dirty=true', {
      timeout: 15_000,
    });

    await page.locator('.fluxio-image-editor__export-trigger').click();
    await page.getByRole('menuitem', { name: 'PNG' }).click();
    await page
      .getByRole('dialog', { name: 'Export image' })
      .getByRole('button', { name: 'Export', exact: true })
      .click();

    await expect(page.locator('.demo__footer')).toContainText(/Last export: \d+ bytes/, {
      timeout: 20_000,
    });

    const exportLine = await page.locator('.demo__footer').innerText();
    const match = exportLine.match(/Last export: (\d+) bytes/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThan(0);

    expect(pageErrors, `uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});
