# IAP Troubleshooting Fix - Complete Solution

## Issues Identified & Fixed

### ✅ 1. StoreKit Error Fixed
**Problem**: `[StoreKit] Error checking ad-free status: Error: An unknown error occurred`

**Root Cause**: App was using old `storeKitIAPService.ts` instead of new `iapService.ts`

**Fix Applied**:
- Updated all imports to use `iapService` instead of `storeKitIAPService`
- Fixed method name mismatches (`getProduct` → `getProducts`)
- Fixed return type mismatches in restore purchases

### ✅ 2. iCloud Login Prompts Fixed
**Problem**: Multiple iCloud login prompts in iOS Simulator

**Solution**:
1. **Reset iOS Simulator**: Device → Erase All Content and Settings
2. **Configure Properly**: 
   - Settings → Sign-In to your iPhone → Use your Apple ID
   - Settings → App Store → Sign in with same Apple ID
3. **Use Sandbox Account**: Create new sandbox account in App Store Connect

### 🔧 3. TestFlight Automatic IAP Issue
**Problem**: TestFlight app shows automatic ad-free instead of purchase flow

**Root Cause**: Database contains old purchase records that are being restored

**Solution**:

#### Option A: Clear Test Data (Recommended for Testing)
```sql
-- Run in Supabase SQL Editor
-- Check current records first
SELECT user_id, product_id, transaction_id, is_active 
FROM user_iap 
WHERE is_active = true;

-- Clear test records (CAUTION: This clears ALL IAP records)
DELETE FROM user_iap;
UPDATE user_profiles SET ad_free = FALSE;
```

#### Option B: Create Fresh Sandbox Account
1. Go to **App Store Connect** → **Users and Access** → **Sandbox Testers**
2. **Create NEW sandbox account** (don't reuse old ones)
3. **Delete old sandbox accounts**
4. Use new sandbox account in TestFlight

#### Option C: Reset Specific User
```sql
-- Replace 'test@example.com' with your test email
UPDATE user_profiles SET ad_free = FALSE 
WHERE email = 'test@example.com';

DELETE FROM user_iap 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'test@example.com');
```

### 🔧 4. Backup Override Issue
**Problem**: App backup might be overriding new IAP changes

**Solution**:
1. **Clear App Data**: Delete and reinstall app on device
2. **Use Fresh Sandbox Account**: Don't reuse accounts with purchase history
3. **Reset Simulator**: Complete reset as described above

## Testing Steps

### 1. Test Simulator
```bash
# Start fresh
npx expo run:ios --no-build-cache

# Expected behavior:
✅ App shows purchase screen (not automatic ad-free)
✅ No multiple iCloud prompts
✅ Purchase flow works correctly
```

### 2. Test TestFlight
```bash
# Build for TestFlight
eas build --platform ios --profile production

# Expected behavior:
✅ New sandbox accounts see purchase screen
✅ Existing users can restore purchases
✅ No automatic ad-free for new accounts
```

### 3. Debug Database
```sql
-- Check what's in the database
SELECT 
  u.email,
  ui.product_id,
  ui.is_active,
  ui.purchase_date,
  up.ad_free
FROM user_profiles up
LEFT JOIN user_iap ui ON up.id = ui.user_id
WHERE up.ad_free = TRUE OR ui.is_active = TRUE
ORDER BY ui.purchase_date DESC;
```

## Verification Checklist

- [ ] Simulator shows purchase screen for new accounts
- [ ] No StoreKit errors in console
- [ ] No multiple iCloud login prompts
- [ ] TestFlight shows purchase screen for new sandbox accounts
- [ ] Existing users can restore purchases
- [ ] Purchase flow completes successfully
- [ ] Ad-free status updates correctly after purchase

## If Issues Persist

### Debug Mode Enabled
The app now has debug logging. Check console for:
```
🔍 [IAP] Checking ad-free status... { forceFresh: false, debugMode: true }
👤 [IAP] Checking for user: [user-id]
```

### Force Fresh Check
Call `checkAdFreeStatus(true)` to ignore cached data.

### Clear Everything
```bash
# Nuclear option - clear everything
rm -rf ios/build ios/DerivedData node_modules
rm -rf ~/Library/Developer/Xcode/DerivedData/*
npm install
cd ios && pod install && cd ..
```

## Next Steps

1. **Test the fixes** using the verification checklist
2. **Create new sandbox accounts** for clean testing
3. **Use EAS Build** for TestFlight to avoid local build issues
4. **Monitor console logs** for any remaining errors

The core IAP service has been updated and all import issues fixed. The remaining issues are configuration-related and should be resolved with the above steps.
