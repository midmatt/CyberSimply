#!/bin/bash

# TestFlight Build Script for CyberSimply
# This script builds the app for TestFlight submission

set -e

echo "🚀 Building CyberSimply for TestFlight..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Please install it first:"
    echo "npm install -g @expo/eas-cli"
    exit 1
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please log in first:"
    echo "eas login"
    exit 1
fi

echo "📱 Building iOS app for TestFlight..."

# Build for TestFlight
eas build --platform ios --profile testflight --non-interactive

echo "✅ Build completed successfully!"
echo "📋 Next steps:"
echo "1. Go to App Store Connect"
echo "2. Select your app"
echo "3. Go to TestFlight tab"
echo "4. Upload the build"
echo "5. Add testers and submit for review"

echo "🎉 Ready for TestFlight submission!"
