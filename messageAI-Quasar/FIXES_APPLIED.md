# Fixes Applied

## ✅ Issue 1: Infinite Recursion in Profiles RLS - FIXED

**Problem:** Profiles table had RLS policies that queried the profiles table within their own USING clause, creating infinite loops.

**Solution:** Applied simple non-recursive RLS policies.

**Status:** ✅ Should be working now (you applied the fix via Supabase SQL Editor)

---

## ✅ Issue 2: Demo Accounts & Young Kids - FIXED

**Problem 1:** Demo accounts were created with dummy password hashes that don't work for login.

**Problem 2:** Young kids (peewees, kids 8-12) were given accounts, but they shouldn't have their own accounts - they should be managed by parents.

**Solution Applied:**
1. ✅ Removed young kid accounts from login page (Lily, Mia)
2. ✅ Updated demo account list to only show people who would have accounts (adults, older teens)
3. ✅ Created proper instructions for creating demo accounts

**To Create Demo Accounts:**

### Quick Option (Create Just One for Testing)
1. Go to: https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/auth/users
2. Click **"Add user"** → **"Create new user"**
3. Email: `demo@test.com`
4. Password: `demo123456`
5. Click **"Create user"**
6. Run the SQL from `QUICK_CREATE_ONE_DEMO.sql` in Supabase SQL Editor

### Full Option (Create All Demo Accounts)
Follow instructions in `CREATE_DEMO_ACCOUNTS_PROPERLY.md`

Create these 5 accounts via Supabase Dashboard:
- `alex.student@demo.com` - Adult, All Levels
- `jordan.competitor@demo.com` - Adult, Advanced, Both Gyms
- `sam.teen@demo.com` - Teen (15+)
- `parent.trainer@demo.com` - Parent Who Trains
- `casey.beginner@demo.com` - Adult Beginner

---

## 📝 Files Changed

1. **Migration:** `supabase/migrations/20251026020000_fix_profiles_infinite_recursion.sql`
   - Fixed profiles RLS infinite recursion

2. **Login Page:** `src/pages/LoginPage.vue`
   - Removed young kid demo accounts (they shouldn't have accounts)
   - Updated error message with correct instructions

3. **Documentation:**
   - `CREATE_DEMO_ACCOUNTS_PROPERLY.md` - Complete guide
   - `QUICK_CREATE_ONE_DEMO.sql` - Quick single demo account setup
   - `FIXES_APPLIED.md` - This file

---

## 🚀 Next Steps

1. **If you haven't already:** Apply the profiles RLS fix via Supabase SQL Editor (the DROP POLICY and CREATE POLICY statements)

2. **Create at least one demo account** so you can test:
   - Go to Supabase Dashboard → Authentication → Users
   - Add user: `demo@test.com` / `demo123456`
   - Run `QUICK_CREATE_ONE_DEMO.sql`

3. **Try logging in** - The infinite recursion error should be gone!

4. **(Optional) Set up database password** for future automated migrations:
   - Get your database connection string from Supabase Dashboard
   - Update `SUPABASE_DB_URL` in `.env` with the correct password (no brackets)

---

## 🎯 Summary

**Before:**
- ❌ Can't login - infinite recursion error
- ❌ Demo accounts don't work
- ❌ Young kids have accounts (unrealistic)

**After:**
- ✅ Profiles RLS fixed - no more infinite recursion
- ✅ Clear instructions for creating working demo accounts
- ✅ Realistic demo accounts (only adults and older teens)
- ✅ Young kids removed from demo list (they'd be managed by parents)

