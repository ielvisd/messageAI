# Ossome

AI-Powered Team Communication for Jiu-Jitsu Gyms

Built with Quasar Framework, Supabase, and Capacitor for **iOS, Android, and Web**.

## 📱 iOS Development

### iOS Simulator

#### Prerequisites
- macOS with Xcode installed
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`
- Node.js and npm

#### Setup & Launch

1. **Install dependencies and build**
   ```bash
   cd messageAI-Quasar
   npm install
   quasar build
   ```

2. **Sync build to iOS**
   ```bash
   npx cap sync ios
   ```

3. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

4. **Run in Simulator**
   - In Xcode, select a simulator device (e.g., iPhone 15 Pro)
   - Click the Play button (▶️) or press `Cmd + R`
   - The app will build and launch in the simulator

#### Development Workflow

For live reload during development:
```bash
# Terminal 1: Start dev server
quasar dev

# Terminal 2: Sync and open
npx cap sync ios
npx cap open ios
```

Then in Xcode, run the app. Changes to your code will hot-reload in the simulator.

#### Troubleshooting

**Build fails in Xcode:**
- Clean build folder: `Product > Clean Build Folder` (Cmd + Shift + K)
- Delete `ios/App/Pods` and run `pod install` from `ios/App/`

**Capacitor sync errors:**
```bash
cd messageAI-Quasar
rm -rf ios
npx cap add ios
npx cap sync ios
```

**Simulator not showing:**
- Ensure Xcode simulator is installed: `Xcode > Preferences > Components`
- List available simulators: `xcrun simctl list devices`

### iOS Production Build

To build for TestFlight or App Store:
```bash
cd messageAI-Quasar
quasar build
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select "Any iOS Device" as the build target
2. Go to `Product > Archive`
3. Once archived, click `Distribute App`
4. Follow the wizard to upload to App Store Connect

---

## 💻 Web Development

### Local Development Server
```bash
cd messageAI-Quasar
npm install
quasar dev
```

Open http://localhost:9000 in your browser.

### Web Production Build
```bash
quasar build
# Deploy dist/spa to your hosting
```

---

## 🗄️ Database Setup

1. **Create Supabase project** at https://supabase.com
2. **Copy environment variables** to `.env`:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. **Run migrations**:
   - Go to SQL Editor in Supabase Dashboard
   - Run migrations from `messageAI-Quasar/supabase/migrations/` in order
   - Or run the `QUICK_FIX.sql` for essential setup

## 📚 Documentation

- `/AI_DEV_LOG.md` - Development log and AI-assisted workflow
- `/messageAI-Quasar/DEBUG_CHAT_REQUESTS.md` - Chat request system debugging
- `/messageAI-Quasar/QUICK_FIX.sql` - Database quick fixes
- `/PRD.md` - Product Requirements Document

## 🏗️ Tech Stack

- **Mobile**: Capacitor (iOS & Android)
- **Frontend**: Quasar Framework (Vue 3 + TypeScript)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Testing**: Playwright (E2E), Vitest (Unit)
