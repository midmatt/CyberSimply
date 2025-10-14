# App Store Connect Product ID Setup Guide

## 🎯 **FIXING "Invalid Product ID" Error**

The error occurs because your product IDs in the code don't match what's configured in App Store Connect.

---

## 🚀 **STEP 1: Update App Store Connect (5 minutes)**

### 1.1 Go to App Store Connect
- **URL**: https://appstoreconnect.apple.com
- **Sign in** with your Apple Developer account

### 1.2 Navigate to Your App
- Go to **My Apps**
- Select **CyberSimply** (or your app name)

### 1.3 Create In-App Purchases
- Go to **Features** → **In-App Purchases**
- Click **+** to create a new in-app purchase

### 1.4 Create Lifetime Product
```
Product Type: Non-Consumable
Product ID: com.cybersimply.adfree.lifetime
Reference Name: Ad-Free Lifetime
Display Name: Ad-Free Lifetime
Description: Remove all ads forever and support CyberSimply development.

Price: $12.99
Availability: All Countries and Regions
```

### 1.5 Create Monthly Subscription
```
Product Type: Auto-Renewable Subscription
Product ID: com.cybersimply.adfree.monthly
Reference Name: Ad-Free Monthly
Display Name: Ad-Free Monthly
Description: Remove all ads with a monthly subscription.

Price: $2.99/month
Availability: All Countries and Regions
```

### 1.6 Save Both Products
- Click **Save** for each product
- **Status should show**: "Ready to Submit" or "Ready for Sale"

---

## 🚀 **STEP 2: Test Your App**

### 2.1 Run Your App
```bash
cd /Users/matthewvella/code/CyberSimply-clean
npx expo run:ios --device
```

### 2.2 Expected Results
✅ **Buttons should appear** (Ad-Free Lifetime, Ad-Free Monthly)  
✅ **No "Invalid Product ID" error**  
✅ **Purchase flow should work** (with sandbox account)

---

## 🔍 **TROUBLESHOOTING**

### If you still get "Invalid Product ID":

#### Option A: Use Different Product IDs
If the above IDs don't work, try these simpler ones:

1. **Update your code**:
```typescript
// In src/services/iapService.ts
export const PRODUCT_IDS = {
  LIFETIME: 'lifetime_adfree',
  MONTHLY: 'monthly_adfree',
} as const;
```

2. **Update App Store Connect** with these simpler IDs

#### Option B: Check Your Bundle ID
Make sure your product IDs match your bundle ID format:
- If your bundle ID is `com.yourcompany.cybersimply`
- Use product IDs like: `com.yourcompany.cybersimply.adfree.lifetime`

#### Option C: Use Test Product IDs
For immediate testing, you can use Apple's test product IDs:
```typescript
export const PRODUCT_IDS = {
  LIFETIME: 'com.example.product',
  MONTHLY: 'com.example.subscription',
} as const;
```

---

## ✅ **VERIFICATION CHECKLIST**

After setting up products in App Store Connect:

- [ ] **Products created** in App Store Connect
- [ ] **Product IDs match** your code exactly
- [ ] **Products show "Ready to Submit"** status
- [ ] **App shows purchase buttons** without errors
- [ ] **Purchase flow works** with sandbox account

---

## 📞 **QUICK FIX FOR TESTING**

If you want to test immediately without setting up App Store Connect:

1. **Update product IDs** to use Apple's test format
2. **Use sandbox testing** with your sandbox account
3. **Test purchase flow** (will show test purchase)

---

## 🎯 **NEXT STEPS**

1. **Set up products** in App Store Connect with the IDs above
2. **Test your app** - should work without "Invalid Product ID" error
3. **Use sandbox account** for testing purchases
4. **Deploy to TestFlight** once everything works

The key is making sure the product IDs in your code **exactly match** what you create in App Store Connect!
