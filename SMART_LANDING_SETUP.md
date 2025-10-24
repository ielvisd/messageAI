# Smart Landing Page Setup Guide

## ✅ What's Been Implemented

### 1. **Smart Platform Detection**
- Automatically detects iOS, Android, or Desktop
- Shows appropriate UI for each platform
- Attempts to open native app if installed

### 2. **Mobile Flow**
When a mobile user scans the QR code:
1. **Shows two options:**
   - ⭐ **Recommended**: Download app from App Store/Play Store
   - 📱 **Alternative**: Continue in browser (instant access)

2. **Tries to open app automatically** if installed
3. **Falls back to web** if app not installed

### 3. **Desktop Flow**
- Goes straight to web signup
- No app download prompts (desktop users use web)

### 4. **Deep Linking Support**
- Custom URL scheme: `messageai://join/TOKEN`
- Universal Links: `https://messageai.app/join/TOKEN`
- App opens automatically if installed

---

## 📋 Setup Checklist

### Phase 1: Testing (Current - Web Only)
✅ Works right now!
- QR code → Web page → Signup → Join
- Can test the full flow on localhost

### Phase 2: Prepare for App Store Launch

#### 1. Update App Store URLs
Edit: `src/config/app-links.ts`

```typescript
export const APP_CONFIG = {
  // iOS App Store URL
  appStoreURL: 'https://apps.apple.com/app/messageai/id123456789', // ← Update with real App Store ID
  
  // Android Play Store URL
  playStoreURL: 'https://play.google.com/store/apps/details?id=com.messageai.app', // ← Update with real package name
  
  // Your actual domain
  universalLinkDomain: 'messageai.app', // ← Update with your domain
}
```

#### 2. Update Capacitor Config
Edit: `capacitor.config.ts`

```typescript
server: {
  hostname: 'messageai.app', // ← Update with your actual domain
},
```

#### 3. Publish Apps
- **iOS**: Submit to App Store via Xcode
- **Android**: Submit to Play Store via Android Studio

---

## 🔧 Advanced Setup (Phase 3)

### iOS Universal Links

**Required for seamless app opening**

1. **Create apple-app-site-association file:**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.gauntletai.messageai",
      "paths": ["/join/*"]
    }]
  }
}
```

2. **Host at:**
```
https://messageai.app/.well-known/apple-app-site-association
```

3. **Update Info.plist:**
Add Associated Domains entitlement:
```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:messageai.app</string>
</array>
```

### Android App Links

**Required for seamless app opening**

1. **Create assetlinks.json:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.gauntletai.messageai",
    "sha256_cert_fingerprints": ["YOUR_FINGERPRINT_HERE"]
  }
}]
```

2. **Host at:**
```
https://messageai.app/.well-known/assetlinks.json
```

3. **Update AndroidManifest.xml:**
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" />
  <data android:host="messageai.app" />
  <data android:pathPrefix="/join/" />
</intent-filter>
```

---

## 🧪 Testing Guide

### Test on Web (Now)
1. Run: `npm run dev`
2. Generate QR code from Owner Dashboard
3. Open QR URL in browser
4. Should see smart landing page ✅

### Test Deep Linking (After App Published)

#### iOS
```bash
# Test custom scheme
xcrun simctl openurl booted messageai://join/ABC123

# Test universal link
xcrun simctl openurl booted https://messageai.app/join/ABC123
```

#### Android
```bash
# Test custom scheme
adb shell am start -a android.intent.action.VIEW -d "messageai://join/ABC123"

# Test app link
adb shell am start -a android.intent.action.VIEW -d "https://messageai.app/join/ABC123"
```

---

## 📱 User Experience

### Mobile (App Not Installed)
```
Scan QR → Landing Page
├─> "Download App" (recommended)
│   └─> Opens App Store/Play Store
│       └─> After install: Scan QR again → Opens in app
│
└─> "Continue in Browser"
    └─> Instant signup & join
```

### Mobile (App Installed)
```
Scan QR → App Opens Directly
└─> Join flow in native app
```

### Desktop
```
Scan QR → Web Signup → Join
(No app prompts)
```

---

## 🎯 Benefits

### For Gym Owners
✅ One QR code works for everyone
✅ Students choose their preferred method
✅ Higher app adoption (recommended option)
✅ Still accessible to everyone (web fallback)

### For Students
✅ Flexibility to choose app or web
✅ Instant access via web (no wait)
✅ Best experience with native app
✅ Seamless if app already installed

---

## 📝 Next Steps

### Right Now
1. ✅ Test the web flow
2. ✅ Verify QR codes work
3. ✅ Check mobile detection

### Before Launch
1. Update app store URLs in `app-links.ts`
2. Publish apps to App Store & Play Store
3. Update QR codes (they'll still work!)

### After Launch
1. Set up Universal Links (iOS)
2. Set up App Links (Android)
3. Monitor analytics (app vs web adoption)

---

## 🔍 Troubleshooting

### "App won't open from link"
- Check if app is actually installed
- Verify custom URL scheme in capacitor.config.ts
- Check deep link listener in App.vue

### "Shows wrong platform option"
- Check Quasar platform detection
- Test on actual device (not simulator)

### "App store link doesn't work"
- Update URLs in app-links.ts
- Wait for apps to be published

---

## 💡 Pro Tips

1. **Test on real devices** - Platform detection works best on actual hardware
2. **Start with web** - Get feedback before forcing app installs
3. **Track metrics** - See how many choose app vs web
4. **Update gradually** - Phase 1 → Phase 2 → Phase 3

---

**Status**: ✅ Ready for testing!
**Next Phase**: Publish to app stores & update config

