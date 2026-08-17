# 🚀 StoreKit 2 IAP - Step-by-Step Deployment Guide

This guide will walk you through deploying the new StoreKit 2 + Supabase IAP system to your CyberSimply app.

---

## ✅ Pre-Flight Checklist

Before you begin, make sure you have:
- [ ] Supabase account with project access
- [ ] App Store Connect account with admin access
- [ ] Product IDs already configured in App Store Connect
- [ ] Xcode 14+ installed on your Mac
- [ ] Node.js and npm installed
- [ ] Supabase CLI installed (`npm install -g supabase`)

---

## 📝 Step 1: Database Setup (15 minutes)

### 1.1 Login to Supabase Dashboard

1. Go to https://app.supabase.com/
2. Select your CyberSimply project
3. Click on **SQL Editor** in the left sidebar

### 1.2 Create the user_iap Table

1. Click **+ New query**
2. Copy the contents from `/Users/matthewvella/code/CyberSimply-clean/sql/create-user-iap-table.sql`
3. Paste into the SQL editor
4. Click **Run** or press `Cmd + Enter`
5. ✅ Verify: You should see "Success. No rows returned"

### 1.3 Update user_profiles Table

1. Create another new query
2. Run this SQL:

```sql
-- Add new columns to user_profiles (if they don't exist)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ad_free BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMP WITH TIME ZONE;
```

3. Click **Run**
4. ✅ Verify: You should see "Success. No rows returned"

### 1.4 Migrate Existing Users

**⚠️ IMPORTANT: Do this step to preserve existing premium users' access!**

1. Create another new query
2. Copy the contents from `/Users/matthewvella/code/CyberSimply-clean/sql/migrate-legacy-iap.sql`
3. Paste and click **Run**
4. ✅ Verify: Check the Messages tab - you should see success messages like:
   - "✅ Migrated X existing premium users to ad_free status"
   - "✅ Created X legacy transaction records in user_iap"

### 1.5 Verify Database Setup

Run this verification query:

```sql
-- Verify tables exist
SELECT 
  COUNT(*) FILTER (WHERE table_name = 'user_iap') as user_iap_exists,
  COUNT(*) FILTER (WHERE table_name = 'user_profiles') as user_profiles_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('user_iap', 'user_profiles');
```

Expected result: Both columns should show `1`

---

## 🔌 Step 2: Deploy Webhook to Supabase (10 minutes)

### 2.1 Install Supabase CLI (if not installed)

```bash
npm install -g supabase
```

### 2.2 Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### 2.3 Link Your Project

```bash
cd /Users/matthewvella/code/CyberSimply-clean
supabase link --project-ref YOUR_PROJECT_REF
```

**How to find your PROJECT_REF:**
- Go to Supabase Dashboard → Settings → General
- Look for "Reference ID" - it's a string like `abcdefghijklmnop`

### 2.4 Deploy the Webhook Function

```bash
supabase functions deploy apple-iap-webhook-v2
```

Expected output:
```
✓ Deployed Function apple-iap-webhook-v2
```

### 2.5 Get Your Webhook URL

Your webhook URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/apple-iap-webhook-v2
```

**📝 Copy this URL - you'll need it for App Store Connect!**

### 2.6 Test the Webhook

```bash
# View webhook logs (keep this running in a separate terminal)
supabase functions logs apple-iap-webhook-v2 --tail
```

---

## 🍎 Step 3: Configure App Store Connect (10 minutes)

### 3.1 Verify Product IDs

1. Go to https://appstoreconnect.apple.com/
2. Select your CyberSimply app
3. Go to **Features** → **In-App Purchases**
4. Verify these products exist:
   - `com.cybersimply.adfree.lifetime.2025` (Type: Non-Consumable)
   - `com.cybersimply.adfree.monthly.2025` (Type: Auto-Renewable Subscription)

**If they don't exist:**
- Create them now using the "+" button
- Set pricing (e.g., $12.99 for lifetime, $2.99/month for subscription)
- Submit for review

### 3.2 Configure App Store Server Notifications

1. In App Store Connect, go to your app → **App Information**
2. Scroll down to **App Store Server Notifications**
3. Click **Manage** or **+** to add webhook
4. Configure:
   - **Version**: Select **Version 2**
   - **Production Server URL**: Paste your webhook URL from Step 2.5
   - **Sandbox Server URL**: Same URL (paste again)
5. Click **Save**

### 3.3 Test the Webhook Connection

1. In the Server Notifications section, click **Send Test Notification**
2. Check your webhook logs (from Step 2.6)
3. ✅ You should see: `✅ [Webhook] Test notification received`

**If you don't see it:**
- Double-check the URL is correct
- Make sure the webhook is deployed
- Check for typos in the URL

---

## 📱 Step 4: App Configuration & Testing (30 minutes)

### 4.1 Verify Dependencies

```bash
cd /Users/matthewvella/code/CyberSimply-clean
npm list react-native-iap
```

Expected: `react-native-iap@12.15.0` or higher

**If missing:**
```bash
npm install react-native-iap@^12.15.0
```

### 4.2 iOS Setup in Xcode

1. Open the iOS project:
   ```bash
   open ios/CyberSimply.xcworkspace
   ```

2. In Xcode, select your project → **Signing & Capabilities**

3. Verify **In-App Purchase** capability is enabled
   - If not, click **+ Capability** → Add **In-App Purchase**

4. Verify **Sign in with Apple** is enabled (if using Supabase auth)

5. Update **Bundle Identifier** if needed (should match App Store Connect)

### 4.3 Create Sandbox Test Account

1. Go to App Store Connect → **Users and Access** → **Sandbox**
2. Click **+** to add Sandbox Tester
3. Fill in:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: test.user@yourapptest.com (use unique email)
   - **Password**: Create a strong password
   - **Country/Region**: United States (or your region)
4. Click **Save**

**📝 Save these credentials - you'll need them for testing!**

### 4.4 Sign Out of App Store on Test Device

**On your physical iPhone or simulator:**
1. Go to **Settings** → **App Store**
2. Tap your Apple ID at the top
3. Tap **Sign Out**
4. **Do NOT sign back in yet!**

### 4.5 Build and Run for Testing

```bash
# Clean build
rm -rf ios/build
rm -rf ios/Pods
cd ios && pod install && cd ..

# Run on device (recommended) or simulator
npm run ios:dev
```

**Or in Xcode:**
- Select your device/simulator
- Click the ▶️ Play button

---

## 🧪 Step 5: Test the Purchase Flow (20 minutes)

### 5.1 Launch the App

1. App should launch successfully
2. Sign in or create an account (if not already signed in)

### 5.2 Navigate to Ad-Free Screen

1. Go to **Settings** → **Go Ad-Free** (or wherever your IAP screen is)
2. ✅ You should see the products listed with prices

### 5.3 Test Purchase

1. Tap **Purchase** on the lifetime product
2. App Store payment sheet should appear
3. **When prompted to sign in:**
   - Sign in with your **Sandbox Test Account** credentials
   - Check "Remember me" if prompted
4. Confirm the purchase (it's free in sandbox)
5. ✅ Purchase should complete immediately

### 5.4 Verify Purchase Success

**In the app:**
- Check logs in Xcode console for:
  ```
  ✅ [IAP] Purchase initiated
  ✅ [IAP] Purchase recorded in user_iap table
  ✅ [AdFree] Active purchase found in user_iap
  ```
- UI should update to show "Ad-Free Active" or hide ads

**In Supabase Dashboard:**
1. Go to **Table Editor** → `user_iap`
2. You should see a new row with your purchase
3. Check `is_active` = `true`

**In Webhook Logs:**
```bash
supabase functions logs apple-iap-webhook-v2 --tail
```
- You might see a notification (could take a few minutes)

### 5.5 Test Restore Purchases

1. In the app, go back to Settings → Go Ad-Free
2. Tap **Restore Purchases**
3. ✅ You should see "Purchases restored successfully"
4. ✅ Ad-free status should remain active

### 5.6 Test with New Account

1. Sign out of the app
2. Create a new account (or sign in as different user)
3. ✅ This account should NOT have ad-free access
4. ✅ Products should be available for purchase

---

## 🎯 Step 6: TestFlight Deployment (20 minutes)

### 6.1 Update Version Numbers

In `app.json`:
```json
{
  "expo": {
    "version": "2.1.0",
    "ios": {
      "buildNumber": "59"
    }
  }
}
```

### 6.2 Build for TestFlight

```bash
# Use the provided script
npm run build:testflight
```

**Or manually:**
```bash
eas build --platform ios --profile production
```

### 6.3 Submit to TestFlight

```bash
npm run submit:ios
```

**Or manually:**
1. Go to App Store Connect → TestFlight
2. Upload the build
3. Wait for processing (10-30 minutes)
4. Once processed, add to testers

### 6.4 Test on TestFlight

1. Install from TestFlight
2. Repeat Step 5 tests
3. Verify everything works in production environment

---

## 📊 Step 7: Monitoring & Verification (Ongoing)

### 7.1 Monitor Webhook Activity

```bash
# Real-time logs
supabase functions logs apple-iap-webhook-v2 --tail

# Recent logs
supabase functions logs apple-iap-webhook-v2
```

Look for:
- ✅ `📬 [Webhook] Received notification`
- ✅ `✅ [Webhook] Purchase activated`
- ❌ Any error messages

### 7.2 Database Queries

**Check active ad-free users:**
```sql
SELECT COUNT(*) as active_adfree_users
FROM user_profiles
WHERE ad_free = TRUE;
```

**Check recent purchases:**
```sql
SELECT 
  up.email,
  ui.product_id,
  ui.purchase_date,
  ui.is_active,
  ui.expires_date
FROM user_iap ui
JOIN user_profiles up ON ui.user_id = up.id
WHERE ui.purchase_date > NOW() - INTERVAL '7 days'
ORDER BY ui.purchase_date DESC;
```

**Check webhook activity:**
```sql
SELECT 
  product_id,
  last_notification_type,
  last_notification_date,
  COUNT(*) as count
FROM user_iap
WHERE last_notification_date > NOW() - INTERVAL '24 hours'
GROUP BY product_id, last_notification_type, last_notification_date
ORDER BY last_notification_date DESC;
```

### 7.3 Key Metrics to Watch

Monitor these daily:
- [ ] Purchase success rate (aim for >95%)
- [ ] Webhook delivery rate (should be 100%)
- [ ] Failed renewals (investigate if >5%)
- [ ] User support tickets about IAP

---

## 🚨 Troubleshooting

### Issue: "Products not loading"

**Check:**
1. Product IDs match exactly in code and App Store Connect
2. Products are in "Ready to Submit" or "Approved" status
3. Sandbox test account is signed in
4. App is connected to internet

**Fix:**
```bash
# Re-fetch products
# In app, kill and relaunch
```

### Issue: "Purchase fails immediately"

**Check:**
1. Using sandbox test account (not your real Apple ID)
2. Signed out of App Store in Settings
3. Product is available in your region
4. No existing active subscription

**Fix:**
- Delete app, sign out completely, reinstall

### Issue: "Purchase succeeds but ad-free not activating"

**Check:**
1. Webhook logs for errors
2. Database: `SELECT * FROM user_iap WHERE user_id = 'YOUR_USER_ID'`
3. User is authenticated in app

**Fix:**
```sql
-- Manually grant access (temporary)
UPDATE user_profiles 
SET ad_free = TRUE 
WHERE id = 'USER_ID';
```

### Issue: "Webhook not receiving notifications"

**Check:**
1. Webhook URL is correct in App Store Connect
2. Function is deployed: `supabase functions list`
3. No firewall blocking requests

**Fix:**
1. Redeploy webhook: `supabase functions deploy apple-iap-webhook-v2`
2. Re-save webhook URL in App Store Connect
3. Send test notification

---

## 🎉 Success Checklist

Before going to production, verify:

- [ ] Database migrations completed successfully
- [ ] Webhook deployed and receiving test notifications
- [ ] Sandbox purchase works end-to-end
- [ ] Purchase appears in `user_iap` table
- [ ] User profile updates to `ad_free = TRUE`
- [ ] UI updates to show ad-free status
- [ ] Restore purchases works
- [ ] TestFlight build tested by at least 2 people
- [ ] Webhook logs show no errors
- [ ] Legacy users still have ad-free access
- [ ] All 23 TypeScript errors fixed ✅

---

## 📚 Additional Resources

- **Full Setup Guide**: `STOREKIT2_SETUP_GUIDE.md`
- **Quick Reference**: `STOREKIT2_QUICK_REFERENCE.md`
- **Webhook Documentation**: `supabase/functions/apple-iap-webhook-v2/README.md`
- **Rollback Guide**: `backups/iap_backup_2025-10-08/README.md`

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review webhook logs for detailed errors
3. Check the full documentation in `STOREKIT2_SETUP_GUIDE.md`
4. Verify database state with provided SQL queries

---

**Last Updated**: October 8, 2025  
**Status**: ✅ Ready for Deployment  
**TypeScript Errors**: 0/23 Fixed ✅
