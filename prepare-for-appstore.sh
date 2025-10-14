#!/bin/bash

# 🚀 CyberSimply - App Store Submission Preparation Script
# This script prepares your app for App Store submission with Apple IAP compliance

set -e

echo "🚀 Preparing CyberSimply for App Store submission..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Check if logged in to EAS
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please run: eas login"
    exit 1
fi

echo "✅ EAS authentication verified"

# Check app.json configuration
echo "📱 Verifying app configuration..."
if grep -q "guest@cybersimply.com" app.json; then
    echo "✅ Guest email updated to cybersimply.com"
else
    echo "⚠️  Guest email may need updating"
fi

# Check version and build numbers
echo "📊 Current app configuration:"
echo "  - Version: $(grep '"version"' app.json | cut -d'"' -f4)"
echo "  - iOS Build: $(grep '"buildNumber"' app.json | cut -d'"' -f4)"
echo "  - Android Build: $(grep '"versionCode"' app.json | cut -d'"' -f4)"

# Build for TestFlight first (recommended)
echo ""
echo "🧪 Building for TestFlight..."
echo "This allows you to test the Apple IAP compliance before App Store submission."
echo ""

read -p "Do you want to build for TestFlight? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Building TestFlight version..."
    eas build --platform ios --profile testflight
    
    echo ""
    echo "✅ TestFlight build completed!"
    echo "📱 Install and test the Apple IAP compliance flow:"
    echo "   1. Launch app (should go directly to main tabs)"
    echo "   2. Check Settings → should show guest@cybersimply.com"
    echo "   3. Navigate to Ad-Free → should show purchase options"
    echo "   4. Test purchase flow (use sandbox Apple ID)"
    echo "   5. Verify optional account creation prompt appears"
    echo ""
fi

# Build for App Store
echo ""
read -p "Do you want to build for App Store submission? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Building App Store version..."
    eas build --platform ios --profile production
    
    echo ""
    echo "✅ App Store build completed!"
    echo "📤 Next steps:"
    echo "   1. Submit to App Store Connect: eas submit --platform ios"
    echo "   2. Or upload manually via Transporter"
    echo "   3. Complete App Store Connect listing"
    echo "   4. Submit for review"
    echo ""
fi

echo "🎉 App Store preparation complete!"
echo ""
echo "📋 Don't forget to:"
echo "   ✅ Test the Apple IAP compliance flow"
echo "   ✅ Verify guest email shows as guest@cybersimply.com"
echo "   ✅ Test purchase without registration"
echo "   ✅ Test optional account creation prompt"
echo "   ✅ Set up in-app purchases in App Store Connect"
echo "   ✅ Upload screenshots and app description"
echo ""
echo "📖 See APP_STORE_SUBMISSION_CHECKLIST.md for complete details"
