#!/bin/bash

# Simple script to create IPA file for App Store submission
# This script will use the existing build and create an IPA

set -e

echo "🚀 Creating IPA file for CyberSimply..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Set variables
PROJECT_NAME="CyberSimply"
BUILD_DIR="build"
IPA_PATH="$BUILD_DIR/CyberSimply.ipa"

# Create build directory
mkdir -p "$BUILD_DIR"

echo "📦 Looking for existing builds..."

# Find the most recent .app file from Release build
APP_PATH=$(find /Users/matthewvella/Library/Developer/Xcode/DerivedData -name "CyberSimply.app" -path "*/Build/Products/Release-iphoneos/*" -type d | head -1)

# If no device build found, try simulator build
if [ -z "$APP_PATH" ]; then
    APP_PATH=$(find /Users/matthewvella/Library/Developer/Xcode/DerivedData -name "CyberSimply.app" -path "*/Build/Products/Release-iphonesimulator/*" -type d | head -1)
fi

if [ -z "$APP_PATH" ]; then
    echo "❌ No Release build found. Please run 'npx expo run:ios --configuration Release' first."
    exit 1
fi

echo "✅ Found app at: $APP_PATH"

# Create Payload directory
PAYLOAD_DIR="$BUILD_DIR/Payload"
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR"

# Copy the .app to Payload directory
echo "📋 Copying app to Payload directory..."
cp -R "$APP_PATH" "$PAYLOAD_DIR/"

# Create IPA file
echo "📦 Creating IPA file..."
cd "$BUILD_DIR"
zip -r "$PROJECT_NAME.ipa" Payload/
cd ..

# Clean up
rm -rf "$PAYLOAD_DIR"

if [ -f "$IPA_PATH" ]; then
    echo "✅ IPA created successfully: $IPA_PATH"
    echo "📱 You can now upload this IPA to App Store Connect using Transporter"
    echo "📍 IPA location: $(pwd)/$IPA_PATH"
    echo ""
    echo "📋 To upload to App Store Connect:"
    echo "1. Open Transporter app"
    echo "2. Drag and drop the IPA file: $(pwd)/$IPA_PATH"
    echo "3. Click 'Deliver' to upload to App Store Connect"
else
    echo "❌ Failed to create IPA file"
    exit 1
fi

echo "🎉 Build complete!"
