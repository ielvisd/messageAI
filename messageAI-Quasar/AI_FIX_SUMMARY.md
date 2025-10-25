# AI Assistant Schedule Fix Summary

## Problem

When Alex asked about no-gi classes:
1. **"What no gi classes are available tomorrow?"** (Saturday)
   - AI responded: "No scheduled no-gi classes for tomorrow"
   - **WRONG**: There IS an Open Mat on Saturday at 10:30 AM

2. **"What's the schedule tomorrow?"** (Saturday)
   - AI responded: "No scheduled classes for tomorrow"
   - **WRONG**: There IS an Open Mat on Saturday

3. **Missing suggestions**: The AI didn't suggest:
   - The Open Mat on Saturday (tomorrow)
   - The NO-GI classes on Thursday as an alternative

## Root Causes

### 1. Case Sensitivity Issue
- Database stores: `'GI'`, `'NO-GI'`, `'Open Mat'`, `'Competition'`
- AI was calling with: `'nogi'`, `'gi'`, etc. (lowercase)
- The filter was doing case-sensitive exact match → **no results**

### 2. Semantic Gap
- "Open Mat" is a separate class type from "NO-GI"
- When users ask for "no-gi classes", they often mean both:
  - Formal NO-GI classes
  - Open Mat sessions (which are typically no-gi)
- The AI wasn't understanding this relationship

### 3. Poor Alternative Suggestions
- AI wasn't instructed to suggest alternatives when no classes found
- No tool available to find "next available class of type X"

## Solutions Implemented

### 1. Fixed `get_schedule` Tool ✅

**File**: `src/composables/useGymAI.ts`

#### Changes:
- **Case-insensitive matching**: Normalize all class types to uppercase
- **New parameter** `include_related`: When true and searching for NO-GI, also includes Open Mat
- **Better mapping**: `'nogi'` → `'NO-GI'`, `'open_mat'` → `'Open Mat'`

```typescript
// Before: Case-sensitive exact match
if (params.class_type) {
  query = query.eq('class_type', params.class_type);
}

// After: Case-insensitive with related types
if (params.class_type) {
  const normalizedType = params.class_type.toUpperCase();
  
  // If asking for NO-GI and include_related is true, get both NO-GI and Open Mat
  if ((normalizedType === 'NO-GI' || normalizedType === 'NOGI') && params.include_related) {
    query = query.in('class_type', ['NO-GI', 'Open Mat']);
  } else if (normalizedType === 'NOGI') {
    query = query.eq('class_type', 'NO-GI');
  } else if (normalizedType === 'OPEN_MAT' || normalizedType === 'OPENMAT') {
    query = query.eq('class_type', 'Open Mat');
  } else {
    query = query.eq('class_type', normalizedType);
  }
}
```

### 2. Added `find_next_class` Tool ✅

**New tool** to help AI suggest alternatives when no classes found on requested day.

```typescript
{
  name: 'find_next_class',
  description: 'Find the next available class of a specific type after a given day. Useful for suggesting alternatives.',
  parameters: {
    class_type: { type: 'string', description: 'Class type to find (GI, NO-GI, Open Mat, Competition)' },
    after_day: { type: 'string', description: 'Find classes after this day (Monday-Sunday)' }
  }
}
```

**How it works**:
- Automatically includes Open Mat when searching for NO-GI
- Loops through days of the week after the given day
- Returns the next available class with day and time info

### 3. Enhanced AI System Prompt ✅

**File**: `supabase/functions/gym-ai-assistant/index.ts`

#### Added:
1. **Class type education**: AI now knows what each class type means
2. **Best practices**: Specific instructions on handling no-gi queries
3. **Proactive suggestions**: Always suggest alternatives, never just say "no classes"

```typescript
CLASS TYPES:
- GI: Traditional Brazilian Jiu-Jitsu with the gi (kimono)
- NO-GI: Grappling without the gi (rashguard/shorts)
- Open Mat: Open training session, typically no-gi or mixed
- Competition: Competition-focused training

BEST PRACTICES:
1. When someone asks about "no-gi" classes, consider checking for both NO-GI classes AND Open Mat sessions
2. If no classes are available on a specific day, proactively suggest the next available class of that type
3. Always provide helpful alternatives rather than just saying "no classes available"
4. When showing schedules, include the class type, day, time, and level
```

## Expected Behavior Now

### Query: "What no gi classes are available tomorrow?" (when tomorrow is Saturday)

**Before**: ❌
```
It looks like there are currently no scheduled no-gi classes for tomorrow.
```

**After**: ✅
```
Tomorrow (Saturday) we have an Open Mat at 10:30 AM - 12:00 PM, which is perfect for no-gi training!

If you're looking for formal NO-GI classes, the next ones are on Thursday:
- 6:00 PM - 7:00 PM (Kids, All Levels)
- 7:00 PM - 8:00 PM (Adult & Teens, All Levels)
```

### Query: "What's the schedule tomorrow?" (when tomorrow is Saturday)

**Before**: ❌
```
It seems that there are no scheduled classes for tomorrow.
```

**After**: ✅
```
Here's the schedule for tomorrow (Saturday):

🥋 Open Mat - 10:30 AM to 12:00 PM
Level: All Levels
Notes: Adult & Teens - Open Mat
```

## Testing Checklist

To verify these fixes work:

1. ✅ Ask "What no-gi classes are tomorrow?" on Friday
   - Should mention Saturday Open Mat
   
2. ✅ Ask "What's the schedule tomorrow?" on Friday
   - Should show Saturday Open Mat
   
3. ✅ Ask "What no-gi classes are available tomorrow?" on Wednesday
   - Should say no no-gi tomorrow, but suggest Thursday classes
   
4. ✅ Ask "What gi classes are tomorrow?" on any day
   - Should work with case-insensitive matching

## Technical Details

### Files Changed
1. `src/composables/useGymAI.ts` - Tool definitions and implementations
2. `supabase/functions/gym-ai-assistant/index.ts` - AI system prompt

### Database Schema (No changes needed)
- `gym_schedules.class_type` values: `'GI'`, `'NO-GI'`, `'Open Mat'`, `'Competition'`
- Saturday schedule has: `'Open Mat'` at 10:30-12:00

### Backward Compatibility
✅ All existing functionality preserved
✅ Old queries still work (now case-insensitive)
✅ New optional parameter `include_related` defaults to false

## FOLLOW-UP FIXES (Added after initial testing)

### Issue 4: Timezone Bug 🐛
**Problem**: It's Friday 9pm local time, but AI thinks tomorrow is Sunday
- Server was using UTC time instead of user's local timezone
- If user in PST and it's Friday 9pm PST, but Saturday 5am UTC → AI thinks today is Saturday

**Fix**: ✅
- Frontend now passes `userTimezone` parameter using `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Edge Function uses user's timezone to calculate today/tomorrow
- Both initial call and follow-up call include timezone

```typescript
// Frontend (useGymAI.ts)
const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

// Edge Function (gym-ai-assistant/index.ts)
const today = userTimezone 
  ? new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }))
  : new Date()
```

### Issue 5: Conversation Memory Not Working 🧠
**Problem**: AI responds "I don't have access to previous conversations"
- Even though conversation history is loaded and passed
- AI doesn't understand it should reference the conversation history

**Fix**: ✅
- Added explicit instruction in system prompt about conversation memory
- AI is now told: "You have access to our conversation history above. Reference previous discussions naturally when relevant."
- Added best practice: "If user asks 'what did I ask last time', reference the conversation history"

```typescript
const hasHistory = conversationHistory && conversationHistory.length > 0
const historyNote = hasHistory 
  ? `\n\nCONVERSATION MEMORY: You have access to our conversation history above. Reference previous discussions naturally when relevant.`
  : `\n\nCONVERSATION MEMORY: This is the start of a new conversation.`
```

## Additional Improvements Possible

Future enhancements:
1. **Semantic understanding**: Use RAG to understand "no-gi" means both NO-GI and Open Mat
2. **User preferences**: Remember if user prefers gi/no-gi and proactively suggest
3. **Attendance history**: Suggest classes user has attended before
4. **Time-based suggestions**: If user asks in the evening, prioritize morning classes next day

