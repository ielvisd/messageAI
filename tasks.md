<!-- 8dad704a-ce91-4c50-992f-a86a6fdf85d8 c5e6b82f-7449-484b-9527-c815c62df4a0 -->
# MessageAI Feature-Based PR Task List

## Phase 1: MVP Foundation (Day 1)

### PR1: feat/project-setup

- Initialize Quasar v2 project with Vue 3 Composition API
- Configure Capacitor for iOS/Android modes
- Set up Supabase client in `src/boot/supabase.js`
- Configure ESLint and Vitest
- Add dev dependencies: vite-plugin-vue-mcp
- Configure `.cursor/mcp.json` with GitMCP Quasar server
- Create basic routing structure
- **Tests**: Verify build passes, Supabase connection test

### PR2: feat/auth

- Create reactive global state in `src/state/auth.js` (user, isAuthenticated)
- Implement signIn/signUp/signOut functions with Supabase auth
- Create auth pages: Login.vue, Signup.vue with QForm/QInput
- Create profiles table with RLS policies
- Add profile upsert on signup (name, avatar via Camera plugin)
- Auth guard for routes
- **Tests**: Auth flow unit tests, profile creation tests

### PR3: feat/chat-list

- Create chats table schema with RLS
- Build ChatList.vue with QList/QItem
- Display chat previews (last message, QBadge unread count, QAvatar)
- Implement chat creation/selection
- Basic navigation to chat view
- **Tests**: Chat list rendering, selection logic

### PR4: feat/messaging-core

- Create messages table with timestamp, status fields
- Build `composables/useChat.js` with messages ref, send function
- Create ChatView.vue with QChatMessage bubbles
- Implement QInput send functionality
- Add Luxon timestamps with TZ awareness
- Optimistic UI: messages show as 'sending' → 'sent'
- **Tests**: useChat composable tests, optimistic send flow

### PR5: feat/realtime-sync

- Configure Supabase Realtime channels in useChat
- Subscribe to postgres_changes for messages table
- Handle message updates/inserts in real-time
- Add subscription cleanup on unmount
- **Tests**: Mock realtime events, verify message updates

### PR6: feat/offline-handling

- Integrate Capacitor Network plugin
- Add online/offline reactive state to useChat
- Display QBanner when offline: "Offline - queuing"
- Queue messages when offline, sync on reconnect
- Persist messages to local Capacitor Storage
- **Tests**: Network status changes, offline queue behavior

### PR7: feat/status-indicators

- Add online/offline status to profiles table
- Create presence system with Supabase Realtime presence
- Display status indicators in chat list and chat view
- Update user presence on app lifecycle events
- **Tests**: Presence state updates, indicator rendering

### PR8: feat/read-receipts

- Add read_at field to messages table
- Implement read receipt tracking logic
- Display read status in QChatMessage (checkmarks)
- Update receipts on message view
- **Tests**: Receipt update logic, UI state tests

### PR9: feat/basic-groups

- Create groups and group_members tables
- Build group creation QDialog with member selection (QChip)
- Extend useChat to handle group chats
- Add sender name attribution in QChatMessage for groups
- Group chat list integration
- **Tests**: Group creation, multi-user message display

### PR10: feat/push-notifications

- Configure FCM in Capacitor
- Add push_tokens field to profiles table
- Implement token registration with Capacitor PushNotifications
- Create Supabase Edge Function: `/push/send` (DB webhook → FCM API)
- Handle foreground notifications
- **Tests**: Token storage, notification trigger (mock FCM)

## Phase 2: Core Extensions (Days 2-3)

### PR11: feat/media-sharing

- Configure Supabase Storage bucket for images
- Integrate Capacitor Camera plugin
- Add media_url field to messages table
- Implement image upload/download in useChat
- Display images in QChatMessage with preview
- Add image compression/optimization
- **Tests**: Upload flow, image rendering, storage permissions

### PR12: feat/app-lifecycle

- Integrate Capacitor App plugin
- Handle app state changes (background/foreground/quit)
- Queue messages during background state
- Sync queued messages on app resume
- Handle notification taps to open specific chats
- **Tests**: Lifecycle state transitions, message queue persistence

## Phase 3: AI Foundation (Day 4)

### PR13: feat/ai-base-setup

- Install Vercel AI SDK for Vue (@ai-sdk/vue, @ai-sdk/openai)
- Create Supabase Edge Function: `/ai/execute`
- Set up pgvector extension for embeddings
- Create embeddings table for RAG context
- Build `composables/useAIChat.js` with streaming support
- Configure API proxy to Edge Function
- Add embedding generation for messages (background job)
- **Tests**: Edge function connectivity, embedding storage

## Phase 4: AI Features (Days 4-6)

### PR14: feat/ai-thread-summarization

- Create inline QMenu on QChatMessage long-press
- Add "Summarize" option in QMenu
- Implement RAG query for thread context
- Create Edge Function handler for summarization prompt
- Display streaming summary in QDialog
- Add gym-specific context to prompts
- **Tests**: Mock LLM responses, summary generation logic

### PR15: feat/ai-action-extraction

- Add tasks table (action items)
- Create tool in useAIChat: extractActions
- Implement action item detection in threads
- Build TaskList.vue with QList (extracted actions)
- Auto-link tasks to messages/users
- Add task completion tracking
- **Tests**: Action extraction accuracy, task creation flow

### PR16: feat/ai-smart-search

- Create SearchPage.vue with semantic search UI
- Implement RAG-based search across all messages
- Add TZ-aware date filtering
- Build Edge Function: `/ai/search` with similarity queries
- Display results grouped by chat with context
- **Tests**: Mock search queries, result ranking

### PR17: feat/ai-priority-detection

- Add priority field to messages table
- Create Edge Function handler for urgency detection
- Implement visual indicators (glow effect) for urgent messages
- Add priority filter in chat list
- Configure keywords for gym-specific urgency
- **Tests**: Priority classification logic, UI highlighting

### PR18: feat/ai-decision-tracking

- Create decisions table (decision text, status, chat_id)
- Build decision extraction logic in Edge Function
- Create DecisionTracker.vue component (QTimeline)
- Display pending/resolved decisions per chat
- Add decision status updates
- **Tests**: Decision extraction, status tracking

### PR19: feat/ai-proactive-assistant

- Create dedicated AIAssistant.vue page with QChatMessage
- Implement watcher on messages ref for keywords (schedule, class, conflict)
- Build Edge Function: `/ai/proactive` with conflict detection
- Generate QChip suggestions ("Suggest 7pm swap?")
- Add tool calling for calendar event creation
- Implement suggestion approval/dismiss flow
- **Tests**: Keyword detection, suggestion generation, tool execution

## Phase 5: Polish & Deployment (Day 7)

### PR20: chore/comprehensive-testing

- Achieve >80% coverage for all composables
- Add integration tests for critical flows
- Test all Capacitor plugins on actual devices
- Performance testing (<500ms message delivery, <2s AI)
- Fix any discovered bugs
- **Tests**: Full test suite execution, coverage report

### PR21: chore/production-polish

- UI/UX refinements (modern, beautiful design)
- Add loading states and error handling
- Optimize bundle size
- Add analytics hooks (optional)
- Final ESLint pass on all files
- Documentation: README with setup instructions
- **Tests**: Build verification, lint checks pass

### PR22: feat/deployment-config

- Configure iOS build in Xcode (TestFlight, APNs cert)
- Configure Android build in Android Studio (APK, google-services.json)
- Set up Supabase production environment
- Run `supabase db push` for schema migration
- Create deployment documentation
- Build and test APK/IPA files
- **Tests**: Production build success, app installation tests

## Notes

- Each PR includes its own unit tests and linting
- Run `quasar lint` pre-commit for all PRs
- All composables use Composition API (no Pinia)
- Reference vite-plugin-vue-mcp and GitMCP Quasar in prompts
- Dependencies between PRs: PR1 must complete first, then auth/data PRs can proceed in parallel where logical

### To-dos

- [ ] PR1: feat/project-setup - Initialize Quasar, Capacitor, Supabase, dev tools
- [ ] PR2: feat/auth - Authentication system with profiles
- [ ] PR3: feat/chat-list - Chat list UI and navigation
- [ ] PR4: feat/messaging-core - Core messaging with optimistic UI
- [ ] PR5: feat/realtime-sync - Supabase Realtime integration
- [ ] PR6: feat/offline-handling - Offline persistence and sync
- [ ] PR7: feat/status-indicators - Online/offline status system
- [ ] PR8: feat/read-receipts - Read receipt tracking
- [ ] PR9: feat/basic-groups - Group chat functionality
- [ ] PR10: feat/push-notifications - FCM push notification system
- [ ] PR11: feat/media-sharing - Image upload and sharing
- [ ] PR12: feat/app-lifecycle - Background/foreground handling
- [ ] PR13: feat/ai-base-setup - Vercel AI SDK, Edge Functions, pgvector RAG
- [ ] PR14: feat/ai-thread-summarization - Thread summary with RAG
- [ ] PR15: feat/ai-action-extraction - Action item extraction and tracking
- [ ] PR16: feat/ai-smart-search - Semantic search across chats
- [ ] PR17: feat/ai-priority-detection - Urgent message detection
- [ ] PR18: feat/ai-decision-tracking - Decision extraction and status
- [ ] PR19: feat/ai-proactive-assistant - Proactive scheduling suggestions
- [ ] PR20: chore/comprehensive-testing - Full test coverage and QA
- [ ] PR21: chore/production-polish - UI refinements and optimization
- [ ] PR22: feat/deployment-config - iOS/Android builds and production deployment
