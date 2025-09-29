#!/bin/bash

# Production-ready script to build and archive CyberSimply for App Store submission
# This script will build the app and create an archive ready for App Store Connect

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
EXPORT_PATH="build/Export"
IPA_PATH="build/CyberSimply.ipa"

# Create build directory
mkdir -p build

echo "🧹 Cleaning previous builds..."
# Clean previous builds
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH" "$IPA_PATH"

echo "📦 Building and archiving the app..."

# Archive the app for App Store distribution
xcodebuild archive \
    -workspace "$WORKSPACE_PATH" \
    -scheme "$SCHEME_NAME" \
    -configuration "$CONFIGURATION" \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    CODE_SIGN_STYLE=Automatic \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="" \
    PROVISIONING_PROFILE_SPECIFIER=""

echo "📤 Creating export options..."

# Create export options plist for App Store distribution
cat > build/ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
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
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>
EOF

echo "📦 Exporting archive..."

# Export the archive for App Store distribution
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "build/ExportOptions.plist" \
    -allowProvisioningUpdates

# Check if IPA was created successfully
if [ -f "$EXPORT_PATH/$PROJECT_NAME.ipa" ]; then
    echo "✅ Archive created successfully!"
    echo "📱 Archive location: $(pwd)/$ARCHIVE_PATH"
    echo "📦 IPA location: $(pwd)/$EXPORT_PATH/$PROJECT_NAME.ipa"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Open Xcode"
    echo "2. Go to Window > Organizer"
    echo "3. Select the archive and click 'Distribute App'"
    echo "4. Choose 'App Store Connect'"
    echo "5. Follow the upload process"
    echo ""
    echo "📊 Archive size: $(du -sh "$ARCHIVE_PATH" | cut -f1)"
    echo "📊 IPA size: $(du -sh "$EXPORT_PATH/$PROJECT_NAME.ipa" | cut -f1)"
else
    echo "❌ Failed to export IPA file"
    echo "Please check the export log above for errors"
    exit 1
fi

echo "🎉 Build process complete!"
echo "🔍 You can now upload to App Store Connect using Xcode Organizer"
echo "📱 Build Number: 28 (Restored from stable version)"
