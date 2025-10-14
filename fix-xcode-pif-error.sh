#!/bin/bash

# Fix Xcode PIF Transfer Session Error
# This script resolves the "unable to initiate PIF transfer session" error

echo "🔧 Fixing Xcode PIF Transfer Session Error..."

# 1. Close Xcode completely
echo "📱 Step 1: Closing Xcode..."
pkill -f "Xcode"
sleep 2

# 2. Clear Xcode derived data
echo "🗑️  Step 2: Clearing Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "✅ Derived data cleared"

# 3. Clear Xcode build cache
echo "🗑️  Step 3: Clearing Xcode build cache..."
rm -rf ~/Library/Caches/com.apple.dt.Xcode
echo "✅ Build cache cleared"

# 4. Clear Xcode archives
echo "🗑️  Step 4: Clearing Xcode archives..."
rm -rf ~/Library/Developer/Xcode/Archives/*
echo "✅ Archives cleared"

# 5. Clear project build folder
echo "🗑️  Step 5: Clearing project build folder..."
cd /Users/matthewvella/code/CyberSimply-clean
rm -rf ios/build
rm -rf build
echo "✅ Project build folders cleared"

# 6. Clean CocoaPods
echo "🧹 Step 6: Cleaning CocoaPods..."
cd ios
pod deintegrate
pod clean
pod install
cd ..
echo "✅ CocoaPods cleaned and reinstalled"

# 7. Clear React Native cache
echo "🧹 Step 7: Clearing React Native cache..."
npx react-native start --reset-cache &
sleep 3
pkill -f "react-native start"
echo "✅ React Native cache cleared"

# 8. Clear Metro cache
echo "🧹 Step 8: Clearing Metro cache..."
npx react-native start --reset-cache --verbose &
sleep 3
pkill -f "react-native start"
echo "✅ Metro cache cleared"

# 9. Clear npm cache
echo "🧹 Step 9: Clearing npm cache..."
npm cache clean --force
echo "✅ npm cache cleared"

# 10. Reinstall node modules
echo "📦 Step 10: Reinstalling node modules..."
rm -rf node_modules
npm install
echo "✅ Node modules reinstalled"

# 11. Regenerate native files
echo "📱 Step 11: Regenerating native files..."
npx expo prebuild --clean --platform ios
echo "✅ Native files regenerated"

# 12. Final CocoaPods install
echo "📦 Step 12: Final CocoaPods install..."
cd ios
pod install --repo-update
cd ..
echo "✅ CocoaPods final install complete"

echo ""
echo "🎉 Xcode PIF error fix complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open ios/CyberSimply.xcworkspace in Xcode"
echo "2. Wait for Xcode to finish indexing (this may take a few minutes)"
echo "3. Try Product → Archive again"
echo ""
echo "⚠️  If the error persists:"
echo "1. Restart your Mac"
echo "2. Try archiving again"
echo "3. Use EAS Build as alternative: eas build --platform ios --profile production"
echo ""
echo "✨ Ready to try archiving again!"
