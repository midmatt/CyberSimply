#!/bin/bash

# CyberSimply Archive Preparation Script
# This script prepares the app for Xcode archiving without changing version numbers

echo "🚀 Preparing CyberSimply for Xcode Archive..."

# 1. Clean and regenerate native files
echo "📱 Regenerating native iOS files..."
npx expo prebuild --clean --platform ios

if [ $? -ne 0 ]; then
    echo "❌ Failed to regenerate native files"
    exit 1
fi

# 2. Install CocoaPods dependencies
echo "📦 Installing CocoaPods dependencies..."
cd ios && pod install && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Failed to install CocoaPods dependencies"
    exit 1
fi

# 3. Verify version numbers
echo "🔍 Verifying version numbers..."
VERSION=$(grep '"version":' app.json | cut -d'"' -f4)
BUILD_NUMBER=$(grep '"buildNumber":' app.json | cut -d'"' -f4)

echo "✅ App Version: $VERSION"
echo "✅ Build Number: $BUILD_NUMBER"

# 4. Check for any remaining issues
echo "🔍 Checking for potential issues..."

# Check for linting errors
if command -v npx &> /dev/null; then
    echo "🔍 Running TypeScript check..."
    npx tsc --noEmit --skipLibCheck
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript check passed"
    else
        echo "⚠️  TypeScript check found issues (non-critical for archive)"
    fi
fi

# 5. Final status
echo ""
echo "🎉 Archive preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open ios/CyberSimply.xcworkspace in Xcode"
echo "2. Select 'Any iOS Device (arm64)' as the destination"
echo "3. Go to Product → Archive"
echo "4. Wait for archive to complete"
echo "5. Upload to App Store Connect or export for distribution"
echo ""
echo "📱 Version Information:"
echo "   • App Version: $VERSION"
echo "   • Build Number: $BUILD_NUMBER"
echo "   • Bundle ID: com.cybersimply.app"
echo ""
echo "✨ Ready for archive!"
