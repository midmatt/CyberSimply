#!/bin/bash

echo "📦 Preparing Xcode Archive for TestFlight..."

# Set build configuration
export CONFIGURATION=Release
export SCHEME=CyberSimply
export WORKSPACE=CyberSimply.xcworkspace

# Clean build folder
echo "🧹 Cleaning build folder..."
rm -rf build/
xcodebuild clean -workspace $WORKSPACE -scheme $SCHEME

# Build for archive
echo "🔨 Building for archive..."
xcodebuild archive \
    -workspace $WORKSPACE \
    -scheme $SCHEME \
    -configuration $CONFIGURATION \
    -archivePath build/CyberSimply.xcarchive \
    -destination generic/platform=iOS \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM=YOUR_TEAM_ID \
    PROVISIONING_PROFILE_SPECIFIER=YOUR_PROVISIONING_PROFILE

if [ $? -eq 0 ]; then
    echo "✅ Archive created successfully at build/CyberSimply.xcarchive"
    echo "📱 You can now upload this archive to App Store Connect"
else
    echo "❌ Archive creation failed"
    exit 1
fi
