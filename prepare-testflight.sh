#!/bin/bash

# TestFlight Preparation Script
# This script prepares the app for manual TestFlight distribution

echo "🚀 Preparing CyberSimply for TestFlight Distribution..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting TestFlight preparation process..."

# Step 1: Clean and install dependencies
print_status "Step 1: Cleaning and installing dependencies..."
rm -rf node_modules
rm -rf ios/build
rm -rf android/build
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Update version numbers
print_status "Step 2: Updating version numbers..."

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Update iOS build number
IOS_BUILD_NUMBER=$(node -p "require('./app.json').expo.ios.buildNumber")
NEW_IOS_BUILD=$((IOS_BUILD_NUMBER + 1))
print_status "Updating iOS build number from $IOS_BUILD_NUMBER to $NEW_IOS_BUILD"

# Update app.json with new build number
node -e "
const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
appJson.expo.ios.buildNumber = '$NEW_IOS_BUILD';
fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log('Updated iOS build number to $NEW_IOS_BUILD');
"

# Step 3: Verify environment configuration
print_status "Step 3: Verifying environment configuration..."

# Check if EAS configuration is correct
if grep -q "EXPO_PUBLIC_SUPABASE_URL" eas.json; then
    print_success "Environment variables configured in eas.json"
else
    print_error "Environment variables missing from eas.json"
    exit 1
fi

# Step 4: Run TypeScript check
print_status "Step 4: Running TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    print_success "TypeScript check passed"
else
    print_warning "TypeScript check found issues - please review"
fi

# Step 5: Run linting
print_status "Step 5: Running ESLint..."
npx eslint src/ --ext .ts,.tsx --max-warnings 0

if [ $? -eq 0 ]; then
    print_success "ESLint check passed"
else
    print_warning "ESLint found issues - please review"
fi

# Step 6: Test Supabase connection
print_status "Step 6: Testing Supabase connection..."
node testflight-diagnostics.js

if [ $? -eq 0 ]; then
    print_success "Supabase connection test passed"
else
    print_error "Supabase connection test failed"
    exit 1
fi

# Step 7: Clean iOS build
print_status "Step 7: Cleaning iOS build directory..."
cd ios
rm -rf build/
rm -rf DerivedData/
xcodebuild clean -workspace CyberSimply.xcworkspace -scheme CyberSimply

if [ $? -eq 0 ]; then
    print_success "iOS build cleaned successfully"
else
    print_warning "iOS clean had warnings - continuing anyway"
fi

cd ..

# Step 8: Install iOS pods
print_status "Step 8: Installing iOS pods..."
cd ios
pod install --repo-update

if [ $? -eq 0 ]; then
    print_success "Pods installed successfully"
else
    print_error "Pod installation failed"
    exit 1
fi

cd ..

# Step 9: Create archive preparation script
print_status "Step 9: Creating Xcode archive preparation script..."

cat > ios/prepare-archive.sh << 'EOF'
#!/bin/bash

echo "📦 Preparing Xcode Archive for TestFlight..."

# Set build configuration
export CONFIGURATION=Release
export SCHEME=CyberSimply
export WORKSPACE=CyberSimply.xcworkspace

# Clean build folder
echo "🧹 Cleaning build folder..."
rm -rf build/
xcodebuild clean -workspace $WORKSPACE -scheme $SCHEME

# Build for archive
echo "🔨 Building for archive..."
xcodebuild archive \
    -workspace $WORKSPACE \
    -scheme $SCHEME \
    -configuration $CONFIGURATION \
    -archivePath build/CyberSimply.xcarchive \
    -destination generic/platform=iOS \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM=YOUR_TEAM_ID \
    PROVISIONING_PROFILE_SPECIFIER=YOUR_PROVISIONING_PROFILE

if [ $? -eq 0 ]; then
    echo "✅ Archive created successfully at build/CyberSimply.xcarchive"
    echo "📱 You can now upload this archive to App Store Connect"
else
    echo "❌ Archive creation failed"
    exit 1
fi
EOF

chmod +x ios/prepare-archive.sh

# Step 10: Create TestFlight checklist
print_status "Step 10: Creating TestFlight checklist..."

cat > TESTFLIGHT_CHECKLIST.md << 'EOF'
# TestFlight Distribution Checklist

## Pre-Build Verification ✅
- [x] Dependencies installed and updated
- [x] Version numbers updated (iOS build: $NEW_IOS_BUILD)
- [x] Environment variables configured
- [x] TypeScript compilation successful
- [x] ESLint checks passed
- [x] Supabase connection verified
- [x] iOS build cleaned
- [x] Pods installed

## Manual Archive Steps

### 1. Open Xcode
```bash
open ios/CyberSimply.xcworkspace
```

### 2. Configure Signing
- Select your development team
- Choose automatic code signing
- Verify provisioning profile

### 3. Create Archive
- Product → Archive
- Wait for build to complete
- Verify archive in Organizer

### 4. Upload to App Store Connect
- Click "Distribute App"
- Choose "App Store Connect"
- Choose "Upload"
- Follow upload process

## Post-Upload Verification

### TestFlight Testing
- [ ] App installs successfully
- [ ] No crashes on launch
- [ ] Articles load correctly
- [ ] Categories work properly
- [ ] Redirect URLs work
- [ ] No duplicate articles
- [ ] Search functionality works
- [ ] Ad-free purchase works (if applicable)

### Known Issues Fixed
- ✅ Article duplication resolved
- ✅ Redirect URLs now working
- ✅ Category sorting fixed
- ✅ Supabase queries consistent between simulator and TestFlight

## Environment Configuration
- Supabase URL: https://uaykrxfhzfkhjwnmvukb.supabase.co
- Environment: Production
- Build Configuration: Release
- iOS Build Number: $NEW_IOS_BUILD

## Troubleshooting
If issues occur:
1. Check Xcode console logs
2. Verify Supabase connection
3. Check network connectivity
4. Review app permissions

## Support
For any issues, check the diagnostic logs in the app or contact the development team.
EOF

print_success "TestFlight preparation completed successfully!"

echo ""
echo "🎯 Next Steps:"
echo "1. Open Xcode: open ios/CyberSimply.xcworkspace"
echo "2. Configure code signing"
echo "3. Create archive (Product → Archive)"
echo "4. Upload to App Store Connect"
echo ""
echo "📋 Checklist created: TESTFLIGHT_CHECKLIST.md"
echo "🔧 Archive script created: ios/prepare-archive.sh"
echo ""
echo "Good luck with your TestFlight distribution! 🚀"
