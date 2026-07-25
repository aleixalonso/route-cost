import { expect, test } from '@playwright/test';

test('home page reports API availability', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'RouteCost' })).toBeVisible();
  await expect(page.getByText('API available: route-cost-api')).toBeVisible();
});

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/unknown');

  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible();
});
