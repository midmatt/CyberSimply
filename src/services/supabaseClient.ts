import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/supabaseConfig';

// Supabase client configuration
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Create Supabase client with AsyncStorage for persistence
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
});

// Database types (generated from your schema)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          is_premium: boolean;
          premium_expires_at: string | null;
          ad_free: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_premium?: boolean;
          premium_expires_at?: string | null;
          ad_free?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_premium?: boolean;
          premium_expires_at?: string | null;
          ad_free?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          content: string | null;
          source_url: string | null;
          source: string | null;
          author: string | null;
          published_at: string | null;
          image_url: string | null;
          category: string | null;
          what: string | null;
          impact: string | null;
          takeaways: string | null;
          why_this_matters: string | null;
          ai_summary_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          summary?: string | null;
          content?: string | null;
          source_url?: string | null;
          source?: string | null;
          author?: string | null;
          published_at?: string | null;
          image_url?: string | null;
          category?: string | null;
          what?: string | null;
          impact?: string | null;
          takeaways?: string | null;
          why_this_matters?: string | null;
          ai_summary_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string | null;
          content?: string | null;
          source_url?: string | null;
          source?: string | null;
          author?: string | null;
          published_at?: string | null;
          image_url?: string | null;
          category?: string | null;
          what?: string | null;
          impact?: string | null;
          takeaways?: string | null;
          why_this_matters?: string | null;
          ai_summary_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          article_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          article_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          article_id?: string;
          created_at?: string;
        };
      };
      reading_history: {
        Row: {
          id: string;
          user_id: string;
          article_id: string;
          read_at: string;
          time_spent: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          article_id: string;
          read_at?: string;
          time_spent?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          article_id?: string;
          read_at?: string;
          time_spent?: number;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          notifications_enabled: boolean;
          email_digest_enabled: boolean;
          digest_frequency: string;
          preferred_categories: string[];
          ai_summaries_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          notifications_enabled?: boolean;
          email_digest_enabled?: boolean;
          digest_frequency?: string;
          preferred_categories?: string[];
          ai_summaries_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          notifications_enabled?: boolean;
          email_digest_enabled?: boolean;
          digest_frequency?: string;
          preferred_categories?: string[];
          ai_summaries_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: number;
          name: string;
          display_name: string;
          description: string | null;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          display_name: string;
          description?: string | null;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          display_name?: string;
          description?: string | null;
          color?: string;
          created_at?: string;
        };
      };
      article_metrics: {
        Row: {
          id: string;
          article_id: string;
          views: number;
          favorites: number;
          shares: number;
          avg_read_time: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          views?: number;
          favorites?: number;
          shares?: number;
          avg_read_time?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          views?: number;
          favorites?: number;
          shares?: number;
          avg_read_time?: number;
          last_updated?: string;
        };
      };
    };
    Views: {
      article_details: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          content: string | null;
          source_url: string | null;
          source: string | null;
          author: string | null;
          published_at: string | null;
          image_url: string | null;
          category: string | null;
          what: string | null;
          impact: string | null;
          takeaways: string | null;
          why_this_matters: string | null;
          ai_summary_generated: boolean;
          created_at: string;
          updated_at: string;
          view_count: number;
          favorite_count: number;
          share_count: number;
          avg_read_time: number;
        };
      };
    };
  };
}

// Export typed client
export type SupabaseClient = typeof supabase;
