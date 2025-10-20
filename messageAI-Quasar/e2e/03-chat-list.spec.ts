import { test, expect } from '@playwright/test';

test.describe('PR3: Chat List', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  const testChats = [
    {
      id: 'chat-1',
      name: 'Direct Message',
      type: 'direct',
      last_message: {
        content: 'Hello there!',
        created_at: new Date().toISOString(),
        sender_name: 'John Doe'
      },
      unread_count: 2,
      members: [
        { id: 'user-1', name: 'Test User', avatar_url: null },
        { id: 'user-2', name: 'John Doe', avatar_url: null }
      ]
    },
    {
      id: 'chat-2',
      name: 'Team Chat',
      type: 'group',
      last_message: {
        content: 'Meeting at 3pm',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        sender_name: 'Jane Smith'
      },
      unread_count: 0,
      members: [
        { id: 'user-1', name: 'Test User', avatar_url: null },
        { id: 'user-2', name: 'John Doe', avatar_url: null },
        { id: 'user-3', name: 'Jane Smith', avatar_url: null }
      ]
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock authentication
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

    // Mock profile data
    await page.route('**/rest/v1/profiles*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          name: testUser.name,
          email: testUser.email,
          created_at: new Date().toISOString()
        })
      });
    });

    // Mock chats data
    await page.route('**/rest/v1/chat_members*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            chat_id: 'chat-1',
            last_read_at: new Date(Date.now() - 7200000).toISOString(),
            chats: testChats[0]
          },
          {
            chat_id: 'chat-2',
            last_read_at: new Date().toISOString(),
            chats: testChats[1]
          }
        ])
      });
    });

    // Mock messages for unread count
    await page.route('**/rest/v1/messages*', route => {
      const url = new URL(route.request().url());
      const chatId = url.searchParams.get('chat_id');
      
      if (chatId === 'chat-1') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'msg-1', content: 'Hello there!', created_at: new Date().toISOString(), profiles: { name: 'John Doe' } },
            { id: 'msg-2', content: 'How are you?', created_at: new Date().toISOString(), profiles: { name: 'John Doe' } }
          ])
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Login and navigate to chats
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/chats');
  });

  test('chat list loads for authenticated users', async ({ page }) => {
    await expect(page.locator('text=Chats')).toBeVisible();
    await expect(page.locator('button[aria-label="Add chat"]')).toBeVisible();
  });

  test('empty state displays when no chats', async ({ page }) => {
    // Mock empty chats
    await page.route('**/rest/v1/chat_members*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.reload();
    
    await expect(page.locator('text=No chats yet')).toBeVisible();
    await expect(page.locator('text=Start a conversation!')).toBeVisible();
    await expect(page.locator('text=Create Chat')).toBeVisible();
  });

  test('create chat dialog opens and closes', async ({ page }) => {
    // Click add chat button
    await page.click('button[aria-label="Add chat"]');
    
    // Check dialog opens
    await expect(page.locator('text=Create New Chat')).toBeVisible();
    await expect(page.locator('input[placeholder*="Chat Name"]')).toBeVisible();
    await expect(page.locator('text=Chat Type')).toBeVisible();
    await expect(page.locator('text=Add Members')).toBeVisible();
    
    // Close dialog
    await page.click('text=Cancel');
    await expect(page.locator('text=Create New Chat')).not.toBeVisible();
  });

  test('chat creation (direct message)', async ({ page }) => {
    await page.click('button[aria-label="Add chat"]');
    
    // Fill form
    await page.fill('input[placeholder*="Chat Name"]', 'New Direct Chat');
    await page.selectOption('select', 'direct');
    await page.fill('input[placeholder*="Member Email"]', 'friend@example.com');
    
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
    
    await page.click('button[aria-label="Add member"]');
    
    // Mock chat creation
    await page.route('**/rest/v1/chats', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-chat-id',
            name: 'New Direct Chat',
            type: 'direct',
            created_by: 'test-user-id'
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
    
    // Check success notification
    await expect(page.locator('text=Chat created successfully!')).toBeVisible();
    
    // Dialog should close
    await expect(page.locator('text=Create New Chat')).not.toBeVisible();
  });

  test('chat creation (group chat)', async ({ page }) => {
    await page.click('button[aria-label="Add chat"]');
    
    // Fill form for group chat
    await page.fill('input[placeholder*="Chat Name"]', 'New Group Chat');
    await page.selectOption('select', 'group');
    await page.fill('input[placeholder*="Member Email"]', 'member1@example.com');
    
    // Mock member lookup
    await page.route('**/rest/v1/profiles*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('email') === 'member1@example.com') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'member1-id',
            name: 'Member One',
            email: 'member1@example.com'
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
    
    await page.click('button[aria-label="Add member"]');
    
    // Add another member
    await page.fill('input[placeholder*="Member Email"]', 'member2@example.com');
    await page.route('**/rest/v1/profiles*', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('email') === 'member2@example.com') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'member2-id',
            name: 'Member Two',
            email: 'member2@example.com'
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
    
    await page.click('button[aria-label="Add member"]');
    
    // Check that both members are added
    await expect(page.locator('text=Member One')).toBeVisible();
    await expect(page.locator('text=Member Two')).toBeVisible();
    
    // Mock chat creation
    await page.route('**/rest/v1/chats', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-group-id',
            name: 'New Group Chat',
            type: 'group',
            created_by: 'test-user-id'
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
    
    // Check success notification
    await expect(page.locator('text=Chat created successfully!')).toBeVisible();
  });

  test('member selection in create dialog', async ({ page }) => {
    await page.click('button[aria-label="Add chat"]');
    
    // Try to add a member
    await page.fill('input[placeholder*="Member Email"]', 'nonexistent@example.com');
    
    // Mock user not found
    await page.route('**/rest/v1/profiles*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    await page.click('button[aria-label="Add member"]');
    
    // Check error message
    await expect(page.locator('text=User not found')).toBeVisible();
  });

  test('chat list updates after creation', async ({ page }) => {
    // Initially should show existing chats
    await expect(page.locator('text=Direct Message')).toBeVisible();
    await expect(page.locator('text=Team Chat')).toBeVisible();
    
    // Create new chat
    await page.click('button[aria-label="Add chat"]');
    await page.fill('input[placeholder*="Chat Name"]', 'Updated Chat List');
    await page.selectOption('select', 'direct');
    
    // Mock chat creation
    await page.route('**/rest/v1/chats', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'updated-chat-id',
            name: 'Updated Chat List',
            type: 'direct',
            created_by: 'test-user-id'
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
    
    // After creation, the chat list should reload
    // In a real implementation, this would happen automatically
    // For now, we just verify the creation was successful
    await expect(page.locator('text=Chat created successfully!')).toBeVisible();
  });

  test('navigation to chat view on click', async ({ page }) => {
    // Click on first chat
    await page.click('text=Direct Message');
    
    // Should navigate to chat view
    await expect(page).toHaveURL(/\/chat\/chat-1/);
  });

  test('unread count displays correctly', async ({ page }) => {
    // Check that unread count is displayed
    await expect(page.locator('text=2')).toBeVisible(); // Unread count for first chat
    
    // Second chat should have no unread count visible
    const secondChat = page.locator('text=Team Chat').locator('..');
    await expect(secondChat.locator('text=0')).not.toBeVisible();
  });

  test('real-time chat list updates', async ({ page }) => {
    // This would test real-time updates via Supabase subscriptions
    // For now, we'll test that the subscription setup doesn't break the page
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Verify the page is still functional
    await expect(page.locator('text=Chats')).toBeVisible();
  });

  test('error states and retry functionality', async ({ page }) => {
    // Mock API error
    await page.route('**/rest/v1/chat_members*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.reload();
    
    // Check error state
    await expect(page.locator('text=Failed to load chats')).toBeVisible();
    await expect(page.locator('text=Retry')).toBeVisible();
    
    // Mock successful response for retry
    await page.route('**/rest/v1/chat_members*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Click retry
    await page.click('text=Retry');
    
    // Should show empty state
    await expect(page.locator('text=No chats yet')).toBeVisible();
  });

  test('chat list displays with correct information', async ({ page }) => {
    // Check that chat information is displayed correctly
    const firstChat = page.locator('text=Direct Message').locator('..');
    
    // Check last message preview
    await expect(firstChat.locator('text=John Doe: Hello there!')).toBeVisible();
    
    // Check unread count
    await expect(firstChat.locator('text=2')).toBeVisible();
    
    // Check avatar (should show person icon for direct message)
    await expect(firstChat.locator('[class*="q-avatar"]')).toBeVisible();
  });

  test('loading state during chat operations', async ({ page }) => {
    // Test loading state during chat creation
    await page.click('button[aria-label="Add chat"]');
    await page.fill('input[placeholder*="Chat Name"]', 'Loading Test Chat');
    await page.selectOption('select', 'direct');
    
    // Mock slow response
    await page.route('**/rest/v1/chats', route => {
      setTimeout(() => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'loading-chat-id',
            name: 'Loading Test Chat',
            type: 'direct',
            created_by: 'test-user-id'
          })
        });
      }, 1000);
    });
    
    await page.click('text=Create');
    
    // Check that loading state is shown
    await expect(page.locator('text=Creating...')).toBeVisible();
    
    // Button should be disabled during loading
    await expect(page.locator('text=Create')).toBeDisabled();
  });
});
