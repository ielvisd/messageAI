# Ossome - Final Demo Video Script (5-7 Minutes)

**Production URL:** https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app

**Recording Date:** October 26, 2025

**Challenge:** Gauntlet AI Challenge 2 - Final Submission

---

## Recording Setup

### Simulators Configuration
- **iPad Pro (PWA):** Owner account - John Silva (owner@jiujitsio.com)
- **iPhone 15 Pro #1:** Instructor - Carlos Martinez (carlos.martinez@jiujitsio.com)
- **iPhone 15 Pro #2:** Instructor - Ana Rodriguez (ana.rodriguez@jiujitsio.com)
- **Password for all:** demo123456

### OBS Settings
- Resolution: 1920x1080 or 2560x1440
- Frame Rate: 30fps minimum
- Audio: System audio + microphone
- Layout: All 3 simulators visible side-by-side

### Pre-Recording Checklist

- [ ] Run `demo_final_seed.sql` to ensure test data is ready
- [ ] All 3 simulators launched and arranged for OBS capture
- [ ] Set all simulators to same time/date
- [ ] Test 10-second OBS recording to verify all simulators visible
- [ ] Script printed or on second monitor for reference
- [ ] Microphone tested for clear narration
- [ ] Timer ready to track 7-minute limit
- [ ] Production URL loaded on iPad: https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app
- [ ] All 3 accounts logged out (ready for fresh login demo)
- [ ] WiFi enabled on all simulators

---

## Demo Script with Timestamps

### Section 1: Introduction (0:00-0:45, 45 seconds)

**Visual:**
- iPad showing landing page at production URL
- Pan to show all 3 simulators ready

**Narration:**
> "Hi, I'm presenting **Ossome** - an AI-powered team communication app built specifically for Brazilian Jiu-Jitsu gym owners and their teams."
>
> "The problem: Gym owners are drowning in messages across WhatsApp, text, and email - students asking about schedules, RSVPs, instructor assignments."
>
> "My solution: A WhatsApp-inspired app with a gym-savvy AI assistant that handles scheduling queries, manages RSVPs, and proactively detects problems like missing instructors."
>
> "Built with Quasar Vue 3, Supabase, and OpenAI GPT-4o-mini. Let's see it in action across three devices."

**Actions:**
- **iPad:** Show landing page briefly
- **Camera:** Pan to show all 3 simulators ready
- **Timing:** Keep under 45 seconds

---

### Section 2: MVP Features - Real-Time Messaging (0:45-2:30, 1 minute 45 seconds)

#### 2A: Authentication & Role System (0:45-1:05, 20 seconds)

**iPad (Owner):**
1. Click "Login" button
2. Enter: owner@jiujitsio.com
3. Enter: demo123456
4. Submit
5. Wait for redirect to Unified Dashboard
6. Point out "Owner" role badge in header

**Narration:**
> "Starting with authentication. Notice I'm logged in as an owner - there are 4 roles: Owner, Instructor, Student, and Parent, each with different permissions and dashboards."

**Timing: 20 seconds**

---

#### 2B: Real-Time 1:1 Messaging (1:05-1:35, 30 seconds)

**iPhone 1 (Carlos) - simultaneously:**
1. Login: carlos.martinez@jiujitsio.com / demo123456
2. Navigate to Messages (bottom nav)
3. Open existing chat with owner (should already exist from seed)

**iPad (Owner):**
1. Navigate to Messages
2. Open same chat with Carlos
3. Type: "Can you teach Monday 7pm GI?"
4. Hit send
5. **WATCH:** Message appears instantly on iPhone 1

**iPhone 1 (Carlos):**
1. **OBSERVE:** Message arrives in real-time
2. Read receipt shows "Read"
3. Type response: "Yes, I'm available"
4. Hit send
5. **WATCH:** Appears instantly on iPad

**Narration:**
> "Real-time messaging with Supabase Realtime channels. Messages appear instantly with optimistic UI, read receipts, and online status indicators. All the modern chat features you'd expect."

**Timing: 30 seconds**

---

#### 2C: Group Chat with 3+ Participants (1:35-2:05, 30 seconds)

**iPhone 2 (Ana):**
1. Login: ana.rodriguez@jiujitsio.com / demo123456
2. Navigate to Messages

**All 3 simulators:**
1. Navigate to gym group chat: "Jiujitsio - All Members"
2. Show all 3 in the same chat

**iPad (Owner):**
1. Type: "Team meeting tomorrow at 10am"
2. Send
3. **WATCH:** Appears on both iPhones instantly

**iPhone 1 (Carlos):**
1. **OBSERVE:** Message arrives
2. Long-press message
3. React with 👍 emoji
4. **WATCH:** Emoji appears on all devices

**iPhone 2 (Ana):**
1. **OBSERVE:** Message and emoji arrive
2. Type: "I'll be there!"
3. Send
4. **WATCH:** Appears on all devices

**Narration:**
> "Group chats work seamlessly - see all 3 participants receiving messages in real-time. Notice the emoji reactions, sender names, and member indicators."

**Timing: 30 seconds**

---

#### 2D: Media Sharing (2:05-2:30, 25 seconds)

**iPhone 1 (Carlos):**
1. In group chat, click camera icon (or attachment)
2. Select photo from simulator gallery
3. Send to group
4. **WATCH:** Image uploads and appears with thumbnail

**All devices:**
1. **OBSERVE:** Image appears on all 3 devices
2. Show thumbnail preview

**Narration:**
> "Media sharing with compression and thumbnail previews. Built using Capacitor Camera API for native iOS access."

**Timing: 25 seconds**

---

### Section 3: Offline Scenario & App Lifecycle (2:30-3:15, 45 seconds)

#### 3A: Offline Message Queue (2:30-2:50, 20 seconds)

**iPhone 2 (Ana):**
1. Open iPhone Settings app
2. Navigate to Wi-Fi settings
3. Turn OFF Wi-Fi
4. Return to Ossome app
5. **OBSERVE:** Banner appears: "You're offline" or similar
6. In group chat, type: "I'll bring coffee"
7. Send message
8. **OBSERVE:** Message shows "queued" or "pending" status

**Narration:**
> "Offline handling: When Ana goes offline, messages queue automatically with optimistic UI showing the queued status."

**Timing: 20 seconds**

---

#### 3B: Reconnection & Sync (2:50-3:00, 10 seconds)

**iPhone 2 (Ana):**
1. Open iPhone Settings
2. Turn Wi-Fi back ON
3. Return to Ossome app
4. **OBSERVE:** Message status changes to "sent"
5. Message syncs to server

**iPad & iPhone 1:**
1. **OBSERVE:** Ana's message appears on both devices

**Narration:**
> "When she reconnects, queued messages sync instantly to all devices. All built with Capacitor Network plugin monitoring connection status."

**Timing: 10 seconds**

---

#### 3C: Background/Foreground Handling (3:00-3:15, 15 seconds)

**iPhone 1 (Carlos):**
1. Swipe up to home screen (background the app)
2. App goes to background

**iPad (Owner):**
1. In chat with Carlos, type: "Carlos, are you available for 8pm class?"
2. Send

**iPhone 1 (Carlos):**
1. **OBSERVE:** Push notification appears on home screen (if simulator supports)
2. Tap notification or app icon
3. **OBSERVE:** Message already visible in chat

**Narration:**
> "App lifecycle handling: Messages persist across background and foreground transitions with proper state management. Push notifications work when the app is backgrounded."

**Timing: 15 seconds**

---

### Section 4: AI Features - The Game Changer (3:15-5:45, 2 minutes 30 seconds)

#### 4A: AI Introduction & 5 Capabilities (3:15-3:35, 20 seconds)

**iPad (Owner):**
1. Click AI Assistant icon in header (robot/brain icon)
2. Show AI chat interface
3. **POINT OUT:** If visible, show banner/UI indicating 5 capabilities

**Narration:**
> "Now the AI - this isn't just a chatbot. It has 12 working tools and 5 technical capabilities: RAG for conversation history stored in the ai_conversations table, user preferences stored in JSONB, function calling with 12 tools, memory and state management persisting across sessions, and comprehensive error handling with graceful fallbacks."

**Timing: 20 seconds**

---

#### 4B: AI Capability 1 - Schedule Queries (RAG + Function Calling) (3:35-4:05, 30 seconds)

**iPad (Owner - AI Assistant):**
1. Type: "What classes are tomorrow?"
2. Send
3. **WAIT:** AI processes and calls get_schedule tool
4. **OBSERVE:** Formatted response with:
   - Class names (GI, NO-GI, etc.)
   - Times
   - Instructors
   - **IMPORTANT:** Schedule IDs shown like [ID: abc-123-def]

**Narration:**
> "Natural language schedule queries. The AI uses the get_schedule tool to query the database, understands gym terminology like GI and NO-GI, and includes schedule IDs in its response for follow-up actions. This demonstrates both the RAG pipeline passing conversation context and function calling with structured outputs."

**Timing: 30 seconds**

---

#### 4C: AI Capability 2 & 3 - RSVP Multi-Step Workflow (Memory + Preferences) (4:05-4:30, 25 seconds)

**iPad (Owner - AI Assistant):**
1. Type: "RSVP me to the first GI class"
2. Send
3. **WAIT:** AI processes and chains tools:
   - Extracts schedule ID from previous message (memory)
   - Calculates next occurrence date
   - Calls rsvp_to_class tool with proper parameters
4. **OBSERVE:** Success confirmation message

**Narration:**
> "Multi-step workflow: The AI remembers the schedule from its previous message, uses my stored preferences to understand 'first GI class', and chains together multiple tool calls automatically. That's memory and state management in action - conversation context persists across messages."

**Timing: 25 seconds**

---

#### 4D: AI Capability 4 - Advanced Proactive Problem Detection (4:30-5:30, 1 minute)

**iPad (Owner - AI Assistant):**
1. Type: "Are there any problems with this week's schedule?"
2. Send
3. **WAIT:** AI calls check_schedule_problems tool
4. **OBSERVE:** Response showing:
   - 🚨 CRITICAL: Class without instructor (tomorrow or within 48h)
   - Severity level clearly marked
   - Specific class details
   - Suggested actions

**Narration:**
> "This is my advanced capability - proactive scheduling assistant. It automatically checks for classes without instructors, marking them CRITICAL if within 48 hours, capacity issues, instructor conflicts, and cancelled classes with active RSVPs. Look at the severity levels - CRITICAL, WARNING, INFO. The AI prioritizes what needs immediate attention and provides actionable suggestions."

**Timing: 1 minute**

---

#### 4E: AI Multi-Tool Chain - Fix Problem with AI (5:30-5:45, 15 seconds)

**iPad (Owner - AI Assistant):**
1. Type: "Who are the instructors?"
2. **WAIT:** AI lists instructors (Carlos, Ana, Mike)
3. Type: "Assign Carlos to that class"
4. **WAIT:** AI chains multiple tools:
   - get_instructors (already done)
   - Retrieves schedule from memory (conversation state)
   - Matches "Carlos" to Carlos Martinez profile ID
   - Calls assign_instructor_to_class with proper UUIDs
5. **OBSERVE:** Success confirmation

**Narration:**
> "Problem solved through conversation. The AI chained 3 tool calls automatically - getting instructors, retrieving the problematic schedule from memory, and making the assignment. That's agentic behavior, not basic prompting. This demonstrates error handling with UUID validation and graceful fallbacks if anything fails."

**Timing: 15 seconds**

---

#### 4F: OPTIONAL - Voice Input (If time permits, otherwise SKIP)

**iPad (Owner - AI Assistant):**
1. Click microphone icon
2. Speak clearly: "What's on the schedule for Friday?"
3. **OBSERVE:** Voice transcription appears
4. Auto-submits after 1.5 seconds of silence
5. AI responds with Friday schedule

**Narration:**
> "Bonus feature: Voice input using Web Speech API - iOS Safari 14.5+ compatible with auto-submit after silence detection. Makes the AI accessible hands-free during training."

**Timing: 15 seconds (OPTIONAL - cut if running over time)**

---

### Section 5: Technical Architecture (5:45-6:15, 30 seconds)

**Visual:**
- Keep simulators visible OR
- Show code snippet from `src/composables/useGymAI.ts` OR
- Show architecture diagram if prepared

**Narration:**
> "Technical architecture: Frontend is Quasar 2 with Vue 3 Composition API - no Pinia, just native reactivity for cleaner code. The AI logic lives in a 925-line composable with 12 tools. Backend is Supabase Postgres with Row Level Security, Realtime channels for instant updates, and Edge Functions calling OpenAI GPT-4o-mini. Built as both PWA and iOS app via Capacitor for maximum reach. Tested with Vitest and Playwright - 19 unit tests passing."

**Timing: 30 seconds**

---

### Section 6: Wrap-Up (6:15-7:00, 45 seconds)

**Visual:**
- Show all 3 simulators active and in sync
- Pan across each device showing different features

**Narration:**
> "So that's Ossome - production-ready team communication built specifically for Jiu-Jitsu gyms."
>
> "Real-time messaging with offline support, group chats, media sharing, and role-based access for owners, instructors, students, and parents."
>
> "An AI assistant that actually understands gym operations - not just generic chatbot responses."
>
> "All 5 required technical capabilities implemented: RAG pipeline with conversation history, user preferences in JSONB storage, function calling with 12 working tools, persistent memory and state management, and comprehensive error handling."
>
> "Plus the advanced proactive scheduling capability that detects problems before they become emergencies."
>
> "Built for the Remote Team Professional persona - gym owners coordinating trainers across multiple locations and time zones."
>
> "Thank you!"

**Timing: 45 seconds**

---

## Backup Flows & Troubleshooting

### If AI is slow or times out:
- **Don't wait more than 10 seconds**
- Say: "AI responses are usually under 2 seconds, but OpenAI API can have latency. Let me show you the code instead."
- Open `src/composables/useGymAI.ts` and show tool definitions
- Highlight the 12 tools array

### If real-time messaging breaks:
- Say: "Real-time is working in production - let me explain the architecture."
- Show `src/composables/useChat.ts` Supabase Realtime subscription code
- Explain the channel setup

### If simulator crashes:
- Continue with remaining simulators
- Say: "In production, this works across any device combination - iOS, web, iPad."

### If offline scenario doesn't show properly:
- Narrate what should happen
- Say: "The Network plugin monitors connection status and queues messages locally."
- Show composable code if needed

### If running over 7 minutes:
1. **First:** Cut voice input demo (Section 4F) - saves 15 seconds
2. **Second:** Shorten technical architecture to 15 seconds - saves 15 seconds
3. **Third:** Speed up narration slightly (talk faster but clearly)

### If running under 6 minutes:
- Add more detail to AI explanations
- Show code snippets
- Demonstrate additional AI query

---

## Recording Tips

### Before Recording:
1. Practice the entire script 2-3 times
2. Time yourself - aim for 6:30 to have buffer
3. Have water nearby for clear voice
4. Close all unnecessary apps on Mac
5. Turn off notifications on Mac
6. Put phone on Do Not Disturb

### During Recording:
1. Speak clearly and at moderate pace
2. Let actions breathe - give 1-2 seconds for viewers to observe
3. Don't rush when AI is processing
4. If you make a mistake, pause, breathe, and continue (edit later)
5. Keep energy up throughout

### After Recording:
1. Review full video before editing
2. Cut any dead air or long pauses
3. Add title card at beginning
4. Add closing card with:
   - GitHub repo link
   - Production URL
   - Your name/contact

---

## Test Data Requirements

Before recording, ensure:
- [ ] All 3 accounts can log in successfully
- [ ] Owner and Carlos have at least 1 existing 1:1 chat with message history
- [ ] All 3 accounts are members of "Jiujitsio - All Members" group chat
- [ ] At least 5-10 schedules exist with instructors assigned
- [ ] **CRITICAL:** 1 schedule exists for tomorrow WITHOUT instructor (for AI problem detection)
- [ ] WiFi works on all simulators
- [ ] Camera permissions granted for media demo (or have preloaded images)

---

## Demo Accounts Reference

| Account | Email | Password | Role | Use For |
|---------|-------|----------|------|---------|
| John Silva | owner@jiujitsio.com | demo123456 | Owner | iPad - Primary demo device |
| Carlos Martinez | carlos.martinez@jiujitsio.com | demo123456 | Instructor | iPhone 1 - Real-time messaging |
| Ana Rodriguez | ana.rodriguez@jiujitsio.com | demo123456 | Instructor | iPhone 2 - Group chat & offline |

---

## Key Success Metrics - Must Show

Your demo MUST clearly demonstrate:

- ✅ **Real-time messaging** between 2+ devices (iPad + iPhone 1)
- ✅ **Group chat** with 3+ participants (all 3 simulators)
- ✅ **Offline scenario** with message queueing and sync (iPhone 2)
- ✅ **App lifecycle handling** - background/foreground (iPhone 1)
- ✅ **All 5 AI capabilities** with specific examples:
  1. RAG Pipeline - conversation history
  2. User Preferences - JSONB storage
  3. Function Calling - 12 tools in action
  4. Memory/State - persistent across messages
  5. Error Handling - validation and fallbacks
- ✅ **Advanced capability** - Proactive problem detection
- ✅ **Clear persona statement** - Jiu-Jitsu gym owner
- ✅ **Clear problem/solution** statement
- ✅ **Under 7 minutes** total runtime

---

## Final Checklist Before Submitting Video

- [ ] Video is 5-7 minutes long
- [ ] Audio is clear (no background noise)
- [ ] All 3 simulators visible throughout
- [ ] All required features demonstrated
- [ ] Title card added
- [ ] Closing card with links added
- [ ] Exported as MP4 (H.264, 1080p minimum)
- [ ] Tested playback on another device
- [ ] File size reasonable for upload (<500MB)

---

**Good luck with your demo! You've built something impressive - now show it off with confidence!** 🥋


