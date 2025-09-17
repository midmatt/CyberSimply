#!/bin/bash

# Setup script for AdMob integration
echo "Setting up AdMob integration for CyberSafeNews..."

# Install the AdMob dependency
echo "Installing react-native-google-mobile-ads..."
npm install react-native-google-mobile-ads

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ AdMob dependency installed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run 'expo start' to start the development server"
    echo "2. Test the app on a device or emulator"
    echo "3. Check the console logs for ad loading messages"
    echo ""
    echo "Note: Test ads should now appear in the app using Google's test ad unit IDs"
    echo "For production, update the ad unit IDs in src/constants/adConfig.ts"
else
    echo "❌ Failed to install AdMob dependency"
    echo "Please run: npm install expo-ads-admob"
fi
