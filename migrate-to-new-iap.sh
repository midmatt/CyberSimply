#!/bin/bash

echo "🛒 Migrating CyberSimply to New IAP System"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# Backup existing files
echo "📦 Creating backup of existing IAP files..."
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
cp src/services/iapService.ts backup/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "⚠️ iapService.ts not found"
cp src/context/AdFreeContext.tsx backup/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "⚠️ AdFreeContext.tsx not found"

echo "✅ Backup created in backup/$(date +%Y%m%d_%H%M%S)/"

# Check if new files exist
echo "🔍 Checking for new IAP files..."
if [ ! -f "src/services/iapServiceFixed.ts" ]; then
    echo "❌ Error: iapServiceFixed.ts not found"
    exit 1
fi

if [ ! -f "src/context/AdFreeContextFixed.tsx" ]; then
    echo "❌ Error: AdFreeContextFixed.tsx not found"
    exit 1
fi

if [ ! -f "sql/create-iap-tables.sql" ]; then
    echo "❌ Error: create-iap-tables.sql not found"
    exit 1
fi

echo "✅ All new IAP files found"

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Apple App Store Connect
EXPO_PUBLIC_APPLE_SHARED_SECRET=your_apple_shared_secret_here

# Supabase (if not already configured)
# EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF
    echo "✅ .env file created - please add your Apple shared secret"
else
    echo "✅ .env file already exists"
fi

# Check for required dependencies
echo "🔍 Checking dependencies..."
if ! grep -q "expo-in-app-purchases" package.json; then
    echo "⚠️ expo-in-app-purchases not found in package.json"
    echo "Run: npm install expo-in-app-purchases"
fi

if ! grep -q "@react-native-async-storage/async-storage" package.json; then
    echo "⚠️ @react-native-async-storage/async-storage not found in package.json"
    echo "Run: npm install @react-native-async-storage/async-storage"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Add your Apple shared secret to .env file"
echo "2. Run the SQL script in Supabase: sql/create-iap-tables.sql"
echo "3. Update your imports to use the new IAP service:"
echo "   - Replace iapService with iapServiceFixed"
echo "   - Replace AdFreeContext with AdFreeContextFixed"
echo "4. Test with a new account to verify ad-free status is false by default"
echo "5. Test purchase flow to verify it works correctly"
echo ""
echo "📖 For detailed instructions, see: IAP_IMPLEMENTATION_GUIDE.md"
echo ""
echo "✅ Migration preparation complete!"
