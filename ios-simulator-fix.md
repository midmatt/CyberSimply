# iOS Simulator iCloud Login Fix

## Problem
The iOS Simulator is prompting for iCloud login multiple times during IAP testing, which interferes with the purchase flow.

## Solution

### Step 1: Reset iOS Simulator
1. **Open Simulator**
2. **Device → Erase All Content and Settings**
3. **Confirm the reset**

### Step 2: Configure Simulator for IAP Testing
1. **Go to Settings → Sign-In to your iPhone**
2. **Sign in with your Apple ID** (use the same one as your App Store Connect)
3. **Go to Settings → App Store**
4. **Sign in with the same Apple ID**
5. **Enable "Sign in automatically"**

### Step 3: Use Sandbox Testing Account
1. **Create a sandbox testing account** in App Store Connect
2. **Sign out of App Store** in Settings → App Store
3. **When prompted during purchase**, use the sandbox account credentials

### Step 4: Clear Simulator Data (if issues persist)
```bash
# Reset specific simulator
xcrun simctl erase "iPhone 15 Pro"

# Or reset all simulators
xcrun simctl erase all
```

### Step 5: Alternative - Use Physical Device
For the most reliable IAP testing:
1. **Use a physical iOS device**
2. **Sign out of App Store** on the device
3. **Use sandbox account** when prompted

## TestFlight Issue Fix

The TestFlight app showing automatic IAP is likely due to:

1. **App Store Connect configuration**
2. **Previous purchases being restored**
3. **Sandbox account having existing purchases**

### Fix TestFlight IAP Issue:

1. **Check App Store Connect**:
   - Go to Users and Access → Sandbox Testers
   - Create a NEW sandbox account
   - Delete old sandbox accounts

2. **Reset TestFlight Build**:
   - Create a new build number
   - Upload fresh build to TestFlight

3. **Clear Purchase History**:
   - The new sandbox account should have no purchase history
   - This will force the purchase flow instead of restore

## Verification Steps

1. ✅ Simulator shows purchase screen (not automatic ad-free)
2. ✅ No multiple iCloud login prompts
3. ✅ Purchase flow works correctly
4. ✅ TestFlight shows purchase screen for new accounts
5. ✅ Existing users can restore purchases
