import { expect, type Page } from '@playwright/test';

/** Tools nested under the utilibar Annotate group (subrail toolbar). */
const ANNOTATE_TOOLS = new Set([
  'Text',
  'Shapes',
  'Draw',
  'Path',
  'Overlay',
  'Stickers',
  'Emoji',
]);

/**
 * Open a utilibar tool. Annotate children live in a separate `toolbar="Annotate"` subrail.
 */
export async function openUtilibarTool(page: Page, name: string): Promise<void> {
  const utilibar = page.getByRole('toolbar', { name: 'Image editor utilities' });

  if (ANNOTATE_TOOLS.has(name)) {
    const annotate = utilibar.getByRole('button', { name: 'Annotate', exact: true });
    if ((await annotate.getAttribute('aria-expanded')) !== 'true') {
      await annotate.click();
    }
    const tool = page.getByRole('toolbar', { name: 'Annotate' }).getByRole('button', {
      name,
      exact: true,
    });
    await expect(tool).toBeVisible();
    await tool.click();
    return;
  }

  await utilibar.getByRole('button', { name, exact: true }).click();
}

/**
 * Click Done for the active tool panel.
 * Prefer scoping by tool group — multiple control hosts can keep Done in the DOM.
 */
export async function clickToolDone(page: Page, toolGroup?: string): Promise<void> {
  if (toolGroup) {
    await page
      .getByRole('group', { name: toolGroup, exact: true })
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    return;
  }
  await page.locator('fluxio-controls-panel .fluxio-btn--done').last().click();
}

/** Overlay / stickers object chips are labeled "Image 1", "Image 2", … */
export function overlayObjectOption(page: Page, index: number) {
  return page
    .getByRole('group', { name: 'Overlay', exact: true })
    .getByRole('option', { name: `Image ${index}`, exact: true });
}
