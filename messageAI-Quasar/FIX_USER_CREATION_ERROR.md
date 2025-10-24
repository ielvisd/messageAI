# Fix "Database Error Checking Email" When Creating Users

## 🔧 The Problem

When trying to create users in Supabase Dashboard, you're getting a database error. This is because:

1. The trigger `on_auth_user_created` tries to insert a profile automatically
2. The INSERT policy on `profiles` table might be missing or too restrictive
3. The trigger function might not have `SECURITY DEFINER` to bypass RLS

## ✅ The Solution

Run this SQL migration to fix the trigger and policies:

### **Go to: Supabase Dashboard → SQL Editor**

Copy and paste the contents of:
```
supabase/migrations/20251025190000_fix_profile_creation.sql
```

Click **Run**

You should see:
```
✅ Profile creation policies updated!
✨ You can now create users via Supabase Dashboard!
```

## 📝 What This Does

1. **Creates a proper INSERT policy** for profiles that allows users to insert their own profile
2. **Updates the trigger function** with `SECURITY DEFINER` so it can bypass RLS when creating profiles
3. **Adds error handling** so user creation doesn't fail even if profile creation has issues
4. **Sets default role** to 'student' for new users

## 🧪 Now Create Demo Users

After running the fix, create the demo users:

### **Go to: Supabase Dashboard → Authentication → Users**

Click **"Add user"** → **"Create new user"** for each:

| Email | Password | Auto Confirm |
|-------|----------|--------------|
| alex.student@demo.com | demo123456 | ✅ YES |
| jordan.competitor@demo.com | demo123456 | ✅ YES |
| sam.teen@demo.com | demo123456 | ✅ YES |
| parent.trainer@demo.com | demo123456 | ✅ YES |
| casey.beginner@demo.com | demo123456 | ✅ YES |

**Important:** Make sure to check **"Auto Confirm User"** checkbox!

## 🔗 Then Link Profiles to Gyms

After creating the users, run this to link them to their gyms:

**Go to: Supabase Dashboard → SQL Editor**

Copy and paste:
```
supabase/migrations/20251025180001_link_demo_profiles.sql
```

Click **Run**

## ✅ Verify It Worked

Check that profiles were created:

```sql
SELECT 
  u.email,
  p.name,
  p.role,
  p.gym_id
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email LIKE '%@demo.com'
ORDER BY u.email;
```

You should see all 5 users with their profiles!

## 🎯 Test in App

1. Open app
2. Go to login page
3. Select "Jordan Martinez" from dropdown
4. Click "Login as Selected Profile"
5. Success! 🎉

---

**Still having issues?** Check:
- ✅ RLS is enabled on profiles table
- ✅ Trigger `on_auth_user_created` exists
- ✅ Function `handle_new_user()` has `SECURITY DEFINER`
- ✅ "Auto Confirm User" was checked when creating users

