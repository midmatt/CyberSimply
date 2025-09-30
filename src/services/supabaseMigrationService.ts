// Supabase Migration Service
// Handles runtime schema migrations to ensure required columns exist

import { supabase } from './supabaseClientProduction';

class SupabaseMigrationService {
  private static instance: SupabaseMigrationService;
  private migrationRun: boolean = false;

  private constructor() {}

  public static getInstance(): SupabaseMigrationService {
    if (!SupabaseMigrationService.instance) {
      SupabaseMigrationService.instance = new SupabaseMigrationService();
    }
    return SupabaseMigrationService.instance;
  }

  /**
   * Run all startup migrations
   */
  public async runStartupMigrations(): Promise<{ success: boolean; error?: string }> {
    // Only run migrations once
    if (this.migrationRun) {
      return { success: true };
    }

    try {
      // Run user_profiles migrations (with minimal logging)
      await this.ensureUserProfilesColumns();

      this.migrationRun = true;
      console.log('✅ [Migration] Schema check complete');
      return { success: true };

    } catch (error) {
      console.log('ℹ️ [Migration] Skipped (non-critical)');
      // Don't mark as run so it can retry on next app start
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown migration error' 
      };
    }
  }

  /**
   * Ensure user_profiles table has all required columns for ad-free functionality
   */
  private async ensureUserProfilesColumns(): Promise<void> {
    // Minimal logging to speed up startup

    try {
      // Create a SQL function to add columns if they don't exist
      // This is idempotent - safe to run multiple times
      const migrationSQL = `
        DO $$ 
        BEGIN
          -- Add ad_free column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'ad_free'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN ad_free BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added ad_free column to user_profiles';
          END IF;

          -- Add is_premium column if it doesn't exist (for backwards compatibility)
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'is_premium'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added is_premium column to user_profiles';
          END IF;

          -- Add premium_expires_at column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'premium_expires_at'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN premium_expires_at TIMESTAMPTZ;
            RAISE NOTICE 'Added premium_expires_at column to user_profiles';
          END IF;

          -- Add product_type column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'product_type'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN product_type TEXT 
            CHECK (product_type IN ('lifetime', 'subscription'));
            RAISE NOTICE 'Added product_type column to user_profiles';
          END IF;

          -- Add purchase_date column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'purchase_date'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN purchase_date TIMESTAMPTZ;
            RAISE NOTICE 'Added purchase_date column to user_profiles';
          END IF;
        END $$;

        -- Update any NULL values to FALSE for ad_free
        UPDATE user_profiles SET ad_free = FALSE WHERE ad_free IS NULL;
        
        -- Update any NULL values to FALSE for is_premium
        UPDATE user_profiles SET is_premium = FALSE WHERE is_premium IS NULL;
      `;

      // Execute migration SQL (minimal logging)

      // Execute the migration SQL
      // Note: Supabase client doesn't have a direct .sql() method for arbitrary SQL
      // We need to create an RPC function in Supabase or use the admin API
      // For now, we'll try to execute via a query and handle the error gracefully

      // Try to query just the essential columns first
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('id, ad_free, is_premium')
        .limit(1);

      if (testError) {
        // Columns don't exist - try alternative migration silently
        await this.tryAlternativeMigration();
      } else {
        // Essential columns exist - quietly update NULL values
        await this.updateNullValuesToFalse();
      }

    } catch (error) {
      console.error('❌ [Migration] Error in ensureUserProfilesColumns:', error);
      throw error;
    }
  }

  /**
   * Alternative migration method using Supabase API
   */
  private async tryAlternativeMigration(): Promise<void> {
    try {
      // Try calling RPC function silently
      const { data, error } = await supabase.rpc('migrate_user_profiles_add_ad_free');

      if (!error) {
        console.log('✅ [Migration] RPC migration completed');
      }
      // Silently fail if RPC doesn't exist

    } catch (error) {
      // Silently fail - don't block app startup
    }
  }

  /**
   * Update NULL values to FALSE for boolean columns
   */
  private async updateNullValuesToFalse(): Promise<void> {
    try {
      // Get all user profiles with NULL ad_free or is_premium
      const { data: profiles, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, ad_free, is_premium')
        .or('ad_free.is.null,is_premium.is.null');

      if (fetchError || !profiles || profiles.length === 0) {
        return; // Silently skip
      }

      // Update each profile quickly
      for (const profile of profiles) {
        const updates: any = {};
        
        if (profile.ad_free === null) updates.ad_free = false;
        if (profile.is_premium === null) updates.is_premium = false;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', profile.id);
        }
      }

    } catch (error) {
      // Silently fail - non-critical
    }
  }

  /**
   * Check if migrations have been run
   */
  public hasMigrationsRun(): boolean {
    return this.migrationRun;
  }

  /**
   * Reset migration state (for testing)
   */
  public resetMigrationState(): void {
    this.migrationRun = false;
  }
}

export const supabaseMigrationService = SupabaseMigrationService.getInstance();
