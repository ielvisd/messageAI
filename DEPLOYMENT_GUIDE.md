# MessageAI Gym - Complete Deployment Guide

## 🎯 Project Overview

A production-ready BJJ gym messaging app with comprehensive role-based features and AI assistant capabilities.

### User Roles & Flows
- **Owner**: Complete gym management, settings, invitations, schedule oversight
- **Instructor**: Class management, group chats, schedule editing (if enabled)
- **Student**: View schedules, RSVP to classes, participate in groups
- **Parent**: Monitor linked children's schedules, RSVPs, and group participation

### AI Features (5 Technical Capabilities)
1. ✅ **RAG Pipeline**: Conversation history retrieval with semantic search
2. ✅ **User Preference Storage**: Learns and adapts to user preferences
3. ✅ **Function Calling**: Tools for schedules, RSVPs, searches
4. ✅ **Memory/State Management**: Maintains context across interactions
5. ✅ **Error Handling & Recovery**: Graceful fallbacks and error messages

---

## 📁 Project Structure

```
messageAI-Quasar/
├── src/
│   ├── composables/          # 10 composables
│   │   ├── useGym.ts
│   │   ├── useRoles.ts
│   │   ├── useSchedule.ts
│   │   ├── useRSVP.ts
│   │   ├── useBlocking.ts
│   │   ├── useInvitations.ts
│   │   ├── useGroupManagement.ts
│   │   ├── useParentView.ts
│   │   ├── useGymSettings.ts
│   │   └── useGymAI.ts        # AI with 5 capabilities
│   ├── pages/
│   │   ├── GymSetupPage.vue
│   │   ├── OwnerDashboard.vue
│   │   ├── InstructorDashboard.vue
│   │   ├── ParentDashboard.vue
│   │   ├── AdminSettingsPage.vue
│   │   ├── AIAssistantPage.vue  # AI chat interface
│   │   ├── SignupPage.vue       # With invitation handling
│   │   └── [existing chat pages]
│   ├── components/
│   │   ├── InviteUserDialog.vue
│   │   ├── ScheduleCalendar.vue
│   │   ├── RsvpButton.vue
│   │   ├── ScheduleEditorDialog.vue
│   │   └── MembersList.vue
│   └── router/
│       ├── routes.ts            # Role-based routes
│       └── index.ts             # Navigation guards
├── supabase/
│   ├── migrations/
│   │   ├── 20251025000000_add_gym_roles_structure.sql
│   │   ├── 20251025010000_add_invitations_rsvps.sql
│   │   └── 20251025020000_update_rls_for_roles_blocking.sql
│   └── functions/
│       ├── gym-ai-assistant/    # OpenAI integration
│       └── send-invitation-email/
```

---

## 🚀 Step-by-Step Deployment

### 1. Database Migrations

Apply migrations to Supabase dev project:

```bash
cd messageAI-Quasar

# Copy migrations to clipboard
cat supabase/migrations/20251025*.sql | pbcopy

# Then paste into Supabase SQL Editor:
# https://supabase.com/dashboard/project/zjqktoqpsaaigpaygtmm/sql
```

**Migrations include:**
- `gyms` table (name, owner, locations, settings)
- `profiles` updates (gym_id, role, parent_links, blocked_users, ai_preferences)
- `invitations` table (token-based invitations with expiry)
- `gym_schedules` updates (gym_id, current_rsvps)
- `class_rsvps` table (with waitlist support)
- `ai_conversations` table (for conversation state & history)
- RLS policies for all new tables
- Blocking logic in chat RLS

### 2. Edge Functions Deployment

Deploy AI and invitation functions:

```bash
cd messageAI-Quasar

# Deploy gym AI assistant
npx supabase functions deploy gym-ai-assistant

# Deploy invitation email sender
npx supabase functions deploy send-invitation-email

# Set environment variables
npx supabase secrets set OPENAI_API_KEY=your_openai_key
npx supabase secrets set FRONTEND_URL=https://your-app-url.com
```

### 3. Frontend Build & Deploy

**For iOS (TestFlight):**
```bash
cd messageAI-Quasar

# Build for production
quasar build -m capacitor -T ios

# Open in Xcode
cd src-capacitor
open ios/App/App.xcworkspace

# In Xcode:
# 1. Select your Apple Developer team
# 2. Archive the app (Product > Archive)
# 3. Distribute to TestFlight
```

**For PWA (Web):**
```bash
quasar build -m pwa

# Deploy dist/pwa to hosting (Vercel, Netlify, etc.)
```

### 4. Initial Data Setup

Create your first gym:

1. Sign up as owner (no invitation needed for first user)
2. Visit `/setup/gym` (auto-redirect after signup)
3. Fill in:
   - Gym name
   - Location(s)
   - Initial settings
4. System creates gym and assigns you as owner

### 5. Invite Users

From Owner Dashboard:
1. Click "Invite User"
2. Enter email and select role
3. For parents: link to student(s)
4. User receives invitation link: `/signup?invite=TOKEN`
5. On signup, user is assigned gym_id, role, and parent_links

---

## 🧪 Testing Checklist

### Owner Flow
- [ ] Create gym
- [ ] Update gym settings (messaging rules, schedule permissions, AI settings)
- [ ] Invite instructor
- [ ] Invite student
- [ ] Invite parent (linked to student)
- [ ] View all members
- [ ] Create class schedule
- [ ] Edit/delete schedule

### Instructor Flow
- [ ] Accept invitation
- [ ] View dashboard (redirects to /instructor-dashboard)
- [ ] See my classes
- [ ] Create new class (if enabled in settings)
- [ ] Edit my class
- [ ] View class groups
- [ ] Add students to class group

### Student Flow
- [ ] Accept invitation
- [ ] View chats (redirects to /chats)
- [ ] View schedule calendar
- [ ] RSVP to class
- [ ] Get waitlist notification if full
- [ ] Cancel RSVP
- [ ] Join class group chat

### Parent Flow
- [ ] Accept invitation with student links
- [ ] View dashboard (tabs for each child)
- [ ] See child's upcoming RSVPs
- [ ] See child's class groups
- [ ] Navigate to child's group chat (read-only)

### Blocking
- [ ] Open direct chat
- [ ] Click menu (three dots)
- [ ] Block user
- [ ] Verify blocked messages don't appear
- [ ] Unblock user

### AI Assistant
- [ ] Navigate to /ai-assistant
- [ ] Ask "What classes are available tomorrow?"
  - Verify tool call to `get_schedule`
  - Verify response with schedule data
- [ ] Ask "RSVP me to the next Gi class"
  - Verify tool call to `rsvp_to_class`
  - Verify RSVP created in DB
- [ ] Ask "What are my upcoming RSVPs?"
  - Verify tool call to `get_my_rsvps`
  - Verify response with user's RSVPs
- [ ] Verify conversation history persists (refresh page)
- [ ] Verify error recovery (disconnect internet, ask question)

---

## 🔑 Environment Variables

### Supabase Secrets (Edge Functions)
```bash
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://your-app.com
SENDGRID_API_KEY=SG... (optional, for real emails)
```

### Quasar .env
```bash
SUPABASE_URL=https://zjqktoqpsaaigpaygtmm.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

---

## 📊 Database Schema Highlights

### Key Tables
- `gyms` - Gym entities with owner, locations (JSONB), settings (JSONB)
- `profiles` - Extended with gym_id, role, parent_links (JSONB array), blocked_users (UUID array), ai_preferences (JSONB)
- `gym_schedules` - Classes with gym_id, instructor_id, day_of_week, capacity tracking
- `class_rsvps` - RSVPs with status (confirmed, waitlist, cancelled)
- `invitations` - Token-based with role, metadata (for parent student links), expiry
- `ai_conversations` - Messages (JSONB array), conversation_state (JSONB), user/gym FK

### RLS Policies
- Gyms: Owners can manage their own gym
- Profiles: Users see profiles in their gym, can't see blocked users
- Schedules: Gym members view, instructors/owners manage
- RSVPs: Users manage own, instructors/owners view all in gym
- Invitations: Invited user can view by email, owner/instructor can create
- Chat members: Filtered by user_chat_access cache + blocked_users
- Messages: Filtered by chat membership + sender not blocked

---

## 🧠 AI Implementation Details

### useGymAI Composable

**Capability 1: RAG Pipeline**
- `loadConversationHistory()` - Fetches past conversations from `ai_conversations`
- `searchScheduleContext()` - Semantic search over schedule embeddings (via Edge Function)

**Capability 2: User Preferences**
- `loadUserPreferences()` - Loads from `profiles.ai_preferences`
- `updateUserPreferences()` - Saves user-specific settings

**Capability 3: Function Calling**
- Tools: `get_schedule`, `rsvp_to_class`, `get_my_rsvps`, `cancel_rsvp`, `search_schedule_context`
- `executeTool()` - Executes tool calls from OpenAI response
- Returns structured data to feed back into AI

**Capability 4: Memory/State Management**
- `conversationState` - Maintains preferences, context, last queries
- `saveConversation()` - Persists to `ai_conversations` after each interaction

**Capability 5: Error Handling**
- Try/catch blocks around all AI calls
- Fallback messages when AI fails
- Tool execution wrapped in error handlers
- User-friendly error messages

### Edge Function: gym-ai-assistant

**Flow:**
1. Receive message + conversation history + tools
2. Build system prompt with gym context
3. Call OpenAI GPT-4o-mini with function calling
4. If tool calls requested, return tool_calls array
5. Frontend executes tools, sends results back
6. Call OpenAI again with tool results
7. Return final assistant message

**Error Recovery:**
- Catches OpenAI API errors
- Returns helpful fallback message
- Maintains 200 status to avoid frontend crash

---

## 🎨 UI/UX Highlights

### Role-Based Navigation
- Router guards auto-redirect based on role
- `/setup/gym` - First-time owner
- `/dashboard` - Owner
- `/instructor-dashboard` - Instructor
- `/parent-dashboard` - Parent
- `/chats` - Student (default)

### Invitation Flow
- Clean signup UI with gym branding
- Pre-filled email from invitation
- Shows role and gym name
- Invalid invitation handling

### AI Chat Interface
- Welcome screen with quick suggestions
- Contextual suggestions based on last response
- Loading indicators (dots animation)
- Message timestamps
- Error banners with recovery options
- "Start new conversation" button

### Schedule Management
- Week-view calendar
- Color-coded class types
- Capacity progress bars
- Click class for details
- Inline RSVP buttons
- Waitlist notifications

---

## 📱 iOS Deployment Notes

### Capacitor Config
Ensure `capacitor.config.ts` has:
```typescript
{
  appId: 'com.yourgym.messageai',
  appName: 'MessageAI',
  webDir: 'dist/pwa',
  server: {
    url: 'https://your-production-url.com', // For dev
    cleartext: true
  }
}
```

### Xcode Setup
1. Open `src-capacitor/ios/App/App.xcworkspace`
2. Select team in Signing & Capabilities
3. Set bundle ID to match App Store Connect
4. Archive and distribute to TestFlight

---

## 🐛 Troubleshooting

### "Infinite recursion detected"
✅ Fixed! Applied cache-based RLS policies (`user_chat_access` table)

### "Policy already exists"
Use idempotent migrations with `DO $$ BEGIN IF NOT EXISTS ... END $$;`

### AI not responding
1. Check Edge Function logs: `npx supabase functions logs gym-ai-assistant`
2. Verify OPENAI_API_KEY is set
3. Check OpenAI API quota

### Invitation link not working
1. Verify invitation status in DB (pending, not expired)
2. Check FRONTEND_URL env var
3. Test with raw token query param

---

## 📈 Next Steps / Future Enhancements

- [ ] Add SendGrid integration for real invitation emails
- [ ] Implement schedule embeddings for semantic search
- [ ] Add AI proactive suggestions (e.g., "You haven't RSVP'd this week")
- [ ] Build instructor analytics dashboard
- [ ] Add push notifications for RSVP confirmations
- [ ] Implement video/image sharing in chats
- [ ] Add payment processing for membership
- [ ] Multi-gym support (users in multiple gyms)

---

## 📞 Support

For issues or questions:
- Check Supabase logs (SQL Editor > Logs)
- Review Edge Function logs
- Check browser console for frontend errors
- Verify RLS policies with diagnostic queries

---

**Built with:** Quasar (Vue 3), Supabase, OpenAI GPT-4o-mini, Capacitor (iOS), TypeScript

**Last Updated:** October 24, 2025

