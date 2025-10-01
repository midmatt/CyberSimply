#!/bin/bash

# Xcode Archive Preparation Script for App Store Submission
# This script prepares your app for archiving in Xcode and uploading to App Store Connect

set -e

echo "🚀 Preparing CyberSimply for Xcode Archive..."
echo "================================================"

# Step 1: Clean previous builds
echo ""
echo "📦 Step 1: Cleaning previous builds..."
cd ios
rm -rf build
rm -rf DerivedData
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply -configuration Release
cd ..

# Step 2: Install dependencies
echo ""
echo "📦 Step 2: Installing dependencies..."
npm install

# Step 3: Install iOS pods
echo ""
echo "📦 Step 3: Installing CocoaPods..."
cd ios
pod install --repo-update
cd ..

# Step 4: Verify build number
echo ""
echo "📦 Step 4: Verifying build number..."
BUILD_NUMBER=$(grep -A1 "buildNumber" app.json | tail -1 | tr -d ' ,"')
echo "Current build number: $BUILD_NUMBER"

if [ "$BUILD_NUMBER" -lt 42 ]; then
    echo "❌ Error: Build number must be >= 42 for App Store"
    exit 1
fi

echo "✅ Build number is valid: $BUILD_NUMBER"

# Step 5: Verify NSUserTrackingUsageDescription is removed
echo ""
echo "📦 Step 5: Verifying tracking permissions removed..."
if grep -q "NSUserTrackingUsageDescription" ios/CyberSimply/Info.plist; then
    echo "❌ Error: NSUserTrackingUsageDescription still present in Info.plist"
    echo "   This will cause App Store rejection"
    exit 1
fi
echo "✅ No tracking permissions found"

# Step 6: Create prebuild
echo ""
echo "📦 Step 6: Running Expo prebuild..."
npx expo prebuild --clean

echo ""
echo "================================================"
echo "✅ Preparation Complete!"
echo "================================================"
echo ""
echo "📱 NEXT STEPS - Archive in Xcode:"
echo ""
echo "1. Open Xcode:"
echo "   cd ios && open CyberSimply.xcworkspace"
echo ""
echo "2. In Xcode:"
echo "   • Select 'Any iOS Device (arm64)' as the destination"
echo "   • Product → Archive (or Cmd+Shift+B)"
echo "   • Wait for archive to complete (5-10 minutes)"
echo ""
echo "3. In Organizer window:"
echo "   • Click 'Distribute App'"
echo "   • Select 'App Store Connect'"
echo "   • Click 'Upload'"
echo "   • Follow the wizard to upload"
echo ""
echo "4. In App Store Connect:"
echo "   • Go to https://appstoreconnect.apple.com"
echo "   • Select your app"
echo "   • Add screenshots, description, etc."
echo "   • Submit for review"
echo ""
echo "Current Configuration:"
echo "  • Bundle ID: com.cybersimply.app"
echo "  • Build Number: $BUILD_NUMBER"
echo "  • Version: 1.0.0"
echo "  • Team: V6B8A4AKNR (Matthew Vella)"
echo ""
echo "🎯 Ready for Xcode Archive! Good luck with your submission! 🚀"
echo ""

