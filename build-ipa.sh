#!/bin/bash

# Complete script to build and create IPA file for App Store submission
# This script will build the app and create an IPA file ready for Transporter

set -e

echo "🚀 Building CyberSimply for App Store submission..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Set variables
PROJECT_NAME="CyberSimply"
WORKSPACE_PATH="ios/CyberSimply.xcworkspace"
SCHEME_NAME="CyberSimply"
CONFIGURATION="Release"
ARCHIVE_PATH="build/CyberSimply.xcarchive"
IPA_PATH="build/CyberSimply.ipa"

# Create build directory
mkdir -p build

echo "📦 Building and archiving the app..."

# Clean and archive the app
xcodebuild clean \
    -workspace "$WORKSPACE_PATH" \
    -scheme "$SCHEME_NAME" \
    -configuration "$CONFIGURATION"

xcodebuild archive \
    -workspace "$WORKSPACE_PATH" \
    -scheme "$SCHEME_NAME" \
    -configuration "$CONFIGURATION" \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    CODE_SIGN_STYLE=Automatic

echo "📦 Creating IPA file..."

# Create Payload directory
PAYLOAD_DIR="build/Payload"
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR"

# Copy the .app to Payload directory
cp -R "$ARCHIVE_PATH/Products/Applications/CyberSimply.app" "$PAYLOAD_DIR/"

# Create IPA file
cd build
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
    echo ""
    echo "📊 IPA file size: $(du -h "$IPA_PATH" | cut -f1)"
else
    echo "❌ Failed to create IPA file"
    exit 1
fi

echo "🎉 Build complete!"
