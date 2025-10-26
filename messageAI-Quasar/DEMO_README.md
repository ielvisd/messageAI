# Ossome Demo Video - Complete Guide

**Everything you need to record your final Challenge 2 submission video.**

---

## Quick Start (TL;DR)

```bash
# 1. Setup database
cd messageAI-Quasar
pnpm db:apply demo_final_seed.sql
pnpm db:apply VERIFY_DEMO_DATA.sql

# 2. Read the scripts
# - PRE_DEMO_CHECKLIST.md (setup)
# - FINAL_DEMO_SCRIPT.md (recording)
# - DEMO_QUICK_REFERENCE.md (quick ref)

# 3. Launch 3 simulators (iPad + 2 iPhones)

# 4. Setup OBS, press record, follow script

# 5. Edit, export, submit!
```

---

## Documentation Files Overview

### 📋 Core Documents

1. **FINAL_DEMO_SCRIPT.md** (Most Important!)
   - Complete 5-7 minute script with timestamps
   - Detailed actions for each simulator
   - Full narration text
   - Backup flows if things go wrong
   - **Use this during recording**

2. **PRE_DEMO_CHECKLIST.md**
   - Step-by-step setup guide (30 minutes)
   - Database preparation
   - Simulator configuration
   - OBS setup
   - Environment prep
   - **Complete this BEFORE recording**

3. **DEMO_QUICK_REFERENCE.md**
   - One-page cheat sheet
   - Login credentials
   - Timeline at a glance
   - Copy-paste queries
   - Opening/closing lines
   - **Print and keep next to keyboard**

### 🗄️ Database Files

4. **demo_final_seed.sql**
   - Seeds all required test data
   - Creates group chat with 3 members
   - Creates 1:1 chat between owner and Carlos
   - **CRITICAL:** Creates unassigned class for tomorrow (AI demo)
   - Run with: `pnpm db:apply demo_final_seed.sql`

5. **VERIFY_DEMO_DATA.sql**
   - Diagnostic script to check everything is ready
   - Verifies accounts, chats, schedules
   - Shows clear ✅/❌ status
   - Run with: `pnpm db:apply VERIFY_DEMO_DATA.sql`

---

## Demo Requirements (Must Show)

Your 5-7 minute video MUST demonstrate:

### ✅ MVP Features (2 minutes)
1. **Real-time messaging** between 2+ devices
2. **Group chat** with 3+ participants
3. **Offline scenario** - queue and sync
4. **App lifecycle** - background/foreground
5. **Media sharing** - send photo

### ✅ AI Features (3 minutes)
1. **RAG Pipeline** - Conversation history
2. **User Preferences** - JSONB storage
3. **Function Calling** - 12 tools in action
4. **Memory/State** - Persistent across messages
5. **Error Handling** - Validation and fallbacks
6. **Advanced Capability** - Proactive problem detection

### ✅ Presentation
- Clear **persona statement** (Jiu-Jitsu gym owner)
- Clear **problem/solution** statement
- Technical architecture overview

---

## Recording Timeline

| Time | What to Do |
|------|------------|
| **T-30 min** | Complete PRE_DEMO_CHECKLIST.md |
| **T-10 min** | Practice run, test recording |
| **T-5 min** | Logout all accounts, deep breath |
| **T-0** | Press record, follow FINAL_DEMO_SCRIPT.md |
| **T+7** | Stop recording, backup file |
| **T+10** | Review recording |
| **T+30** | Edit, add title cards |
| **T+60** | Export MP4, test playback |

---

## Demo Accounts

| Device | Email | Password | Role |
|--------|-------|----------|------|
| iPad Pro (PWA) | owner@jiujitsio.com | demo123456 | Owner |
| iPhone 15 Pro #1 | carlos.martinez@jiujitsio.com | demo123456 | Instructor |
| iPhone 15 Pro #2 | ana.rodriguez@jiujitsio.com | demo123456 | Instructor |

---

## Critical Success Factors

### 🎯 Preparation
- [ ] Run database seed scripts
- [ ] Verify all data with VERIFY script
- [ ] Practice at least once
- [ ] Test OBS recording

### 🎬 During Recording
- [ ] Speak clearly and confidently
- [ ] Let actions breathe (1-2 seconds)
- [ ] Don't rush when AI processes
- [ ] Follow timing guide
- [ ] Use backup flows if needed

### ✂️ Post-Production
- [ ] Cut dead air
- [ ] Add title card at start
- [ ] Add closing card with links
- [ ] Export as MP4 (H.264)
- [ ] Keep under 7 minutes

---

## If Things Go Wrong

### During Setup
**Problem:** Verification script shows ❌
- **Fix:** Re-run `demo_final_seed.sql`
- **Check:** Supabase connection in .env

**Problem:** Simulators won't launch
- **Fix:** Restart Xcode, try `open -a Simulator`
- **Backup:** Use real devices if available

### During Recording
**Problem:** AI is slow (>10 seconds)
- **Action:** Say "API latency, let me show the code"
- **Show:** `src/composables/useGymAI.ts`

**Problem:** Real-time breaks
- **Action:** Explain architecture instead
- **Show:** `src/composables/useChat.ts`

**Problem:** Simulator crashes
- **Action:** Continue with remaining devices
- **Say:** "Works across any device combo"

**Problem:** Running over 7 minutes
- **Cut:** Voice input demo (15s)
- **Cut:** Shorten tech section (15s)

---

## Recording Checklist

### Before Recording
- [ ] Database seeded and verified
- [ ] 3 simulators launched and positioned
- [ ] OBS configured and tested
- [ ] All accounts logged out
- [ ] Script printed or on second monitor
- [ ] Timer ready
- [ ] Water nearby
- [ ] Quiet environment

### During Recording
- [ ] Start timer when OBS starts
- [ ] Follow FINAL_DEMO_SCRIPT.md exactly
- [ ] Watch for 7-minute limit
- [ ] Stay calm if issues arise
- [ ] Finish with closing statement

### After Recording
- [ ] Stop OBS
- [ ] Save file immediately
- [ ] Backup to cloud
- [ ] Watch full recording
- [ ] Note any issues
- [ ] Decide: keep or re-record

---

## Post-Production Guide

### Title Card (3 seconds)
```
OSSOME
AI-Powered Team Communication for Jiu-Jitsu Gyms

Built with Quasar + Supabase + OpenAI
```

### Closing Card (3 seconds)
```
OSSOME - Gauntlet AI Challenge 2

Production: https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app
GitHub: [your-repo-link]

Built by: Elvis Ibarra
```

### Export Settings
- Format: MP4
- Codec: H.264
- Resolution: 1080p or 1440p
- Frame Rate: 30fps
- Bitrate: 8-10 Mbps
- Audio: AAC, 192 kbps

---

## Troubleshooting

### Video Issues
- **Choppy playback:** Increase recording quality
- **Simulators cut off:** Adjust OBS scene
- **Poor audio:** Check mic position/levels

### Content Issues
- **Too long:** Cut optional sections first
- **Too short:** Add more AI detail
- **Unclear:** Re-record problem sections only

### Technical Issues
- **DB connection:** Check .env file
- **AI not working:** Verify OpenAI key in Supabase secrets
- **Real-time broken:** Test Supabase connection

---

## Resources

### Internal Docs
- `FINAL_DEMO_SCRIPT.md` - Full recording script
- `PRE_DEMO_CHECKLIST.md` - Setup steps
- `DEMO_QUICK_REFERENCE.md` - Cheat sheet
- `demo_final_seed.sql` - Database setup
- `VERIFY_DEMO_DATA.sql` - Data verification

### External Resources
- Production App: https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app
- PRD: `../PRD.md`
- README: `README.md`

### Commands
```bash
# Database
pnpm db:apply demo_final_seed.sql
pnpm db:apply VERIFY_DEMO_DATA.sql

# Development
pnpm dev

# Production
# Already deployed at Vercel URL
```

---

## Success Metrics

Your demo should achieve:

- ✅ Under 7 minutes total
- ✅ All MVP features shown
- ✅ All 5 AI capabilities demonstrated
- ✅ Advanced proactive capability highlighted
- ✅ Clear problem/solution stated
- ✅ Persona clearly identified
- ✅ Professional presentation
- ✅ Working across 3 devices
- ✅ No major technical issues

---

## Final Thoughts

**You've built something impressive:**
- Production-ready messaging app
- Real-time sync across devices
- Offline support and lifecycle handling
- 12-tool AI assistant with advanced capabilities
- Clean Quasar + Supabase + OpenAI architecture

**Now just show it off with confidence!**

The hard part is done. The demo is just telling the story of what you built. Follow the script, stay calm, and let your work speak for itself.

**You've got this!** 🥋🎬

---

## Quick Links

- **Start Here:** `PRE_DEMO_CHECKLIST.md`
- **Recording Script:** `FINAL_DEMO_SCRIPT.md`
- **Quick Ref:** `DEMO_QUICK_REFERENCE.md`
- **Seed Data:** `pnpm db:apply demo_final_seed.sql`
- **Verify Ready:** `pnpm db:apply VERIFY_DEMO_DATA.sql`

**When ready, press record and crush it!** 🚀


