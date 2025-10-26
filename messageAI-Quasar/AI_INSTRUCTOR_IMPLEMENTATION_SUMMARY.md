# AI-Powered Instructor Assignment - Implementation Summary

## ✅ Completed (Phase 1-6)

### Phase 1: Debug Empty Instructor List

**Created:**
- `diagnose_instructor_list.sql` - Comprehensive diagnostic queries to check gym members, roles, and instructor assignments

**Modified:**
- `src/composables/useInstructorAssignment.ts`
  - Added detailed console logging with emoji indicators
  - Added debug fallback to show all gym profiles when no instructors found
  - Expanded query to include `role` and `gym_id` fields for debugging

**Next Steps for Fixing:**
1. Run the diagnostic SQL: `pnpm db:apply diagnose_instructor_list.sql`
2. Check console logs when opening ClassDetailsDialog to see what data is returned
3. Verify users have correct `role` field set (`'instructor'` or `'owner'`)
4. Verify users have correct `gym_id` set to match the gym

### Phase 2: AI Tools for Instructor Management

**Added 7 New AI Tools to `useGymAI.ts`:**

1. **`get_instructors`** - List all instructors with their preferences
   - Optional: Include their current class schedule
   - Returns instructor profiles with roles and preferences

2. **`assign_instructor_to_class`** - Assign instructor to a class
   - Validates user is owner/admin
   - Supports one-time or recurring assignments
   - Uses existing `assign_instructor_to_class` database function

3. **`check_schedule_problems`** - Detect scheduling issues
   - Checks for missing instructors (critical if within 48h)
   - Checks for over-capacity classes
   - Checks for instructor conflicts (overlapping assignments)
   - Checks for cancelled classes with active RSVPs
   - Returns problems with severity and suggested actions

4. **`get_instructor_schedule`** - View an instructor's full schedule
   - Shows all classes they're teaching
   - Returns total class count

5. **`send_alert`** - Send notifications to gym members
   - Targets: gym_chat, instructors, or specific users
   - Posts formatted alert messages to chat

6. **`cancel_class_with_notification`** - Cancel class and notify members
   - Validates owner/admin permissions
   - Automatically notifies affected RSVP members
   - Posts cancellation notice to gym chat

### Phase 3: Update AI System Prompt

**Modified: `supabase/functions/gym-ai-assistant/index.ts`**

Added comprehensive instructor management section:
- Natural language examples for assignment
- Proactive problem detection guidelines
- Notification strategy (gym-wide vs instructor-specific)
- Severity levels (CRITICAL, WARNING, INFO)

### Phase 4: Problem Detection Logic

**Created: `src/composables/useScheduleProblems.ts`**

Comprehensive problem detection system:

**Problem Types:**
- `no_instructor` - Classes without assigned instructors
  - **Critical** if within 48 hours
  - **Warning** if further out
- `over_capacity` - Classes exceeding max capacity
  - **Warning** severity
- `instructor_conflict` - Instructors assigned to overlapping classes
  - **Warning** severity
- `cancelled_with_rsvps` - Cancelled classes with active RSVPs
  - **Info** severity

**Features:**
- Checks date ranges (default: next 7 days)
- Provides specific suggested actions for each problem
- Detects time conflicts between classes
- Tracks occurrences of recurring classes

### Phase 5: Notification System Integration

**Implementation in `useGymAI.ts`:**

Notification system leverages existing chat infrastructure:
- **Gym-wide alerts**: Posts to `gym_chat_id`
- **Instructor alerts**: Currently uses gym_chat (future: dedicated instructor chat)
- **Class cancellations**: Auto-notifies RSVPed members

**Message Format:**
```
🚨 Schedule Alert: [Problem Type]
Class: GI - Monday 7:00 PM
Issue: No instructor assigned
Action needed: Assign an instructor or cancel class
```

### Phase 6: Natural Language Examples

**Supported Commands:**

1. **List instructors**
   - "Who are the instructors?"
   - "Show me all instructors"
   - "List instructors with their schedules"

2. **Assign instructor**
   - "Assign John Silva to Monday 7pm GI class"
   - "Make Alex the instructor for Wednesday fundamentals"

3. **Check problems**
   - "Any problems with tomorrow's schedule?"
   - "Are there any classes without instructors?"
   - "Check for scheduling conflicts"

4. **View instructor schedule**
   - "What classes does John teach?"
   - "Show me Alex's schedule"

5. **Send alerts**
   - "Alert the gym about the class cancellation"
   - "Notify instructors about the schedule change"

6. **Cancel with notification**
   - "Cancel tomorrow's 6pm class, instructor is sick"
   - "Cancel Monday GI and notify everyone"

## 📋 Testing Checklist

### 1. Debug Empty Instructor List
- [ ] Run diagnostic SQL to check current data
- [ ] Open ClassDetailsDialog and check console logs
- [ ] Verify instructor roles are set correctly
- [ ] Test instructor assignment dropdown

### 2. Test AI Tools

#### Get Instructors
- [ ] Ask: "Who are the instructors?"
- [ ] Ask: "Show me instructors with their schedules"
- [ ] Verify correct data returned

#### Assign Instructor
- [ ] Ask: "Assign [instructor name] to [day] [time] [class type]"
- [ ] Verify AI calls get_schedule → get_instructors → assign_instructor_to_class
- [ ] Check database that assignment was saved
- [ ] Verify ClassDetailsDialog shows the instructor

#### Check Problems
- [ ] Create a test schedule without an instructor for tomorrow
- [ ] Ask: "Any problems with tomorrow's schedule?"
- [ ] Verify AI returns CRITICAL severity
- [ ] Check suggested actions are provided

#### Schedule Conflicts
- [ ] Assign same instructor to overlapping classes
- [ ] Ask: "Are there any scheduling problems?"
- [ ] Verify conflict detected

#### Send Alert
- [ ] Ask: "Send alert to gym about missing instructor"
- [ ] Check gym chat for the alert message
- [ ] Verify 🚨 emoji appears

#### Cancel with Notification
- [ ] Create RSVPs for a test class
- [ ] Ask: "Cancel [class] because [reason]"
- [ ] Verify class is marked cancelled in database
- [ ] Check gym chat for cancellation notice
- [ ] Verify affected member count is correct

### 3. Multi-Step Workflows

#### Problem → Assign → Verify
- [ ] "Check tomorrow's schedule for problems"
- [ ] (AI reports no instructor for 6pm class)
- [ ] "Assign [instructor] to that class"
- [ ] "Check problems again"
- [ ] Verify problem is resolved

#### Problem → Cancel → Notify
- [ ] "Any issues with this week?"
- [ ] (AI reports class without instructor)
- [ ] "Cancel that class and notify members"
- [ ] Verify cancellation and notifications sent

## 🔧 Configuration

### Owner/Admin Permissions

Most instructor management features require `role = 'owner'`. To grant permissions:

```sql
UPDATE profiles
SET role = 'owner'
WHERE email = 'your-email@example.com';
```

### Instructor Permissions

To mark someone as an instructor:

```sql
UPDATE profiles
SET role = 'instructor'
WHERE email = 'instructor@example.com';
```

Or use the instructor QR code join flow.

## 📁 Files Modified/Created

### Created
- `src/composables/useScheduleProblems.ts` (277 lines)
- `diagnose_instructor_list.sql`
- `AI_INSTRUCTOR_IMPLEMENTATION_SUMMARY.md` (this file)

### Modified
- `src/composables/useGymAI.ts` (+287 lines)
  - Added 7 new tools
  - Added 7 new tool implementations
  - Updated executeTool switch statement
- `src/composables/useInstructorAssignment.ts` (+15 lines)
  - Enhanced logging
  - Added debug fallback
- `supabase/functions/gym-ai-assistant/index.ts` (+35 lines)
  - Enhanced system prompt with instructor management
  - Added natural language examples
  - Added notification strategy

## 🚀 Usage Examples

### For Gym Owners

1. **Morning Check**
   ```
   User: "Any problems with today's classes?"
   AI: [Checks schedule] ✅ All classes have instructors assigned. No issues found.
   ```

2. **Quick Assignment**
   ```
   User: "Assign John Silva to Monday 7pm GI"
   AI: [Gets schedule] [Gets instructors] [Assigns] ✅ Successfully assigned John Silva to GI - Monday 7:00 PM
   ```

3. **Handle Emergency**
   ```
   User: "No instructor for tonight's 6pm class. Should I cancel?"
   AI: [Checks problems] ⚠️ The 6pm NO-GI class has 12 confirmed RSVPs. 
        Options:
        1. Find a backup instructor
        2. Cancel and notify the 12 members
        What would you like to do?
   User: "Cancel it, instructor is sick"
   AI: [Cancels with notification] ✅ Class cancelled. Notification sent to gym chat. 12 members affected.
   ```

4. **Prevent Conflicts**
   ```
   User: "Assign Alex Chen to Wednesday 7pm"
   AI: [Checks schedule] ⚠️ Alex Chen is already teaching Wednesday Fundamentals 6:30-7:30 PM, 
        which overlaps with this class. Would you like to:
        1. Assign a different instructor
        2. Adjust the class time
   ```

## 🔮 Future Enhancements (Not Yet Implemented)

1. **Smart Instructor Suggestions**
   - "Who should teach fundamentals?" → AI analyzes preferences
   - Consider instructor experience, specialties, availability

2. **Automated Coverage Requests**
   - When instructor is missing, auto-post to instructor chat
   - "Need coverage for Monday 7pm GI - who's available?"

3. **Backup Instructor System**
   - Configure backup instructors for each class
   - Auto-assign backups when needed

4. **Scheduled Problem Checks**
   - Daily automated check at 6am
   - Proactive notifications for upcoming problems

5. **Instructor Dashboard**
   - Dedicated view for instructors to see their schedule
   - Mark availability, request time off

## 🐛 Troubleshooting

### "No instructors available" in ClassDetailsDialog

1. Run diagnostic SQL: `pnpm db:apply diagnose_instructor_list.sql`
2. Check console logs for debug output
3. Verify users have `role IN ('instructor', 'owner')`
4. Verify users have correct `gym_id`

### AI doesn't assign instructors

1. Verify user is owner (not instructor or student)
2. Check console for tool execution logs
3. Verify `assign_instructor_to_class` database function exists
4. Check tool parameters are correct (valid UUIDs)

### Alerts not appearing in chat

1. Verify gym has `gym_chat_id` set
2. Check user permissions to post to chat
3. Verify chat exists and is active
4. Check browser console for errors

## 📞 Support

If issues persist:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Run diagnostic SQL and share output
4. Test with simpler queries first ("Who are the instructors?")

---

**Status**: Implementation complete, testing required
**Next Steps**: 
1. Fix empty instructor list (run diagnostic SQL)
2. Test all natural language patterns
3. Verify notifications work correctly



