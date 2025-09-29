#!/bin/bash
# Verify Archive Ready Script for CyberSimply iOS App
# This script checks if the app is ready for Xcode archiving

echo "🔍 Verifying CyberSimply app is ready for archiving..."

# Navigate to iOS directory
cd "$(dirname "$0")"

# Check if workspace exists
if [ ! -d "CyberSimply.xcworkspace" ]; then
    echo "❌ CyberSimply.xcworkspace not found!"
    exit 1
fi
echo "✅ Workspace directory found"

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ Podfile not found!"
    exit 1
fi
echo "✅ Podfile found"

# Check if Pods directory exists
if [ ! -d "Pods" ]; then
    echo "⚠️ Pods directory not found. Run 'pod install' first."
    exit 1
fi
echo "✅ Pods directory found"

# Check if Info.plist exists
if [ ! -f "CyberSimply/Info.plist" ]; then
    echo "❌ Info.plist not found!"
    exit 1
fi
echo "✅ Info.plist found"

# Check bundle identifier
BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw CyberSimply/Info.plist)
if [ "$BUNDLE_ID" = "$(PRODUCT_BUNDLE_IDENTIFIER)" ]; then
    echo "✅ Bundle identifier uses Xcode variable (normal for Xcode projects)"
elif [ "$BUNDLE_ID" = "com.cybersimply.app" ]; then
    echo "✅ Bundle identifier correct: $BUNDLE_ID"
else
    echo "⚠️ Bundle identifier: $BUNDLE_ID (should be com.cybersimply.app in Xcode)"
fi

# Check version
VERSION=$(plutil -extract CFBundleShortVersionString raw CyberSimply/Info.plist)
echo "✅ Version: $VERSION"

# Check build number
BUILD=$(plutil -extract CFBundleVersion raw CyberSimply/Info.plist)
if [ "$BUILD" = "$(CURRENT_PROJECT_VERSION)" ]; then
    echo "✅ Build number uses Xcode variable (normal for Xcode projects)"
else
    echo "✅ Build number: $BUILD"
fi

# Check if required capabilities are in entitlements
if [ ! -f "CyberSimply/CyberSimply.entitlements" ]; then
    echo "❌ Entitlements file not found!"
    exit 1
fi
echo "✅ Entitlements file found"

# Check for required capabilities
if grep -q "com.apple.developer.in-app-payments" CyberSimply/CyberSimply.entitlements; then
    echo "✅ In-App Purchase capability enabled"
else
    echo "❌ In-App Purchase capability not found!"
fi

if grep -q "com.apple.developer.applesignin" CyberSimply/CyberSimply.entitlements; then
    echo "✅ Sign In with Apple capability enabled"
else
    echo "❌ Sign In with Apple capability not found!"
fi

# Check if required icons exist
ICON_DIR="CyberSimply/Images.xcassets/AppIcon.appiconset"
if [ -d "$ICON_DIR" ]; then
    echo "✅ App icon directory found"
    
    # Check for required icon sizes (basic check)
    ICON_COUNT=$(find "$ICON_DIR" -name "*.png" | wc -l)
    if [ $ICON_COUNT -gt 0 ]; then
        echo "✅ App icons found ($ICON_COUNT files)"
    else
        echo "⚠️ No app icon files found in $ICON_DIR"
    fi
else
    echo "❌ App icon directory not found!"
fi

# Check if required privacy descriptions exist
PRIVACY_DESC_COUNT=$(grep -c "UsageDescription" CyberSimply/Info.plist)
if [ $PRIVACY_DESC_COUNT -ge 4 ]; then
    echo "✅ Privacy descriptions found ($PRIVACY_DESC_COUNT)"
else
    echo "⚠️ Some privacy descriptions may be missing"
fi

# Check if AdMob configuration exists
if grep -q "GADApplicationIdentifier" CyberSimply/Info.plist; then
    echo "✅ AdMob configuration found"
else
    echo "⚠️ AdMob configuration not found"
fi

# Check if background modes are configured
if grep -q "UIBackgroundModes" CyberSimply/Info.plist; then
    echo "✅ Background modes configured"
else
    echo "⚠️ Background modes not configured"
fi

echo ""
echo "🎉 Archive readiness check completed!"
echo ""
echo "Next steps:"
echo "1. Open CyberSimply.xcworkspace in Xcode"
echo "2. Select your development team"
echo "3. Choose your distribution certificate"
echo "4. Product → Archive"
echo ""
echo "Or run: ./quick-build.sh for automated build"
