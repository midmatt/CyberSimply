#!/bin/bash

# CyberSafe News Monetization Setup Script
# This script helps you configure ads and donations

echo "🚀 CyberSafe News Monetization Setup"
echo "====================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "✅ .env file created from template"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔧 Configuration Steps:"
echo ""

echo "1. 📱 Google AdMob Setup:"
echo "   - Go to https://admob.google.com/"
echo "   - Create an account and add your app"
echo "   - Get your ad unit IDs"
echo "   - Update src/constants/adConfig.ts"
echo ""

echo "2. ☕ Buy Me a Coffee Setup:"
echo "   - Go to https://buymeacoffee.com/"
echo "   - Create your profile"
echo "   - Update the URL in src/constants/adConfig.ts"
echo ""

echo "4. 🔑 Update Environment Variables:"
echo "   Add these to your .env file:"
echo "   GOOGLE_ADMOB_APP_ID=your_app_id_here"
echo "   GOOGLE_ADMOB_BANNER_ID=your_banner_id_here"
echo "   GOOGLE_ADMOB_INTERSTITIAL_ID=your_interstitial_id_here"
echo "   GOOGLE_ADMOB_REWARDED_ID=your_rewarded_id_here"
echo ""

echo "5. ⚙️ Production Configuration:"
echo "   - Set TEST_MODE: false in adConfig.ts"
echo "   - Replace test ad unit IDs with real ones"
echo "   - Test ad display and donation flows"
echo ""

echo "📚 For detailed instructions, see MONETIZATION_README.md"
echo ""

echo "🎯 Quick Test Commands:"
echo "npm run start          # Start the app"
echo "npx tsc --noEmit      # Check for TypeScript errors"
echo ""

echo "✅ Setup complete! Follow the steps above to configure your monetization features."
echo ""

# Check if TypeScript compilation works
echo "🔍 Checking TypeScript compilation..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed - check for errors"
fi

echo ""
echo "🚀 Happy monetizing!"
