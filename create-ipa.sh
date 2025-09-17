#!/bin/bash

# Script to create IPA file for App Store submission
# This script will archive the app and export it as an IPA

set -e

echo "🚀 Creating IPA file for CyberSimply..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Set variables
PROJECT_NAME="CyberSimply"
WORKSPACE_PATH="ios/CyberSimply.xcworkspace"
SCHEME_NAME="CyberSimply"
CONFIGURATION="Release"
ARCHIVE_PATH="build/CyberSimply.xcarchive"
EXPORT_PATH="build/Export"
IPA_PATH="build/CyberSimply.ipa"

# Create build directory
mkdir -p build

echo "📦 Archiving the app..."

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
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="YOUR_TEAM_ID" \
    PROVISIONING_PROFILE_SPECIFIER=""

echo "📤 Exporting IPA..."

# Create export options plist
cat > build/ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
</dict>
</plist>
EOF

# Export the archive
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "build/ExportOptions.plist"

# Move IPA to final location
if [ -f "$EXPORT_PATH/$PROJECT_NAME.ipa" ]; then
    mv "$EXPORT_PATH/$PROJECT_NAME.ipa" "$IPA_PATH"
    echo "✅ IPA created successfully: $IPA_PATH"
    echo "📱 You can now upload this IPA to App Store Connect using Transporter"
    echo "📍 IPA location: $(pwd)/$IPA_PATH"
else
    echo "❌ Failed to create IPA file"
    exit 1
fi

echo "🎉 Build complete!"