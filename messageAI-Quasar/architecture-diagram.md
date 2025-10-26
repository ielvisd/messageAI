# MessageAI - System Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Application<br/>Quasar + Vue 3]
        iOSApp[iOS App<br/>Capacitor]
        PWA[Progressive Web App]
    end

    subgraph "Frontend Components"
        Chat[Chat System<br/>Real-time Messaging]
        AI[AI Assistant<br/>Gym Management]
        Dashboard[Unified Dashboard<br/>Role-based Views]
        Schedule[Schedule Management]
        Insights[AI Insights Widget]
    end

    subgraph "State Management & Composables"
        useChat[useChat]
        useGymAI[useGymAI]
        useAuth[useAuth]
        usePresence[usePresence]
        useReactions[useReactions]
        useSchedule[useSchedule]
    end

    subgraph "Supabase Backend"
        Auth[Authentication<br/>Row Level Security]
        RealtimeDB[(Realtime Database<br/>PostgreSQL)]
        EdgeFunctions[Edge Functions<br/>Deno Runtime]
        Storage[File Storage]
    end

    subgraph "Database Tables"
        Users[profiles]
        Gyms[gyms]
        Chats[chats]
        Messages[messages]
        Schedules[schedules]
        RSVP[rsvps]
    end

    subgraph "AI Services"
        GymAI[Gym AI Assistant<br/>Edge Function]
        OpenAI[OpenAI API<br/>GPT-4]
    end

    WebApp --> Chat
    WebApp --> AI
    WebApp --> Dashboard
    iOSApp --> Chat
    iOSApp --> AI
    PWA --> Chat

    Chat --> useChat
    AI --> useGymAI
    Dashboard --> useAuth
    Schedule --> useSchedule
    Insights --> useGymAI

    useChat --> RealtimeDB
    useGymAI --> EdgeFunctions
    useAuth --> Auth
    usePresence --> RealtimeDB
    useReactions --> RealtimeDB
    useSchedule --> RealtimeDB

    EdgeFunctions --> GymAI
    GymAI --> OpenAI
    GymAI --> RealtimeDB

    RealtimeDB --> Users
    RealtimeDB --> Gyms
    RealtimeDB --> Chats
    RealtimeDB --> Messages
    RealtimeDB --> Schedules
    RealtimeDB --> RSVP

    Auth --> Users
    Storage --> Messages
```

## User Flow Diagram

```mermaid
graph LR
    subgraph "User Roles"
        Student[Student]
        Instructor[Instructor]
        Admin[Admin/Owner]
    end

    subgraph "Core Features"
        Login[Login/Signup]
        ChatList[Chat List]
        ChatView[Chat Conversation]
        AIChat[AI Assistant]
        AdminPanel[Admin Settings]
        ScheduleView[Class Schedule]
    end

    subgraph "AI Capabilities"
        Attendance[Attendance Tracking]
        Insights[Student Insights]
        Scheduling[Auto-Scheduling]
        Assignments[Assignment Management]
    end

    Student --> Login
    Instructor --> Login
    Admin --> Login

    Login --> ChatList
    ChatList --> ChatView
    ChatList --> AIChat
    ChatList --> ScheduleView

    Admin --> AdminPanel
    Instructor --> AIChat
    
    AIChat --> Attendance
    AIChat --> Insights
    AIChat --> Scheduling
    AIChat --> Assignments

    ChatView --> usePresence[Real-time Presence]
    ChatView --> useReactions[Message Reactions]
```

## Data Flow - Messaging

```mermaid
sequenceDiagram
    participant User
    participant Vue Component
    participant useChat
    participant Supabase Realtime
    participant Database
    participant Other Users

    User->>Vue Component: Send Message
    Vue Component->>useChat: sendMessage()
    useChat->>Database: INSERT message
    Database->>Supabase Realtime: Broadcast change
    Supabase Realtime->>useChat: Real-time update
    useChat->>Vue Component: Update UI
    Supabase Realtime->>Other Users: Push notification
    Other Users->>Vue Component: Update chat
```

## Data Flow - AI Assistant

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant useGymAI
    participant Edge Function
    participant OpenAI
    participant Database

    User->>Frontend: Ask AI question
    Frontend->>useGymAI: sendMessage()
    useGymAI->>Edge Function: POST /gym-ai-assistant
    Edge Function->>Database: Fetch context (gym, users, schedules)
    Edge Function->>OpenAI: Generate response with context
    OpenAI->>Edge Function: AI response
    Edge Function->>Database: Save conversation
    Edge Function->>useGymAI: Return response
    useGymAI->>Frontend: Display AI response
```

## Database Schema Overview

```mermaid
erDiagram
    profiles ||--o{ gym_members : "belongs_to"
    gyms ||--o{ gym_members : "has_many"
    profiles ||--o{ chats : "participates_in"
    chats ||--o{ messages : "contains"
    profiles ||--o{ messages : "sends"
    gyms ||--o{ schedules : "has"
    schedules ||--o{ rsvps : "receives"
    profiles ||--o{ rsvps : "creates"
    chats ||--o{ ai_conversations : "has"

    profiles {
        uuid id PK
        string full_name
        string phone
        string avatar_url
        timestamp last_seen
    }

    gyms {
        uuid id PK
        string name
        json settings
        uuid owner_id FK
    }

    gym_members {
        uuid id PK
        uuid gym_id FK
        uuid profile_id FK
        string role
        boolean is_active
    }

    chats {
        uuid id PK
        uuid gym_id FK
        string chat_type
        jsonb participants
    }

    messages {
        uuid id PK
        uuid chat_id FK
        uuid sender_id FK
        text content
        string message_type
        jsonb metadata
    }

    schedules {
        uuid id PK
        uuid gym_id FK
        string class_name
        timestamp start_time
        timestamp end_time
        uuid instructor_id FK
    }

    rsvps {
        uuid id PK
        uuid schedule_id FK
        uuid user_id FK
        string status
    }
```

## Technology Stack

```mermaid
mindmap
  root((MessageAI))
    Frontend
      Quasar Framework
      Vue 3 Composition API
      TypeScript
      Vite
      PWA Support
    Mobile
      Capacitor
      iOS Native
      Push Notifications
    Backend
      Supabase
        PostgreSQL
        Real-time Subscriptions
        Edge Functions
        Row Level Security
        Authentication
    AI
      OpenAI GPT-4
      Context-aware Responses
      Role-based Logic
    DevOps
      Vercel Deployment
      GitHub Actions
      Playwright E2E Tests
      Vitest Unit Tests
```

## Key Features by Role

```mermaid
graph TB
    subgraph "Student Features"
        S1[View Chat List]
        S2[Send Messages]
        S3[View Schedule]
        S4[RSVP to Classes]
        S5[Ask AI Questions]
    end

    subgraph "Instructor Features"
        I1[All Student Features]
        I2[View Student Insights]
        I3[Manage Class Attendance]
        I4[Create Schedules]
        I5[AI Assignment Suggestions]
    end

    subgraph "Admin/Owner Features"
        A1[All Instructor Features]
        A2[Manage Gym Settings]
        A3[Add/Remove Members]
        A4[View Analytics]
        A5[Configure AI Behavior]
    end

    S1 --> I1
    S2 --> I1
    S3 --> I1
    S4 --> I1
    S5 --> I1

    I1 --> A1
    I2 --> A1
    I3 --> A1
    I4 --> A1
    I5 --> A1
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        Vercel[Vercel Edge Network<br/>Static Assets + SSR]
        Supabase[Supabase Cloud<br/>US West Region]
    end

    subgraph "Mobile Distribution"
        AppStore[Apple App Store<br/>iOS App]
        TestFlight[TestFlight<br/>Beta Testing]
    end

    subgraph "Monitoring & Analytics"
        Logs[Supabase Logs]
        Analytics[Usage Analytics]
        Errors[Error Tracking]
    end

    Users[End Users] --> Vercel
    Users --> AppStore
    Vercel --> Supabase
    AppStore --> Supabase
    TestFlight --> Supabase

    Supabase --> Logs
    Supabase --> Analytics
    Vercel --> Errors
```


