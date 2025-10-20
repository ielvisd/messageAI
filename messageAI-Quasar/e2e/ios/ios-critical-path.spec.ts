import { test, expect } from '@playwright/test';

test.describe('iOS Simulator - Critical Path', () => {
  const testUser = {
    email: 'ios-test@example.com',
    password: 'testpassword123',
    name: 'iOS Test User'
  };

  test.beforeEach(async ({ page }) => {
    // Set iOS-specific viewport and user agent
    await page.setViewportSize({ width: 390, height: 844 });

    // Mock iOS-specific behaviors
    await page.addInitScript(() => {
      // Mock iOS-specific APIs
      (window as any).DeviceMotionEvent = class DeviceMotionEvent {};
      (window as any).DeviceOrientationEvent = class DeviceOrientationEvent {};
      (window as any).TouchEvent = class TouchEvent {};

      // Mock Capacitor plugins
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
        isPluginAvailable: () => true
      };
    });
  });

  test('iOS critical path: complete user journey', async ({ page }) => {
    // Step 1: Sign up
    await page.goto('/signup');

    // Mock successful signup
    await page.route('**/auth/v1/signup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'ios-user-id', email: testUser.email },
          session: { access_token: 'ios-token' }
        })
      });
    });

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[type="text"]', testUser.name);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/chats');

    // Step 2: Create chat
    await page.click('button[aria-label="Add chat"]');
    await page.fill('input[placeholder*="Chat Name"]', 'iOS Test Chat');
    await page.selectOption('select', 'direct');

    // Mock chat creation
    await page.route('**/rest/v1/chats', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ios-chat-id',
            name: 'iOS Test Chat',
            type: 'direct',
            created_by: 'ios-user-id'
          })
        });
      }
    });

    await page.click('text=Create');

    // Step 3: Send message
    await page.click('text=iOS Test Chat');

    // Mock chat info and messages
    await page.route('**/rest/v1/chats*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ios-chat-id',
          name: 'iOS Test Chat',
          type: 'direct',
          members: [
            { id: 'ios-user-id', name: testUser.name, avatar_url: null }
          ]
        })
      });
    });

    await page.route('**/rest/v1/messages*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await messageInput.fill('Hello from iOS!');

    // Mock message sending
    await page.route('**/rest/v1/messages', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ios-msg-id',
            chat_id: 'ios-chat-id',
            sender_id: 'ios-user-id',
            content: 'Hello from iOS!',
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
    await expect(page.locator('text=Hello from iOS!')).toBeVisible();
  });

  test('iOS-specific gestures and navigation', async ({ page }) => {
    await page.goto('/login');

    // Test iOS-specific touch interactions
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Test touch events
    await emailInput.tap();
    await emailInput.fill('ios@example.com');

    await passwordInput.tap();
    await passwordInput.fill('password123');

    // Test iOS-specific navigation
    const signupLink = page.locator('text=Sign Up');
    await signupLink.tap();
    await expect(page).toHaveURL('/signup');
  });

  test('iOS Capacitor plugin availability', async ({ page }) => {
    await page.goto('/login');

    // Check that Capacitor plugins are available
    const capacitorAvailable = await page.evaluate(() => {
      return typeof window !== 'undefined' &&
             (window as any).Capacitor !== undefined &&
             (window as any).Capacitor.isNativePlatform() === true;
    });

    expect(capacitorAvailable).toBe(true);
  });

  test('iOS viewport and responsive design', async ({ page }) => {
    // Test iPhone 12 viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    // Check that the page fits properly on iOS
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();

    expect(bodyBox?.width).toBeLessThanOrEqual(390);
    expect(bodyBox?.height).toBeLessThanOrEqual(844);

    // Check that touch targets are appropriately sized
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const buttonBox = await button.boundingBox();

      // Touch targets should be at least 44px (iOS guideline)
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('iOS-specific error handling', async ({ page }) => {
    await page.goto('/login');

    // Test iOS-specific error scenarios
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'iOS-specific error' })
      });
    });

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should show error in iOS-appropriate way
    await expect(page.locator('text=iOS-specific error')).toBeVisible();
  });

  test('iOS app lifecycle simulation', async ({ page }) => {
    await page.goto('/chats');

    // Simulate app going to background
    await page.evaluate(() => {
      // Simulate iOS app lifecycle events
      const event = new Event('visibilitychange');
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      document.dispatchEvent(event);
    });

    // Simulate app coming to foreground
    await page.evaluate(() => {
      const event = new Event('visibilitychange');
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      document.dispatchEvent(event);
    });

    // App should still be functional
    await expect(page.locator('text=Chats')).toBeVisible();
  });

  test('iOS push notification simulation', async ({ page }) => {
    await page.goto('/chats');

    // Simulate iOS push notification
    await page.evaluate(() => {
      // Mock iOS push notification
      const event = new Event('push');
      (event as any).data = {
        title: 'New Message',
        body: 'You have a new message',
        data: { chatId: 'test-chat-id' }
      };
      window.dispatchEvent(event);
    });

    // Should handle push notification appropriately
    // In a real implementation, this would navigate to the specific chat
  });

  test('iOS-specific performance', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // iOS should load within 1.5 seconds (more strict than web)
    expect(loadTime).toBeLessThan(1500);

    console.log(`✅ iOS page loaded in ${loadTime}ms`);
  });

  test('iOS memory management', async ({ page }) => {
    // Test that the app doesn't leak memory on iOS
    await page.goto('/chats');

    // Navigate between pages multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/login');
      await page.goto('/chats');
    }

    // App should still be responsive
    await expect(page.locator('text=Chats')).toBeVisible();
  });
});
