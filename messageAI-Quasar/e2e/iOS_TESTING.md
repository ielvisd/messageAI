# iOS Testing Guide

## Overview
This document provides instructions for testing MessageAI on iOS simulators using Playwright. The tests are designed to validate iOS-specific functionality and ensure the app works correctly on Apple devices.

## Prerequisites

### 1. Xcode Installation
- Install Xcode from the Mac App Store
- Install iOS Simulator through Xcode
- Ensure you have the latest iOS simulator versions

### 2. Playwright iOS Setup
```bash
# Install Playwright with iOS support
pnpm install @playwright/test

# Install iOS browsers
npx playwright install webkit
```

### 3. iOS Simulator Configuration
- Open Xcode
- Go to Xcode > Preferences > Components
- Download the latest iOS simulator versions
- Ensure simulators are properly configured

## Running iOS Tests

### Basic iOS Testing
```bash
# Run all iOS tests
pnpm test:e2e:ios

# Run specific iOS test
pnpm test:e2e:ios ios-critical-path.spec.ts

# Run with UI mode for debugging
pnpm test:e2e:ui --project="iOS Simulator"
```

### iOS Simulator Management
```bash
# List available simulators
xcrun simctl list devices

# Boot a specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Shutdown simulators
xcrun simctl shutdown all
```

## Test Configuration

### iOS-Specific Settings
The tests are configured with iOS-specific settings in `playwright.config.ts`:

```typescript
{
  name: 'iOS Simulator',
  use: {
    ...devices['iPhone 12'],
    browserName: 'webkit',
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  },
}
```

### Supported iOS Versions
- iOS 15.0+
- iPhone 12 and newer
- iPad Pro (for tablet testing)

## Test Categories

### 1. Critical Path Tests
- Complete user journey on iOS
- Authentication flow
- Chat creation and messaging
- Navigation and UI interactions

### 2. iOS-Specific Features
- Capacitor plugin integration
- Touch gestures and interactions
- App lifecycle management
- Push notification handling
- Memory management

### 3. Performance Tests
- Load time validation (< 1.5s on iOS)
- Memory usage monitoring
- Responsive design verification
- Touch target sizing (44px minimum)

## Common Issues and Solutions

### Issue: Simulator Not Starting
**Solution:**
```bash
# Reset simulator
xcrun simctl erase all

# Restart simulator
xcrun simctl shutdown all
xcrun simctl boot "iPhone 15 Pro"
```

### Issue: Tests Failing on iOS
**Solution:**
1. Check simulator is running
2. Verify webkit is installed: `npx playwright install webkit`
3. Check iOS version compatibility
4. Review test logs for specific errors

### Issue: Touch Events Not Working
**Solution:**
- Ensure `hasTouch: true` is set in test configuration
- Use `tap()` instead of `click()` for touch interactions
- Verify viewport size matches target device

### Issue: Capacitor Plugins Not Available
**Solution:**
- Check that `window.Capacitor` is properly mocked
- Verify plugin availability in test setup
- Ensure native platform detection works

## Debugging iOS Tests

### 1. Visual Debugging
```bash
# Run with UI mode
pnpm test:e2e:ui --project="iOS Simulator"

# Take screenshots
pnpm test:e2e:ios --screenshot=only-on-failure
```

### 2. Console Logs
```bash
# Run with console logs
pnpm test:e2e:ios --reporter=list
```

### 3. Network Debugging
```bash
# Run with network logging
DEBUG=pw:api pnpm test:e2e:ios
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up after each test
- Use proper mocking for external dependencies

### 2. iOS-Specific Considerations
- Test with different iOS versions
- Validate touch target sizes
- Check for iOS-specific UI patterns
- Test app lifecycle scenarios

### 3. Performance Monitoring
- Monitor load times
- Check memory usage
- Validate smooth animations
- Test with slow networks

### 4. Error Handling
- Test offline scenarios
- Validate error messages
- Check recovery mechanisms
- Test edge cases

## Continuous Integration

### GitHub Actions Setup
```yaml
name: iOS Tests
on: [push, pull_request]

jobs:
  ios-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:e2e:ios
```

### Local Development
```bash
# Run tests before committing
pnpm test:e2e:ios

# Run specific test suites
pnpm test:e2e:ios --grep "critical path"
```

## Troubleshooting

### Common Error Messages

**"No devices found"**
- Ensure iOS simulator is installed
- Check Xcode is properly configured
- Verify simulator is booted

**"Webkit not found"**
- Run `npx playwright install webkit`
- Check Playwright installation
- Verify browser dependencies

**"Touch events not working"**
- Check test configuration
- Verify viewport settings
- Use proper touch methods

### Getting Help
1. Check Playwright documentation
2. Review iOS simulator logs
3. Check test output for specific errors
4. Verify device compatibility

## Test Maintenance

### Regular Updates
- Update iOS simulator versions monthly
- Review test coverage quarterly
- Update test data as needed
- Monitor performance metrics

### Test Data Management
- Use consistent test data
- Clean up test artifacts
- Maintain test user accounts
- Update mock responses

## Conclusion

iOS testing with Playwright provides comprehensive coverage for mobile-specific functionality. Follow this guide to ensure your MessageAI app works correctly on iOS devices and simulators.

For additional support, refer to:
- [Playwright iOS Documentation](https://playwright.dev/docs/emulation#mobile)
- [iOS Simulator Documentation](https://developer.apple.com/documentation/xcode/running-your-app-in-the-simulator)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
