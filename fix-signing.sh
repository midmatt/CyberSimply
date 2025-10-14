#!/bin/bash

echo "🔧 Fixing Xcode Signing Issues..."
echo "=================================="

# Navigate to iOS directory
cd ios

echo "📱 Step 1: Cleaning Xcode cache..."
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf build

echo "📱 Step 2: Cleaning provisioning profiles..."
rm -rf ~/Library/MobileDevice/Provisioning\ Profiles/*

echo "📱 Step 3: Rebuilding with clean entitlements..."
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply

echo "📱 Step 4: Opening Xcode with fresh cache..."
open CyberSimply.xcworkspace

echo ""
echo "✅ Signing fix complete!"
echo ""
echo "📋 Next steps in Xcode:"
echo "1. Wait for Xcode to fully load"
echo "2. Go to CyberSimply project → Signing & Capabilities"
echo "3. Uncheck 'Automatically manage signing'"
echo "4. Wait 5 seconds"
echo "5. Check 'Automatically manage signing' again"
echo "6. Select your team: Matthew Vella"
echo "7. Wait for provisioning profile to regenerate"
echo "8. Try archiving again"
echo ""
echo "If still having issues:"
echo "- Xcode → Preferences → Accounts → Download Manual Profiles"
echo "- Or create a new App ID in Apple Developer Portal"
