#!/bin/bash

# Production Build Script for CyberSimply
# This script builds the app for production (App Store + Google Play)

set -e

echo "🚀 Building CyberSimply for Production..."

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

echo "📱 Building iOS app for App Store..."

# Build iOS for App Store
eas build --platform ios --profile production --non-interactive

echo "🤖 Building Android app for Google Play..."

# Build Android for Google Play
eas build --platform android --profile production --non-interactive

echo "✅ Production builds completed successfully!"
echo "📋 Next steps:"
echo ""
echo "iOS (App Store):"
echo "1. Go to App Store Connect"
echo "2. Select your app"
echo "3. Go to TestFlight tab"
echo "4. Upload the build"
echo "5. Submit for App Store review"
echo ""
echo "Android (Google Play):"
echo "1. Go to Google Play Console"
echo "2. Select your app"
echo "3. Go to Production tab"
echo "4. Upload the APK/AAB"
echo "5. Submit for review"

echo "🎉 Ready for production submission!"
