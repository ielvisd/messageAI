# Ossome

**AI-Powered Team Communication for Jiu-Jitsu Gyms**

## What is Ossome?

Ossome is a WhatsApp-inspired messaging app built specifically for jiu-jitsu gym owners and teams. It helps gym owners manage trainers, schedules, and member communication across locations and time zones. 

**Key Features:**
- 💬 Real-time 1:1 and group messaging
- 📸 Multimedia support (images, video)
- 🤖 AI-powered thread summaries, action item extraction, and smart search
- 📅 QR code attendance tracking and class scheduling
- 🔔 Push notifications
- 🥋 Belt progression tracking and student notes
- 📊 Instructor dashboards and class rosters
- 🏢 Multi-gym support

Built with **Quasar Framework** (Vue 3), **Supabase**, and **Capacitor** for iOS, Android, and Web.

## 🚀 Quick Start: Run in iOS Simulator

**Prerequisites:**
- macOS with Xcode installed
- Node.js and pnpm (`npm install -g pnpm`)

**Steps:**

```bash
# 1. Navigate to the project
cd messageAI-Quasar

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
# Copy .env.example to .env and add your Supabase credentials
cp .env.example .env

# 4. Build and sync to iOS
pnpm build
npx cap sync ios

# 5. Open in Xcode and run
npx cap open ios
```

In Xcode, select a simulator (e.g., iPhone 15 Pro) and click the Play button (▶️).

**Development Mode (with hot reload):**
```bash
pnpm dev
```
Visit `http://localhost:9000` in your browser.

## 🗄️ Database Setup

1. Create a Supabase project at https://supabase.com
2. Add your Supabase credentials to `.env`:
   ```bash
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Apply migrations using the automated script:
   ```bash
   cd messageAI-Quasar
   pnpm db:apply supabase/migrations/
   ```

## 📚 Documentation

- `/PRD.md` - Product Requirements Document
- `/messageAI-Quasar/README.md` - Detailed project documentation

## 🏗️ Tech Stack

- **Frontend**: Quasar Framework (Vue 3 + TypeScript + Composition API)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Mobile**: Capacitor (iOS & Android native bridges)
- **AI**: OpenAI GPT-4o-mini for smart features
- **Testing**: Playwright (E2E), Vitest (Unit)

---

Built with ❤️ for the jiu-jitsu community
