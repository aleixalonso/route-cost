import { expect, type Page, test } from '@playwright/test';

test('catalog route-cost flow works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await calculateCatalogRoute(page);

  await expect(page.getByText('17,5 km', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('27 min', { exact: true }).first()).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Route map' })).toBeVisible();
  await expect(page.getByTestId('route-map-canvas')).toBeVisible();
  await expect(page.getByTestId('route-map-marker-a')).toBeVisible();
  await expect(page.getByTestId('route-map-marker-b')).toBeVisible();
  await expect(
    page.getByText('Road categories', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Plaça de Catalunya, Barcelona, Catalunya, España to/),
  ).toBeVisible();
  await expect(
    page.getByText('Calculate a route to display it on the map.'),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('alternative route selection updates results and keeps the map mounted', async ({
  page,
}) => {
  let routeCostRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/route-cost-estimates')) {
      routeCostRequests += 1;
    }
  });

  await page.goto('/');
  await calculateCatalogRoute(page);

  const mapCanvas = page.getByTestId('route-map-canvas');
  await expect(
    page.getByRole('radio', { name: /Fastest route/ }),
  ).toBeChecked();
  await expect(mapCanvas).toHaveAttribute(
    'data-route-alternative-id',
    'primary',
  );

  const alternativeRadio = page.getByRole('radio', { name: /Alternative 1/ });
  await alternativeRadio.click();

  await expect(alternativeRadio).toBeChecked();
  await expect(alternativeRadio).toBeFocused();
  await expect(page.getByText('14 km', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('25 min', { exact: true }).first()).toBeVisible();
  await expect(mapCanvas).toHaveAttribute(
    'data-route-alternative-id',
    'alternative-1',
  );
  expect(routeCostRequests).toBe(1);
});

test('map style failure does not break route results or form use', async ({
  page,
}) => {
  await page.route('**/map-style.json', async (route) => {
    await route.fulfill({ status: 500, body: 'style unavailable' });
  });

  await page.goto('/');
  await calculateCatalogRoute(page);

  await expect(page.getByText('17,5 km', { exact: true }).last()).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'map could not be displayed',
  );
  await expect(
    page.getByRole('button', { name: 'Calculate route' }),
  ).toBeEnabled();
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

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(
        'document.documentElement.scrollWidth <= window.innerWidth',
      ),
    )
    .toBe(true);
}
