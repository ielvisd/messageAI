# Chat Deletion Fix - Implementation Summary

## Problem Statement
1. Users could "delete" gym group chats (shouldn't be allowed)
2. DM deletion tried to delete the entire chat for both parties, causing it to reappear on refresh
3. Frontend was directly deleting chat records instead of using proper leave/hide logic

## Solution Implemented

### 1. Database Migration
**File**: `supabase/migrations/20251027000000_fix_chat_deletion_behavior.sql`

Updated the `leave_or_delete_chat()` function to handle three scenarios:

#### Gym Group Chats
- Checks if the chat is linked to a gym (via `gyms.gym_chat_id`)
- Returns `'cannot_leave_gym_chat'` error
- Prevents users from leaving their gym's main group chat

#### Direct Messages (DMs)
- Only removes the current user from `chat_members` table
- Chat remains in database for the other person
- Returns `'chat_hidden'`
- If the other person messages again, the conversation reappears

#### Regular Group Chats
- If user is the last member OR the creator: deletes entire chat
- Otherwise: removes user from `chat_members` (leave group)
- Returns `'chat_deleted'` or `'left_chat'`

### 2. Frontend Composable
**File**: `src/composables/useChatList.ts`

Updated three functions:

#### `deleteChat(chatId)`
- Changed return type to `{ success: boolean; result?: string; message?: string }`
- Now calls `supabase.rpc('leave_or_delete_chat', { chat_id_param: chatId })`
- Handles all possible return values with appropriate messages
- Updates local state to remove the chat from the UI

#### `deleteMultipleChats(chatIds)`
- Changed return type to `{ success: boolean; skipped: string[]; errors: string[] }`
- Iterates through each chat and calls `deleteChat()`
- Tracks which gym chats were skipped
- Returns detailed results for better user feedback

#### `deleteAllChats()`
- Changed return type to match `deleteMultipleChats`
- Uses `deleteMultipleChats()` internally
- Properly handles gym chats by skipping them

### 3. Frontend UI
**File**: `src/pages/ChatListPage.vue`

Updated three handler functions:

#### `handleDeleteChat(chatId)`
- Detects chat type (DM vs group)
- Shows appropriate confirmation message:
  - DM: "Hide this conversation? You can resume it by messaging this person again."
  - Group: "Leave this group chat?"
- Shows warning notification for gym chats with caption explaining why
- Shows success message based on result type

#### `handleDeleteSelected()`
- Updated confirmation to mention gym chats will be skipped
- Shows count of deleted chats and skipped gym chats
- Displays informative notifications with captions

#### `handleDeleteAll()`
- Updated confirmation to mention gym chats will be skipped
- Shows count of deleted chats and skipped gym chats
- Handles edge case where no chats were deleted (all were gym chats)

## Expected Behavior

### Gym Group Chats
- ❌ **Cannot delete/leave**: User sees warning notification
- Message: "Cannot leave your gym's main chat"
- Caption: "This is your gym's main group chat"

### Direct Messages (DMs)
- ✅ **Hidden for current user only**: Conversation removed from their chat list
- ✅ **Other person keeps chat**: They still see all messages
- ✅ **Reappears on new message**: If other person messages, chat comes back
- Success message: "Conversation hidden"

### Regular Group Chats
- ✅ **Leave group**: Removes user from members, chat continues for others
- ✅ **Delete if last member**: Entire chat deleted if user is last one
- ✅ **Delete if creator**: Creator can delete entire chat for everyone
- Success message: "Left group chat" or "Chat deleted successfully"

## Database Changes

The migration updates the `leave_or_delete_chat()` function with:
- Check for gym chat linkage
- DM-specific hide logic
- Proper return values for all scenarios

## To Apply Changes

### 1. Apply Database Migration
```bash
cd messageAI-Quasar
pnpm db:apply supabase/migrations/20251027000000_fix_chat_deletion_behavior.sql
```

### 2. Restart Dev Server (if running)
```bash
pnpm dev
```

### 3. Test Scenarios
1. Try to delete a gym group chat → Should show warning
2. Delete a DM → Should hide for you only
3. Have the other person message you → DM should reappear
4. Leave a regular group chat → Should remove you from members
5. Delete multiple chats including gym chat → Should skip gym chat

## Testing Checklist
- [ ] Gym chat deletion blocked with appropriate message
- [ ] DM deletion only hides for current user
- [ ] DM reappears when other person messages
- [ ] Regular group chat leave works correctly
- [ ] Batch deletion skips gym chats and shows count
- [ ] Delete all skips gym chats and shows count

## Files Modified
1. `supabase/migrations/20251027000000_fix_chat_deletion_behavior.sql` (new)
2. `src/composables/useChatList.ts`
3. `src/pages/ChatListPage.vue`

