#!/bin/bash

echo "🚀 Preparing CyberSimply for TestFlight Submission"
echo "=================================================="

# Navigate to project directory
cd "$(dirname "$0")"

echo "📁 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -d "ios/CyberSimply.xcworkspace" ]; then
    echo "❌ Error: CyberSimply.xcworkspace not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found Xcode workspace"

# Check build number consistency
echo "🔍 Checking build number consistency..."
APP_JSON_BUILD=$(grep '"buildNumber"' app.json | sed 's/.*"buildNumber": "\([^"]*\)".*/\1/')
INFO_PLIST_BUILD=$(grep -A 1 'CFBundleVersion' ios/CyberSimply/Info.plist | tail -1 | sed 's/.*<string>\([^<]*\)<\/string>.*/\1/')

echo "   app.json buildNumber: $APP_JSON_BUILD"
echo "   Info.plist CFBundleVersion: $INFO_PLIST_BUILD"

if [ "$APP_JSON_BUILD" = "$INFO_PLIST_BUILD" ]; then
    echo "✅ Build numbers match"
else
    echo "⚠️  Build numbers don't match - please check configuration"
fi

# Check entitlements
echo "🔍 Checking entitlements..."
if grep -q "com.apple.developer.in-app-payments" ios/CyberSimply/CyberSimply.entitlements; then
    echo "❌ Apple Pay entitlements still present - please remove them"
else
    echo "✅ No Apple Pay entitlements found"
fi

# Check for PassKit references
echo "🔍 Checking for PassKit references..."
if grep -r "PassKit" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="*.sh" > /dev/null 2>&1; then
    echo "❌ PassKit references found - please remove them"
else
    echo "✅ No PassKit references found"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Open Xcode: open ios/CyberSimply.xcworkspace"
echo "2. Clean Build Folder: Product → Clean Build Folder (⇧⌘K)"
echo "3. Select 'Any iOS Device (arm64)' as destination"
echo "4. Select 'Release' configuration"
echo "5. Archive: Product → Archive (⌘⇧B)"
echo "6. Upload to TestFlight via Organizer"
echo ""
echo "📖 For detailed instructions, see: TESTFLIGHT_SUBMISSION_GUIDE.md"
echo ""
echo "🚀 Ready to submit to TestFlight!"

# Open Xcode workspace
echo "🔧 Opening Xcode workspace..."
open ios/CyberSimply.xcworkspace