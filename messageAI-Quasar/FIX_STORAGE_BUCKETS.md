# Fix: Profile Picture Upload Hanging

## Problem
The app hangs when trying to upload a profile picture because the required storage buckets don't exist in Supabase.

## Solution

### Option 1: Run SQL Script (Recommended)
1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm
2. Go to **SQL Editor**
3. Copy and paste the contents of `scripts/create-storage-buckets.sql`
4. Click **Run**
5. Verify you see 2 rows returned showing the buckets were created

### Option 2: Create Manually via Dashboard
1. Go to **Storage** in your Supabase Dashboard
2. Click **New bucket**
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
5. Then run the SQL from `scripts/create-storage-buckets.sql` to set up the policies

## What Changed
I've also improved the ProfilePictureEditor component:
- ✅ Added 30-second timeout for uploads
- ✅ Added detailed logging at each step
- ✅ Added better error messages
- ✅ Shows specific error if storage is misconfigured

## Test After Fix
1. Rebuild the app: `pnpm dev`
2. Try uploading a profile picture again
3. You should now see detailed logs in the console showing each step
4. The upload should complete in a few seconds (or timeout with a clear error message)

