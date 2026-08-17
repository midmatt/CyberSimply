# StoreKit 2 + Supabase IAP Setup Guide

This guide walks you through setting up the upgraded IAP system with StoreKit 2, Supabase integration, and App Store Server Notifications v2.

---

## 📋 Prerequisites

- Xcode 14+ (for StoreKit 2)
- Supabase project with database access
- App Store Connect account with in-app purchase products configured
- Node.js & npm/yarn installed

---

## 🗂️ Part 1: Database Setup

### Step 1: Run Database Migrations

Execute these SQL scripts in your Supabase SQL Editor in order:

#### 1.1 Create user_iap table
```bash
# File: sql/create-user-iap-table.sql
```
This creates the `user_iap` table for tracking verified purchases and sets up automatic triggers.

#### 1.2 Update user_profiles schema
The `backend/supabase-schema.sql` has been updated with new columns:
- `ad_free` - TRUE only after verified purchase
- `product_type` - 'lifetime' or 'subscription'
- `purchase_date` - First purchase date
- `last_purchase_date` - Most recent purchase

Run the full schema or just add the missing columns:
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ad_free BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMP WITH TIME ZONE;
```

#### 1.3 Migrate existing users (Backwards Compatibility)
```bash
# File: sql/migrate-legacy-iap.sql
```
This script:
- ✅ Grants existing premium users `ad_free = TRUE`
- ✅ Creates synthetic `user_iap` records for legacy purchases
- ✅ Ensures zero disruption for existing users

**Run this BEFORE deploying the new app version!**

### Step 2: Verify Database Setup

Run this query to confirm everything is set up:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_iap', 'user_profiles');

-- Check columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('ad_free', 'product_type', 'purchase_date');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE tablename = 'user_iap';
```

---

## 🔌 Part 2: Supabase Edge Function (Webhook)

### Step 1: Deploy the Webhook Function

```bash
cd /Users/matthewvella/code/CyberSimply-clean

# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the webhook function
supabase functions deploy apple-iap-webhook-v2
```

### Step 2: Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/apple-iap-webhook-v2
```

**Save this URL - you'll need it for App Store Connect!**

### Step 3: Set Environment Variables

The Edge Function needs these environment variables (already set in Supabase):
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

No additional setup required for the function itself.

---

## 🍎 Part 3: App Store Connect Configuration

### Step 1: Configure In-App Purchase Products

Ensure your products are configured in App Store Connect:

1. Go to **App Store Connect** → Your App → **Features** → **In-App Purchases**
2. Verify these product IDs exist:
   - `com.cybersimply.adfree.lifetime.2025` (Non-consumable)
   - `com.cybersimply.adfree.monthly.2025` (Auto-renewable subscription)

### Step 2: Set Up App Store Server Notifications v2

1. Go to **App Store Connect** → Your App → **App Information**
2. Scroll to **App Store Server Notifications**
3. Click **Add URL** or **Edit**
4. Configure:
   - **Version**: Select **Version 2 Notifications**
   - **Production Server URL**: 
     ```
     https://YOUR_PROJECT_REF.supabase.co/functions/v1/apple-iap-webhook-v2
     ```
   - **Sandbox Server URL**: Same as production (function handles both)
5. Click **Save**

### Step 3: Test the Webhook

1. In App Store Connect, click **Send Test Notification**
2. Check your webhook is working:
   ```bash
   supabase functions logs apple-iap-webhook-v2 --tail
   ```
3. Look for: `✅ [Webhook] Test notification received`

---

## 📱 Part 4: App Configuration

### Step 1: Install Dependencies

Ensure you have the required npm packages:

```bash
npm install react-native-iap@^12.0.0
```

Or if using yarn:
```bash
yarn add react-native-iap@^12.0.0
```

### Step 2: iOS Configuration

#### 4.2.1 Update Info.plist

Add StoreKit 2 entitlement (already in your project):
```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>YOUR_AD_NETWORK_ID.skadnetwork</string>
  </dict>
</array>
```

#### 4.2.2 Enable In-App Purchase Capability

In Xcode:
1. Open `ios/CyberSimply.xcworkspace`
2. Select your project → **Signing & Capabilities**
3. Click **+ Capability** → Add **In-App Purchase**

#### 4.2.3 StoreKit Configuration File (for testing)

For local testing, create a StoreKit configuration file:
1. In Xcode: **File** → **New** → **File**
2. Search for **StoreKit Configuration File**
3. Add your product IDs for testing without App Store Connect

### Step 3: Environment Variables

Create/update `.env` file:
```bash
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# IAP Product IDs (optional, defined in code)
IAP_LIFETIME_PRODUCT=com.cybersimply.adfree.lifetime.2025
IAP_MONTHLY_PRODUCT=com.cybersimply.adfree.monthly.2025
```

**⚠️ IMPORTANT**: Never commit `.env` with real keys to version control!

---

## 🧪 Part 5: Testing

### Step 1: Test in Sandbox Environment

1. **Create Sandbox Test User** in App Store Connect:
   - Go to **Users and Access** → **Sandbox** → **Testers**
   - Add a test account (use unique email)

2. **Sign out of App Store on device**:
   - Settings → App Store → Sign Out

3. **Run your app** and attempt a purchase
   - You'll be prompted to sign in with sandbox account
   - Purchase should complete instantly (no actual charge)

### Step 2: Verify Purchase Flow

After purchase, check:

#### In Your App
```bash
# Check logs for:
✅ [IAP] Purchase initiated
✅ [IAP] Purchase recorded in user_iap table
✅ [AdFree] Active purchase found in user_iap
```

#### In Supabase
Query to verify:
```sql
-- Check user_iap table
SELECT * FROM user_iap 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY purchase_date DESC;

-- Check user_profiles
SELECT id, email, ad_free, product_type, premium_expires_at
FROM user_profiles
WHERE id = 'YOUR_USER_ID';
```

#### In Webhook Logs
```bash
supabase functions logs apple-iap-webhook-v2 --tail
```
Look for notification events.

### Step 3: Test Restore Purchases

1. In your app, go to Ad-Free screen
2. Tap **Restore Purchases**
3. Verify ad-free status is restored

---

## 🚀 Part 6: Deployment Checklist

Before releasing to production:

### Pre-Deployment
- [ ] Database migrations completed (`user_iap` table created)
- [ ] Legacy users migrated (run `migrate-legacy-iap.sql`)
- [ ] Webhook deployed and tested
- [ ] App Store Server Notifications v2 configured
- [ ] Webhook receiving test notifications successfully

### App Build
- [ ] `react-native-iap` version 12+ installed
- [ ] Product IDs match App Store Connect
- [ ] Supabase environment variables set correctly
- [ ] StoreKit 2 capability enabled in Xcode
- [ ] Tested in Sandbox with test account

### Post-Deployment
- [ ] Monitor webhook logs for errors
- [ ] Check user_iap table for incoming purchases
- [ ] Verify ad-free status syncs correctly
- [ ] Test restore purchases for existing users
- [ ] Monitor for any subscription renewal issues

---

## 📊 Part 7: Monitoring & Maintenance

### Daily Monitoring

Check webhook health:
```bash
supabase functions logs apple-iap-webhook-v2 --tail
```

### Database Queries

#### Active Subscriptions
```sql
SELECT COUNT(*) as active_subscriptions
FROM user_iap
WHERE is_active = TRUE
AND expires_date IS NOT NULL
AND expires_date > NOW();
```

#### Lifetime Purchases
```sql
SELECT COUNT(*) as lifetime_purchases
FROM user_iap
WHERE is_active = TRUE
AND expires_date IS NULL;
```

#### Recent Purchases
```sql
SELECT 
  ui.user_id,
  up.email,
  ui.product_id,
  ui.purchase_date,
  ui.expires_date
FROM user_iap ui
JOIN user_profiles up ON ui.user_id = up.id
WHERE ui.purchase_date > NOW() - INTERVAL '7 days'
ORDER BY ui.purchase_date DESC;
```

#### Failed Renewals
```sql
SELECT 
  ui.user_id,
  up.email,
  ui.last_notification_type,
  ui.last_notification_date
FROM user_iap ui
JOIN user_profiles up ON ui.user_id = up.id
WHERE ui.last_notification_type IN ('DID_FAIL_TO_RENEW', 'EXPIRED')
AND ui.last_notification_date > NOW() - INTERVAL '7 days';
```

---

## 🐛 Troubleshooting

### Issue: Purchases not showing up

**Check:**
1. Webhook is receiving notifications (check logs)
2. `user_iap` table has the transaction
3. `is_active = TRUE` and `expires_date` is future/null
4. User is authenticated when purchasing

**Fix:**
```sql
-- Manually activate a purchase
UPDATE user_iap
SET is_active = TRUE
WHERE transaction_id = 'TRANSACTION_ID';

-- Sync user profile
UPDATE user_profiles
SET ad_free = TRUE, is_premium = TRUE
WHERE id = 'USER_ID';
```

### Issue: Webhook not receiving notifications

**Check:**
1. Webhook URL is correct in App Store Connect
2. Function is deployed: `supabase functions list`
3. Send test notification from App Store Connect
4. Check function logs for errors

### Issue: Legacy users lost ad-free access

**Fix:**
```bash
# Re-run migration script
psql YOUR_DATABASE_URL -f sql/migrate-legacy-iap.sql
```

---

## 📚 Additional Resources

- **Files Created/Modified:**
  - `src/services/iapService.ts` - StoreKit 2 service
  - `src/context/AdFreeContext.tsx` - Updated status checking
  - `sql/create-user-iap-table.sql` - Database schema
  - `sql/migrate-legacy-iap.sql` - Migration script
  - `supabase/functions/apple-iap-webhook-v2/` - Webhook handler

- **Apple Documentation:**
  - [App Store Server Notifications v2](https://developer.apple.com/documentation/appstoreservernotifications)
  - [StoreKit 2 API](https://developer.apple.com/documentation/storekit)
  - [In-App Purchase Programming Guide](https://developer.apple.com/in-app-purchase/)

- **React Native IAP:**
  - [Documentation](https://github.com/dooboolab/react-native-iap)
  - [StoreKit 2 Support](https://github.com/dooboolab/react-native-iap#storekit-2)

---

## ✅ Success Criteria

Your upgrade is successful when:

1. ✅ New purchases appear in `user_iap` table within seconds
2. ✅ Ad-free status syncs immediately after purchase
3. ✅ Webhook receives and processes Apple notifications
4. ✅ Legacy users still have ad-free access (backwards compatible)
5. ✅ Restore Purchases works for all users
6. ✅ Subscription renewals auto-update in Supabase
7. ✅ Refunds and cancellations are detected automatically

---

🎉 **Congratulations!** Your app now has a robust, server-verified IAP system with automatic updates!

For questions or issues, refer to the troubleshooting section or check the webhook logs.
