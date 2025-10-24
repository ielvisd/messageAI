# Demo Accounts Setup Guide

This document explains how to set up and use demo accounts for testing the MessageAI gym management features.

## 🎯 Overview

We have 7 different demo student profiles covering various use cases:
- Different age groups (Pee Wee, Kids, Teens, Adults)
- Different skill levels (Fundamentals, All Levels, Advanced)
- Single gym and multi-gym memberships
- Different training preferences (GI, No-GI, Competition)
- Parent who trains

## 📋 Demo Profiles

| Name | Email | Age Category | Gyms | Skill Level | Focus |
|------|-------|-------------|------|-------------|-------|
| **Alex Chen** | alex.student@demo.com | Adult | Jiujitsio | All Levels | Fitness, Competition |
| **Jordan Martinez** | jordan.competitor@demo.com | Adult | Both | Advanced | Competition, Technique |
| **Sam Johnson** | sam.teen@demo.com | Teen (13-17) | Jiujitsio | All Levels | Fitness, Self Defense |
| **Mia Rodriguez** | mia.kid@demo.com | Kid (8-12) | Both | Fundamentals | Fun, Discipline |
| **Taylor Smith** | parent.trainer@demo.com | Adult (Parent) | Jiujitsio West | Fundamentals | Family Activity |
| **Casey Thompson** | casey.beginner@demo.com | Adult | Jiujitsio West | Fundamentals | Fitness, Weight Loss |
| **Lily Williams** | lily.peewee@demo.com | Pee Wee (5-7) | Jiujitsio | All Levels | Fun, Discipline |

**All passwords:** `demo123456`

## 🚀 Setup Instructions

### Option 1: Using the apply script (Recommended)

```bash
cd messageAI-Quasar
pnpm db:apply supabase/migrations/20251025180000_create_demo_students.sql
```

### Option 2: Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20251025180000_create_demo_students.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

### Option 3: Manual Creation via Supabase Auth

For each demo account:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add user**
3. Enter the email and password (demo123456)
4. Confirm the email
5. The migration will automatically associate them with the correct gym

## 🧪 How to Use

### In the App

1. Open the app and navigate to the **Login** page
2. Scroll down to see **"🧪 Quick Demo Login"** section
3. Click the **dropdown** to select a demo profile
4. Each option shows:
   - Name
   - Icon (indicating age/role)
   - Description (age, skill level, gyms)
5. Click **"Login as Selected Profile"**
6. You'll be logged in instantly!

### Testing Different Scenarios

**Multi-Gym Schedule View:**
- Login as **Jordan Martinez** or **Mia Rodriguez** (both are members of both gyms)
- Go to Schedule (left drawer)
- You'll see classes from both Jiujitsio and Jiujitsio West
- Use the gym filter toggles to show/hide each gym's classes

**Single Gym Experience:**
- Login as **Alex Chen**, **Sam Johnson**, or **Lily Williams**
- They only belong to Jiujitsio
- Schedule will only show Jiujitsio classes

**Beginner Focus:**
- Login as **Casey Thompson** or **Taylor Smith**
- Both are at Jiujitsio West with Fundamentals level
- Good for testing beginner-friendly features

**Competition Training:**
- Login as **Jordan Martinez**
- Advanced level, competition focus
- Member of both gyms for more training opportunities

**Age-Specific Testing:**
- **Lily Williams** - Pee Wee (5-7 years)
- **Mia Rodriguez** - Kid (8-12 years)
- **Sam Johnson** - Teen (13-17 years)
- Others - Adults

## 🎨 UI Features

The demo login dropdown includes:
- **Icons** for each profile type
- **Name** of the student
- **Description** with key details
- **Tooltips** for guidance
- **Disabled state** when no profile selected

## ⚠️ Important Notes

1. **First-time Setup**: The migration creates profiles in the database, but you need to create the actual auth users via Supabase Auth or by having them sign up through the app first.

2. **Password**: All demo accounts use the same password: `demo123456`

3. **Data Persistence**: These are real database entries, so any changes made while logged in as a demo account will persist (messages sent, RSVPs, etc.)

4. **Testing Privacy**: Consider periodically resetting demo data if it gets cluttered from testing.

## 🧹 Cleanup

To remove demo accounts and start fresh:

```sql
-- Remove from chat_members
DELETE FROM public.chat_members 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@demo.com'
);

-- Remove profiles
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@demo.com'
);

-- Remove auth users
DELETE FROM auth.users WHERE email LIKE '%@demo.com';
```

Then re-run the migration to recreate them.

## 🎯 Testing Checklist

Use these demo accounts to test:

- [ ] Multi-gym membership (Jordan, Mia)
- [ ] Single gym membership (Alex, Sam, Lily, Casey, Taylor)
- [ ] Schedule filtering by gym
- [ ] Age-appropriate class display
- [ ] Skill level filtering
- [ ] Chat access to gym groups
- [ ] Parent/child account relationships
- [ ] Different training preferences

---

**Pro Tip:** Keep this file open while testing so you can quickly reference which account has which characteristics!

