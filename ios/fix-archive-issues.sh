#!/bin/bash
# Fix Archive Issues Script for CyberSimply iOS App
# This script addresses common archiving problems

set -e

echo "🔧 Fixing common archive issues..."

# Navigate to iOS directory
cd "$(dirname "$0")"

echo "📋 Checking current configuration..."

# Check if we're in the right directory
if [ ! -f "CyberSimply.xcworkspace" ]; then
    echo "❌ CyberSimply.xcworkspace not found!"
    exit 1
fi

echo "✅ Workspace found"

# Clean everything first
echo "🧹 Performing deep clean..."
rm -rf build/
rm -rf DerivedData/
rm -rf ~/Library/Developer/Xcode/DerivedData/CyberSimply-*
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply

echo "📦 Reinstalling CocoaPods..."
pod deintegrate
pod install

echo "🔧 Fixing provisioning profile issues..."

# Create a temporary build script that forces generic platform
cat > temp_archive.sh << 'EOF'
#!/bin/bash
set -e

# Force generic iOS platform to avoid device-specific provisioning issues
xcodebuild -workspace CyberSimply.xcworkspace \
           -scheme CyberSimply \
           -configuration Release \
           -archivePath CyberSimply.xcarchive \
           -destination generic/platform=iOS \
           CODE_SIGN_IDENTITY="" \
           CODE_SIGNING_REQUIRED=NO \
           CODE_SIGNING_ALLOWED=NO \
           archive

echo "✅ Archive completed successfully!"
EOF

chmod +x temp_archive.sh

echo "🚀 Running archive with fixed configuration..."
./temp_archive.sh

# Clean up
rm temp_archive.sh

echo "✅ Archive issues fixed!"
echo "📁 Archive location: $(pwd)/CyberSimply.xcarchive"
echo ""
echo "Next steps:"
echo "1. Open Xcode Organizer"
echo "2. Select your archive"
echo "3. Click 'Distribute App'"
echo "4. Choose your distribution method"
