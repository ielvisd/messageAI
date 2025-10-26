# AI Session Management - Smart Session Breaks

## What Was Implemented

We've implemented a lightweight "smart session break" system that allows the AI to start fresh conversations when users click on proactive alerts, while preserving all previous conversations in the database.

## How It Works

### 1. **Alert Click → Fresh Session**
When a user clicks an action item from the AI Insights Widget:
- Sets `ai_start_fresh` flag in sessionStorage
- Navigates to AI Assistant page
- Clears the in-memory conversation (but DB record remains)
- Auto-sends contextual message about the specific problem

### 2. **Manual "Start New Conversation"**
When user clicks the refresh button in AI Assistant header:
- Clears `conversationId` to null (forces new DB record on next message)
- Clears in-memory messages **temporarily**
- Shows confirmation: "Conversation cleared. Refresh to restore, or start chatting fresh."
- **Does NOT persist** - page refresh will reload last conversation from DB
- Next message sent will create a new conversation in DB

### 3. **Conversation Preservation**
- Old conversations are **automatically saved** to `ai_conversations` table
- Each conversation has: `user_id`, `gym_id`, `messages`, `conversation_state`, `timestamps`
- Currently loads "most recent" conversation per user/gym
- All old conversations remain in DB for future retrieval

## Benefits

✅ **No Database Changes** - Uses existing schema  
✅ **Clean Context** - Alerts start focused conversations  
✅ **Data Preserved** - All history stays in database  
✅ **Simple UX** - Clear user feedback on what's happening  
✅ **Flexible** - Easy to add session history UI later  

## User Experience

**Before:** Alert clicks added to ongoing conversation (context pollution)  
**After:** Alert clicks start fresh, focused conversation  

**Example Flow:**
1. User chats: "What classes are tomorrow?"
2. AI responds with schedule
3. User sees critical alert: "No instructor for Monday 7pm GI"
4. User clicks alert
5. 🆕 **NEW conversation starts** with focus on that specific problem
6. Old conversation about "tomorrow's classes" is saved but not lost

## Future Enhancement (Phase 2)

If users request it post-demo, can add:
- Conversation history dropdown
- Session titles (auto-generated from first message)
- `is_active` flag in database for better querying
- View/restore past conversations

## Files Modified

1. **AIInsightsWidget.vue** - Sets fresh session flag on alert click + forces navigation with query param
2. **AIAssistantPage.vue** - Detects flag and starts fresh conversation
3. **AIAssistantPage.vue** - Updated "Start New Conversation" button
4. **AIAssistantPage.vue** - Added route watcher to handle alerts when already on page
5. **useGymAI.ts** - Added `skipHistory` option to `initialize()` function
6. **useGymAI.ts** - Exported `conversationId` for session management

## Technical Implementation

### Handling "Already on Page" Scenario
When clicking an alert while already on `/ai-assistant`:
- Adds timestamp query param (`?t=timestamp`) to force route change
- Route watcher detects query change and re-runs session initialization
- Prevents need for manual page refresh

### "Start New Conversation" Behavior
When clicking "Start New Conversation":
1. Clears UI state only (temporary)
2. Page refresh will reload last conversation from DB
3. If user sends a message while cleared, that creates a new conversation
4. Gives users option to "undo" by refreshing, or commit to new conversation by chatting

**Why this approach?**
- Browser refresh (F5) = always restore last conversation (expected behavior)
- "Start New" button = temporary clear for fresh context
- Alert clicks = persistent new session (actual new conversation)

## Testing

To test the flow:
1. Start a conversation in AI Assistant
2. Ask a few questions (e.g., "Show me tomorrow's schedule")
3. Navigate to dashboard and expand AI widget
4. Click on any alert
5. ✅ Should see fresh conversation start with alert context
6. ✅ Old conversation still saved in database (check `ai_conversations` table)

## Database Query

To see all conversations for a user:
```sql
SELECT 
  id,
  created_at,
  updated_at,
  messages->0->>'content' as first_message,
  jsonb_array_length(messages) as message_count
FROM ai_conversations
WHERE user_id = 'your-user-id'
ORDER BY updated_at DESC;
```

## Notes

- No breaking changes - existing conversations continue to work
- Backward compatible with current database schema
- Uses sessionStorage for cross-component communication
- Console logs added for debugging (`🆕 Starting fresh AI conversation...`)

