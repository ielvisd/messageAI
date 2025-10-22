import { test, expect, type Page } from '@playwright/test'

test.describe('Read Receipts', () => {
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
        rpc: (name: string) => {
          if (name === 'check_existing_chat_history') {
            return Promise.resolve({ data: false })
          }
          if (name === 'mark_messages_as_read') {
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

  test('displays single checkmark for sent messages', async () => {
    // Navigate to chat view
    await page.goto('http://localhost:9000/#/chat/test-chat-1')

    // Mock messages with no read receipts
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSupabase = (window as any).__supabaseMock
      mockSupabase.from = (table: string) => {
        if (table === 'chats') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'test-chat-1',
                    name: 'Test Chat',
                    type: 'direct',
                    chat_members: [
                      {
                        profiles: {
                          id: 'test-user-2',
                          name: 'Other User',
                          avatar_url: null
                        }
                      }
                    ]
                  }
                })
              })
            })
          }
        }
        if (table === 'messages') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: [
                    {
                      id: 'msg-1',
                      chat_id: 'test-chat-1',
                      sender_id: 'test-user-1',
                      content: 'Hello!',
                      message_type: 'text',
                      status: 'sent',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      profiles: {
                        name: 'Test User',
                        avatar_url: null
                      },
                      message_read_receipts: [] // No read receipts
                    }
                  ]
                })
              })
            })
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null })
            })
          })
        }
      }
    })

    await page.reload()

    // Check for single checkmark (done icon)
    await expect(page.locator('[name="done"]').first()).toBeVisible()
    
    // Should NOT have double checkmark
    const doneAll = page.locator('[name="done_all"]')
    await expect(doneAll).not.toBeVisible()
  })

  test('displays double blue checkmark for read messages', async () => {
    await page.goto('http://localhost:9000/#/chat/test-chat-1')

    // Mock messages with read receipts
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSupabase = (window as any).__supabaseMock
      mockSupabase.from = (table: string) => {
        if (table === 'chats') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'test-chat-1',
                    name: 'Test Chat',
                    type: 'direct',
                    chat_members: [
                      {
                        profiles: {
                          id: 'test-user-2',
                          name: 'Other User',
                          avatar_url: null
                        }
                      }
                    ]
                  }
                })
              })
            })
          }
        }
        if (table === 'messages') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: [
                    {
                      id: 'msg-1',
                      chat_id: 'test-chat-1',
                      sender_id: 'test-user-1',
                      content: 'Hello!',
                      message_type: 'text',
                      status: 'read',
                      read_at: new Date().toISOString(),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      profiles: {
                        name: 'Test User',
                        avatar_url: null
                      },
                      message_read_receipts: [
                        {
                          id: 'receipt-1',
                          user_id: 'test-user-2',
                          read_at: new Date().toISOString(),
                          profiles: {
                            name: 'Other User'
                          }
                        }
                      ]
                    }
                  ]
                })
              })
            })
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null })
            })
          })
        }
      }
    })

    await page.reload()

    // Check for double checkmark (done_all icon)
    await expect(page.locator('[name="done_all"]').first()).toBeVisible()
    
    // Should NOT have single checkmark
    const done = page.locator('[name="done"]')
    await expect(done).not.toBeVisible()
  })

  test('shows read count in group chats', async () => {
    await page.goto('http://localhost:9000/#/chat/test-group-1')

    // Mock group chat with multiple read receipts
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSupabase = (window as any).__supabaseMock
      mockSupabase.from = (table: string) => {
        if (table === 'chats') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'test-group-1',
                    name: 'Team Chat',
                    type: 'group',
                    chat_members: [
                      {
                        profiles: {
                          id: 'test-user-2',
                          name: 'Alice',
                          avatar_url: null
                        }
                      },
                      {
                        profiles: {
                          id: 'test-user-3',
                          name: 'Bob',
                          avatar_url: null
                        }
                      }
                    ]
                  }
                })
              })
            })
          }
        }
        if (table === 'messages') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: [
                    {
                      id: 'msg-1',
                      chat_id: 'test-group-1',
                      sender_id: 'test-user-1',
                      content: 'Hello team!',
                      message_type: 'text',
                      status: 'read',
                      read_at: new Date().toISOString(),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      profiles: {
                        name: 'Test User',
                        avatar_url: null
                      },
                      message_read_receipts: [
                        {
                          id: 'receipt-1',
                          user_id: 'test-user-2',
                          read_at: new Date().toISOString(),
                          profiles: { name: 'Alice' }
                        },
                        {
                          id: 'receipt-2',
                          user_id: 'test-user-3',
                          read_at: new Date().toISOString(),
                          profiles: { name: 'Bob' }
                        }
                      ]
                    }
                  ]
                })
              })
            })
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null })
            })
          })
        }
      }
    })

    await page.reload()

    // Hover over the double checkmark to see tooltip
    const doneAll = page.locator('[name="done_all"]').first()
    await expect(doneAll).toBeVisible()
    
    // Hover to trigger tooltip
    await doneAll.hover()
    
    // Check tooltip contains read count
    await expect(page.locator('.q-tooltip')).toContainText('Read by 2')
    await expect(page.locator('.q-tooltip')).toContainText('Alice')
    await expect(page.locator('.q-tooltip')).toContainText('Bob')
  })

  test('real-time update: checkmark changes when message is read', async () => {
    await page.goto('http://localhost:9000/#/chat/test-chat-1')

    // Initially mock unread message
    let isRead = false
    
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSupabase = (window as any).__supabaseMock
      
      // Store callback for later trigger
      let readReceiptCallback: ((payload: unknown) => void) | null = null
      
      mockSupabase.channel = () => ({
        on: (event: string, config: unknown, callback: (payload: unknown) => void) => {
          if (typeof config === 'object' && config !== null && 'table' in config) {
            const tableConfig = config as { table: string }
            if (tableConfig.table === 'message_read_receipts') {
              readReceiptCallback = callback
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(window as any).__triggerReadReceipt = () => {
                if (readReceiptCallback) {
                  readReceiptCallback({
                    eventType: 'INSERT',
                    new: {
                      id: 'receipt-1',
                      message_id: 'msg-1',
                      user_id: 'test-user-2',
                      read_at: new Date().toISOString()
                    }
                  })
                }
              }
            }
          }
          return { on: () => ({ subscribe: () => ({}) }) }
        },
        subscribe: () => ({})
      })

      mockSupabase.from = (table: string) => {
        if (table === 'chats') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'test-chat-1',
                    name: 'Test Chat',
                    type: 'direct',
                    chat_members: [
                      {
                        profiles: {
                          id: 'test-user-2',
                          name: 'Other User',
                          avatar_url: null
                        }
                      }
                    ]
                  }
                })
              })
            })
          }
        }
        if (table === 'messages') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: [
                    {
                      id: 'msg-1',
                      chat_id: 'test-chat-1',
                      sender_id: 'test-user-1',
                      content: 'Hello!',
                      message_type: 'text',
                      status: 'sent',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      profiles: {
                        name: 'Test User',
                        avatar_url: null
                      },
                      message_read_receipts: []
                    }
                  ]
                })
              })
            })
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null })
            })
          })
        }
      }
    })

    await page.reload()

    // Initially should show single checkmark
    await expect(page.locator('[name="done"]').first()).toBeVisible()

    // Trigger read receipt
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trigger = (window as any).__triggerReadReceipt
      if (trigger) trigger()
    })

    // Wait a bit for state to update
    await page.waitForTimeout(500)

    // Now should show double checkmark
    await expect(page.locator('[name="done_all"]').first()).toBeVisible()
  })
})

