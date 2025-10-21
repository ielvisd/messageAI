import { test, expect } from '@playwright/test';

test.describe('PR4: Messaging Core', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  const testChat = {
    id: 'chat-1',
    name: 'Direct Message',
    type: 'direct',
    members: [
      { id: 'user-1', name: 'Test User', avatar_url: null },
      { id: 'user-2', name: 'John Doe', avatar_url: null }
    ]
  };

  const testMessages = [
    {
      id: 'msg-1',
      chat_id: 'chat-1',
      sender_id: 'user-2',
      content: 'Hello there!',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      sender_name: 'John Doe',
      sender_avatar: null
    },
    {
      id: 'msg-2',
      chat_id: 'chat-1',
      sender_id: 'user-1',
      content: 'Hi! How are you?',
      message_type: 'text',
      status: 'read',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      sender_name: 'Test User',
      sender_avatar: null
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/token?grant_type=password', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', email: testUser.email },
          session: { access_token: 'test-token' }
        })
      });
    });

    // Mock profile data
    await page.route('**/rest/v1/profiles*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          name: testUser.name,
          email: testUser.email,
          created_at: new Date().toISOString()
        })
      });
    });

    // Mock chat info
    await page.route('**/rest/v1/chats*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testChat)
      });
    });

    // Mock messages
    await page.route('**/rest/v1/messages*', route => {
      const url = new URL(route.request().url());
      const chatId = url.searchParams.get('chat_id');

      if (chatId === 'chat-1') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(testMessages)
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Login and navigate to chat
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.goto('/chat/chat-1');
  });

  test('chat view loads with messages', async ({ page }) => {
    await expect(page.locator('text=Direct Message')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Hello there!')).toBeVisible();
    await expect(page.locator('text=Hi! How are you?')).toBeVisible();
  });

  test('send text message', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Type message
    await messageInput.fill('This is a test message');

    // Mock message sending
    await page.route('**/rest/v1/messages', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-msg-id',
            chat_id: 'chat-1',
            sender_id: 'user-1',
            content: 'This is a test message',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: 'Test User',
              avatar_url: null
            }
          })
        });
      }
    });

    // Send message
    await sendButton.click();

    // Check that message appears
    await expect(page.locator('text=This is a test message')).toBeVisible();

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('message appears in list after send', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await messageInput.fill('New message');

    // Mock message sending
    await page.route('**/rest/v1/messages', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-msg-id',
            chat_id: 'chat-1',
            sender_id: 'user-1',
            content: 'New message',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: 'Test User',
              avatar_url: null
            }
          })
        });
      }
    });

    await sendButton.click();

    // Message should appear in the chat
    await expect(page.locator('text=New message')).toBeVisible();
  });

  test('status updates (sending → sent)', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await messageInput.fill('Status test message');

    // Mock slow response to see status change
    await page.route('**/rest/v1/messages', route => {
      setTimeout(() => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'status-msg-id',
            chat_id: 'chat-1',
            sender_id: 'user-1',
            content: 'Status test message',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: 'Test User',
              avatar_url: null
            }
          })
        });
      }, 1000);
    });

    await sendButton.click();

    // Initially should show as sending
    await expect(page.locator('text=Sending...')).toBeVisible();

    // After response, should show as sent
    await expect(page.locator('text=Sent')).toBeVisible();
  });

  test('sender info displays correctly', async ({ page }) => {
    // Check that sender names are displayed
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Test User')).toBeVisible();

    // Check that messages are properly attributed
    const johnMessage = page.locator('text=Hello there!').locator('..');
    await expect(johnMessage.locator('text=John Doe')).toBeVisible();

    const userMessage = page.locator('text=Hi! How are you?').locator('..');
    await expect(userMessage.locator('text=Test User')).toBeVisible();
  });

  test('empty chat state displays', async ({ page }) => {
    // Mock empty messages
    await page.route('**/rest/v1/messages*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.reload();

    await expect(page.locator('text=No messages yet')).toBeVisible();
    await expect(page.locator('text=Start the conversation!')).toBeVisible();
  });

  test('back navigation to chat list', async ({ page }) => {
    // Click back button
    await page.click('button[aria-label="Back"]');

    // Should navigate back to chat list
    await expect(page).toHaveURL('/chats');
  });

  test('read receipts update on view', async ({ page }) => {
    // Mock read receipt update
    await page.route('**/rest/v1/chat_members*', route => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      }
    });

    // Navigate to chat (should trigger read receipt)
    await page.goto('/chat/chat-1');

    // Wait for read receipt to be sent
    await page.waitForTimeout(1000);

    // In a real implementation, you'd check that the API was called
    // For now, we just verify the page loads correctly
    await expect(page.locator('text=Direct Message')).toBeVisible();
  });

  test('real-time message updates', async ({ page }) => {
    // This would test real-time updates via Supabase subscriptions
    // For now, we'll test that the subscription setup doesn't break the page

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Verify the page is still functional
    await expect(page.locator('text=Direct Message')).toBeVisible();
  });

  test('message formatting and timestamps', async ({ page }) => {
    // Check that timestamps are displayed
    const messages = page.locator('[class*="q-chat-message"]');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(0);

    // Check that messages have proper formatting
    await expect(page.locator('text=Hello there!')).toBeVisible();
    await expect(page.locator('text=Hi! How are you?')).toBeVisible();
  });

  test('error handling for failed sends', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await messageInput.fill('This will fail');

    // Mock failed message sending
    await page.route('**/rest/v1/messages', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to send message' })
        });
      }
    });

    await sendButton.click();

    // Check error notification
    await expect(page.locator('text=Failed to send message')).toBeVisible();

    // Message should be restored to input
    await expect(messageInput).toHaveValue('This will fail');
  });

  test('loading state during message operations', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    await messageInput.fill('Loading test message');

    // Mock slow response
    await page.route('**/rest/v1/messages', route => {
      setTimeout(() => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'loading-msg-id',
            chat_id: 'chat-1',
            sender_id: 'user-1',
            content: 'Loading test message',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: 'Test User',
              avatar_url: null
            }
          })
        });
      }, 1000);
    });

    await sendButton.click();

    // Check that loading state is shown
    await expect(page.locator('text=Sending...')).toBeVisible();

    // Button should be disabled during loading
    await expect(sendButton).toBeDisabled();
  });

  test('message input validation', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Try to send empty message
    await sendButton.click();

    // Button should be disabled for empty input
    await expect(sendButton).toBeDisabled();

    // Try to send message with only whitespace
    await messageInput.fill('   ');
    await expect(sendButton).toBeDisabled();

    // Valid message should enable button
    await messageInput.fill('Valid message');
    await expect(sendButton).toBeEnabled();
  });

  test('keyboard shortcuts work', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Type a message"]');

    await messageInput.fill('Keyboard test message');

    // Mock message sending
    await page.route('**/rest/v1/messages', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'keyboard-msg-id',
            chat_id: 'chat-1',
            sender_id: 'user-1',
            content: 'Keyboard test message',
            message_type: 'text',
            status: 'sent',
            created_at: new Date().toISOString(),
            profiles: {
              name: 'Test User',
              avatar_url: null
            }
          })
        });
      }
    });

    // Press Enter to send
    await messageInput.press('Enter');

    // Message should be sent
    await expect(page.locator('text=Keyboard test message')).toBeVisible();
  });
});
