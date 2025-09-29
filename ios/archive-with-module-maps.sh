#!/bin/bash
# Archive with Module Maps Script for CyberSimply iOS App
# This script ensures module maps are generated before archiving

set -e

echo "🔧 Starting archive with module map generation..."

# Navigate to iOS directory
cd "$(dirname "$0")"

# Set locale to fix CocoaPods encoding issues
export LANG=en_US.UTF-8

echo "🧹 Cleaning previous builds..."
rm -rf build/
rm -rf DerivedData/
rm -rf ~/Library/Developer/Xcode/DerivedData/CyberSimply-*

echo "📦 Installing CocoaPods dependencies..."
pod install

echo "🔨 Building project first to generate module maps..."
# Build the project first to generate all module maps
xcodebuild -workspace CyberSimply.xcworkspace \
           -scheme CyberSimply \
           -configuration Release \
           -destination generic/platform=iOS \
           CODE_SIGN_IDENTITY="" \
           CODE_SIGNING_REQUIRED=NO \
           CODE_SIGNING_ALLOWED=NO \
           build

echo "📋 Verifying module maps were generated..."
# Check if some key module maps exist
if [ -f "build/Release-iphoneos/Expo/Expo.modulemap" ]; then
    echo "✅ Expo module map found"
else
    echo "⚠️ Expo module map not found, but continuing..."
fi

echo "🗂️ Creating archive..."
# Now create the archive
xcodebuild -workspace CyberSimply.xcworkspace \
           -scheme CyberSimply \
           -configuration Release \
           -archivePath CyberSimply.xcarchive \
           -destination generic/platform=iOS \
           CODE_SIGN_IDENTITY="" \
           CODE_SIGNING_REQUIRED=NO \
           CODE_SIGNING_ALLOWED=NO \
           archive

echo "✅ Archive completed successfully!"
echo "📁 Archive location: $(pwd)/CyberSimply.xcarchive"
echo ""
echo "Next steps:"
echo "1. Open Xcode Organizer"
echo "2. Select your archive"
echo "3. Click 'Distribute App'"
echo "4. Choose your distribution method"
