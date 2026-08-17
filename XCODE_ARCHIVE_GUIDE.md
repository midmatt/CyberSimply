# Xcode Archive Guide - CyberSimply App

## Overview
This guide will help you archive your CyberSimply app directly in Xcode since your EAS free trial has expired. The app is already configured for local development and archiving.

## Prerequisites
- Xcode 15.0 or later
- macOS 14.0 or later
- Apple Developer Account (for distribution)
- Valid provisioning profiles and certificates

## Step-by-Step Archive Process

### 1. Open the Project in Xcode
```bash
cd /Users/matthewvella/code/CyberSimply-clean
open ios/CyberSimply.xcworkspace
```
**Important**: Always open the `.xcworkspace` file, not the `.xcodeproj` file.

### 2. Clean and Prepare the Project
1. In Xcode, go to **Product** → **Clean Build Folder** (Cmd+Shift+K)
2. Wait for the cleaning process to complete

### 3. Configure Build Settings
1. Select the **CyberSimply** project in the navigator
2. Select the **CyberSimply** target
3. Go to **Build Settings** tab
4. Verify these key settings:
   - **Deployment Target**: iOS 12.0 or later
   - **Bundle Identifier**: `com.cybersimply.app`
   - **Version**: 1.0.0
   - **Build**: 30
   - **Code Signing Identity**: Your Apple Developer certificate
   - **Provisioning Profile**: Your distribution profile

### 4. Configure Signing & Capabilities
1. Select the **CyberSimply** target
2. Go to **Signing & Capabilities** tab
3. Ensure these are configured:
   - **Team**: Your Apple Developer Team
   - **Bundle Identifier**: `com.cybersimply.app`
   - **Signing Certificate**: Distribution certificate
   - **Provisioning Profile**: Distribution profile

### 5. Verify Capabilities
Ensure these capabilities are enabled:
- **In-App Purchase** ✅
- **Sign In with Apple** ✅
- **Associated Domains** ✅ (applinks:cybersimply.com)

### 6. Build for Archive
1. In Xcode, go to **Product** → **Archive**
2. Wait for the build process to complete (this may take 5-10 minutes)
3. If successful, the **Organizer** window will open

### 7. Distribute the Archive
1. In the Organizer, select your archive
2. Click **Distribute App**
3. Choose your distribution method:
   - **App Store Connect** (for App Store)
   - **Ad Hoc** (for internal testing)
   - **Enterprise** (if you have Enterprise account)
   - **Development** (for development testing)

### 8. Upload to App Store Connect (if distributing to App Store)
1. Select **App Store Connect**
2. Click **Next**
3. Choose **Upload** (not Export)
4. Select your distribution certificate
5. Click **Next** → **Upload**

## Troubleshooting Common Issues

### Build Errors
- **"No such module"**: Run `cd ios && pod install` in terminal
- **Code signing errors**: Check certificates and provisioning profiles
- **Bundle identifier conflicts**: Ensure unique bundle ID

### Archive Errors
- **"Archive failed"**: Clean build folder and try again
- **"Missing required icon"**: Check all required icon sizes are present
- **"Invalid entitlements"**: Verify capabilities match your provisioning profile

### Pod Issues
If you encounter CocoaPods issues:
```bash
cd ios
pod deintegrate
pod install
```

## Pre-Archive Checklist

### ✅ App Configuration
- [ ] Bundle identifier: `com.cybersimply.app`
- [ ] Version: 1.0.0
- [ ] Build number: 30
- [ ] Display name: CyberSimply
- [ ] All required icons present

### ✅ Code Signing
- [ ] Valid distribution certificate
- [ ] Valid distribution provisioning profile
- [ ] Team selected correctly
- [ ] Automatic signing disabled (for distribution)

### ✅ Capabilities
- [ ] In-App Purchase enabled
- [ ] Sign In with Apple enabled
- [ ] Associated Domains configured
- [ ] Background modes configured

### ✅ Privacy & Permissions
- [ ] Privacy descriptions added
- [ ] Camera usage description
- [ ] Microphone usage description
- [ ] Photo library usage description
- [ ] Location usage description
- [ ] User tracking description

### ✅ Build Settings
- [ ] Deployment target: iOS 12.0+
- [ ] Release configuration selected
- [ ] Debug symbols included
- [ ] Bitcode enabled (if required)

## App Store Connect Preparation

### Required Information
- **App Name**: CyberSimply
- **Bundle ID**: com.cybersimply.app
- **Version**: 1.0.0
- **Build**: 30
- **Category**: News
- **Content Rating**: 4+ (suitable for all ages)

### App Description
```
Stay informed with the latest cybersecurity news, insights, and analysis. Get breaking news, expert analysis, and in-depth coverage of the cybersecurity landscape.

Key Features:
• Latest cybersecurity news and analysis
• Personalized content based on your interests
• Offline reading capabilities
• Ad-free experience with premium subscription
• Secure and private browsing
• Regular updates with breaking news alerts

Perfect for security professionals, IT administrators, and anyone interested in staying current with cybersecurity trends and threats.
```

### Keywords
cybersecurity, news, security, hacking, privacy, technology

### Screenshots Required
- iPhone 6.7" (iPhone 14 Pro Max)
- iPhone 6.5" (iPhone 11 Pro Max)
- iPhone 5.5" (iPhone 8 Plus)
- iPad Pro 12.9" (6th generation)
- iPad Pro 12.9" (2nd generation)

## Post-Upload Steps

### 1. App Store Connect
1. Log into App Store Connect
2. Go to **My Apps** → **CyberSimply**
3. Select the uploaded build
4. Complete app information
5. Add screenshots and metadata
6. Submit for review

### 2. TestFlight (Optional)
1. Add internal testers
2. Add external testers (if needed)
3. Send test invitations
4. Monitor crash reports and feedback

## Build Scripts

### Quick Build Script
```bash
#!/bin/bash
# quick-build.sh
cd ios
pod install
xcodebuild -workspace CyberSimply.xcworkspace -scheme CyberSimply -configuration Release -archivePath CyberSimply.xcarchive archive
```

### Clean Build Script
```bash
#!/bin/bash
# clean-build.sh
cd ios
rm -rf build/
rm -rf DerivedData/
pod deintegrate
pod install
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply
```

## Important Notes

### Security
- Never commit certificates or provisioning profiles to git
- Use environment variables for sensitive data
- Keep your Apple Developer account secure

### Performance
- Archive builds are optimized for distribution
- Debug symbols are included for crash reporting
- Bitcode is enabled for App Store optimization

### Testing
- Test the archive build on a physical device
- Verify all features work correctly
- Check that in-app purchases work
- Test restore purchases functionality

## Support
If you encounter issues:
1. Check Xcode console for detailed error messages
2. Verify all dependencies are properly installed
3. Ensure your Apple Developer account is active
4. Check that all required capabilities are enabled

## Next Steps After Successful Archive
1. Upload to App Store Connect
2. Complete app metadata
3. Submit for App Store review
4. Monitor for approval status
5. Release to users once approved

Your CyberSimply app is now ready for Xcode archiving! 🚀