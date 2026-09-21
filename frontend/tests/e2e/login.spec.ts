import { test, expect } from '@playwright/test';

test('login model should be visible', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Email Address')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();
});

test('login form validates required fields', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('Email Address')).toBeVisible();
  await page.getByPlaceholder('customer@example.com').fill('john@example.com');
  await page.getByPlaceholder('••••••••').fill('123445');

  await page.locator('form').getByRole('button', { name: 'Sign In' }).click();
  await expect(
    page.getByText('Authentication credentials are invalid or missing.'),
  ).toBeVisible();
});
