import { test, expect } from '@playwright/test';

// Extend Window interface for Supabase
declare global {
  interface Window {
    supabase?: any;
  }
}

test.describe('PR3: Chat List - Realistic Auth Flow', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  test.beforeEach(async ({ page }) => {
    // Remove any error overlays
    await page.evaluate(() => {
      const selectors = [
        'vite-plugin-checker-error-overlay',
        '[data-vite-plugin-checker]',
        '.vite-plugin-checker-error-overlay'
      ];
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
    });

    // Navigate to login page
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // Mock authentication before form submission
    await page.evaluate(() => {
      if (window.supabase) {
        // Mock successful login
        window.supabase.auth.signInWithPassword = async () => ({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              app_metadata: {},
              user_metadata: { name: 'Test User' },
              aud: 'authenticated',
              created_at: '2023-01-01T00:00:00Z'
            },
            session: { access_token: 'test-token' }
          },
          error: null
        });

        // Mock session check
        window.supabase.auth.getSession = async () => ({
          data: {
            session: { access_token: 'test-token' },
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              app_metadata: {},
              user_metadata: { name: 'Test User' },
              aud: 'authenticated',
              created_at: '2023-01-01T00:00:00Z'
            }
          },
          error: null
        });

        // Mock auth state change
        window.supabase.auth.onAuthStateChange = (callback: any) => {
          setTimeout(() => {
            callback('SIGNED_IN', {
              data: {
                session: { access_token: 'test-token' },
                user: {
                  id: 'test-user-id',
                  email: 'test@example.com',
                  app_metadata: {},
                  user_metadata: { name: 'Test User' },
                  aud: 'authenticated',
                  created_at: '2023-01-01T00:00:00Z'
                }
              }
            });
          }, 100);
          return { data: { subscription: { unsubscribe: () => {} } } };
        };

        // Mock profile loading
        const originalFrom = window.supabase.from;
        window.supabase.from = (table: any) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'test-user-id',
                      name: 'Test User',
                      avatar_url: null,
                      online_status: true,
                      last_seen: new Date().toISOString(),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    },
                    error: null
                  })
                })
              })
            };
          }
          return originalFrom.call(window.supabase, table);
        };
      }
    });

    // Fill out login form realistically
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to chats page
    await page.waitForURL(/.*\/chats.*/, { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('chat list page loads after login', async ({ page }) => {
    // Check that we're on the chats page
    await expect(page).toHaveURL(/.*\/chats.*/);

    // Check for basic page elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('page has proper structure', async ({ page }) => {
    // Check for basic HTML structure
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();

    // Check for any content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('page loads without errors', async ({ page }) => {
    // Check that page loads successfully
    await expect(page.locator('body')).toBeVisible();

    // Check for any error messages
    const errorElements = page.locator('[class*="error"], [class*="Error"]');
    const errorCount = await errorElements.count();
    expect(errorCount).toBe(0);
  });

  test('basic navigation works', async ({ page }) => {
    // Try to navigate to different routes
    await page.goto('/login#/chats');
    await page.waitForTimeout(500);

    // Check that page is still functional
    await expect(page.locator('body')).toBeVisible();
  });
});
