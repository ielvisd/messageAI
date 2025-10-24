# How to Create Demo Accounts Properly

**Important:** SQL migrations can't set passwords for Supabase Auth users. You must create them through the Supabase Dashboard.

## 🚀 Quick Setup (5 minutes)

### Step 1: Go to Supabase Dashboard

1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Select your project
4. Navigate to: **Authentication → Users**

### Step 2: Create Each Demo User

For each email below, click **"Add user"** → **"Create new user"**:

#### 1. Alex Chen (Adult, All Levels, Jiujitsio)
- **Email:** `alex.student@demo.com`
- **Password:** `demo123456`
- **Auto Confirm User:** ✅ YES
- Click **Create user**

#### 2. Jordan Martinez (Advanced, Both Gyms, Competitor)
- **Email:** `jordan.competitor@demo.com`
- **Password:** `demo123456`
- **Auto Confirm User:** ✅ YES
- Click **Create user**

#### 3. Sam Johnson (Teen 15+, Jiujitsio)
- **Email:** `sam.teen@demo.com`
- **Password:** `demo123456`
- **Auto Confirm User:** ✅ YES
- Click **Create user**

#### 4. Taylor Smith (Parent Who Trains, Jiujitsio West)
- **Email:** `parent.trainer@demo.com`
- **Password:** `demo123456`
- **Auto Confirm User:** ✅ YES
- Click **Create user**

#### 5. Casey Thompson (Beginner, Jiujitsio West)
- **Email:** `casey.beginner@demo.com`
- **Password:** `demo123456`
- **Auto Confirm User:** ✅ YES
- Click **Create user**

### Step 3: Run the SQL Migration to Set Up Profiles

Now that the auth users exist, run the SQL migration to create their profiles and gym associations:

**Option A: SQL Editor (Recommended)**
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/20251025180000_create_demo_students.sql`
4. Paste into the editor
5. Click **Run**

**Option B: Via Supabase CLI (if you have it set up)**
```bash
supabase db push --db-url "your-connection-string"
```

### Step 4: Test It!

1. Open your app
2. Go to login page
3. Select a demo profile from the dropdown
4. Click "Login as Selected Profile"
5. You should be logged in! 🎉

## 📋 Demo Account Summary

| Name | Email | Age | Gyms | Level |
|------|-------|-----|------|-------|
| Alex Chen | alex.student@demo.com | Adult | Jiujitsio | All Levels |
| Jordan Martinez | jordan.competitor@demo.com | Adult | Both | Advanced |
| Sam Johnson | sam.teen@demo.com | Teen | Jiujitsio | All Levels |
| Taylor Smith | parent.trainer@demo.com | Adult | West | Fundamentals |
| Casey Thompson | casey.beginner@demo.com | Adult | West | Fundamentals |

**All passwords:** `demo123456`

## 🔍 Verify Setup

After creating the users and running the migration, verify in **SQL Editor**:

```sql
-- Check that profiles were created
SELECT 
  p.name,
  p.role,
  p.age_category,
  array_length(p.gym_ids, 1) as num_gyms,
  g.name as current_gym
FROM profiles p
LEFT JOIN gyms g ON g.id = p.gym_id
WHERE p.id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.com'
)
ORDER BY p.name;
```

You should see all 5 profiles with their correct gyms and details.

## ⚠️ Troubleshooting

### "Invalid login credentials" error
- Make sure you clicked **"Auto Confirm User"** when creating the account
- Or manually confirm the email in Dashboard → Authentication → Users → [user] → "Confirm email"

### "Demo account not found" error
- The auth user wasn't created yet - go back to Step 2
- Double-check the email is spelled exactly right

### User created but no gym/profile
- Run the SQL migration from Step 3
- The migration links the auth user to their profile and gym

### psql password authentication failed
- This is normal! The SQL script can't create passwords
- Just create users via Dashboard (Step 2) instead

## 🎯 Why This Way?

Supabase Auth uses bcrypt password hashing with specific salt generation that can't be replicated in SQL migrations. The Dashboard handles this properly, so we:

1. **Create auth users** via Dashboard (with passwords)
2. **Create profiles** via SQL migration (links them to gyms)

This two-step process ensures everything works correctly!

---

**Pro Tip:** Bookmark this page - you can use it to recreate demo accounts anytime you need fresh test data!
