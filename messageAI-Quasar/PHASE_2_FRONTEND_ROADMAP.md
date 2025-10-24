# Phase 2: Frontend Implementation Roadmap

## ✅ Phase 1 Complete: Database Migrations
All database structures, functions, and seed data are now in place:
- ✅ 2 gyms (Jiujitsio, Jiujitsio West)
- ✅ 5 instructors at Jiujitsio West with varied preferences
- ✅ Complete schedules for both gyms
- ✅ Multi-gym membership support
- ✅ Instructor preferences system
- ✅ Private lesson infrastructure
- ✅ Class assignment system with AI matching
- ✅ Smart cancellation notifications
- ✅ Parent-child account relationships

---

## 🚀 Phase 2: Frontend Implementation

### Priority 1: Core User Experience (Students)

#### 1.1 Multi-Gym Membership Display
**Where:** Main layout, profile display
**What:**
- Show list of gyms user is a member of
- Display "MessageAI" as main title (already done ✅)
- Add gym switcher if needed

#### 1.2 Combined Schedule View
**Where:** `SchedulePage.vue` (already created ✅)
**What:**
- Show combined schedule from all gyms user is member of
- Add toggles to filter which gyms are displayed
- Color-code by gym
- Show instructor names (if setting enabled)

**Files to modify:**
- `src/pages/SchedulePage.vue`
- `src/components/ScheduleCalendar.vue`

#### 1.3 Schedule Component Enhancement
**What:**
- Fetch schedules from multiple gyms
- Add gym filter toggles (checkboxes for each gym)
- Show instructor assignments on calendar
- Display class details on click

---

### Priority 2: Instructor Features

#### 2.1 Instructor Preferences Settings
**Where:** New settings page for instructors
**What:**
- Age groups they can teach (pee_wees, kids, teens, adults)
- Class types they prefer (gi, no_gi)
- Skill levels they teach (all_levels, fundamentals, advanced)
- Available days and time ranges
- Private lessons enabled toggle

**New file:** `src/pages/InstructorPreferencesPage.vue`

#### 2.2 Self-Assignment to Classes
**Where:** Schedule view for instructors
**What:**
- View open class slots
- Assign themselves to classes
- Request approval if gym setting requires it
- View their upcoming assigned classes

**Files to modify:**
- `src/pages/SchedulePage.vue` (add instructor mode)

#### 2.3 Private Lesson Management
**Where:** New page for instructors
**What:**
- Set recurring availability slots
- View private lesson bookings
- Approve/decline requests
- Manage split lessons (multiple students)

**New files:**
- `src/pages/PrivateLessonsPage.vue`
- `src/components/PrivateLessonSlot.vue`

---

### Priority 3: Owner/Admin Features

#### 3.1 Instructor Assignment Tool (with AI)
**Where:** New admin page
**What:**
- View unassigned classes
- See AI match scores for each instructor
- Assign for: next class, week, month, year
- Auto-fill option based on AI recommendations
- Manual override capability

**New files:**
- `src/pages/InstructorAssignmentPage.vue`
- `src/composables/useInstructorAssignment.ts`

#### 3.2 Class Cancellation Tool
**Where:** Schedule management for admins
**What:**
- Cancel a class
- Show which students will be notified (smart filtering)
- Option to message affected students
- Suggest alternative classes

**Files to modify:**
- `src/pages/SchedulePage.vue` (add admin actions)
- `src/composables/useClassCancellation.ts` (new)

#### 3.3 Gym Settings Management
**Where:** Settings page for owners/admins
**What:**
- Instructors can self-assign (yes/no, approval required)
- AI auto-assignment enabled
- AI confidence threshold
- Show instructor names on student schedules
- Private lesson approval settings per instructor

**New file:** `src/pages/GymSettingsPage.vue`

#### 3.4 Instructor QR Code Management
**Where:** Gym dashboard
**What:**
- Generate/display instructor recruitment QR code
- Separate from student QR code
- Shows number of instructors recruited via QR

**Files to modify:**
- `src/pages/GymDashboardPage.vue`

---

### Priority 4: Parent/Dependent Features

#### 4.1 Add Dependent Accounts
**Where:** Parent profile settings
**What:**
- Add children as dependents
- Set birthdate (auto-calculates age category)
- Override age category if needed
- Distinguish "parent who trains" vs "parent who only has kids who train"

**New file:** `src/pages/DependentsPage.vue`

#### 4.2 Parent Dashboard View
**Where:** Main dashboard for parents
**What:**
- See combined schedule for self + all dependents
- Receive notifications for kids' class cancellations
- Manage dependent profiles

---

## 📋 Implementation Order

### Week 1: Student Experience
1. ✅ Multi-gym toolbar (already done)
2. Combined schedule view with gym filters
3. Instructor display on schedule (if enabled)

### Week 2: Instructor Core
4. Instructor preferences settings
5. Self-assignment to classes
6. Private lesson availability setup

### Week 3: Admin Tools
7. Instructor assignment tool with AI matching
8. Class cancellation with smart notifications
9. Gym settings management

### Week 4: Advanced Features
10. Parent/dependent management
11. Private lesson booking flow
12. Instructor QR codes

---

## 🛠️ Technical Approach

### State Management
- Use existing `src/state/auth.ts` for user profile
- Create new state files:
  - `src/state/schedule.ts` - Multi-gym schedule state
  - `src/state/instructors.ts` - Instructor management
  - `src/state/gym-settings.ts` - Gym configuration

### Composables (Business Logic)
- `src/composables/useSchedule.ts` - Fetch/manage schedules
- `src/composables/useInstructorAssignment.ts` - AI assignment logic
- `src/composables/usePrivateLessons.ts` - Private lesson management
- `src/composables/useClassCancellation.ts` - Cancellation logic

### Supabase RPC Calls
All the database functions are ready:
- `assign_instructor_to_class()`
- `get_available_instructors()`
- `bulk_assign_instructor()`
- `cancel_class()`
- `get_affected_students()`
- `get_cancellation_alternatives()`
- `join_gym_as_instructor()`

---

## 🎯 Next Immediate Steps

1. **Verify the migrations worked** - Run `VERIFY_MIGRATIONS_QUICK.sql` in Supabase SQL Editor
2. **Start with Schedule Enhancement** - Most visible user-facing feature
3. **Test with existing user** - Join the second gym (Jiujitsio West) to test multi-gym

### Ready to Start?
Let me know which feature you'd like to tackle first, or if you'd like me to:
- A) Start with the combined schedule view (student-facing)
- B) Build the instructor preferences settings (instructor-facing)
- C) Create the AI-powered assignment tool (admin-facing)
- D) Something else?




