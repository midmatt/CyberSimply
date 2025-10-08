# IAP System Backup - October 8, 2025

## Purpose
Backup created before StoreKit 2 upgrade to allow easy rollback if needed.

## Backed Up Files

### Services (`src/services/`)
- `iapService.ts` - Main IAP service implementation
- `iapServiceFixed.ts` - Fixed IAP service variant
- `newIAPService.ts` - New IAP service implementation
- `storeKitIAPService.ts` - StoreKit IAP service
- `stripeService.ts` - Stripe payment service
- `supabaseClient.ts` - Supabase client configuration
- `supabaseUserService.ts` - User service with ad-free status

### Context (`src/context/`)
- `AdFreeContext.tsx` - Ad-free context provider
- `AdFreeContextFixed.tsx` - Fixed ad-free context variant

### Screens (`src/screens/`)
- `AdFreeScreen.tsx` - Ad-free purchase screen

### Constants (`src/constants/`)
- `adConfig.ts` - Ad configuration settings

## Rollback Instructions

To restore this backup:

```bash
# Option 1: Use the git tag
git checkout iap-pre-storekit2

# Option 2: Manually restore files
cp -r backups/iap_backup_2025-10-08/src/* src/
```

## Git Tag
Tag: `iap-pre-storekit2`
Message: "Rollback point before StoreKit2 integration"
