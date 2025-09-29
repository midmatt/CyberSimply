import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { configService } from './configService';

// Get configuration from config service
const { url: supabaseUrl, anonKey: supabaseAnonKey } = configService.getSupabaseConfig();

console.log('🔧 [Supabase] Initializing with config:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  platform: Platform.OS,
  isProduction: configService.isProduction(),
  debugMode: configService.isDebugMode()
});

// Create Supabase client with enhanced error handling and logging
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': `cybersimply-app-${Platform.OS}`,
    },
  },
});

// Enhanced query wrapper with logging and error handling
export class SupabaseQueryWrapper {
  static async executeQuery<T>(
    queryName: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: {
      retries?: number;
      timeout?: number;
      fallbackData?: T;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: string; fromCache?: boolean }> {
    const { retries = 2, timeout = 10000, fallbackData } = options;
    
    console.log(`🔍 [Supabase] Executing query: ${queryName}`);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        
        // Add timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), timeout);
        });
        
        const result = await Promise.race([queryFn(), timeoutPromise]);
        const duration = Date.now() - startTime;
        
        if (result.error) {
          console.error(`❌ [Supabase] Query ${queryName} failed (attempt ${attempt + 1}):`, {
            error: result.error,
            message: result.error.message,
            code: result.error.code,
            details: result.error.details,
            hint: result.error.hint,
            duration
          });
          
          // If it's a network error and we have retries left, try again
          if (attempt < retries && this.isRetryableError(result.error)) {
            console.log(`🔄 [Supabase] Retrying query ${queryName} (attempt ${attempt + 2})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
            continue;
          }
          
          return {
            success: false,
            error: result.error.message || 'Query failed',
            data: fallbackData
          };
        }
        
        console.log(`✅ [Supabase] Query ${queryName} succeeded:`, {
          dataLength: Array.isArray(result.data) ? result.data.length : 'not array',
          duration,
          attempt: attempt + 1
        });
        
        return {
          success: true,
          data: result.data || fallbackData
        };
        
      } catch (error) {
        console.error(`💥 [Supabase] Query ${queryName} threw error (attempt ${attempt + 1}):`, error);
        
        if (attempt < retries) {
          console.log(`🔄 [Supabase] Retrying query ${queryName} after error (attempt ${attempt + 2})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: fallbackData
        };
      }
    }
    
    return {
      success: false,
      error: 'Max retries exceeded',
      data: fallbackData
    };
  }
  
  private static isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Network-related errors that are worth retrying
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'CONNECTION_ERROR',
      'SERVICE_UNAVAILABLE'
    ];
    
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'unavailable',
      'fetch'
    ];
    
    const errorCode = error.code || '';
    const errorMessage = (error.message || '').toLowerCase();
    
    return retryableCodes.some(code => errorCode.includes(code)) ||
           retryableMessages.some(msg => errorMessage.includes(msg));
  }
}

// Test connection function
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  console.log('🧪 [Supabase] Testing connection...');
  
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ [Supabase] Connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ [Supabase] Connection test successful');
    return { success: true };
  } catch (error) {
    console.error('💥 [Supabase] Connection test threw error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection test failed' 
    };
  }
};

// Export the same Database types as the original client
export * from './supabaseClient';
