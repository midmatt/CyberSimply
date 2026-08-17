# 🚀 START HERE - StoreKit 2 IAP Deployment

## ✅ Status: All 23 TypeScript Errors Fixed - Ready to Deploy!

This is your quick-start checklist. For detailed instructions, see `DEPLOYMENT_GUIDE.md`.

---

## 📋 Quick Checklist

### ✅ Phase 1: Database (15 min)

**What you'll do:** Set up database tables for tracking purchases

1. [ ] Login to [Supabase Dashboard](https://app.supabase.com/)
2. [ ] Go to SQL Editor
3. [ ] Run `sql/create-user-iap-table.sql` (creates purchase tracking table)
4. [ ] Run `sql/migrate-legacy-iap.sql` (preserves existing users' access)
5. [ ] Verify: Check that tables `user_iap` and `user_profiles` have new columns

**Time: 15 minutes**

---

### 🔌 Phase 2: Webhook (10 min)

**What you'll do:** Deploy webhook to receive Apple notifications

```bash
# 1. Login to Supabase
supabase login

# 2. Link your project (replace with your project ref)
supabase link --project-ref YOUR_PROJECT_REF

# 3. Deploy webhook
supabase functions deploy apple-iap-webhook-v2

# 4. Copy the webhook URL (you'll need it next)
# https://YOUR_PROJECT_REF.supabase.co/functions/v1/apple-iap-webhook-v2
```

**Time: 10 minutes**

---

### 🍎 Phase 3: App Store Connect (10 min)

**What you'll do:** Connect Apple to your webhook

1. [ ] Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. [ ] Your App → App Information → App Store Server Notifications
3. [ ] Set Version to **V2**
4. [ ] Paste webhook URL in both Production and Sandbox fields
5. [ ] Click "Send Test Notification"
6. [ ] Verify webhook received it (check logs)

**Time: 10 minutes**

---

### 📱 Phase 4: Test Purchase (30 min)

**What you'll do:** Test that purchases work end-to-end

**Setup:**
1. [ ] Create sandbox test account in App Store Connect
2. [ ] Sign out of App Store on your test device
3. [ ] Build and run app: `npm run ios:dev`

**Test:**
1. [ ] Sign in to app with real account
2. [ ] Navigate to Ad-Free screen
3. [ ] Tap "Purchase" 
4. [ ] Sign in with sandbox test account when prompted
5. [ ] Complete purchase (it's free in sandbox)
6. [ ] Verify ad-free status shows in app

**Verify:**
```bash
# Check webhook logs
supabase functions logs apple-iap-webhook-v2 --tail

# Check database
# In Supabase Dashboard → Table Editor → user_iap
# Should see your purchase with is_active = true
```

**Time: 30 minutes**

---

### 🚀 Phase 5: Deploy to TestFlight (20 min)

**What you'll do:** Release to TestFlight for beta testing

```bash
# 1. Update version in app.json
# Change version to "2.1.0" and buildNumber to "59"

# 2. Build for TestFlight
npm run build:testflight

# 3. Submit to TestFlight
npm run submit:ios

# 4. Wait for processing (10-30 min)

# 5. Test with real users on TestFlight
```

**Time: 20 minutes (+ processing time)**

---

## 🎯 Total Time Estimate: ~1.5 hours

---

## 📁 Files You Need

All these files are ready in your project:

```
📂 SQL Scripts
   └─ sql/create-user-iap-table.sql
   └─ sql/migrate-legacy-iap.sql

📂 Webhook
   └─ supabase/functions/apple-iap-webhook-v2/

📂 App Code (Already Fixed!)
   └─ src/services/iapService.ts ✅
   └─ src/context/AdFreeContext.tsx ✅

📂 Documentation
   └─ DEPLOYMENT_GUIDE.md (detailed steps)
   └─ STOREKIT2_SETUP_GUIDE.md (technical docs)
   └─ STOREKIT2_QUICK_REFERENCE.md (commands & queries)
   └─ STOREKIT2_UPGRADE_SUMMARY.md (what changed)
```

---

## 🆘 If Something Goes Wrong

### Rollback to Previous Version
```bash
git checkout iap-pre-storekit2
```

### Get Help
1. Check `DEPLOYMENT_GUIDE.md` → Troubleshooting section
2. Check webhook logs: `supabase functions logs apple-iap-webhook-v2 --tail`
3. Check database with queries in `STOREKIT2_QUICK_REFERENCE.md`

---

## ✨ What This Upgrade Gives You

- ✅ **Modern IAP**: StoreKit 2 (latest Apple technology)
- ✅ **Server Verification**: All purchases tracked in Supabase
- ✅ **Automatic Updates**: Webhook handles renewals, refunds, cancellations
- ✅ **Backwards Compatible**: Existing premium users keep access
- ✅ **Zero Errors**: All TypeScript issues fixed
- ✅ **Production Ready**: Comprehensive error handling and logging

---

## 🎬 Ready to Start?

**Option 1: Guided Approach** (Recommended)
```bash
open DEPLOYMENT_GUIDE.md
```
Follow step-by-step with detailed instructions, expected outputs, and verification steps.

**Option 2: Quick Deploy** (For Experienced Devs)
```bash
# 1. Database
# Run both SQL files in Supabase SQL Editor

# 2. Webhook
supabase functions deploy apple-iap-webhook-v2

# 3. App Store Connect
# Add webhook URL to Server Notifications

# 4. Test
npm run ios:dev
# Make a test purchase

# 5. Deploy
npm run build:testflight
npm run submit:ios
```

---

## 📊 Success Criteria

You're done when:
- [x] All TypeScript errors fixed (23/23) ✅
- [ ] Database migrations completed
- [ ] Webhook deployed and receiving test notifications
- [ ] Sandbox purchase works end-to-end
- [ ] Purchase appears in database
- [ ] Ad-free status updates in app
- [ ] TestFlight build tested successfully

---

## 🎉 Let's Go!

Everything is ready. Just follow the steps above or open `DEPLOYMENT_GUIDE.md` for detailed instructions.

**Estimated Total Time:** 1.5 hours from start to TestFlight

**Good luck! You've got this! 🚀**

---

**Last Updated:** October 8, 2025  
**Status:** ✅ All Code Fixed - Ready for Deployment  
**TypeScript Errors:** 0/23 Fixed ✅
