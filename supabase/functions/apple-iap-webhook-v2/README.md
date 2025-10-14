# Apple App Store Server Notifications v2 Webhook

This Supabase Edge Function handles real-time notifications from Apple about in-app purchases and subscriptions.

## Features

- ✅ Automatic subscription renewal tracking
- ✅ Refund detection and handling
- ✅ Grace period management
- ✅ User status sync with Supabase
- ✅ Production and Sandbox environment support

## Setup

### 1. Deploy the Edge Function

```bash
supabase functions deploy apple-iap-webhook-v2
```

### 2. Get the Webhook URL

After deployment, your webhook URL will be:
```
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/apple-iap-webhook-v2
```

### 3. Configure in App Store Connect

1. Go to **App Store Connect** → Your App → **App Information**
2. Scroll to **App Store Server Notifications**
3. Set **Production Server URL**: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/apple-iap-webhook-v2`
4. Set **Sandbox Server URL**: Same URL (the function handles both)
5. Choose **Version 2** for notification version

### 4. Test the Webhook

Apple provides a test notification feature in App Store Connect:
1. Go to your webhook configuration
2. Click **Send Test Notification**
3. Check your Supabase logs to verify receipt

## Notification Types Handled

### Subscriptions
- `SUBSCRIBED` - New subscription purchased
- `DID_RENEW` - Subscription renewed successfully
- `DID_FAIL_TO_RENEW` - Renewal failed (payment issue)
- `DID_CHANGE_RENEWAL_STATUS` - User enabled/disabled auto-renew
- `EXPIRED` - Subscription expired
- `GRACE_PERIOD_EXPIRED` - Grace period ended without renewal
- `REFUND` - Purchase was refunded
- `REVOKE` - Purchase was revoked by Apple

### One-Time Purchases
- `REFUND` - One-time purchase refunded
- `REFUND_REVERSED` - Refund was reversed

## Database Updates

The webhook automatically updates:

### `user_iap` Table
- Creates/updates transaction records
- Sets `is_active` based on notification type
- Tracks `last_notification_type` and `last_notification_date`

### `user_profiles` Table  
- Syncs `ad_free` status based on active purchases
- Updates `premium_expires_at` for subscriptions
- Sets `product_type` to 'lifetime' or 'subscription'

## Security

**⚠️ Important for Production:**

The current implementation decodes Apple's JWT but **does not verify the signature**. 

For production, you should:

1. Download Apple's public keys from:
   ```
   https://appleid.apple.com/auth/keys
   ```

2. Verify the JWT signature using the public key

3. Validate claims (issuer, audience, expiration)

Example verification library: `jose` (available in Deno)

## Monitoring

View webhook logs:
```bash
supabase functions logs apple-iap-webhook-v2
```

Common log patterns:
- `📬 [Webhook] Received notification` - New notification received
- `✅ [Webhook] Purchase activated` - Subscription activated/renewed
- `❌ [Webhook] Purchase deactivated` - Subscription expired/refunded
- `🔄 [Webhook] Syncing user profile` - User profile update

## Troubleshooting

### Webhook not receiving notifications

1. Verify URL is correct in App Store Connect
2. Check Edge Function is deployed and running
3. Send a test notification from App Store Connect
4. Check Supabase function logs for errors

### User status not updating

1. Verify `user_iap` table has the transaction
2. Check `is_active` is true and `expires_date` is future/null
3. Verify database triggers are enabled
4. Check `user_profiles` RLS policies allow updates

### Sandbox purchases not working

- Ensure you're using a sandbox test account
- Webhook URL should be the same for sandbox and production
- Check logs for `environment: 'sandbox'` in notifications

## Related Files

- **Database Schema**: `sql/create-user-iap-table.sql`
- **IAP Service**: `src/services/iapService.ts`
- **AdFree Context**: `src/context/AdFreeContext.tsx`
