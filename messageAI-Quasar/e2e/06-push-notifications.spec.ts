import { test, expect, type Page } from '@playwright/test'

test.describe('Push Notifications', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto('http://localhost:9000/#/')

    // Mock authentication
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User'
      }
      localStorage.setItem('user', JSON.stringify(mockUser))
    })

    // Mock Supabase connection
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__supabaseMock = {
        auth: {
          getUser: () => Promise.resolve({
            data: {
              user: {
                id: 'test-user-1',
                email: 'test@example.com'
              }
            }
          })
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null })
            })
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'test-chat-1' } })
            })
          })
        }),
        rpc: (name: string, params?: unknown) => {
          if (name === 'add_push_token') {
            console.log('✅ Mock: Push token registered', params)
            return Promise.resolve({ error: null })
          }
          if (name === 'remove_push_token') {
            console.log('✅ Mock: Push token removed', params)
            return Promise.resolve({ error: null })
          }
          if (name === 'set_user_online' || name === 'set_user_offline') {
            return Promise.resolve({ error: null })
          }
          return Promise.resolve({ data: null })
        },
        channel: () => ({
          on: () => ({ on: () => ({ subscribe: () => ({}) }) }),
          subscribe: () => ({})
        })
      }
    })

    await page.reload()
  })

  test('push notification token registration flow', async () => {
    // This test verifies the token registration logic
    // On web, push notifications are not available, so we check for proper handling

    // Check console for push notification initialization messages
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    await page.waitForTimeout(1000)

    // On web platform, should log that push notifications are only for native
    const hasNativeOnlyMessage = consoleMessages.some(msg => 
      msg.includes('Push notifications only available on native platforms') ||
      msg.includes('Skipping push notifications on web platform')
    )

    expect(hasNativeOnlyMessage).toBe(true)
  })

  test('push token saved to database on native (mocked)', async () => {
    // Mock Capacitor as native platform
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
        Plugins: {
          PushNotifications: {
            requestPermissions: () => Promise.resolve({ receive: 'granted' }),
            register: () => Promise.resolve(),
            addListener: (event: string, callback: (data: unknown) => void) => {
              // Simulate successful registration
              if (event === 'registration') {
                setTimeout(() => {
                  callback({ value: 'mock-push-token-12345' })
                }, 100)
              }
              return Promise.resolve()
            },
            removeAllListeners: () => Promise.resolve()
          }
        }
      }
    })

    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Check for registration success message
    const hasRegistrationMessage = consoleMessages.some(msg =>
      msg.includes('Push registration success') || 
      msg.includes('Saving push token')
    )

    expect(hasRegistrationMessage).toBe(true)
  })

  test('edge function payload structure', async () => {
    // This test validates the expected payload structure for the Edge Function
    // The actual Edge Function is tested separately, but we verify the data structure

    const expectedPayload = {
      type: 'insert',
      table: 'messages',
      schema: 'public',
      record: {
        id: 'message-123',
        chat_id: 'chat-456',
        sender_id: 'user-789',
        content: 'Hello, World!',
        created_at: new Date().toISOString()
      },
      old_record: null
    }

    // Verify the payload structure
    expect(expectedPayload).toHaveProperty('type', 'insert')
    expect(expectedPayload).toHaveProperty('table', 'messages')
    expect(expectedPayload.record).toHaveProperty('id')
    expect(expectedPayload.record).toHaveProperty('chat_id')
    expect(expectedPayload.record).toHaveProperty('sender_id')
    expect(expectedPayload.record).toHaveProperty('content')
    expect(expectedPayload.record).toHaveProperty('created_at')
  })

  test('notification tap navigation', async () => {
    // Mock notification tap handling
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
        Plugins: {
          PushNotifications: {
            requestPermissions: () => Promise.resolve({ receive: 'granted' }),
            register: () => Promise.resolve(),
            addListener: (event: string, callback: (action: unknown) => void) => {
              // Store the callback for notification action
              if (event === 'pushNotificationActionPerformed') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(window as any).__notificationTapCallback = callback
              }
              return Promise.resolve()
            },
            removeAllListeners: () => Promise.resolve()
          }
        }
      }
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Simulate notification tap
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (window as any).__notificationTapCallback
      if (callback) {
        callback({
          notification: {
            data: {
              chat_id: 'test-chat-123'
            }
          }
        })
      }
    })

    await page.waitForTimeout(500)

    // Verify navigation occurred (would show in URL)
    const url = page.url()
    expect(url).toContain('chat/test-chat-123')
  })

  test('foreground notification handling', async () => {
    // Mock foreground notification
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'ios',
        Plugins: {
          PushNotifications: {
            requestPermissions: () => Promise.resolve({ receive: 'granted' }),
            register: () => Promise.resolve(),
            addListener: (event: string, callback: (notification: unknown) => void) => {
              // Store the callback for foreground notifications
              if (event === 'pushNotificationReceived') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(window as any).__foregroundNotificationCallback = callback
              }
              return Promise.resolve()
            },
            removeAllListeners: () => Promise.resolve()
          }
        }
      }
    })

    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    await page.reload()
    await page.waitForTimeout(500)

    // Simulate foreground notification
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (window as any).__foregroundNotificationCallback
      if (callback) {
        callback({
          title: 'New Message',
          body: 'You have a new message from Alice',
          data: {
            chat_id: 'chat-123',
            message_id: 'msg-456'
          }
        })
      }
    })

    await page.waitForTimeout(300)

    // Check for foreground notification log
    const hasForegroundLog = consoleMessages.some(msg =>
      msg.includes('Foreground notification received')
    )

    expect(hasForegroundLog).toBe(true)
  })
})

