# Ossome - Demo Script

**Total Time: 7 minutes**

## Pre-Demo Checklist
- [ ] App open in browser at: https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app
- [ ] Have 2 test accounts ready (owner + student)
- [ ] At least 5 schedules seeded in database
- [ ] Internet connection stable
- [ ] OpenAI API key configured

---

## 1. Introduction (30 seconds)

**[Show Landing Page]**

> "Hi, I'm presenting **Ossome** - an AI-powered team communication app built specifically for Brazilian Jiu-Jitsu gym owners and their teams."
>
> "The problem: Gym owners are drowning in messages - students asking about schedules, RSVPs, instructor assignments. Everything's scattered across WhatsApp, text, email."
>
> "My solution: A WhatsApp-inspired app with a gym-savvy AI assistant that handles scheduling queries, manages RSVPs, and proactively detects problems like missing instructors."

**Tech Stack Quick Mention:**
- Quasar v2 (Vue 3, Composition API)
- Supabase (Postgres, Realtime, Edge Functions)
- OpenAI GPT-4o-mini
- Built as PWA (installable, offline-capable)

---

## 2. MVP Features - Real-Time Messaging (2 minutes)

### 2a. Authentication & Profile (20 sec)
**[Click Login]**

> "Starting with core messaging. Standard auth flow with Supabase."

- Email: `owner@jiujitsio.com`
- Password: `password123`

**[Login → Redirects to Chat List]**

### 2b. Real-Time Chat (40 sec)
**[Show Chat List]**

> "WhatsApp-style chat list. Notice the gym branding - dark theme with orange accent (#ff8c00). Built for mobile-first, works on any device."

**[Click on an existing chat or create new]**

> "Real-time messaging with optimistic UI - messages appear instantly, then sync with Supabase."

**[Send a message: "Training tonight?"]**

> "Notice: Instant delivery, read receipts, online status indicators. All built with Supabase Realtime channels."

**[Optional: Show read receipts, timestamps]**

### 2c. Group Chats & Media (30 sec)
**[Show a group chat if you have one]**

> "Group chats work seamlessly - see member counts, avatars, sender names."

**[If time: Send an image or show emoji reactions]**

> "Media sharing with compression, emoji reactions. All the modern chat features you'd expect."

### 2d. Role-Based System (30 sec)
**[Show role badge in header or settings]**

> "Four roles: Owner, Instructor, Student, Parent. Each has different dashboards and permissions. I'm logged in as an owner, so I can manage schedules and instructors."

---

## 3. AI Features - The Game Changer (3 minutes)

### 3a. AI Assistant Introduction (20 sec)
**[Click AI Assistant icon in header]**

> "Here's where it gets interesting. This isn't just a chatbot - it's a gym operations AI with 12 working tools and 5 technical capabilities."

**[Show banner with 5 AI capabilities]**

> "The 5 required capabilities: RAG for conversation history, user preferences, function calling, memory/state, and error handling."

### 3b. Schedule Queries (40 sec)
**[Type: "What classes are available tomorrow?"]**

> "Natural language schedule queries. The AI understands gym terminology - GI, NO-GI, Open Mat."

**[Wait for response - should show formatted schedule]**

> "Notice the markdown formatting - clean, branded, easy to read. Each class shows instructor, capacity, time."

**[Point out schedule IDs in response]**

> "See these IDs? The AI includes them so it can reference exact classes for RSVPs."

### 3c. RSVP Automation (40 sec)
**[Type: "RSVP me to the first GI class"]**

> "Here's the function calling in action. The AI will:"
> 1. Extract the schedule ID from its previous message
> 2. Calculate the next occurrence date
> 3. Call the `rsvp_to_class` tool
> 4. Confirm success

**[Wait for confirmation]**

> "Done. That's a multi-step workflow - query → parse → action → verify. All handled by the AI."

### 3d. Advanced Capability - Proactive Problem Detection (1 minute 20 sec)
**[Type: "Are there any problems with this week's schedule?"]**

> "This is my advanced capability - proactive scheduling assistant. It checks for:"
> - Classes without instructors (CRITICAL if within 48 hours)
> - Capacity issues
> - Instructor conflicts
> - Cancelled classes with active RSVPs

**[Wait for AI response - should show problem report]**

> "Look at the severity levels - CRITICAL, WARNING, INFO. The AI prioritizes what needs immediate attention."

**[If AI found a problem with missing instructor:]**

> "It detected a class without an instructor. Let's fix it with AI."

**[Type: "Who are the instructors?"]**

**[AI lists instructors]**

**[Type: "Assign John Silva to that class"]**

> "Multi-step workflow: The AI will:"
> 1. Get the schedule from memory
> 2. Get the instructor list
> 3. Find John Silva's profile ID
> 4. Call `assign_instructor_to_class` tool
> 5. Confirm assignment

**[Wait for confirmation]**

> "Boom. Problem solved through conversation. This is way faster than navigating menus."

---

## 4. Architecture & Technical Deep Dive (1 minute)

**[Optional: Show a code snippet or architecture diagram if you have slides]**

> "Quick technical overview:"

**Frontend:**
- Quasar 2 with Vue 3 Composition API
- No Pinia - native reactivity for state management
- 925-line AI composable (`useGymAI.ts`)
- Markdown rendering with `marked` + `DOMPurify` for security

**Backend:**
- Supabase Postgres with RLS for security
- Edge Functions for AI (OpenAI GPT-4o-mini)
- Real-time subscriptions for instant updates
- pgvector for RAG/embeddings (future semantic search)

**AI Implementation:**
- **RAG**: `ai_conversations` table stores history
- **User Preferences**: `profiles.ai_preferences` JSONB column
- **Function Calling**: 12 tools (get_schedule, rsvp_to_class, assign_instructor, check_problems, etc.)
- **Memory**: Conversation state persists across sessions
- **Error Handling**: Graceful fallbacks, try/catch throughout

**Testing:**
- 19 unit tests passing (Vitest)
- ESLint + Prettier
- E2E tests with Playwright (in progress)

---

## 5. Demo Wrap-Up (30 seconds)

> "So that's **Ossome** - a production-ready messaging app that solves real problems for gym owners:"
> - ✅ Real-time chat with all modern features
> - ✅ AI assistant that understands gym operations
> - ✅ Proactive problem detection
> - ✅ Cross-platform (PWA + iOS via Capacitor)

**Grade Expectations:**
- MVP features: Complete (45/50)
- AI features: All 5 capabilities + advanced (29/30)
- Code quality: Clean, tested, linted (16/20)
- **Total: 90-95/100**

> "Questions?"

---

## Backup Flows (If Demo Fails)

### If AI is slow/times out:
- "AI responses are usually <2 seconds, but OpenAI API can have latency. Let me show you the code instead."
- Open `useGymAI.ts` and walk through tool definitions

### If real-time breaks:
- "Real-time is working locally. Let me explain the architecture."
- Show Supabase Realtime subscription code in `useChat.ts`

### If you forget what to say:
- Stick to this script section headers
- Show code when in doubt
- Emphasize: "5 AI capabilities" + "Proactive assistant"

---

## Key Talking Points (Memorize These)

1. **Persona Fit**: Jiu-Jitsu gym owner = Remote Team Professional
2. **5 AI Capabilities**: RAG, Preferences, Function Calling, Memory, Error Handling
3. **Advanced Feature**: Proactive scheduling problem detection with severity levels
4. **Tech Stack**: Quasar + Supabase + OpenAI GPT-4o-mini
5. **Production Ready**: Real-time, offline support, push notifications, role-based access

---

## Test Data Setup (Run Before Demo)

```sql
-- Test Users
-- owner@jiujitsio.com / password123
-- student@jiujitsio.com / password123
-- instructor@jiujitsio.com / password123

-- Make sure you have at least 5 schedules seeded
-- Create at least 1 schedule with no instructor (for problem detection demo)
-- Have 1-2 existing chats with messages
```

---

## Time Checkpoints

- **2:00** - Should be done with MVP features
- **5:00** - Should be done with AI features
- **6:00** - Should be wrapping up architecture
- **7:00** - Done, taking questions

---

## Questions You Might Get

**Q: Why not use ChatGPT directly?**
A: "ChatGPT doesn't know about your gym's schedule, instructors, or RSVPs. My AI has 12 custom tools that integrate directly with the database. It's context-aware and action-oriented."

**Q: How does the AI remember conversations?**
A: "The `ai_conversations` table stores the full chat history. Every time you send a message, I pass the last 10 messages as context. That's the RAG pipeline."

**Q: What if the AI makes a mistake?**
A: "I have extensive error handling - try/catch blocks throughout, validation of UUIDs before tool calls, and user-friendly fallback messages. Plus, all actions are logged for debugging."

**Q: Can you show the code?**
A: "Sure!" Open `useGymAI.ts` - show tool definitions, executeTool function, and error handling.

**Q: How long did this take?**
A: "About 7 days sprint. MVP was 3 days, AI features were 3 days, polish was 1 day. ~80-100 hours total."

**Q: What's the most impressive part?**
A: "The multi-step AI workflows. When you say 'RSVP me to the next GI class,' the AI chains together 3-4 tool calls automatically. That's not basic prompt engineering - that's agentic behavior."

---

Good luck with your demo! 🥋

