import { expect, type Page, test } from '@playwright/test';

const viewports = [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`responsive layout at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await calculateCatalogRoute(page);

    await expect(
      page.getByText('17,5 km', { exact: true }).last(),
    ).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(
          'document.documentElement.scrollWidth <= window.innerWidth',
        ),
      )
      .toBe(true);

    // Alternative labels remain readable and the map canvas is present.
    const alternativesGroup = page.getByRole('group', {
      name: 'Route alternatives',
    });
    await expect(
      alternativesGroup.getByRole('radio', { name: /Fastest/ }),
    ).toBeVisible();
    await expect(
      alternativesGroup.getByRole('radio', { name: /Alternative 1/ }),
    ).toBeVisible();
    await expect(page.getByTestId('route-map-canvas')).toBeVisible();
  });
}

async function calculateCatalogRoute(page: Page) {
  await page.getByRole('combobox', { name: 'Origin' }).fill('Pla');
  await page.getByRole('button', { name: /Plaça de Catalunya/ }).click();
  await expect(page.getByRole('combobox', { name: 'Origin' })).toHaveValue(
    /Plaça de Catalunya/,
  );

  await page.getByRole('combobox', { name: 'Destination' }).fill('Sag');
  await page.getByRole('button', { name: /Sagrada Família/ }).click();
  await expect(page.getByRole('combobox', { name: 'Destination' })).toHaveValue(
    /Sagrada Família/,
  );

  await page.getByLabel('Vehicle').selectOption('honda-forza-350-2025');
  await page.getByRole('spinbutton', { name: 'Fuel price' }).fill('1.6');
  await page.getByRole('button', { name: 'Calculate route' }).click();
}
