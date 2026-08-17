# StoreKit 2 IAP System - Quick Reference

## 🚀 Quick Start Commands

### Database Setup
```bash
# 1. Create user_iap table
psql YOUR_DATABASE_URL -f sql/create-user-iap-table.sql

# 2. Migrate legacy users
psql YOUR_DATABASE_URL -f sql/migrate-legacy-iap.sql
```

### Deploy Webhook
```bash
supabase functions deploy apple-iap-webhook-v2
```

### Monitor Webhook
```bash
supabase functions logs apple-iap-webhook-v2 --tail
```

---

## 📂 File Structure

```
CyberSimply/
├── src/
│   ├── services/
│   │   └── iapService.ts              # ⭐ StoreKit 2 purchase logic
│   └── context/
│       └── AdFreeContext.tsx          # ⭐ Ad-free status provider
├── sql/
│   ├── create-user-iap-table.sql      # Database schema
│   └── migrate-legacy-iap.sql         # Backwards compatibility
├── supabase/
│   └── functions/
│       └── apple-iap-webhook-v2/      # ⭐ Webhook handler
│           ├── index.ts
│           └── README.md
└── STOREKIT2_SETUP_GUIDE.md          # Full setup instructions
```

---

## 🔑 Key Product IDs

```typescript
LIFETIME: 'com.cybersimply.adfree.lifetime.2025'
MONTHLY:  'com.cybersimply.adfree.monthly.2025'
```

---

## 📊 Database Tables

### `user_iap` (Primary IAP tracking)
```sql
transaction_id          TEXT (unique) - Apple transaction ID
user_id                 UUID - User reference
product_id              TEXT - Product purchased
purchase_date           TIMESTAMP
expires_date            TIMESTAMP (NULL for lifetime)
is_active               BOOLEAN
last_notification_type  TEXT - Latest webhook event
```

### `user_profiles` (User status)
```sql
ad_free                 BOOLEAN - TRUE after verified purchase
product_type            TEXT - 'lifetime' or 'subscription'
premium_expires_at      TIMESTAMP
```

---

## 🔄 Purchase Flow

### Client-Side (iapService.ts)
```
1. User taps "Purchase" 
   ↓
2. iapService.purchaseProduct(productId)
   ↓
3. StoreKit 2 handles purchase
   ↓
4. Purchase listener fires
   ↓
5. Verify with Apple
   ↓
6. Record in Supabase user_iap table
   ↓
7. Update user_profiles.ad_free = TRUE
   ↓
8. Cache locally
   ↓
9. UI updates immediately
```

### Server-Side (Webhook)
```
1. Apple sends notification
   ↓
2. Webhook receives POST
   ↓
3. Decode JWT transaction info
   ↓
4. Update user_iap table
   ↓
5. Sync user_profiles
   ↓
6. Return 200 OK to Apple
```

---

## 🧪 Testing Commands

### Sandbox Purchase Test
```bash
# 1. Create sandbox test user in App Store Connect
# 2. Sign out of App Store on device
# 3. Run app and purchase
# 4. Check logs:

# In app:
✅ [IAP] Purchase initiated
✅ [IAP] Purchase recorded in user_iap table

# In Supabase:
SELECT * FROM user_iap WHERE user_id = 'USER_ID';

# In webhook:
supabase functions logs apple-iap-webhook-v2 --tail
```

---

## 🐛 Common Issues & Fixes

### Issue: Purchase not showing
```sql
-- Check user_iap
SELECT * FROM user_iap WHERE user_id = 'USER_ID';

-- Manually activate if needed
UPDATE user_iap SET is_active = TRUE 
WHERE transaction_id = 'TX_ID';

-- Sync profile
UPDATE user_profiles SET ad_free = TRUE 
WHERE id = 'USER_ID';
```

### Issue: Webhook not receiving
```bash
# 1. Check deployment
supabase functions list

# 2. Send test notification from App Store Connect

# 3. Check logs
supabase functions logs apple-iap-webhook-v2 --tail
```

### Issue: Legacy user lost access
```bash
# Re-run migration
psql YOUR_DATABASE_URL -f sql/migrate-legacy-iap.sql
```

---

## 📈 Useful Queries

### Active Ad-Free Users
```sql
SELECT COUNT(*) FROM user_profiles WHERE ad_free = TRUE;
```

### Recent Purchases
```sql
SELECT 
  up.email, 
  ui.product_id, 
  ui.purchase_date
FROM user_iap ui
JOIN user_profiles up ON ui.user_id = up.id
WHERE ui.purchase_date > NOW() - INTERVAL '7 days'
ORDER BY ui.purchase_date DESC;
```

### Subscription Status
```sql
SELECT 
  COUNT(*) FILTER (WHERE expires_date IS NULL) as lifetime,
  COUNT(*) FILTER (WHERE expires_date IS NOT NULL AND expires_date > NOW()) as active_subs,
  COUNT(*) FILTER (WHERE expires_date IS NOT NULL AND expires_date <= NOW()) as expired_subs
FROM user_iap WHERE is_active = TRUE;
```

### Failed Renewals
```sql
SELECT 
  up.email,
  ui.last_notification_type,
  ui.last_notification_date
FROM user_iap ui
JOIN user_profiles up ON ui.user_id = up.id
WHERE ui.last_notification_type = 'DID_FAIL_TO_RENEW'
ORDER BY ui.last_notification_date DESC;
```

---

## 🔐 Security Checklist

- [ ] Supabase RLS policies enabled on `user_iap`
- [ ] Service role key never exposed to client
- [ ] Webhook URL uses HTTPS
- [ ] JWT signature verification in production webhook
- [ ] Transaction IDs are unique and validated

---

## 📞 Support Contacts

- **Apple Developer**: https://developer.apple.com/contact/
- **Supabase Support**: https://supabase.com/support
- **React Native IAP**: https://github.com/dooboolab/react-native-iap/issues

---

## 🎯 Success Metrics

Monitor these KPIs:

1. **Purchase Success Rate**: % of initiated purchases that complete
2. **Webhook Delivery**: % of Apple notifications received by webhook
3. **Sync Latency**: Time between purchase and Supabase update
4. **Restore Success Rate**: % of restore attempts that succeed
5. **Renewal Rate**: % of subscriptions that renew successfully

Target: All metrics > 95%

---

## 🔄 Rollback Plan

If issues occur, rollback to previous system:

```bash
# 1. Checkout pre-upgrade tag
git checkout iap-pre-storekit2

# 2. Restore backup files
cp -r backups/iap_backup_2025-10-08/src/* src/

# 3. Deploy previous app version

# 4. Keep database changes (backwards compatible)
```

**Note**: The new `user_iap` table doesn't break old code, so you can rollback the app without database changes.

---

## 📚 Related Documentation

- 📖 [Full Setup Guide](./STOREKIT2_SETUP_GUIDE.md)
- 🗄️ [Database Schema](./sql/create-user-iap-table.sql)
- 🔗 [Webhook README](./supabase/functions/apple-iap-webhook-v2/README.md)
- 🔙 [Rollback Backup](./backups/iap_backup_2025-10-08/README.md)

---

**Last Updated**: October 8, 2025
**Version**: StoreKit 2.0
