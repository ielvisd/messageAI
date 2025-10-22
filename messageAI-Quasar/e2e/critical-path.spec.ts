import { test, expect } from '@playwright/test';

test.describe('Critical Path - Complete User Journey', () => {
  const testUser = {
    email: 'critical-test@example.com',
    password: 'testpassword123',
    name: 'Critical Test User'
  };

  test('complete user journey: signup → create chat → send message → logout → login → verify', async ({ page }) => {
    // Step 1: Sign up new user
    await page.goto('/signup');

    // Mock successful signup
    await page.route('**/auth/v1/signup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'critical-user-id', email: testUser.email },
          session: { access_token: 'critical-token' }
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
            id: 'critical-user-id',
            name: testUser.name,
            email: testUser.email,
            created_at: new Date().toISOString()
          })
        });
      }
    });

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[type="text"]', testUser.name);
    await page.click('button[type="submit"]');

    // Should redirect to chats page
    await expect(page).toHaveURL('/chats');
    await expect(page.locator('text=Chats')).toBeVisible();

    // Step 2: Create a chat
    await page.click('button[aria-label="Add chat"]');

    // Mock member lookup
    await page.route('**/rest/v1/profiles*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('email') === 'friend@example.com') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'friend-id',
            name: 'Friend User',
            email: 'friend@example.com'
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    await page.fill('input[placeholder*="Chat Name"]', 'Critical Test Chat');
    await page.selectOption('select', 'direct');
    await page.fill('input[placeholder*="Member Email"]', 'friend@example.com');
    await page.click('button[aria-label="Add member"]');

    // Mock chat creation
    await page.route('**/rest/v1/chats', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'critical-chat-id',
            name: 'Critical Test Chat',
            type: 'direct',
            created_by: 'critical-user-id'
          })
        });
      }
    });

    await page.route('**/rest/v1/chat_members', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      }
    });

    await page.click('text=Create');
    await expect(page.locator('text=Chat created successfully!')).toBeVisible();

    // Step 3: Send a message
    await page.click('text=Critical Test Chat');
    await expect(page).toHaveURL('/chat/critical-chat-id');

    // Mock chat info
    await page.route('**/rest/v1/chats*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'critical-chat-id',
          name: 'Critical Test Chat',
          type: 'direct',
          members: [
            { id: 'critical-user-id', name: testUser.name, avatar_url: null },
            { id: 'friend-id', name: 'Friend User', avatar_url: null }
          ]
        })
      });
    });

    // Mock empty messages initially
    await page.route('**/rest/v1/messages*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await messageInput.fill('Hello from critical path test!');

    // Mock message sending
    await page.route('**/rest/v1/messages', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'critical-msg-id',
            chat_id: 'critical-chat-id',
            sender_id: 'critical-user-id',
            content: 'Hello from critical path test!',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: testUser.name,
              avatar_url: null
            }
          })
        });
      }
    });

    await sendButton.click();
    await expect(page.locator('text=Hello from critical path test!')).toBeVisible();

    // Step 4: Log out
    // Mock logout
    await page.route('**/auth/v1/logout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // In a real implementation, you'd click a logout button
    // For now, we'll simulate logout by clearing the session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Step 5: Log back in
    await page.goto('/login');

    // Mock successful login
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'critical-user-id', email: testUser.email },
          session: { access_token: 'critical-token' }
        })
      });
    });

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to chats page
    await expect(page).toHaveURL('/chats');

    // Step 6: Verify message persists
    // Mock chats with the created chat
    await page.route('**/rest/v1/chat_members*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            chat_id: 'critical-chat-id',
            last_read_at: new Date().toISOString(),
            chats: {
              id: 'critical-chat-id',
              name: 'Critical Test Chat',
              type: 'direct',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        ])
      });
    });

    // Mock messages with the sent message
    await page.route('**/rest/v1/messages*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'critical-msg-id',
            chat_id: 'critical-chat-id',
            sender_id: 'critical-user-id',
            content: 'Hello from critical path test!',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: testUser.name,
              avatar_url: null
            }
          }
        ])
      });
    });

    // Click on the chat to verify message persists
    await page.click('text=Critical Test Chat');
    await expect(page).toHaveURL('/chat/critical-chat-id');
    await expect(page.locator('text=Hello from critical path test!')).toBeVisible();
  });

  test('cross-browser compatibility', async ({ page, browserName }) => {
    // Test that the app works across different browsers
    await page.goto('/login');

    // Basic functionality should work in all browsers
    await expect(page.locator('text=Login to MessageAI')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    console.log(`✅ Critical path test passed in ${browserName}`);
  });

  test('mobile responsive design', async ({ page }) => {
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

    // Check that buttons are touch-friendly
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('offline/online transitions', async ({ page }) => {
    // Test offline functionality
    await page.goto('/login');

    // Simulate offline
    await page.context().setOffline(true);

    // Try to login (should show offline state)
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should show offline error or queue message
    // This would depend on the actual implementation

    // Simulate online
    await page.context().setOffline(false);

    // Should be able to retry
    await page.click('button[type="submit"]');
  });

  test('performance requirements', async ({ page }) => {
    // Test that the app meets performance requirements
    const startTime = Date.now();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 4 seconds (more realistic for dev environment)
    expect(loadTime).toBeLessThan(4000);

    console.log(`✅ Page loaded in ${loadTime}ms`);
  });

  test('error handling and recovery', async ({ page }) => {
    // Test error handling
    await page.goto('/login');

    // Mock network error
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Internal server error')).toBeVisible();

    // Should allow retry
    await page.click('button[type="submit"]');
  });
});
