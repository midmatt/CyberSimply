# Authentication & Stripe Integration Setup Guide

This guide will help you set up user authentication with Supabase and Stripe integration for ad-free purchases.

## 🚀 Quick Setup

### 1. Supabase Authentication Setup

1. **Enable Authentication in Supabase**:
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Settings**
   - Enable **Email** provider
   - Configure **Site URL**: `cybersafenews://`
   - Set **Redirect URLs**: `cybersafenews://reset-password`

2. **Update Environment Variables**:
   ```bash
   # In your .env file
   SUPABASE_URL=https://uaykrxfhzfkhjwnmvukb.supabase.co
   SUPABASE_ANON_KEY=your_actual_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

### 2. Stripe Integration Setup

1. **Create Stripe Account**:
   - Go to [stripe.com](https://stripe.com) and create an account
   - Get your **Publishable Key** and **Secret Key** from the dashboard

2. **Update Stripe Keys**:
   ```bash
   # In your .env file
   STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

3. **Set Up Webhooks**:
   - In Stripe dashboard, go to **Webhooks**
   - Add endpoint: `https://your-backend-url.com/api/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the webhook secret to your environment variables

## 📱 Features Implemented

### Authentication Features
- ✅ **Sign Up/Sign In** with email and password
- ✅ **Password Reset** via email
- ✅ **User Profile Management** with display name and avatar
- ✅ **Secure Session Management** with automatic token refresh
- ✅ **Sign Out** functionality

### Ad-Free Purchase Features
- ✅ **Stripe Payment Integration** for one-time purchases
- ✅ **Ad-Free Status Tracking** in Supabase
- ✅ **Automatic Ad Removal** for paid users
- ✅ **Purchase Confirmation** and status updates
- ✅ **Secure Payment Processing** with webhook validation

### UI/UX Features
- ✅ **Authentication Screens** (Sign Up, Log In, Forgot Password)
- ✅ **Profile Screen** with account management
- ✅ **Ad-Free Purchase Screen** with Stripe checkout
- ✅ **Updated Settings Screen** with account and ad-free options
- ✅ **Smooth Navigation** between authenticated and non-authenticated states

## 🔧 Technical Implementation

### Authentication Flow
1. **App Launch**: Check for existing session
2. **Sign Up**: Create account with email verification
3. **Sign In**: Authenticate with email/password
4. **Session Management**: Automatic token refresh
5. **Sign Out**: Clear session and redirect to auth screen

### Ad-Free Purchase Flow
1. **User Clicks "Go Ad-Free"**: Navigate to purchase screen
2. **Stripe Checkout**: Present payment sheet
3. **Payment Processing**: Handle payment with Stripe
4. **Webhook Processing**: Update user status in Supabase
5. **UI Update**: Remove ads and show confirmation

### Security Features
- **Row Level Security (RLS)** on all Supabase tables
- **Secure API Keys** stored in environment variables
- **Webhook Signature Verification** for Stripe events
- **User Data Isolation** - users can only access their own data
- **Password Hashing** handled by Supabase Auth

## 🛠️ Configuration Files

### Frontend Configuration
- **`src/constants/supabaseConfig.ts`** - Supabase configuration
- **`src/services/supabaseClient.ts`** - Supabase client setup
- **`src/services/authService.ts`** - Authentication service
- **`src/services/stripeService.ts`** - Stripe payment service
- **`src/context/SupabaseContext.tsx`** - React context for auth state

### Backend Configuration
- **`backend/server.js`** - Main server with Stripe routes
- **`backend/stripe-routes.js`** - Stripe payment processing
- **`backend/supabase-schema.sql`** - Database schema
- **`backend/env.example`** - Environment variables template

## 📊 Database Schema

### User Tables
- **`user_profiles`** - User account information
- **`user_preferences`** - App settings and preferences
- **`notification_preferences`** - Notification settings

### Payment Tables
- **`donors`** - Buy Me a Coffee integration (legacy)
- **Payment tracking** - Handled by Stripe webhooks

### Content Tables
- **`articles`** - Cached news articles
- **`user_favorites`** - User's favorite articles
- **`reading_history`** - Articles user has read

## 🔐 Security Best Practices

### Authentication Security
- Use Supabase's built-in authentication
- Never store passwords in plain text
- Implement proper session management
- Use HTTPS for all API calls

### Payment Security
- Use Stripe's secure payment processing
- Validate webhook signatures
- Never store payment information
- Use test keys for development

### Data Security
- Enable RLS on all tables
- Validate user permissions
- Sanitize user inputs
- Use environment variables for secrets

## 🚀 Deployment Checklist

### Frontend (React Native)
- [ ] Update Supabase keys in `src/constants/supabaseConfig.ts`
- [ ] Update Stripe keys in `src/services/stripeService.ts`
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Verify ad-free status updates

### Backend (Node.js)
- [ ] Set up environment variables
- [ ] Install dependencies (`npm install`)
- [ ] Set up Stripe webhooks
- [ ] Test payment processing
- [ ] Deploy to your hosting platform

### Database (Supabase)
- [ ] Run database schema
- [ ] Enable authentication providers
- [ ] Set up RLS policies
- [ ] Test user registration
- [ ] Verify payment status updates

## 🧪 Testing

### Authentication Testing
1. **Sign Up Flow**:
   - Create new account
   - Verify email (if enabled)
   - Check profile creation

2. **Sign In Flow**:
   - Sign in with valid credentials
   - Test invalid credentials
   - Verify session persistence

3. **Password Reset**:
   - Request password reset
   - Check email delivery
   - Test reset link

### Payment Testing
1. **Test Payments**:
   - Use Stripe test cards
   - Test successful payments
   - Test failed payments

2. **Ad-Free Status**:
   - Verify ad removal after payment
   - Check status persistence
   - Test sign out/sign in

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Check Supabase keys
   - Verify email provider is enabled
   - Check redirect URLs

2. **Payment Errors**:
   - Verify Stripe keys
   - Check webhook configuration
   - Test with Stripe test cards

3. **Database Errors**:
   - Check RLS policies
   - Verify table permissions
   - Check user authentication

### Debug Mode
Enable debug logging by adding:
```typescript
console.log('Debug mode enabled');
```

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Stripe React Native Documentation](https://stripe.com/docs/stripe-react-native)
- [React Navigation Documentation](https://reactnavigation.org/)
- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

## 🆘 Support

If you encounter any issues:
1. Check the console logs for errors
2. Verify your environment variables
3. Test with Stripe test mode first
4. Check Supabase dashboard for authentication issues

---

**Note**: Remember to replace all placeholder keys with your actual Supabase and Stripe credentials before deploying to production!
