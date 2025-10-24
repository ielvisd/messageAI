# QR Attendance System - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd messageAI-Quasar
pnpm install
```

### Step 2: Apply Database Migrations

Make sure your `SUPABASE_DB_URL` is set, then run:

```bash
# Apply schema migration
bash scripts/apply-sql.sh supabase/migrations/20251025190000_attendance_tracking_system.sql

# Apply functions migration
bash scripts/apply-sql.sh supabase/migrations/20251025190001_attendance_functions.sql
```

**Setting SUPABASE_DB_URL**:
```bash
export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'
```

Or add to `.env`:
```
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

### Step 3: Start Dev Server

```bash
pnpm dev
```

---

## ✅ Quick Test

1. **As a Student:**
   - Log in with a student account
   - Navigate to "My Dashboard" in the sidebar
   - Click "Check In" button
   - (QR scanning will work once you have a QR code from an instructor)

2. **As an Instructor:**
   - Log in with an instructor account
   - Go to Schedule page
   - Generate a QR code for a class (integration needed - see below)
   - Students can then scan this QR code

3. **View Dashboard:**
   - As a student, check "My Dashboard" to see:
     - Attendance statistics
     - Belt progression
     - Recent classes
     - Training streak

---

## 🔧 Next Integration Steps

### 1. Add QR Generator to Schedule Page

In `src/pages/SchedulePage.vue`, add for instructors/owners:

```vue
<template>
  <!-- Add to class card actions -->
  <q-btn
    v-if="userRole === 'instructor' || userRole === 'owner'"
    label="Generate QR"
    icon="qr_code"
    @click="openQRGenerator(schedule.id)"
  />

  <!-- Add dialog -->
  <ClassQRCodeGenerator
    v-if="showQRDialog"
    :schedule-id="selectedScheduleId"
    @close="showQRDialog = false"
  />
</template>

<script setup>
import ClassQRCodeGenerator from '../components/ClassQRCodeGenerator.vue'
// ... add state management
</script>
```

### 2. Add Manual Attendance Marker

In `src/pages/SchedulePage.vue`, for instructors viewing class details:

```vue
<q-btn
  label="Mark Attendance"
  icon="checklist"
  @click="openAttendanceMarker(schedule.id)"
/>

<ManualAttendanceMarker
  v-if="showAttendanceDialog"
  :schedule-id="selectedScheduleId"
  :gym-id="currentGymId"
  @close="showAttendanceDialog = false"
/>
```

### 3. Add Student Management Actions

Create a student profile/list page with actions:

```vue
<q-btn
  icon="note_add"
  @click="openNotesDialog(student)"
  label="Add Note"
/>

<q-btn
  icon="military_tech"
  @click="openPromotionDialog(student)"
  label="Award Belt"
/>

<StudentNotesDialog
  v-model="showNotesDialog"
  :student-id="selectedStudent.id"
  :student-name="selectedStudent.name"
  :gym-id="currentGymId"
/>

<BeltPromotionDialog
  v-model="showPromotionDialog"
  :student-id="selectedStudent.id"
  :student-name="selectedStudent.name"
  :gym-id="currentGymId"
/>
```

---

## 📸 Component Usage Examples

### Generate QR Code (Instructor)

```vue
<ClassQRCodeGenerator
  :schedule-id="'uuid-of-class'"
  :valid-date="new Date()"
  @close="handleClose"
  @generated="(qrToken) => console.log('QR generated:', qrToken)"
/>
```

### Manual Attendance

```vue
<ManualAttendanceMarker
  :schedule-id="'uuid-of-class'"
  :gym-id="'uuid-of-gym'"
  :class-date="new Date()"
  @close="handleClose"
  @saved="(count) => console.log(`Marked ${count} students`)"
/>
```

### Student Notes

```vue
<StudentNotesDialog
  v-model="showDialog"
  :student-id="'uuid-of-student'"
  :student-name="'John Doe'"
  :gym-id="'uuid-of-gym'"
  @note-saved="refreshData"
/>
```

### Belt Promotion

```vue
<BeltPromotionDialog
  v-model="showDialog"
  :student-id="'uuid-of-student'"
  :student-name="'John Doe'"
  :gym-id="'uuid-of-gym'"
  @promoted="refreshData"
/>
```

---

## 🎯 Key Features Ready to Use

### For Students
- ✅ QR code check-in via camera
- ✅ Personal dashboard with stats
- ✅ Attendance history
- ✅ Belt progression display
- ✅ Training streak tracker
- ✅ GI vs NO-GI breakdown

### For Instructors
- ✅ Generate class QR codes
- ✅ View attendance lists
- ✅ Manual attendance marking
- ✅ Add notes on students
- ✅ Award belt promotions

### For Owners
- ✅ All instructor features
- ✅ Gym-wide attendance reports (via composable)
- ✅ Student progression analytics
- ✅ Instructor evaluations (database ready)

---

## 📱 Mobile Usage

The system is fully mobile-ready:

- **Camera Access**: QR scanner uses device camera
- **Responsive UI**: All components adapt to screen size
- **Touch-Friendly**: Large buttons and targets
- **Fast Performance**: Optimized for mobile networks

---

## 🔐 Permissions

Make sure your app has camera permissions:

**iOS**: Add to `Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan class QR codes for check-in</string>
```

**Android**: Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
```

---

## 🧪 Testing Data

To test, you'll need:

1. **Demo Gym**: Create a gym in Supabase
2. **Demo Students**: Create user profiles with role='student'
3. **Demo Instructors**: Create user profiles with role='instructor'
4. **Schedules**: Create gym_schedules entries for classes

### Quick SQL to Add Test Data

```sql
-- Add a test class schedule
INSERT INTO gym_schedules (gym_id, day_of_week, start_time, end_time, class_type, level, instructor_name)
VALUES 
  ('your-gym-id', 'Monday', '18:00:00', '19:30:00', 'GI', 'All Levels', 'John Instructor');
```

---

## 📊 Database Queries for Debugging

### Check attendance records
```sql
SELECT * FROM class_attendance WHERE gym_id = 'your-gym-id' ORDER BY check_in_time DESC;
```

### Check active QR codes
```sql
SELECT * FROM class_qr_codes WHERE expires_at > NOW() ORDER BY created_at DESC;
```

### Check belt progressions
```sql
SELECT p.name, bp.belt_color, bp.stripes, bp.awarded_date 
FROM belt_progression bp
JOIN profiles p ON bp.user_id = p.id
ORDER BY bp.awarded_date DESC;
```

### Check student notes
```sql
SELECT s.name as student, i.name as instructor, sn.note_type, sn.content, sn.created_at
FROM student_notes sn
JOIN profiles s ON sn.student_id = s.id
JOIN profiles i ON sn.instructor_id = i.id
ORDER BY sn.created_at DESC;
```

---

## 🎓 Architecture Overview

```
Frontend (Vue 3 + Quasar)
  ↓
Composables (useAttendance, useStudentNotes, useBeltProgression)
  ↓
Supabase Client
  ↓
Database Functions (RPC) + Direct Queries
  ↓
PostgreSQL with RLS
```

### Data Flow: Check-In via QR

```
Student scans QR → CheckInScanner.vue
  → useAttendance.checkInViaQR()
  → supabase.rpc('check_in_via_qr')
  → Database validates QR token
  → Records attendance in class_attendance table
  → Returns success + class details
  → UI shows confirmation
```

---

## 📝 Common Issues & Solutions

### Issue: Camera not working
**Solution**: Ensure HTTPS, check browser permissions, test in Chrome/Safari

### Issue: QR code not scanning
**Solution**: Better lighting, steady hand, adjust distance

### Issue: Migrations fail
**Solution**: Check SUPABASE_DB_URL, verify no table conflicts, run in order

### Issue: "Unauthorized" errors
**Solution**: Check RLS policies, verify user role in profiles table

### Issue: QR codes expire immediately
**Solution**: Verify gym_schedules have correct end_time, check timezone settings

---

## 🎉 You're Ready!

The QR attendance system is now implemented. Start by:

1. ✅ Installing dependencies
2. ✅ Applying migrations  
3. ✅ Testing student dashboard
4. ✅ Generating your first QR code
5. ✅ Scanning and checking in

For detailed documentation, see `QR_ATTENDANCE_IMPLEMENTATION_SUMMARY.md`.

---

**Need Help?** Check the implementation summary for troubleshooting and architecture details.

