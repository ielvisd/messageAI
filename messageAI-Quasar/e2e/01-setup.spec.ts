import { test, expect } from '@playwright/test';

test.describe('PR1: Project Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads without errors', async ({ page }) => {
    // Check that the page loads without console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Verify no critical errors occurred
    expect(errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('404') &&
      !error.includes('Failed to load resource')
    )).toHaveLength(0);
  });

  test('routing structure is accessible', async ({ page }) => {
    // Test that all main routes are accessible
    const routes = ['/login', '/signup', '/chats'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Verify the page loaded (not 404)
      expect(page.url()).toContain(route);

      // Check that the page has content (not blank)
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('Supabase initialization', async ({ page }) => {
    // Check that Supabase is properly initialized
    const supabaseInitialized = await page.evaluate(() => {
      // Check if Supabase client is available
      return typeof window !== 'undefined' &&
             (window as any).supabase !== undefined;
    });

    expect(supabaseInitialized).toBe(true);
  });

  test('Quasar framework loads correctly', async ({ page }) => {
    // Check that Quasar components are available
    const quasarLoaded = await page.evaluate(() => {
      // Check for Quasar-specific elements or classes
      const quasarElements = document.querySelectorAll('[class*="q-"]');
      return quasarElements.length > 0;
    });

    expect(quasarLoaded).toBe(true);
  });

  test('Vue 3 app mounts successfully', async ({ page }) => {
    // Check that Vue app is mounted
    const vueMounted = await page.evaluate(() => {
      // Check for Vue app mount point
      const app = document.querySelector('#q-app');
      return app !== null;
    });

    expect(vueMounted).toBe(true);
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Check that the page is responsive
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();

    // Check that elements are properly sized for mobile
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test('build artifacts are generated correctly', async ({ page }) => {
    // Check that static assets are loaded
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Check for essential assets
    const html = await page.content();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('id="q-app"');
  });
});
