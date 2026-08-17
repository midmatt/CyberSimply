# Xcode Archive & App Store Submission Guide

Complete guide for archiving your app in Xcode and submitting to Apple App Store Connect.

---

## 🚀 Quick Start

```bash
# Run the preparation script
./prepare-xcode-archive.sh

# Open Xcode
cd ios && open CyberSimply.xcworkspace
```

---

## 📋 Step-by-Step Process

### **Step 1: Prepare the Project**

Run the preparation script:
```bash
./prepare-xcode-archive.sh
```

This will:
- ✅ Clean previous builds
- ✅ Install npm dependencies
- ✅ Update CocoaPods
- ✅ Verify build number (>= 42)
- ✅ Verify no tracking permissions
- ✅ Run expo prebuild

### **Step 2: Open in Xcode**

```bash
cd ios
open CyberSimply.xcworkspace
```

**Important**: Always open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### **Step 3: Configure Xcode**

1. **Select the correct scheme**:
   - Click the scheme dropdown (top left)
   - Select `CyberSimply`

2. **Select destination**:
   - Click the destination dropdown (next to scheme)
   - Select `Any iOS Device (arm64)`
   - **Do NOT** select a simulator!

3. **Verify signing**:
   - Click on the project in the navigator (left sidebar)
   - Select the `CyberSimply` target
   - Go to `Signing & Capabilities` tab
   - Ensure:
     - ✅ "Automatically manage signing" is checked
     - ✅ Team: Matthew Vella (Individual)
     - ✅ Bundle Identifier: com.cybersimply.app

### **Step 4: Archive the App**

1. **Clean build folder**:
   - Menu: `Product` → `Clean Build Folder` (Cmd+Shift+K)

2. **Create archive**:
   - Menu: `Product` → `Archive` (Cmd+Shift+B or Cmd+B)
   - Wait 5-15 minutes for archive to complete
   - ☕ Grab some coffee!

3. **Watch for errors**:
   - If you see errors, check the build log
   - Common issues:
     - Missing pods: Run `cd ios && pod install`
     - Signing issues: Check Signing & Capabilities
     - Module not found: Run `npx expo prebuild --clean`

### **Step 5: Distribute to App Store**

Once archive completes, the **Organizer** window will open:

1. **Validate the archive** (optional but recommended):
   - Click `Validate App`
   - Select your distribution certificate
   - Click `Validate`
   - Wait for validation to complete

2. **Distribute the app**:
   - Click `Distribute App`
   - Select `App Store Connect`
   - Click `Next`
   
3. **Upload options**:
   - Select `Upload`
   - Click `Next`
   
4. **Distribution options**:
   - ✅ Strip Swift symbols: Yes
   - ✅ Upload your app's symbols: Yes
   - ✅ Manage Version and Build Number: (Xcode will handle it)
   - Click `Next`

5. **Re-sign**:
   - Select "Automatically manage signing"
   - Click `Next`

6. **Review**:
   - Review the summary
   - Click `Upload`
   - Wait for upload to complete (2-5 minutes)

7. **Success!**:
   - You'll see "Upload Successful"
   - Click `Done`

### **Step 6: Submit for Review in App Store Connect**

1. Go to: https://appstoreconnect.apple.com

2. **Select your app**:
   - Click on your app

3. **Go to App Store tab**:
   - Click the `App Store` tab (not TestFlight)

4. **Add build**:
   - Under "Build", click `+` or "Select a build"
   - Select the build you just uploaded
   - Wait a few minutes for processing if it doesn't appear immediately

5. **Fill in required information**:
   - **App Name**: CyberSimply
   - **Subtitle**: Stay informed on cybersecurity news
   - **Description**: (Write a compelling description)
   - **Keywords**: cybersecurity, news, security, hacking, privacy
   - **Support URL**: Your support website
   - **Marketing URL**: Your website (optional)
   - **Screenshots**: Upload required screenshots (see below)
   - **App Icon**: Already included in build
   - **Age Rating**: Select appropriate rating
   - **Copyright**: Your copyright info

6. **App Privacy**:
   - Click "Edit" next to App Privacy
   - Answer questions about data collection
   - **Important**: Since we removed NSUserTrackingUsageDescription, select "No" for tracking

7. **Pricing**:
   - Select pricing tier (Free recommended)
   - Select territories

8. **In-App Purchases**:
   - Your IAP products should already be configured
   - Verify:
     - `com.cybersimply.adfree.lifetime.2025`
     - `com.cybersimply.adfree.monthly.2025`

9. **Submit for Review**:
   - Click `Add for Review`
   - Click `Submit to App Review`
   - Answer any additional questions
   - Click `Submit`

---

## 📸 Screenshot Requirements

You need screenshots for:
- **6.7" Display (iPhone 14 Pro Max, 15 Pro Max)**: 1290 x 2796 pixels
- **6.5" Display (iPhone 11 Pro Max, XS Max)**: 1242 x 2688 pixels
- **5.5" Display (iPhone 8 Plus)**: 1242 x 2208 pixels (optional)

**Required**: At least 1 set for 6.7" or 6.5" display

**How to capture**:
1. Run app in simulator for 6.7" device (iPhone 15 Pro Max)
2. Take screenshots using `Cmd+S`
3. Screenshots save to Desktop
4. Upload to App Store Connect

---

## 🔍 Troubleshooting

### Archive Fails

**Error: "Module not found"**
```bash
npx expo prebuild --clean
cd ios && pod install
```

**Error: "Signing identity not found"**
- Go to Xcode → Settings → Accounts
- Add your Apple ID
- Download certificates

**Error: "Provisioning profile doesn't match"**
```bash
cd ios
rm -rf ~/Library/Developer/Xcode/DerivedData
pod install
```

### Upload Fails

**Error: "Invalid binary"**
- Rebuild the archive
- Ensure build number is incremented

**Error: "Missing compliance"**
- Set `ITSAppUsesNonExemptEncryption` to `false` (already done)

---

## ✅ Pre-Flight Checklist

Before archiving, verify:

- [ ] Build number >= 42 (currently: 46) ✅
- [ ] NSUserTrackingUsageDescription removed ✅
- [ ] Profile picture upload removed ✅
- [ ] All IAP features working ✅
- [ ] Archive screen loads from Supabase ✅
- [ ] Summary truncation fixed ✅
- [ ] Restore purchase logic correct ✅
- [ ] Subscription cancellation instructions updated ✅
- [ ] All linting errors resolved ✅

---

## 📝 Quick Reference Commands

```bash
# Prepare for archive
./prepare-xcode-archive.sh

# Open in Xcode
cd ios && open CyberSimply.xcworkspace

# Clean and rebuild (if needed)
cd ios
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply
pod install
cd ..
npx expo prebuild --clean

# Check build number
grep -A1 "buildNumber" app.json

# Update build number (if needed)
# Edit app.json and ios/CyberSimply/Info.plist manually
```

---

## 🎯 App Store Connect URLs

- **App Store Connect**: https://appstoreconnect.apple.com
- **Developer Portal**: https://developer.apple.com
- **TestFlight**: https://appstoreconnect.apple.com/apps/{app-id}/testflight

---

## 💡 Tips

1. **Archive takes time**: 5-15 minutes is normal
2. **Upload takes time**: Processing can take 10-30 minutes
3. **Review takes time**: Apple review usually 24-48 hours
4. **Screenshots matter**: Make them look professional
5. **Description matters**: Clear, concise, keyword-rich

---

## 🆘 Need Help?

If you encounter issues:
1. Check the build logs in Xcode
2. Search the error message
3. Clean and rebuild
4. Check Apple Developer Forums

---

Good luck with your submission! 🚀

