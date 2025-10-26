# Ossome Demo - Quick Reference Card

**Print this and keep next to your keyboard while recording!**

---

## Login Credentials

| Device | Email | Password | Role |
|--------|-------|----------|------|
| iPad | owner@jiujitsio.com | demo123456 | Owner |
| iPhone 1 | carlos.martinez@jiujitsio.com | demo123456 | Instructor |
| iPhone 2 | ana.rodriguez@jiujitsio.com | demo123456 | Instructor |

---

## Timeline (Total: 7 minutes max)

| Time | Section | Duration | Key Action |
|------|---------|----------|------------|
| 0:00 | Intro | 45s | State problem/solution, show 3 devices |
| 0:45 | Auth | 20s | Login iPad as owner |
| 1:05 | 1:1 Chat | 30s | Real-time between iPad & iPhone 1 |
| 1:35 | Group Chat | 30s | All 3 devices, emoji reaction |
| 2:05 | Media | 25s | Send photo in group |
| 2:30 | Offline | 20s | Turn WiFi off, queue message |
| 2:50 | Reconnect | 10s | WiFi on, sync message |
| 3:00 | Lifecycle | 15s | Background app, send message |
| 3:15 | AI Intro | 20s | Show 5 capabilities |
| 3:35 | Schedule Query | 30s | "What classes tomorrow?" |
| 4:05 | RSVP | 25s | "RSVP me to first GI" |
| 4:30 | Problems | 60s | "Any problems this week?" |
| 5:30 | Fix Problem | 15s | "Assign Carlos to that class" |
| 5:45 | Tech | 30s | Architecture overview |
| 6:15 | Wrap | 45s | Summary, thank you |

---

## Critical Demo Elements Checklist

### MUST Show:
- ✅ Real-time between 2+ devices
- ✅ Group chat with 3 participants  
- ✅ Offline queue & sync
- ✅ Background/foreground
- ✅ All 5 AI capabilities
- ✅ Proactive problem detection
- ✅ Persona statement (gym owner)

### AI Queries (Copy-Paste Ready):
```
What classes are tomorrow?
RSVP me to the first GI class
Are there any problems with this week's schedule?
Who are the instructors?
Assign Carlos to that class
```

### Messages to Send:
```
Can you teach Monday 7pm GI?
Yes, I'm available
Team meeting tomorrow at 10am
I'll be there!
I'll bring coffee
Carlos, are you available for 8pm class?
```

---

## Pre-Recording Checklist

- [ ] Run: `pnpm db:apply demo_final_seed.sql`
- [ ] Run: `pnpm db:apply VERIFY_DEMO_DATA.sql` (verify all ✅)
- [ ] 3 simulators launched (iPad Pro + 2x iPhone 15 Pro)
- [ ] Simulators arranged for OBS
- [ ] OBS test recording (10 seconds)
- [ ] All accounts logged OUT (ready for fresh demo)
- [ ] WiFi ON for all simulators
- [ ] Mic tested
- [ ] Timer ready
- [ ] This script printed or on second monitor

---

## If Things Go Wrong

### AI Slow/Timeout (>10s):
- Say: "OpenAI API latency, let me show the code"
- Open: `src/composables/useGymAI.ts`

### Real-Time Breaks:
- Say: "Works in production, here's the architecture"
- Show: `src/composables/useChat.ts`

### Simulator Crashes:
- Continue with remaining simulators
- Say: "Works across any device combination"

### Running Over Time:
1. Cut voice input (saves 15s)
2. Shorten tech section (saves 15s)
3. Speak faster

---

## Opening Lines (Memorize)

> "Hi, I'm presenting Ossome - an AI-powered team communication app built specifically for Brazilian Jiu-Jitsu gym owners and their teams. The problem: Gym owners are drowning in messages across WhatsApp, text, and email - students asking about schedules, RSVPs, instructor assignments. My solution: A WhatsApp-inspired app with a gym-savvy AI assistant that handles scheduling queries, manages RSVPs, and proactively detects problems like missing instructors. Built with Quasar Vue 3, Supabase, and OpenAI GPT-4o-mini. Let's see it in action."

---

## Closing Lines (Memorize)

> "So that's Ossome - production-ready team communication for Jiu-Jitsu gyms. Real-time messaging with offline support, group chats, media sharing, and an AI assistant that actually understands gym operations. All 5 required technical capabilities implemented: RAG pipeline, user preferences, function calling with 12 tools, memory management, and error handling. Plus the advanced proactive scheduling capability. Built for the Remote Team Professional persona - gym owners coordinating trainers across locations. Thank you!"

---

## Technical Soundbites (If Asked)

**"Why not use ChatGPT?"**
> "ChatGPT doesn't know your gym's schedule or instructors. My AI has 12 custom tools integrated with the database - context-aware and action-oriented."

**"How does memory work?"**
> "The ai_conversations table stores full history. Every message passes the last 10 messages as context - that's the RAG pipeline."

**"What if AI makes a mistake?"**
> "Extensive error handling - UUID validation before tool calls, try/catch blocks throughout, user-friendly fallback messages."

---

## Production URL

https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app

---

**You've got this! Take a deep breath, follow the script, and show off your amazing work!** 🥋


