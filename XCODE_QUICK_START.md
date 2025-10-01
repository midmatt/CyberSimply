# Xcode Archive & Upload to App Store - Quick Start

**Ready to submit to Apple tonight!** ✅

---

## 🚀 Quick Steps (5-Step Process)

### **Step 1: Open Xcode** (30 seconds)
```bash
cd /Users/matthewvella/code/CyberSimply-clean/ios
open CyberSimply.xcworkspace
```

### **Step 2: Configure for Archive** (1 minute)

In Xcode:
1. **Top toolbar** → Select destination dropdown
2. Choose: **"Any iOS Device (arm64)"**
3. Verify scheme is set to **"CyberSimply"**

### **Step 3: Archive** (10-15 minutes)

1. Menu: **Product** → **Archive** (or press `Cmd+Shift+B`)
2. Wait for archive to complete
3. Organizer window will open automatically

### **Step 4: Upload to App Store** (5 minutes)

In the Organizer window:
1. Click **"Distribute App"**
2. Select **"App Store Connect"**
3. Click **"Upload"**
4. Click **"Next"** through all prompts
5. Click **"Upload"**
6. Wait for upload to complete
7. Click **"Done"**

### **Step 5: Submit for Review** (10 minutes)

1. Go to: https://appstoreconnect.apple.com
2. Select **CyberSimply**
3. Click **"App Store"** tab
4. Under Build, click **"+" or "Select a build"**
5. Choose the build you just uploaded
6. Fill in required info (see below)
7. Click **"Add for Review"**
8. Click **"Submit to App Review"**

---

## 📝 Required Information for App Store Connect

### **App Information**
- **Name**: CyberSimply
- **Subtitle**: Cybersecurity News & Insights
- **Category**: News
- **Content Rights**: Check "Contains third-party content"

### **Privacy**
- **Privacy Policy URL**: (your website)/privacy
- **Data Collection**: 
  - ❌ Does NOT track users (we removed NSUserTrackingUsageDescription)
  - ✅ Collects email for authentication only

### **App Review Information**
- **Demo Account**: Provide a test account
  - Email: test@example.com
  - Password: TestPassword123
- **Notes**: "App displays cybersecurity news. In-app purchases for ad-free access."

### **Version Information**
- **Version**: 1.0.0
- **Build**: 46
- **What's New**: "Initial release of CyberSimply - your source for cybersecurity news and insights."

---

## 📸 Screenshot Requirements (IMPORTANT!)

You MUST provide screenshots before submitting:

**Required Sizes:**
- 6.7" Display (iPhone 15 Pro Max): 1290 x 2796 px
- 6.5" Display (iPhone 11 Pro Max): 1242 x 2688 px

**How to Capture**:
1. Open iOS Simulator: iPhone 15 Pro Max
2. Run your app: `npm start` and press `i`
3. Navigate to key screens
4. Press `Cmd+S` to save screenshot
5. Screenshots save to Desktop

**Screens to Capture** (minimum 3, max 10):
1. Home screen with articles
2. Article detail view
3. Categories screen
4. Ad-Free screen (showing active status)
5. Profile screen

---

## ⚠️ Common Issues & Solutions

### "No iOS devices connected"
- Select **"Any iOS Device (arm64)"** NOT a simulator

### "Signing identity not found"
- Xcode → Settings → Accounts
- Sign in with your Apple ID
- Download certificates

### "Archive button grayed out"
- Make sure you selected "Any iOS Device", not a simulator

### "Upload failed - build number too low"
- Build number is currently **46** (higher than 41) ✅
- Should work fine!

### "Missing compliance information"
- Already set in Info.plist: `ITSAppUsesNonExemptEncryption = false` ✅

---

## ✅ Pre-Submission Checklist

Before uploading, verify:

- [x] Build number = 46 (>= 42) ✅
- [x] NSUserTrackingUsageDescription removed ✅
- [x] Profile picture upload disabled ✅
- [x] IAP working (lifetime & monthly) ✅
- [x] Restore purchases working ✅
- [x] Subscription management working ✅
- [x] Archive screen loading from Supabase ✅
- [x] All code pushed to GitHub ✅

---

## 🎯 Current Build Configuration

```
App Name: CyberSimply
Bundle ID: com.cybersimply.app
Version: 1.0.0
Build Number: 46
Team: V6B8A4AKNR (Matthew Vella - Individual)

Fixes Included:
✅ No tracking permission (App Store compliant)
✅ No profile upload (no RLS errors)
✅ Fixed restore button logic
✅ Fixed subscription cancellation instructions
✅ Archive screen loads from Supabase
✅ Sentence-based summary truncation
```

---

## 🚀 Ready to Go!

All issues resolved! Your app is ready for production submission tonight.

**Timeline:**
- Archive: 10-15 min
- Upload: 5 min
- Processing: 10-30 min
- Fill App Store info: 15-30 min
- **Total**: ~1 hour

**Good luck!** 🍀

