# Fix: Profile Picture Upload Hanging/Timeout

## Problem
The app hangs or times out when trying to upload, change, or delete profile pictures because:
1. The required storage buckets (`profile-avatars` and `chat-media`) don't exist in Supabase
2. Or the storage policies are not configured correctly

## Solution

### Step 1: Verify the Issue
Run this to check if buckets exist:
```bash
node scripts/verify-storage-config.js
```

If you see ❌ for `profile-avatars` and `chat-media`, continue to Step 2.

### Step 2: Create Storage Buckets

Choose ONE of these methods:

#### Method A: Via Supabase Dashboard (Easiest) ✅ RECOMMENDED
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/storage/buckets)
2. Click **Storage** → **New bucket**
3. Create `profile-avatars`:
   - Name: `profile-avatars`
   - Public: ✅ Yes
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
4. Create `chat-media`:
   - Name: `chat-media`
   - Public: ✅ Yes  
   - File size limit: 50 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/quicktime`, `video/webm`

#### Method B: Via SQL Editor
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/sql/new)
2. Copy the contents of `scripts/create-storage-buckets.sql`
3. Paste and click **Run**
4. You should see "2 rows returned" showing buckets were created

#### Method C: Via Script (Requires Service Role Key)
1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```bash
   VITE_SUPABASE_URL=https://zjqktoqpsaaigpaygtmm.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Run: `node scripts/create-buckets-js.js`
4. Then run: `pnpm db:apply scripts/create-storage-buckets.sql` (for policies)

### Step 3: Verify the Fix
```bash
node scripts/verify-storage-config.js
```

You should now see ✅ for both buckets.

## What Was Fixed

### Code Improvements
The `ProfilePictureEditor.vue` component now has:
- ✅ Added 10-second timeout for delete operations (was missing, causing hangs)
- ✅ Added 30-second timeout for upload operations
- ✅ Added detailed logging at each step for debugging
- ✅ Better error messages with specific timeout handling
- ✅ Proper error handling for storage configuration issues

### How to Test
1. Restart your dev server: `pnpm dev`
2. Open the app in the simulator
3. Try uploading a profile picture - should work in seconds
4. Try changing the picture - should work without hanging
5. Try deleting the picture - should work without hanging
6. Check browser console for detailed logs showing each step

### Debug Logs
You'll now see helpful logs like:
```
🗑️ Starting avatar removal...
Deleting file from storage: user-id/1234567890.jpg
✅ File deleted from storage
Updating profile to remove avatar_url...
✅ Profile updated
Avatar removal process finished
```

## Common Issues

**"Operation timed out"**: Your internet connection might be slow. The app will now show this clearly instead of hanging forever.

**"Storage configuration error"**: The buckets don't exist. Follow Step 2 above.

**"Permission denied"**: The storage policies aren't set up. Run the SQL from Method B above.

