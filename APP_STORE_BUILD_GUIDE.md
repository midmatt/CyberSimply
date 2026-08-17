# 🚀 App Store Build Guide - PhaseScriptExecution Fix

## ❌ **Problem: PhaseScriptExecution Failed**

You're getting "Command PhaseScriptExecution failed with a nonzero exit code" because you're trying to build with Xcode directly on an Expo project. This is not the recommended approach.

## ✅ **Solution: Use EAS Build (Recommended)**

### **Option 1: EAS Build (Cloud) - RECOMMENDED**

```bash
# Build for TestFlight
eas build --platform ios --profile testflight

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**Benefits:**
- ✅ No local Xcode issues
- ✅ Handles code signing automatically
- ✅ Builds in Apple's environment
- ✅ No PhaseScriptExecution errors

### **Option 2: Local Development Build**

If you need to build locally for testing:

```bash
# Use Expo development build (not Xcode directly)
npx expo run:ios --configuration Release

# Or for simulator
npx expo run:ios --simulator
```

---

## 🔧 **If You Must Use Xcode Directly**

### **Step 1: Clean Everything**
```bash
cd ios
rm -rf Pods
rm Podfile.lock
pod install
```

### **Step 2: Fix Common Script Issues**

The PhaseScriptExecution error is usually caused by:

1. **Bundle React Native code script**
2. **Code signing issues**
3. **Missing environment variables**

### **Step 3: Check Build Scripts**

In Xcode:
1. Select your project → Target → Build Phases
2. Look for "Bundle React Native code and images"
3. Check if the script has proper paths
4. Try commenting out problematic scripts temporarily

### **Step 4: Alternative - Use EAS Build**

Instead of fighting with local Xcode issues, use EAS Build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for App Store
eas build --platform ios --profile production
```

---

## 🎯 **Recommended Workflow**

### **For App Store Submission:**

1. **Test with EAS Build**:
   ```bash
   eas build --platform ios --profile testflight
   ```

2. **Install TestFlight build** and test Apple IAP compliance

3. **Build for App Store**:
   ```bash
   eas build --platform ios --profile production
   ```

4. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

### **For Local Development:**

1. **Use Expo Go** for quick testing:
   ```bash
   npx expo start
   ```

2. **Use development build** for IAP testing:
   ```bash
   npx expo run:ios --configuration Release
   ```

---

## 🚨 **Why Xcode Direct Build Fails**

Expo projects are designed to work with:
- ✅ **EAS Build** (cloud builds)
- ✅ **Expo Go** (development)
- ✅ **Development builds** (local testing)

❌ **NOT with Xcode direct builds** (causes PhaseScriptExecution errors)

---

## 📱 **Quick Fix Commands**

```bash
# Stop trying to build with Xcode directly
# Instead, use EAS Build:

# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Build for TestFlight
eas build --platform ios --profile testflight

# 4. Test the build
# 5. Build for App Store
eas build --platform ios --profile production

# 6. Submit to App Store
eas submit --platform ios
```

---

## ✅ **Expected Results**

With EAS Build:
- ✅ No PhaseScriptExecution errors
- ✅ Automatic code signing
- ✅ Apple IAP compliance features included
- ✅ Ready for App Store submission

---

## 🎉 **Your App is Ready!**

Your Apple IAP compliance implementation is complete. Use EAS Build to create production builds without Xcode issues.

**Next Steps:**
1. Run `eas build --platform ios --profile testflight`
2. Test the guest-first flow
3. Build for App Store with `eas build --platform ios --profile production`
4. Submit to App Store

The PhaseScriptExecution error will be resolved by using the proper Expo build workflow! 🚀
