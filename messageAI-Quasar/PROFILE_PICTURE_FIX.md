# Profile Picture Fix - Quick Start

## What Was Wrong
Your profile pictures were hanging/timing out because:
1. ❌ Storage buckets don't exist in Supabase
2. ❌ Delete operations had no timeout (would hang forever)

## What I Fixed
✅ Added 10-second timeouts to delete operations  
✅ Added 30-second timeouts to upload operations  
✅ Added detailed logging for debugging  
✅ Better error messages  

## What You Need to Do Now

### Quick Fix (5 minutes) - Via Supabase Dashboard

1. **Open Supabase Storage Dashboard:**
   https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/storage/buckets

2. **Create `profile-avatars` bucket:**
   - Click "New bucket"
   - Name: `profile-avatars`
   - Public: ✅ Yes
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Click "Create bucket"

3. **Create `chat-media` bucket:**
   - Click "New bucket" again
   - Name: `chat-media`
   - Public: ✅ Yes
   - File size limit: 50 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/quicktime`, `video/webm`
   - Click "Create bucket"

4. **Set up storage policies (IMPORTANT):**
   - Go to: https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/sql/new
   - Copy ALL contents from: `messageAI-Quasar/scripts/create-storage-buckets.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Should see "2 rows" in results

5. **Test it:**
   ```bash
   # In your terminal, verify buckets exist:
   cd messageAI-Quasar
   node scripts/verify-storage-config.js
   
   # Should show:
   # ✅ profile-avatars
   # ✅ chat-media
   ```

6. **Restart your dev server and test:**
   ```bash
   pnpm dev
   ```
   - Open simulator
   - Try uploading/changing/deleting profile picture
   - Should work without hanging!
   - Check browser console for helpful logs

## Troubleshooting

**Still timing out after 10 seconds?**
- Check your internet connection
- The new code will show clear timeout errors instead of hanging forever

**"Permission denied" errors?**
- Make sure you ran the SQL from step 4 above
- This sets up the storage policies

**Want more details?**
- See `FIX_STORAGE_BUCKETS.md` for alternative methods
- Or `scripts/verify-storage-config.js` to diagnose issues

