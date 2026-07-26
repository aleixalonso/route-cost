import { expect, test } from '@playwright/test';

test('catalog route-cost flow works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

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

  await expect(page.getByText('17,5 km', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('27 min')).toBeVisible();
  await expect(page.getByText('0,63 L')).toBeVisible();
  await expect(page.getByText(/1,01\s€/).last()).toBeVisible();
  await expect(
    page.getByText(/Honda Forza 350 · Catalog vehicle/),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Urban', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Interurban', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Motorway', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Unknown', exact: true }),
  ).toBeVisible();
});

test('custom route-cost flow works', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Vehicle').selectOption('custom');
  await page.getByLabel('Vehicle category').selectOption('maxi-scooter');
  await page
    .getByRole('spinbutton', { name: 'Urban consumption', exact: true })
    .fill('3.8');
  await page
    .getByRole('spinbutton', { name: 'Interurban consumption' })
    .fill('3');
  await page
    .getByRole('spinbutton', { name: 'Motorway consumption' })
    .fill('4.1');
  await page
    .getByRole('spinbutton', { name: 'Unknown-road consumption' })
    .fill('3.4');

  await page.getByRole('combobox', { name: 'Origin' }).fill('Pla');
  await page.getByRole('button', { name: /Plaça de Catalunya/ }).click();
  await page.getByRole('combobox', { name: 'Destination' }).fill('Sag');
  await page.getByRole('button', { name: /Sagrada Família/ }).click();
  await page.getByRole('spinbutton', { name: 'Fuel price' }).fill('1.6');
  await page.getByRole('button', { name: 'Calculate route' }).click();

  await expect(page.getByText(/Custom maxi scooter/)).toBeVisible();
  await expect(page.getByText('0,64 L')).toBeVisible();
});

test('validation prevents unresolved submission', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Calculate route' }).click();

  await expect(page.getByText('Choose a resolved origin.')).toBeVisible();
  await expect(page.getByText('Choose a resolved destination.')).toBeVisible();
  await expect(page.getByText('Enter a positive fuel price.')).toBeVisible();
});

test('swap exchanges resolved locations before submit', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('combobox', { name: 'Origin' }).fill('Pla');
  await page.getByRole('button', { name: /Plaça de Catalunya/ }).click();
  await page.getByRole('combobox', { name: 'Destination' }).fill('Sag');
  await page.getByRole('button', { name: /Sagrada Família/ }).click();
  await page
    .getByRole('button', { name: 'Swap origin and destination' })
    .click();

  await expect(page.getByRole('combobox', { name: 'Origin' })).toHaveValue(
    /Sagrada Família/,
  );
  await expect(page.getByRole('combobox', { name: 'Destination' })).toHaveValue(
    /Plaça de Catalunya/,
  );
});

test('empty location search is safe', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('combobox', { name: 'Origin' }).fill('empty');

  await expect(page.getByText('No locations found.')).toBeVisible();
});

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/unknown');

  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible();
});
