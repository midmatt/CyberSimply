# Apple In-App Purchase Setup Guide

This guide will help you set up Apple's native In-App Purchase system for the CyberSafe News app.

## Prerequisites

1. **Apple Developer Account**: You need an active Apple Developer account
2. **App Store Connect Access**: Access to create and manage in-app purchases
3. **iOS Device**: For testing (In-App Purchases don't work in the simulator)

## Step 1: Install Dependencies

The required dependency has already been added to `package.json`:

```bash
npm install
# or
yarn install
```

## Step 2: Configure App Store Connect

### 2.1 Create Your App
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with your bundle identifier
3. Fill in the required app information

### 2.2 Create In-App Purchase Product
1. In App Store Connect, go to your app
2. Navigate to **Features** → **In-App Purchases**
3. Click **+** to create a new in-app purchase
4. Choose **Non-Consumable** (for lifetime ad-free access)
5. Fill in the product details:
   - **Product ID**: `com.cybersafenews.adfree.lifetime`
   - **Reference Name**: `Ad-Free Lifetime Access`
   - **Display Name**: `Ad-Free Lifetime`
   - **Description**: `Remove all advertisements and support the development of CyberSafe News`

### 2.3 Set Pricing
1. Choose your pricing tier (e.g., $9.99)
2. Add localized information for different regions
3. Save the product

## Step 3: Configure iOS Project

### 3.1 Update Info.plist
Add the following to your `ios/YourApp/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 3.2 Enable In-App Purchase Capability
1. Open your project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **In-App Purchase**

## Step 4: Test Configuration

### 4.1 Create Test User
1. In App Store Connect, go to **Users and Access**
2. Create a **Sandbox Tester** account
3. Use this account for testing purchases

### 4.2 Test on Device
1. Build and run the app on a physical iOS device
2. Sign in with your sandbox test account
3. Test the ad-free purchase flow

## Step 5: Product Configuration

The app is configured to use the product ID: `com.cybersafenews.adfree.lifetime`

If you want to change this, update the `PRODUCT_IDS` constant in `src/services/iapService.ts`:

```typescript
const PRODUCT_IDS = {
  AD_FREE_LIFETIME: 'your.new.product.id',
};
```

## Step 6: Testing Checklist

- [ ] App Store Connect product is created and approved
- [ ] iOS project has In-App Purchase capability enabled
- [ ] Test user account is created
- [ ] App runs on physical device
- [ ] Purchase flow works correctly
- [ ] Ad-free status persists after app restart
- [ ] Restore purchases works

## Troubleshooting

### Common Issues

1. **"No products available"**
   - Check that the product ID matches exactly
   - Ensure the product is approved in App Store Connect
   - Verify you're testing on a physical device

2. **"Purchase failed"**
   - Check that you're signed in with a sandbox test account
   - Verify the product is properly configured
   - Check device network connection

3. **"Restore purchases not working"**
   - Ensure the user is signed in with the same Apple ID used for the purchase
   - Check that the purchase was completed successfully

### Debug Tips

- Use `console.log` statements in the IAP service to debug issues
- Check the device logs for detailed error messages
- Test with different sandbox accounts

## Production Deployment

1. **Submit for Review**: Submit your app with the in-app purchase for App Store review
2. **Test in Production**: Use TestFlight to test the production environment
3. **Monitor**: Use App Store Connect analytics to monitor purchase success rates

## Support

For more information, refer to:
- [Apple In-App Purchase Documentation](https://developer.apple.com/in-app-purchase/)
- [react-native-iap Documentation](https://github.com/dooboolab/react-native-iap)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
