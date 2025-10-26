# Production Deployment Test Checklist

**Production URL:** https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app

**Deployed:** October 26, 2025

---

## 🧪 **Test This NOW** (5 minutes)

Open your production URL and verify each item:

### 1. App Loads
- [ ] Visit https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app
- [ ] Page loads without errors
- [ ] No blank white screen
- [ ] Landing page or login visible

### 2. Authentication
- [ ] Can navigate to `/login`
- [ ] Login form is visible
- [ ] Test login with: `owner@jiujitsio.com` / `password123`
- [ ] Successful login redirects to dashboard/chats

### 3. Core Messaging
- [ ] Chat list loads
- [ ] Can click into a chat
- [ ] Can type a message
- [ ] Can send a message
- [ ] Message appears in chat

### 4. AI Assistant
- [ ] Navigate to AI Assistant (icon in header)
- [ ] AI welcome screen shows
- [ ] Can type a message: "What classes are available tomorrow?"
- [ ] AI responds (within 5 seconds)
- [ ] Response is formatted (markdown rendered)

### 5. Real-Time Features
- [ ] Send a message in chat
- [ ] Check if it updates without refresh
- [ ] Online status indicator works

### 6. No Console Errors
- [ ] Open DevTools (F12)
- [ ] Check Console tab
- [ ] No critical errors (red text)
- [ ] Warnings are OK, but no blockers

---

## ✅ **Expected Results**

**If ALL tests pass:**
- Your deployment is **production-ready**
- You can use this URL for your demo
- **Grade impact:** +3 points (now at 93/100)

**If some tests fail:**
- Note which ones fail
- Common issues and fixes below

---

## 🐛 **Common Issues & Fixes**

### Issue: "Blank white screen"
**Cause:** Environment variables not set

**Fix:**
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Verify these exist:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. If missing, add them and redeploy: `vercel --prod`

### Issue: "Login fails" or "Network error"
**Cause:** Supabase not accessible or wrong URL

**Fix:**
1. Check `.env` file locally has correct Supabase credentials
2. Verify same credentials in Vercel environment variables
3. Test Supabase connection: Go to https://supabase.com/dashboard
4. Make sure project isn't paused

### Issue: "AI Assistant returns 500 error"
**Cause:** Edge Function not deployed or OpenAI key missing

**Fix:**
1. Check Edge Function is deployed:
   ```bash
   supabase functions list
   ```
2. Check OpenAI key is set:
   ```bash
   supabase secrets list
   ```
3. If missing:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-key-here
   supabase functions deploy gym-ai-assistant
   ```

### Issue: "Real-time doesn't work"
**Cause:** Supabase Realtime not enabled

**Fix:**
1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for:
   - `messages`
   - `chats`
   - `chat_members`
   - `chat_requests`

### Issue: "CORS errors in console"
**Cause:** Supabase needs Vercel domain allowlisted

**Fix:**
1. Go to Supabase Dashboard → Settings → API
2. Add your Vercel domain to allowed origins
3. No trailing slash: `https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app`

---

## 📊 **Test Results**

Fill this out after testing:

**Test Date:** _______________

**App Loads:** ✅ / ❌  
**Authentication:** ✅ / ❌  
**Core Messaging:** ✅ / ❌  
**AI Assistant:** ✅ / ❌  
**Real-Time:** ✅ / ❌  
**No Errors:** ✅ / ❌  

**Overall Status:** PASS / FAIL

**Notes:**
```
[Add any observations here]
```

---

## 🎯 **After Testing**

**If tests PASS:**
1. ✅ Mark this checklist complete
2. ✅ Move to demo data preparation
3. ✅ Practice demo with production URL
4. ✅ You're 95% ready!

**If tests FAIL:**
1. Note which specific test failed
2. Try the fixes above
3. If stuck, focus on what DOES work in demo
4. Have localhost backup ready

---

## 🚀 **Next Steps**

After verifying production:

1. **Prepare Demo Data** (15 min)
   - Login as owner
   - Verify schedules exist
   - Create one schedule without instructor
   - Have 1-2 existing chats

2. **Practice Demo** (20 min)
   - Read `DEMO_SCRIPT.md`
   - Follow it exactly with production URL
   - Time yourself (should be ~7 minutes)

3. **Final Polish** (10 min)
   - Clear browser cache
   - Close unnecessary tabs
   - Have script open in another window

**Total time to demo-ready: 45 minutes**

---

**Production URL:** https://messageai-nam6rx82j-elvis-ibarras-projects.vercel.app

**Go test it NOW!** 🚀

