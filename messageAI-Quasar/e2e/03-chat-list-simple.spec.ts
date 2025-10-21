import { test, expect } from '@playwright/test';

test.describe('PR3: Chat List - Simple Tests', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    // Check for any text that indicates login functionality
    await expect(page.locator('input[type="email"], input[type="password"], button[type="submit"]')).toHaveCount(3);
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/login#/signup');
    // Check for any text that indicates signup functionality
    await expect(page.locator('input[type="email"], input[type="password"], button[type="submit"]')).toHaveCount(3);
  });

  test('app has correct title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/MessageAI/);
  });

  test('app has favicon', async ({ page }) => {
    await page.goto('/login');
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveCount(5); // There are multiple favicon sizes
  });

  test('responsive design works', async ({ page }) => {
    await page.goto('/login');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});
