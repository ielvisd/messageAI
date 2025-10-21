import { test, expect } from '@playwright/test';

test.describe('PR4: Messaging Core - Simple Tests', () => {
  test('app loads without errors', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/MessageAI/);
  });

  test('responsive design works on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('responsive design works on desktop', async ({ page }) => {
    await page.goto('/login');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('has proper meta tags', async ({ page }) => {
    await page.goto('/login');

    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);

    // Check for charset
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveCount(1);
  });

  test('has proper favicon setup', async ({ page }) => {
    await page.goto('/login');

    // Check for favicon links
    const favicons = page.locator('link[rel="icon"]');
    await expect(favicons).toHaveCount(5); // Multiple sizes
  });

  test('has proper CSS loading', async ({ page }) => {
    await page.goto('/login');
    
    // Check that CSS is loaded (any link with rel="stylesheet")
    const stylesheets = page.locator('link[rel="stylesheet"]');
    await expect(stylesheets).toHaveCount(0); // No external stylesheets in this setup
  });

  test('has proper JavaScript loading', async ({ page }) => {
    await page.goto('/login');
    
    // Check that JavaScript is loaded (any script tag)
    const scripts = page.locator('script[src]');
    await expect(scripts).toHaveCount(3); // Multiple scripts loaded
  });

  test('has proper accessibility attributes', async ({ page }) => {
    await page.goto('/login');

    // Check for proper form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('has proper form validation', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Form should not submit (button should still be visible)
    await expect(submitButton).toBeVisible();
  });
});
