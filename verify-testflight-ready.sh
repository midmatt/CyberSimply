#!/bin/bash

# TestFlight Readiness Verification Script
# This script verifies that the app is ready for TestFlight distribution

echo "🔍 Verifying TestFlight Readiness..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Track overall status
ALL_CHECKS_PASSED=true

# Check 1: Package.json exists
print_status "Checking package.json..."
if [ -f "package.json" ]; then
    print_success "package.json found"
else
    print_error "package.json missing"
    ALL_CHECKS_PASSED=false
fi

# Check 2: App.json exists
print_status "Checking app.json..."
if [ -f "app.json" ]; then
    print_success "app.json found"
    # Check build number
    BUILD_NUMBER=$(node -p "require('./app.json').expo.ios.buildNumber")
    echo "   iOS Build Number: $BUILD_NUMBER"
else
    print_error "app.json missing"
    ALL_CHECKS_PASSED=false
fi

# Check 3: EAS configuration
print_status "Checking EAS configuration..."
if [ -f "eas.json" ]; then
    if grep -q "EXPO_PUBLIC_SUPABASE_URL" eas.json; then
        print_success "Environment variables configured in eas.json"
    else
        print_error "Environment variables missing from eas.json"
        ALL_CHECKS_PASSED=false
    fi
else
    print_error "eas.json missing"
    ALL_CHECKS_PASSED=false
fi

# Check 4: iOS workspace exists
print_status "Checking iOS workspace..."
if [ -d "ios/CyberSimply.xcworkspace" ]; then
    print_success "iOS workspace found"
else
    print_error "iOS workspace missing"
    ALL_CHECKS_PASSED=false
fi

# Check 5: Podfile.lock exists
print_status "Checking iOS pods..."
if [ -f "ios/Podfile.lock" ]; then
    print_success "Podfile.lock found"
else
    print_warning "Podfile.lock missing - run 'cd ios && pod install'"
fi

# Check 6: TypeScript compilation
print_status "Checking TypeScript compilation..."
if npx tsc --noEmit 2>/dev/null; then
    print_success "TypeScript compilation successful"
else
    print_warning "TypeScript compilation has issues"
fi

# Check 7: Supabase connection
print_status "Checking Supabase connection..."
if node testflight-diagnostics.js >/dev/null 2>&1; then
    print_success "Supabase connection working"
else
    print_error "Supabase connection failed"
    ALL_CHECKS_PASSED=false
fi

# Check 8: Key files exist
print_status "Checking key source files..."
KEY_FILES=(
    "src/services/directSupabaseService.ts"
    "src/services/supabaseClientProduction.ts"
    "src/context/NewsContext.tsx"
    "src/screens/CategoryArticlesScreen.tsx"
    "src/components/ArticleDetail.tsx"
)

for file in "${KEY_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file missing"
        ALL_CHECKS_PASSED=false
    fi
done

# Check 9: Environment variables in code
print_status "Checking environment variable usage..."
if grep -q "process.env.EXPO_PUBLIC_SUPABASE_URL" src/services/configService.ts; then
    print_success "Environment variables properly referenced in code"
else
    print_warning "Environment variables may not be properly referenced"
fi

# Check 10: Info.plist configuration
print_status "Checking Info.plist configuration..."
if [ -f "ios/CyberSimply/Info.plist" ]; then
    if grep -q "NSAppTransportSecurity" ios/CyberSimply/Info.plist; then
        print_success "NSAppTransportSecurity configured"
    else
        print_warning "NSAppTransportSecurity not configured"
    fi
else
    print_error "Info.plist missing"
    ALL_CHECKS_PASSED=false
fi

echo ""
echo "=========================================="

if [ "$ALL_CHECKS_PASSED" = true ]; then
    print_success "All critical checks passed! App is ready for TestFlight distribution."
    echo ""
    echo "🚀 Ready to proceed with manual archive:"
    echo "   1. open ios/CyberSimply.xcworkspace"
    echo "   2. Configure code signing"
    echo "   3. Product → Archive"
    echo "   4. Upload to App Store Connect"
else
    print_error "Some checks failed. Please fix the issues before proceeding."
    echo ""
    echo "🔧 Run the preparation script: ./prepare-testflight.sh"
fi

echo "=========================================="