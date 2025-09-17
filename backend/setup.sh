#!/bin/bash

# CyberSafe News Backend Setup Script
echo "🚀 Setting up CyberSafe News Backend API..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your actual values."
    echo ""
    echo "🔧 Required environment variables:"
    echo "   - SUPABASE_URL: Your Supabase project URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key"
    echo "   - BMC_WEBHOOK_SECRET: Your Buy Me a Coffee webhook secret (optional)"
    echo "   - MIN_DONATION_AMOUNT: Minimum donation for ad-free access (default: 3.00)"
    echo ""
    echo "📖 See README.md for detailed setup instructions"
else
    echo "✅ .env file already exists"
fi

# Make test script executable
chmod +x test-api.js

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your Supabase credentials"
echo "2. Run the SQL schema in your Supabase SQL editor"
echo "3. Start the server: npm run dev"
echo "4. Test the API: node test-api.js"
echo "5. Set up Buy Me a Coffee webhook with your server URL"
echo ""
echo "📚 For detailed instructions, see README.md"
