# Debug: Chat Requests Not Showing

## Step-by-Step Debugging Guide

### Step 1: Verify Database Setup ✅

Run this in Supabase SQL Editor to check if tables exist:

```sql
-- Check if chat_requests table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'chat_requests'
);

-- Check if email column exists in profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles';

-- Count existing chat requests
SELECT COUNT(*) as total_requests, 
       status, 
       chat_type 
FROM public.chat_requests 
GROUP BY status, chat_type;
```

### Step 2: Fix Email Column Issue 🔧

If `email` column doesn't exist, run this:

```sql
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- Update trigger to include email for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Test Creating a Chat Request 🧪

1. Open your app and click the debug info button (ℹ️) in the chat list
2. Note your user ID and email
3. Click "Create Chat" (+) button
4. Select "Direct Message"
5. Enter another user's email
6. Add them as a member
7. Enter a chat name
8. Click "Create"

**Expected**: You should see "Chat request sent!" notification

### Step 4: Verify Request Was Created 📝

Run this in Supabase SQL Editor:

```sql
-- Check recent chat requests
SELECT 
  cr.*,
  sender.name as sender_name,
  sender.email as sender_email,
  recipient.name as recipient_name,
  recipient.email as recipient_email
FROM public.chat_requests cr
LEFT JOIN public.profiles sender ON cr.from_user_id = sender.id
LEFT JOIN public.profiles recipient ON cr.to_user_id = recipient.id
ORDER BY cr.created_at DESC
LIMIT 10;
```

### Step 5: Check RLS Policies 🔒

Verify policies are working:

```sql
-- Test as sending user
SELECT 
  cr.id,
  cr.status,
  cr.chat_name,
  recipient.name as to_user
FROM public.chat_requests cr
LEFT JOIN public.profiles recipient ON cr.to_user_id = recipient.id
WHERE cr.from_user_id = auth.uid();

-- Test as receiving user  
SELECT 
  cr.id,
  cr.status,
  cr.chat_name,
  sender.name as from_user
FROM public.chat_requests cr
LEFT JOIN public.profiles sender ON cr.from_user_id = sender.id
WHERE cr.to_user_id = auth.uid();
```

### Step 6: Check Browser Console 🔍

Look for these specific errors:
- ❌ **404 errors**: Table doesn't exist (apply migrations)
- ❌ **400 errors**: Column doesn't exist (fix email column)
- ❌ **403 errors**: RLS policy blocking (check policies)

### Step 7: Test with SQL Insert 💉

Manually create a test request to verify the receiving side works:

```sql
-- Replace these UUIDs with your actual user IDs
INSERT INTO public.chat_requests (
  from_user_id,
  to_user_id,
  chat_type,
  chat_name,
  message,
  status
) VALUES (
  'YOUR_USER_1_ID',  -- sender
  'YOUR_USER_2_ID',  -- recipient
  'direct',
  'Test Chat',
  'This is a test message',
  'pending'
);
```

Then log in as the recipient and check the "Requests" tab.

---

## Common Issues & Fixes

### Issue: "column profiles_1.email does not exist"
**Fix**: Run Step 2 above to add email column

### Issue: Request created but not showing in UI
**Cause**: RLS policies blocking the query
**Fix**: Check that you're logged in as the correct user

### Issue: No notification after creating chat
**Check**: 
1. Is `checkExistingChatHistory` working?
2. Is `createChatRequest` being called?
3. Check browser console for errors

### Issue: Request shows for sender but not recipient
**Cause**: Real-time subscription not working or RLS policy issue
**Fix**: 
1. Check RLS policies in Step 5
2. Refresh the page on recipient's side
3. Check browser console for subscription errors

---

## Current Code Issues Found 🐛

### Bug in ChatListPage.vue line 492:
```javascript
// WRONG - checking same user twice
const hasHistory = await checkExistingChatHistory(otherUser.id, otherUser.id)

// SHOULD BE - check between current user and other user
const hasHistory = await checkExistingChatHistory(user.value.id, otherUser.id)
```

This bug won't prevent requests from being created, but it won't properly check for existing chat history.

