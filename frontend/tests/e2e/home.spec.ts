import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(
    'Apex Commerce | Production Microservices Storefront',
  );
});
