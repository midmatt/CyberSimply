#!/bin/bash

# 🚀 CyberSimply - Xcode Archive Preparation Script
# Prepares the iOS project for archiving in Xcode

set -e

echo "🚀 Preparing CyberSimply for Xcode Archive..."
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Step 1: Clean iOS build
echo "🧹 Cleaning iOS build..."
cd ios
rm -rf build
rm -rf Pods
rm -f Podfile.lock
echo "✅ Cleaned iOS build directory"
echo ""

# Step 2: Create .xcode.env file
echo "📝 Creating .xcode.env file..."
cat > .xcode.env << 'EOF'
# Node binary path for Xcode build scripts
export NODE_BINARY=$(command -v node)
EOF
echo "✅ Created .xcode.env"
echo ""

# Step 3: Install CocoaPods
echo "📦 Installing CocoaPods dependencies..."
echo "   (This may take a few minutes...)"
pod install --repo-update
echo "✅ CocoaPods installed"
echo ""

# Step 4: Return to root
cd ..

# Step 5: Verify setup
echo "🔍 Verifying setup..."
if [ -f "ios/.xcode.env" ]; then
    echo "✅ .xcode.env exists"
else
    echo "❌ .xcode.env missing"
fi

if [ -f "ios/Pods/Manifest.lock" ]; then
    echo "✅ CocoaPods installed"
else
    echo "❌ CocoaPods not installed properly"
fi

echo ""
echo "🎉 Preparation Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Next Steps for Xcode Archive:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open Xcode workspace:"
echo "   open ios/CyberSimply.xcworkspace"
echo ""
echo "2. Select 'Any iOS Device' from device dropdown"
echo ""
echo "3. Go to Product → Archive"
echo ""
echo "4. Once archive completes:"
echo "   - Click 'Distribute App'"
echo "   - Choose 'App Store Connect'"
echo "   - Follow the upload wizard"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Apple IAP Compliance Features Included:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ Auto guest mode on first launch"
echo "✓ No forced registration before IAP"
echo "✓ Optional account creation after purchase"
echo "✓ Guest email: guest@cybersimply.com"
echo ""
echo "🚀 Ready for App Store submission!"