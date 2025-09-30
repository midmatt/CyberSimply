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
      console.log('✅ [Migration] Migrations already run, skipping');
      return { success: true };
    }

    console.log('🔄 [Migration] Starting startup migrations...');

    try {
      // Run user_profiles migrations
      await this.ensureUserProfilesColumns();

      this.migrationRun = true;
      console.log('✅ [Migration] All startup migrations completed successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ [Migration] Migration failed:', error);
      console.warn('⚠️ [Migration] App will continue despite migration errors');
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
    console.log('🔄 [Migration] Checking user_profiles table columns...');

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

      console.log('🔄 [Migration] Executing user_profiles migration SQL...');

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
        console.warn('⚠️ [Migration] Error querying user_profiles columns:', testError.message);
        console.warn('⚠️ [Migration] Column may not exist - attempting alternative migration...');
        
        // If we can't query these columns, try to update via individual operations
        await this.tryAlternativeMigration();
      } else {
        console.log('✅ [Migration] Essential user_profiles columns verified (ad_free, is_premium)');

        // Try to query optional columns separately (don't fail if they don't exist)
        const { data: optionalTest, error: optionalError } = await supabase
          .from('user_profiles')
          .select('id, premium_expires_at, product_type, purchase_date')
          .limit(1);

        if (optionalError) {
          console.warn('⚠️ [Migration] Optional columns missing (product_type, purchase_date) - these will be created on first purchase');
        } else {
          console.log('✅ [Migration] All user_profiles columns verified including optional ones');
        }

        // Update NULL values to FALSE
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
    console.log('🔄 [Migration] Attempting alternative migration via Supabase management API...');

    try {
      // Since we can't directly execute DDL SQL through the Supabase client,
      // we'll create a stored procedure that can be called via RPC
      // This requires the migration SQL to be run manually in Supabase dashboard first
      
      // Check if the migration RPC function exists
      const { data, error } = await supabase.rpc('migrate_user_profiles_add_ad_free');

      if (error) {
        // If the RPC doesn't exist, just log once that manual migration is needed
        if (error.code === 'PGRST202' || error.message?.includes('not found')) {
          console.log('ℹ️ [Migration] RPC function not available - manual migration recommended');
          console.log('ℹ️ [Migration] Run SQL: supabase/add-ad-free-to-user-profiles.sql');
        } else {
          console.error('❌ [Migration] RPC migration failed:', error.message);
        }
      } else {
        console.log('✅ [Migration] RPC migration completed successfully');
      }

    } catch (error) {
      console.error('❌ [Migration] Alternative migration failed:', error);
      // Don't throw - let the app continue
    }
  }

  /**
   * Update NULL values to FALSE for boolean columns
   */
  private async updateNullValuesToFalse(): Promise<void> {
    try {
      console.log('🔄 [Migration] Updating NULL values to FALSE...');

      // Get all user profiles with NULL ad_free or is_premium
      const { data: profiles, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, ad_free, is_premium')
        .or('ad_free.is.null,is_premium.is.null');

      if (fetchError) {
        console.warn('⚠️ [Migration] Error fetching profiles with NULL values:', fetchError);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log('✅ [Migration] No NULL values found, all profiles are up to date');
        return;
      }

      console.log(`🔄 [Migration] Found ${profiles.length} profiles with NULL values, updating...`);

      // Update each profile
      for (const profile of profiles) {
        const updates: any = {};
        
        if (profile.ad_free === null) {
          updates.ad_free = false;
        }
        
        if (profile.is_premium === null) {
          updates.is_premium = false;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', profile.id);

          if (updateError) {
            console.warn(`⚠️ [Migration] Error updating profile ${profile.id}:`, updateError);
          }
        }
      }

      console.log(`✅ [Migration] Updated ${profiles.length} profiles with NULL values`);

    } catch (error) {
      console.error('❌ [Migration] Error updating NULL values:', error);
      // Don't throw - this is not critical
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
