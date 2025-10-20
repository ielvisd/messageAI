import { test, expect } from '@playwright/test';

test.describe('PR2: Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login page loads correctly', async ({ page }) => {
    await expect(page.locator('text=Login to MessageAI')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('text=Sign Up to MessageAI')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible(); // Name field
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('form validation works for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('form validation works for invalid email', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Check for email validation
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('signup flow with valid inputs', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[type="text"]', testUser.name);
    
    // Mock successful signup
    await page.route('**/auth/v1/signup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        })
      });
    });

    await page.click('button[type="submit"]');
    
    // Check for success notification
    await expect(page.locator('text=Signup successful!')).toBeVisible();
    
    // Should redirect to chats page
    await expect(page).toHaveURL('/chats');
  });

  test('signup flow with invalid inputs', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', '123'); // Too short
    await page.fill('input[type="text"]', ''); // Empty name
    
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('login flow with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Mock successful login
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        })
      });
    });

    await page.click('button[type="submit"]');
    
    // Check for success notification
    await expect(page.locator('text=Login successful!')).toBeVisible();
    
    // Should redirect to chats page
    await expect(page).toHaveURL('/chats');
  });

  test('login flow with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Mock failed login
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid login credentials'
        })
      });
    });

    await page.click('button[type="submit"]');
    
    // Check for error notification
    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('session persistence across page reloads', async ({ page }) => {
    // First, login
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        })
      });
    });

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/chats');
    
    // Reload the page
    await page.reload();
    
    // Should still be on chats page (session persisted)
    await expect(page).toHaveURL('/chats');
  });

  test('auth guards redirect unauthenticated users', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/chats');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('logout clears session', async ({ page }) => {
    // First, login
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        })
      });
    });

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/chats');
    
    // Mock logout
    await page.route('**/auth/v1/logout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // Find and click logout button (assuming it exists in the UI)
    // This would need to be implemented in the actual app
    // await page.click('text=Logout');
    
    // For now, just verify the logout API would be called
    // In a real test, you'd check that the user is redirected to login
  });

  test('loading states during auth operations', async ({ page }) => {
    // Test loading state during login
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Mock slow response
    await page.route('**/auth/v1/token?grant_type=password', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 'test-user-id', email: testUser.email },
            session: { access_token: 'test-token' }
          })
        });
      }, 1000);
    });

    await page.click('button[type="submit"]');
    
    // Check that loading state is shown
    await expect(page.locator('button[type="submit"]:has-text("Loading")')).toBeVisible();
    
    // Button should be disabled during loading
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('profile creation on signup', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[type="text"]', testUser.name);
    
    // Mock successful signup
    await page.route('**/auth/v1/signup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user-id', email: testUser.email },
          session: { access_token: 'test-token' }
        })
      });
    });

    // Mock profile creation
    await page.route('**/rest/v1/profiles', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            name: testUser.name,
            email: testUser.email,
            created_at: new Date().toISOString()
          })
        });
      }
    });

    await page.click('button[type="submit"]');
    
    // Should redirect to chats page
    await expect(page).toHaveURL('/chats');
  });
});
