# Pre-Demo Checklist - Run This Before Recording

**Complete these steps 30 minutes before recording to ensure everything is ready.**

---

## Step 1: Database Setup (5 minutes)

### 1.1 Seed Demo Data

```bash
cd messageAI-Quasar
pnpm db:apply demo_final_seed.sql
```

**Expected output:**
- ✅ All 3 accounts verified
- ✅ Group chat created with 3 members
- ✅ 1:1 chat between Owner and Carlos
- ✅ CRITICAL: Unassigned class for tomorrow
- 🎯 "You are ready to record!"

### 1.2 Verify Everything Is Ready

```bash
pnpm db:apply VERIFY_DEMO_DATA.sql
```

**Check for:**
- ✅ All 3 demo accounts exist
- ✅ Jiujitsio gym exists
- ✅ Group chat membership (3 members)
- ✅ 1:1 chat exists
- ✅ At least 5 schedules
- ✅ **CRITICAL:** Unassigned class for tomorrow

**If you see ANY ❌ marks:**
- Run the seed script again
- Check Supabase dashboard for errors
- Verify you're connected to correct database

---

## Step 2: Simulator Setup (10 minutes)

### 2.1 Launch Simulators

```bash
# Open Xcode Simulator or use terminal:
open -a Simulator

# Launch specific devices:
# - iPad Pro (12.9-inch)
# - iPhone 15 Pro (Device 1)
# - iPhone 15 Pro (Device 2)
```

### 2.2 Configure Each Simulator

For EACH simulator:
- [ ] Set system time to same date/time
- [ ] Enable WiFi
- [ ] Disable "Auto-Lock" (Settings > Display)
- [ ] Set volume to 50%
- [ ] Open Safari (for PWA)
- [ ] Navigate to: https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app

### 2.3 Preload Test Image (for media demo)

On iPhone 1:
- [ ] Open Photos app
- [ ] Save 1-2 images to camera roll (any images)
- [ ] Grant Safari camera/photo permissions when prompted

---

## Step 3: OBS Setup (10 minutes)

### 3.1 Scene Configuration

```
Layout Option 1 (Horizontal):
[iPad Pro]     [iPhone 1]     [iPhone 2]
   (40%)           (30%)          (30%)

Layout Option 2 (Grid):
       [iPad Pro - 60%]
[iPhone 1 - 20%]  [iPhone 2 - 20%]
```

### 3.2 OBS Settings

- [ ] Resolution: 1920x1080 or 2560x1440
- [ ] Frame Rate: 30fps
- [ ] Recording Format: MP4
- [ ] Video Codec: H.264
- [ ] Audio: Mic + System Audio
- [ ] Recording Quality: High

### 3.3 Test Recording

- [ ] Record 10 seconds
- [ ] Check all 3 simulators visible
- [ ] Check audio levels
- [ ] Check no lag/stuttering
- [ ] Delete test file

---

## Step 4: Environment Prep (5 minutes)

### 4.1 Mac Setup

- [ ] Close all unnecessary apps
- [ ] Turn off Mac notifications (Do Not Disturb)
- [ ] Put iPhone on Do Not Disturb
- [ ] Close Slack, Discord, email
- [ ] Ensure stable internet (>10 Mbps upload)
- [ ] Plug in Mac (don't rely on battery)

### 4.2 Recording Area

- [ ] Quiet room (no background noise)
- [ ] Good lighting (if showing face)
- [ ] Water nearby
- [ ] Script printed or on second monitor
- [ ] Timer/stopwatch ready

### 4.3 Test Microphone

```bash
# Record test audio:
# Say: "This is a microphone test for Ossome demo"
# Play back and check:
# - Clear audio
# - No echo
# - Good volume level
```

---

## Step 5: Logout All Accounts (2 minutes)

**Important: Start demo with fresh logins**

On each simulator:
- [ ] iPad: Logout if already logged in
- [ ] iPhone 1: Logout if already logged in
- [ ] iPhone 2: Logout if already logged in
- [ ] All at landing page ready for login

---

## Step 6: Print/Prep Script (3 minutes)

- [ ] Print `DEMO_QUICK_REFERENCE.md` (keep next to keyboard)
- [ ] Print or open on second monitor: `FINAL_DEMO_SCRIPT.md`
- [ ] Highlight critical timestamps
- [ ] Have login credentials visible

---

## Step 7: Practice Run (5 minutes)

Do a QUICK practice run:
- [ ] Login on iPad (test credentials work)
- [ ] Send 1 message between devices
- [ ] Open AI Assistant
- [ ] Ask 1 AI question
- [ ] Verify everything works

Then:
- [ ] Logout all accounts again
- [ ] Ready for real recording

---

## Step 8: Final Checks (2 minutes)

### Visual Check

- [ ] All 3 simulators showing landing page
- [ ] All visible in OBS preview
- [ ] No distracting elements on screen
- [ ] Mac desktop clean (if visible)

### Audio Check

- [ ] Mic working in OBS
- [ ] Audio levels good (not clipping)
- [ ] No background noise

### Timing Check

- [ ] Stopwatch/timer ready
- [ ] Goal: 6:00-6:45 (allows buffer under 7:00)

### Mental Check

- [ ] Deep breath
- [ ] Review opening lines
- [ ] Remember: You've built something amazing
- [ ] Confidence: You know this app inside out

---

## Final Pre-Recording Command

```bash
# One last verification (optional but recommended):
pnpm db:apply VERIFY_DEMO_DATA.sql

# Should see:
# ✅ ALL READY! You can start recording!
```

---

## Ready to Record?

If ALL items above are checked ✅:

1. Position yourself comfortably
2. Start OBS recording
3. Take a breath
4. Start with opening line
5. Follow the script
6. Stay calm if anything goes wrong (backup flows in script)
7. Finish strong!

---

## Emergency Contacts / Resources

- **Script:** `FINAL_DEMO_SCRIPT.md`
- **Quick Reference:** `DEMO_QUICK_REFERENCE.md`
- **Backup Flows:** See FINAL_DEMO_SCRIPT.md Section 5
- **Production URL:** https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app
- **Database Verify:** `pnpm db:apply VERIFY_DEMO_DATA.sql`

---

## After Recording

- [ ] Stop OBS recording
- [ ] Save file immediately
- [ ] Backup file to cloud
- [ ] Watch full recording
- [ ] Check for any issues
- [ ] If good: Proceed to editing
- [ ] If issues: Review and re-record problem sections

---

**You've got this! All the hard work is done. Now just show it off!** 🎬🥋


