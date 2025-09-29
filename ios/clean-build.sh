#!/bin/bash
# Clean Build Script for CyberSimply iOS App
# This script performs a complete clean and rebuild

set -e

echo "🧹 Starting complete clean build process..."

# Navigate to iOS directory
cd "$(dirname "$0")"

echo "🗑️ Removing build artifacts..."
rm -rf build/
rm -rf DerivedData/
rm -rf ~/Library/Developer/Xcode/DerivedData/CyberSimply-*

echo "📦 Deintegrating and reinstalling CocoaPods..."
pod deintegrate
pod install

echo "🧹 Cleaning Xcode project..."
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply

echo "✅ Clean build completed!"
echo ""
echo "You can now run:"
echo "1. ./quick-build.sh (for quick build)"
echo "2. Open CyberSimply.xcworkspace in Xcode"
echo "3. Product → Archive"
