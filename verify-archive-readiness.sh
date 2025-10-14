#!/bin/bash

# Verify Archive Readiness Script
# This script verifies that the app is ready for Xcode archiving

echo "🔍 Verifying Archive Readiness..."

# 1. Check if Xcode workspace exists
echo "📱 Checking Xcode workspace..."
if [ -f "ios/CyberSimply.xcworkspace/contents.xcworkspacedata" ]; then
    echo "✅ Xcode workspace exists"
else
    echo "❌ Xcode workspace not found"
    exit 1
fi

# 2. Check if Pods are installed
echo "📦 Checking CocoaPods installation..."
if [ -d "ios/Pods" ]; then
    echo "✅ CocoaPods installed"
else
    echo "❌ CocoaPods not installed"
    exit 1
fi

# 3. Check version numbers
echo "🔢 Checking version numbers..."
VERSION=$(grep '"version":' app.json | cut -d'"' -f4)
BUILD_NUMBER=$(grep '"buildNumber":' app.json | cut -d'"' -f4)
BUNDLE_VERSION=$(grep -A1 'CFBundleShortVersionString' ios/CyberSimply/Info.plist | grep '<string>' | cut -d'>' -f2 | cut -d'<' -f1)

echo "   • App.json version: $VERSION"
echo "   • App.json build: $BUILD_NUMBER"
echo "   • Info.plist version: $BUNDLE_VERSION"

if [ "$VERSION" = "1.0.0" ] && [ "$BUNDLE_VERSION" = "1.0.0" ]; then
    echo "✅ Version numbers are correct (1.0.0)"
else
    echo "⚠️  Version numbers may need attention"
fi

# 4. Check for critical files
echo "📄 Checking critical files..."
CRITICAL_FILES=(
    "src/services/iapService.ts"
    "src/screens/AdFreeScreen.tsx"
    "src/screens/FeedbackScreen.tsx"
    "src/screens/SettingsScreen.tsx"
    "src/context/AdFreeContext.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# 5. Check for no obvious errors
echo "🔍 Checking for common issues..."

# Check if IAP service has correct product IDs
if grep -q "com.cybersimply.adfree.lifetime.2025" src/services/iapService.ts; then
    echo "✅ IAP product IDs are set correctly"
else
    echo "⚠️  IAP product IDs may need verification"
fi

# Check if guest restrictions are in place
if grep -q "authState.isGuest" src/screens/AdFreeScreen.tsx; then
    echo "✅ Guest IAP restrictions are in place"
else
    echo "⚠️  Guest IAP restrictions may be missing"
fi

# Check if feedback screen exists
if grep -q "mvella11@icloud.com" src/screens/FeedbackScreen.tsx; then
    echo "✅ Feedback screen configured correctly"
else
    echo "⚠️  Feedback screen may need attention"
fi

echo ""
echo "🎉 Archive readiness verification complete!"
echo ""
echo "📋 Next steps for archiving:"
echo "1. Open Xcode: ios/CyberSimply.xcworkspace"
echo "2. Select destination: 'Any iOS Device (arm64)'"
echo "3. Wait for indexing to complete (may take a few minutes)"
echo "4. Go to Product → Archive"
echo "5. Wait for archive to complete"
echo "6. Upload to App Store Connect or export for distribution"
echo ""
echo "⚠️  If you encounter issues:"
echo "• Restart Xcode"
echo "• Restart your Mac"
echo "• Use EAS Build: eas build --platform ios --profile production"
echo ""
echo "✨ Your app should now archive successfully!"
