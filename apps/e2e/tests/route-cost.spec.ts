import { expect, type Page, test } from '@playwright/test';

const locationAttribution = { url: 'https://stadiamaps.com/attribution/' };

const e2eLocations = [
  {
    id: 'mock:placa-catalunya',
    name: 'Plaça de Catalunya',
    label: 'Plaça de Catalunya, Barcelona, Catalunya, España',
    formattedAddress: 'Plaça de Catalunya, Barcelona, Catalunya, España',
    coordinate: { latitude: 41.387, longitude: 2.17 },
    type: 'point-of-interest',
    precision: 'point',
    countryCode: 'ES',
    country: 'España',
    region: 'Catalunya',
    locality: 'Barcelona',
    postalCode: '08002',
  },
  {
    id: 'mock:sagrada-familia',
    name: 'Sagrada Família',
    label: 'Sagrada Família, Barcelona, Catalunya, España',
    formattedAddress: 'Carrer de Mallorca, 401, Barcelona, Catalunya, España',
    coordinate: { latitude: 41.4036, longitude: 2.1744 },
    type: 'point-of-interest',
    precision: 'point',
    countryCode: 'ES',
    country: 'España',
    region: 'Catalunya',
    locality: 'Barcelona',
    postalCode: '08013',
  },
] as const;

test.beforeEach(async ({ page }) => {
  await mockLocationSearch(page);
  await mockFuelPriceSuggestion(page);
});
test('catalog route-cost flow works on mobile', async ({ page }) => {
  const routeCostRequests: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/route-cost-estimates')) {
      routeCostRequests.push(request.postDataJSON() as Record<string, unknown>);
    }
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await calculateCatalogRoute(page);

  await expect(page.getByText('17,5 km', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('27 min', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('0,63 L')).toBeVisible();
  await expect(estimatedCostValue(page)).toHaveText(expectedCatalogCost);
  expect(routeCostRequests).toHaveLength(1);
  expect(routeCostRequests[0]).toMatchObject({
    fuelPrice: { amountPerLitre: catalogFuelPricePerLitre, currency: 'EUR' },
  });
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

test('default route characteristics describe the actual returned route', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await calculateCatalogRoute(page);

  await expect(
    routeAlternatives(page).getByRole('radio', { name: /Fastest/ }),
  ).toBeChecked();
  await expect(page.getByText('Includes tolls')).toBeVisible();
  await expect(
    page
      .locator('dt', { hasText: 'Includes tolls' })
      .locator('xpath=following-sibling::dd[1]'),
  ).toHaveText('5 km');
  await expect(page.getByText('Includes motorways')).toBeVisible();
  await expect(
    page
      .locator('dt', { hasText: 'Includes motorways' })
      .locator('xpath=following-sibling::dd[1]'),
  ).toHaveText('5 km');
  await expect(
    page.getByText('No ferries', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('route-map-canvas')).toBeVisible();
});

test('avoid tolls reaches the API and offers a toll-free alternative', async ({
  page,
}) => {
  let routeCostRequest: Record<string, unknown> | null = null;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/route-cost-estimates')) {
      routeCostRequest = request.postDataJSON() as Record<string, unknown>;
    }
  });

  await page.goto('/');
  await calculateCatalogRoute(page);
  await page.getByRole('checkbox', { name: 'Avoid toll roads' }).check();
  await page.getByRole('button', { name: 'Calculate route' }).click();

  await expect(
    page.getByText(
      'You asked to avoid toll roads, but this route still includes 5 km of toll roads.',
    ),
  ).toBeVisible();
  await expect(page.getByText('Includes tolls')).toBeVisible();
  await expect(page.getByRole('radio', { name: /No tolls/ })).toBeVisible();
  expect(routeCostRequest).toMatchObject({
    routePreferences: { avoidTolls: true },
  });
  await expect(page.getByText(/€\s*0/)).toHaveCount(0);
});

test('avoid motorways produces a compliant route without a conflict', async ({
  page,
}) => {
  let routeCostRequest: Record<string, unknown> | null = null;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/route-cost-estimates')) {
      routeCostRequest = request.postDataJSON() as Record<string, unknown>;
    }
  });

  await page.goto('/');
  await calculateCatalogRoute(page);
  await page.getByRole('checkbox', { name: 'Avoid motorways' }).check();
  await page.getByRole('button', { name: 'Calculate route' }).click();

  await expect(page.getByText('No motorways').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(routeCostRequest).toMatchObject({
    routePreferences: { avoidMotorways: true },
  });
});

test('avoid ferries reports the unavoidable ferry conflict', async ({
  page,
}) => {
  let routeCostRequest: Record<string, unknown> | null = null;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/route-cost-estimates')) {
      routeCostRequest = request.postDataJSON() as Record<string, unknown>;
    }
  });

  await page.goto('/');
  await calculateCatalogRoute(page);
  await page.getByRole('checkbox', { name: 'Avoid ferries' }).check();
  await page.getByRole('button', { name: 'Calculate route' }).click();

  await expect(page.getByText('Includes ferries')).toBeVisible();
  await expect(
    page.getByText(
      'You asked to avoid ferries, but this route still requires a ferry.',
    ),
  ).toBeVisible();
  expect(routeCostRequest).toMatchObject({
    routePreferences: { avoidFerries: true },
  });
});

test('shortest priority is included in the route request', async ({ page }) => {
  let routeCostRequest: Record<string, unknown> | null = null;
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/route-cost-estimates')) {
      routeCostRequest = request.postDataJSON() as Record<string, unknown>;
    }
  });

  await page.goto('/');
  await calculateCatalogRoute(page);
  await page.getByRole('radio', { name: 'Shortest' }).check();
  await page.getByRole('button', { name: 'Calculate route' }).click();

  await expect(page.getByText('17,5 km', { exact: true }).last()).toBeVisible();
  await expect(
    routeAlternatives(page).getByRole('radio', { name: /Shortest/ }),
  ).toBeChecked();
  expect(routeCostRequest).toMatchObject({
    routePreferences: { priority: 'shortest' },
  });
});

test('changing preferences marks results stale without recalculating', async ({
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

  await expect(page.getByText('17,5 km', { exact: true }).last()).toBeVisible();
  expect(routeCostRequests).toBe(1);

  await page.getByRole('checkbox', { name: 'Avoid toll roads' }).check();

  expect(routeCostRequests).toBe(1);
  await expect(
    page.getByText(
      'Route preferences have changed. Recalculate to update the route.',
    ),
  ).toBeVisible();
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
  const alternativesGroup = routeAlternatives(page);
  await expect(
    alternativesGroup.getByRole('radio', { name: /Fastest/ }),
  ).toBeChecked();
  await expect(mapCanvas).toHaveAttribute(
    'data-route-alternative-id',
    'primary',
  );

  await expect(
    alternativesGroup.getByRole('radio', {
      name: /Fastest\. 27 min · 17,5 km · Tolls · Motorways · No ferries/,
    }),
  ).toBeVisible();
  await expect(
    alternativesGroup.getByRole('radio', {
      name: /Alternative 1\. 29 min · 14 km · No tolls · Motorways · No ferries/,
    }),
  ).toBeVisible();

  const alternativeRadio = alternativesGroup.getByRole('radio', {
    name: /Alternative 1/,
  });
  await alternativeRadio.click();

  await expect(alternativeRadio).toBeChecked();
  await expect(alternativeRadio).toBeFocused();
  await expect(page.getByText('14 km', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('29 min', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('No tolls', { exact: true }).first(),
  ).toBeVisible();
  await expect(mapCanvas).toHaveAttribute(
    'data-route-alternative-id',
    'alternative-1',
  );
  expect(routeCostRequests).toBe(1);
});

test('map style failure does not break route results or form use', async ({
  page,
}) => {
  // The map style URL is environment configuration (local dev may point at a
  // hosted Stadia style while the default is the deterministic local style).
  // Fail whichever JSON style the app is configured to load.
  await page.route('**/*.json', async (route) => {
    const url = route.request().url();

    if (
      url.includes('/map-style.json') ||
      url.includes('alidade_smooth.json')
    ) {
      await route.fulfill({ status: 500, body: 'style unavailable' });
      return;
    }

    await route.fallback();
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

const catalogFuelPricePerLitre = 1.6;
const catalogRouteKilometres = {
  urban: 7.5,
  interurban: 5,
  motorway: 5,
};
const catalogConsumptionLitresPer100Kilometres = {
  urban: 3.7,
  interurban: 3.1,
  motorway: 4.0,
};
const catalogTotalLitres =
  (catalogRouteKilometres.urban *
    catalogConsumptionLitresPer100Kilometres.urban +
    catalogRouteKilometres.interurban *
      catalogConsumptionLitresPer100Kilometres.interurban +
    catalogRouteKilometres.motorway *
      catalogConsumptionLitresPer100Kilometres.motorway) /
  100;
// 0.6325 L * 1.6 €/L = 1.012 € -> "1,01 €".
const expectedCatalogCost = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
}).format(catalogTotalLitres * catalogFuelPricePerLitre);

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
  await page
    .getByRole('spinbutton', { name: 'Fuel price' })
    .fill(String(catalogFuelPricePerLitre));
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

function routeAlternatives(page: Page) {
  return page.getByRole('group', { name: 'Route alternatives' });
}

function estimatedCostValue(page: Page) {
  return page
    .locator('dt', { hasText: 'Estimated cost' })
    .locator('xpath=following-sibling::dd[1]');
}

async function mockLocationSearch(page: Page): Promise<void> {
  await page.route('**/api/v1/locations/autocomplete**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const query = normalizeSearchText(
      requestUrl.searchParams.get('query') ?? '',
    );
    const items = query.includes('empty')
      ? []
      : e2eLocations
          .filter((location) =>
            normalizeSearchText(location.label).includes(query),
          )
          .map((location) => ({
            id: location.id,
            primaryText: location.name,
            secondaryText: location.locality,
            type: location.type,
            precision: location.precision,
          }));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, attribution: locationAttribution }),
    });
  });

  await page.route('**/api/v1/locations/details**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const placeId = requestUrl.searchParams.get('placeId');
    const location = e2eLocations.find((item) => item.id === placeId);

    if (location === undefined) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Location not found.' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ location, attribution: locationAttribution }),
    });
  });
}

async function mockFuelPriceSuggestion(page: Page): Promise<void> {
  // Pin a no-prices answer so a late suggestion cannot overwrite the manual price;
  // that race rendered 1,02 € instead of 1,01 €.
  await page.route('**/api/v1/fuel-price-suggestions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'no-nearby-prices',
        country: { code: 'ES' },
        fuelProduct: 'petrol-95-e5',
        maximumRadiusMetres: 25000,
      }),
    });
  });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
