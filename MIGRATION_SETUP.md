# Supabase Migration Setup

This document explains how to set up the automatic migrations for the `user_profiles` table to ensure the `ad_free` column exists.

## 🚀 Quick Setup

### Option 1: Run SQL Migration Manually (Recommended)

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the content from **ONE** of these files:
   - `supabase/add-ad-free-to-user-profiles.sql` (detailed version)
   - `supabase/functions/migrate-user-profiles.sql` (RPC function version)
5. Click **Run** to execute the migration
6. Verify the columns were added

### Option 2: Use Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or run the migration file directly
psql $DATABASE_URL -f supabase/add-ad-free-to-user-profiles.sql
```

### Option 3: Enable RPC Migration (For App Startup)

To allow the app to run migrations automatically on startup:

1. Run the RPC function SQL in Supabase dashboard:
   ```bash
   cat supabase/functions/migrate-user-profiles.sql
   ```

2. Copy and execute it in **Supabase SQL Editor**

3. The app will now call this RPC function on startup to ensure columns exist

## 📋 What Gets Added

The migration adds these columns to `user_profiles`:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `ad_free` | BOOLEAN | FALSE | Whether user has purchased ad-free access |
| `is_premium` | BOOLEAN | FALSE | Legacy column for backwards compatibility |
| `premium_expires_at` | TIMESTAMPTZ | NULL | Expiration for subscriptions |
| `product_type` | TEXT | NULL | 'lifetime' or 'subscription' |
| `purchase_date` | TIMESTAMPTZ | NULL | When the purchase was made |

## 🔧 How It Works

### App Startup Migration Check

The app now includes `supabaseMigrationService` that runs on startup:

```typescript
// In src/app/startup/startupOrchestrator.ts
{
  name: 'supabase-migrations',
  critical: false,
  timeout: 8000,
  execute: async () => {
    const { supabaseMigrationService } = await import('../../services/supabaseMigrationService');
    const result = await supabaseMigrationService.runStartupMigrations();
    return { initialized: true, migrationResult: result };
  }
}
```

### Migration Service Features

1. **Idempotent**: Safe to run multiple times
2. **Non-Blocking**: If migration fails, app continues
3. **Logged**: All migration activity is logged for debugging
4. **One-Time**: Only runs once per app session

### Migration Flow

```
App Starts
    ↓
Supabase Context Initializes
    ↓
Migration Service Runs
    ↓
Check if columns exist
    ↓
If missing → Try to call RPC function
    ↓
If RPC not available → Log warning and continue
    ↓
Update NULL values to FALSE
    ↓
App Continues
```

## 🐛 Troubleshooting

### If Migrations Don't Run

1. **Check Console Logs**:
   ```
   🔄 [Migration] Starting startup migrations...
   🔄 [Migration] Checking user_profiles table columns...
   ```

2. **Verify RPC Function**:
   - Check if `migrate_user_profiles_add_ad_free()` exists in Supabase
   - Run in SQL Editor: `SELECT migrate_user_profiles_add_ad_free();`

3. **Manual Migration**:
   - Run the SQL file manually in Supabase dashboard
   - File: `supabase/add-ad-free-to-user-profiles.sql`

### If "Column ad_free does not exist" Error

This means the migration hasn't run yet. Solutions:

1. **Run SQL manually** in Supabase dashboard (fastest)
2. **Create the RPC function** and restart the app
3. **Use Supabase CLI** to push the migration

### Verify Migration Success

Run this in Supabase SQL Editor:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('ad_free', 'is_premium', 'premium_expires_at', 'product_type', 'purchase_date');

-- Check for NULL values
SELECT COUNT(*) as null_count
FROM user_profiles 
WHERE ad_free IS NULL OR is_premium IS NULL;
```

## ✅ Expected Results

After migration:

- ✅ `ad_free` column exists in `user_profiles`
- ✅ No NULL values (all set to FALSE)
- ✅ App doesn't crash with "column does not exist" error
- ✅ Purchases can update `ad_free` status correctly
- ✅ Ad-free functionality works in both simulator and TestFlight

## 📝 Console Output

Successful migration logs:

```
🔄 [Migration] Starting startup migrations...
🔄 [Migration] Checking user_profiles table columns...
✅ [Migration] user_profiles columns verified: {
  has_ad_free: true,
  has_is_premium: true,
  has_premium_expires_at: true,
  has_product_type: true,
  has_purchase_date: true
}
🔄 [Migration] Updating NULL values to FALSE...
✅ [Migration] No NULL values found, all profiles are up to date
✅ [Migration] All startup migrations completed successfully
```

Failed migration logs (app continues):

```
🔄 [Migration] Starting startup migrations...
⚠️ [Migration] Error querying user_profiles columns: {...}
⚠️ [Migration] This may indicate missing columns - attempting to fix...
⚠️ [Migration] Migration RPC function not found
⚠️ [Migration] Please run the migration SQL in Supabase dashboard:
⚠️ [Migration] supabase/add-ad-free-to-user-profiles.sql
⚠️ [Migration] App will continue with available columns
```

## 🎯 Recommendation

**For immediate fix**: Run the SQL migration manually in Supabase dashboard using `supabase/add-ad-free-to-user-profiles.sql`. This is the fastest and most reliable method.

**For automatic migrations**: Create the RPC function in Supabase using `supabase/functions/migrate-user-profiles.sql` so the app can run migrations automatically on startup.
