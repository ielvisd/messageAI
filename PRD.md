# Product Requirements Document (PRD)

## MessageAI - AI-Powered Cross-Platform Messaging App for Remote Teams

### 1. Overview

#### Project Summary

MessageAI is a WhatsApp-inspired cross-platform messaging app built with Quasar (Vue 3) and Supabase, targeting **Remote Team Professionals**, specifically adapted to remote gym owners (e.g., franchise operators coordinating trainers, schedules, and client updates across locations/time zones). This persona fits the "Remote Team Professional" mold: gym owners face thread overload from daily check-ins, missed action items (e.g., "Update equipment inventory"), context switching between client bookings and staff shifts, and TZ coordination for global teams. Pain points are addressed via core messaging infra + tailored AI features.

The app delivers reliable real-time chats (1:1/groups), offline persistence, and AI enhancements like thread summaries and proactive scheduling. Built for a 7-day Gauntlet sprint (start: **Day 1 (Oct 21)**), with MVP non-negotiable by Day 1 (Oct 21): Focus on 1:1 chat, real-time delivery, persistence, optimistic UI, status indicators, timestamps, auth, basic groups, read receipts, and foreground pushes. Deployable on iOS (TestFlight)/Android (APK) via Capacitor.

Notifications use Supabase (DB webhooks trigger Edge Functions) + Firebase Cloud Messaging (FCM) for cross-platform pushes---no Firestore involved.

#### Goals & Success Metrics

- **Business:** Build a production-ready app users (gym owners) would use daily---reliable > flashy. Target: 2+ users chatting seamlessly; AI reduces "thread drowning" by 50% (measured via demo usability).
- **Technical:** 100% MVP pass rate on tests (real-time, offline, lifecycle). All code linted (ESLint), unit-tested (Vitest) per major feature. Performance: <500ms message delivery; <2s AI response.
- **User Persona:** Remote Gym Owner (e.g., "Alex" managing 10 trainers in 3 time zones). Solves: Overloaded DMs from shift updates; auto-extract "Book class for 5pm EST"; proactive "Suggest trainer swap for conflict."
- **Non-Negotiables:** MVP Day 1 gate---flaky sync disqualifies. Holistic build, but phase code gen: MVP first, then extend.

#### Key Assumptions & Risks

- **Users:** iOS/Android focus; web/PWA bonus.
- **AI Costs:** <$5 sprint (GPT-4o-mini, cache responses).
- **Risks:** Capacitor push quirks (mitigate: Test Day 1); LLM code bias (mitigate: Quasar-specific starters below).
- **Out of Scope:** Video calls, end-to-end encryption (use Supabase RLS).

### 2. User Stories

Prioritized by MVP (high) vs. Later (med/low). As a [persona], I want [feature] so that [benefit].

#### MVP (Day 1: High Priority)

- As Alex, I want to sign up/login with email so I can access my profile (name, pic).
- As Alex, I want a chat list so I can start/select 1:1 conversations.
- As Alex, I want to send/receive text messages in real-time so updates appear instantly.
- As Alex, I want messages to persist offline so I see history on reopen.
- As Alex, I want optimistic UI so my sent messages show immediately (pending → sent).
- As Alex, I want online/offline indicators so I know trainer availability.
- As Alex, I want timestamps/read receipts so I track when shifts were acknowledged.
- As Alex, I want basic group chats (3+ users) so I can broadcast class changes.
- As Alex, I want foreground push notifications so I get alerts without backgrounding.

#### Core Extensions (Days 2-3: High)

- As Alex, I want to send/receive images so I share equipment photos.
- As Alex, I want app lifecycle handling so messages queue in background/after quit.

#### AI Features (Days 4-6: Med, Tailored to Gym Owner)

All 5 required + Advanced B (Proactive Assistant: Auto-suggests meeting times, detects scheduling needs---e.g., "Trainer overlap at 6pm? Suggest swap.").

- As Alex, I want thread summarization so I quickly catch up on long shift threads ("Key: 2 cancellations, inventory low").
- As Alex, I want action item extraction so TODOs auto-track ("@Trainer1: Restock by Fri" → Task list).
- As Alex, I want smart search so I find "yoga class bookings" across chats (semantic, TZ-aware).
- As Alex, I want priority message detection so urgent alerts glow ("Emergency: Gym closed---storm!").
- As Alex, I want decision tracking so I follow "New class schedule approved?" status.
- As Alex (Advanced), I want proactive assistant so it suggests "Reschedule 5pm EST class to 7pm UTC for EU trainer?" on conflict detect.

### 3. Tech Stack

- **Framework:** Quasar v2 (Vue 3, Composition API) + Capacitor (iOS/Android). CLI: quasar create, modes: capacitor + pwa.
- **State:** Composition API patterns (reactive globals for app-wide state like auth/offline; composables for feature-specific logic like chat/AI). No Pinia---leverages Vue's native reactivity for lighter footprint.
- **Backend:** Supabase (Postgres tables: profiles, chats, messages, groups, tasks; RLS for privacy; Realtime channels; Edge Functions for AI/push; pgvector for RAG; Storage for pics).
- **AI:** Vercel AI SDK (core integration---equivalent to Nuxt AI Hub: Provides useChat() composable for streaming/chat state, tool calling, and OpenAI support. Wrap in custom Quasar composables like useAIChat() for seamless UI hooks, e.g., in QDialogs. Server-side: Call from Supabase Edge Functions for secure LLM (GPT-4o-mini); client-side: Streaming for responsive AI responses. No direct "Quasar AI Hub," but Vercel SDK + composables mirrors Nuxt's module/composable flow---e.g., handle RAG context retrieval via pgvector queries).
- **Notifications:** Supabase DB webhooks → Edge Functions → FCM API (via Capacitor PushNotifications plugin). Tokens stored in profiles table.
- **Plugins:** @capacitor/camera, @capacitor/push-notifications, @capacitor/network, @capacitor/app, @capacitor/storage.
- **Utils:** Luxon (timestamps/TZ), Lodash (debounce).
- **Testing/Linting:** ESLint (quasar lint), Vitest (unit tests for composables/globals; e.g., test optimistic send).
- **Deployment:** quasar build -m capacitor → Xcode (TestFlight, APNs cert), Android Studio (APK, google-services.json). Supabase: supabase db push.
- **Dev Tools:** Cursor IDE (MCP: Install vite-plugin-vue-mcp [(https://github.com/webfansplz/vite-plugin-vue-mcp)](https://github.com/webfansplz/vite-plugin-vue-mcp) as dev dep (pnpm i -D vite-plugin-vue-mcp), add to vite.config.ts for local MCP server exposing Vue component tree/state/router/Pinia (even sans Pinia here); configure Cursor's .cursor/mcp.json to auto-update with MCP endpoint at http://localhost:port/__mcp/sse. Also, add GitMCP Quasar server [(https://gitmcp.io/quasarframework/quasar)](https://gitmcp.io/quasarframework/quasar) to mcp.json: {"mcpServers": {"Quasar Docs": {"url": "<https://gitmcp.io/quasarframework/quasar"}}> } for framework context/docs access, reducing hallucinations in code gen. Prompt example: 'Use vite-plugin-vue-mcp for live Vue inspection (e.g., get-component-tree for chat structure) and GitMCP Quasar for UI patterns (e.g., QChatMessage examples); generate composable for X using Vercel AI SDK and Composition API globals---no Pinia; lint/test ready.').

#### Quasar-Specific Starters

To counter LLM React/iOS bias, seed prompts with these Vue/Quasar snippets (Composition API focus):

**Reactive Global Starter (e.g., state/auth.js):**

```js
// state/auth.js
import { ref } from 'vue'
import { supabase } from '../boot/supabase'

export const user = ref(null) // Reactive global: user profile
export const isAuthenticated = ref(false)

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
    .then(({ data, error }) => {
      if (!error) {
        user.value = data.user // Mutate reactive ref
        isAuthenticated.value = true
      }
      return { data, error }
    })
}

export function signOut() {
  supabase.auth.signOut()
  user.value = null
  isAuthenticated.value = false
}
```

**Composable Starter (e.g., composables/useChat.js):**

```js
// composables/useChat.js
import { ref, onMounted } from 'vue'
import { supabase } from '../boot/supabase'
import { Network } from '@capacitor/network'

export function useChat(chatId) {
  const messages = ref([])
  const typing = ref(false)
  const online = ref(true)

  onMounted(async () => {
    const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('timestamp')
    messages.value = data || []

    const channel = supabase.channel(`chat:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => { /* Append/update messages.value */ }
      ).subscribe()

    Network.addListener('networkStatusChange', (status) => {
      online.value = status.connected
    })
  })

  function send(text) {
    const optimisticMsg = { id: Date.now(), chat_id: chatId, text, status: 'sending', timestamp: new Date() }
    messages.value.unshift(optimisticMsg) // Optimistic UI
    supabase.from('messages').insert(optimisticMsg).then(({ data, error }) => {
      if (!error) messages.value[0] = { ...messages.value[0], id: data[0].id, status: 'sent' }
    })
  }

  return { messages, send, typing, online }
}
```

**AI Composable Starter (e.g., composables/useAIChat.js---Vercel SDK Equivalent to Nuxt's useChat()):**

```js
// composables/useAIChat.js
import { ref } from 'vue'
import { useChat } from '@ai-sdk/vue' // Vercel AI SDK for Vue
import { openai } from '@ai-sdk/openai'

export function useAIChat(chatId) {
  const { messages, input, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat', // Proxy to Supabase Edge /ai/execute
    initialMessages: [], // Load from RAG context
    body: { chatId }, // Pass for RAG retrieval
    provider: openai('gpt-4o-mini')
  })

  // Custom tool for gym-specific extracts (e.g., action items)
  const tools = {
    extractActions: {
      description: 'Extract action items from gym thread',
      parameters: { type: 'object', properties: { actions: { type: 'array' } } },
      execute: async ({ text }) => { /* Call Edge for parse */ return { actions: [] } }
    }
  }

  return { messages, input, handleSubmit, isLoading, error, tools }
}
```

**Vitest Unit Test Starter (e.g., tests/composables/useChat.test.js):**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useChat } from '../../composables/useChat'

describe('useChat Composable', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('sends optimistic message and updates on success', () => {
    const { messages, send } = useChat('testChat')
    vi.spyOn(supabase.from('messages'), 'insert').mockResolvedValue({ data: [{ id: 1 }], error: null })
    send('Test')
    expect(messages.value[0].status).toBe('sending')
    // Await/update assertion
  })
})
```

**ESLint Config Snippet (quasar.config.js):** Unchanged.

### 4. Feature Specs

#### MVP Features

- **Auth:** Supabase email/password; profile upsert on signup (QForm w/ QInput, QAvatar crop via Camera). Use reactive global user.
- **Chat List:** QList of QItem (preview last msg, QBadge unread count, QAvatar).
- **Messaging:** QChatMessage bubbles; QInput send; Luxon stamps (TZ-aware: DateTime.now().setZone('America/New_York')). Use useChat() composable.
- **Real-Time/Offline:** Supabase channels; Optimistic via composable refs; Network plugin banner (QBanner: "Offline---queuing").
- **Groups:** QDialog create; members as QChip; attrib in QChatMessage (sender name).
- **Pushes:** Capacitor register → Store token in profiles → Edge Function on insert (FCM API call).
- **Tests:** Vitest for composables; lint all.

#### AI Features (Hybrid: Inline QMenu on long-press + /ai-assistant page)

- **Architecture:** Edge /ai/execute: Input (prompt/chatId) → RAG (SQL: SELECT embedding <-> query LIMIT 5) → Vercel AI SDK call (prompt: "For gym owner: Summarize [context] w/ actions") → Return JSON (e.g., { summary: "...", actions: [] }). Streaming via useAIChat() for client responses.
- **Inline:** QMenu on QChatMessage: "Summarize" → QDialog result (stream tokens to QChatMessage).
- **Dedicated:** QChatMessage for AI convo; QInput queries ("Track decisions in group1") via handleSubmit.
- **Advanced Proactive:** Watcher on messages ref → Edge call if keywords ("schedule", "class") → QChip suggestion ("Suggest 7pm swap?") → Tool call to insert calendar event.
- **Tests:** Mock Edge/Vercel responses; test prompt outputs (e.g., extractActions tool returns array).

### 5. Implementation Roadmap

Holistic but MVP-gated: Use Cursor MCP ("As Quasar/Vue expert, generate composable for X using Vercel AI SDK and Composition API globals---no Pinia; lint/test ready; reference vite-plugin-vue-mcp for live Vue inspection and GitMCP Quasar for framework patterns"). Phases align to sprint; each yields PR.

- **Day 1 (MVP, 24h):** Setup + Auth/Chat/Messaging/States/Offline/Push. PR: feat/mvp-core.
- **Days 2-3:** Groups/Media/Lifecycle. PR: feat/group-media.
- **Days 4-6:** AI Setup + 5 Features + Advanced. PRs: feat/ai-base, feat/ai-summarize (one per feature for modularity).
- **Day 7:** Tests/Polish/Deploy/Demo. PR: chore/polish.
- **Post-Sprint:** Brainlift doc, video, social.

**Lint/Test Mandate:** Run quasar lint pre-commit; Vitest coverage >80% per feature (e.g., vitest composables/useChat).
