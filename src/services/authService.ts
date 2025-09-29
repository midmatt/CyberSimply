import { supabase } from './supabaseClient';
import { Database } from './supabaseClient';
import { TABLES, DEFAULT_USER_PREFERENCES, DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/supabaseConfig';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isPremium: boolean;
  premiumExpiresAt?: string;
  isGuest?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
}

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isGuest: false,
  };
  private listeners: ((state: AuthState) => void)[] = [];

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth() {
    try {
      console.log('🔐 AuthService: Starting authentication initialization...');
      
      // Check if user wants to stay logged in
      const stayLoggedIn = await this.getStayLoggedInPreference();
      console.log('🔐 AuthService: Stay logged in preference:', stayLoggedIn);
      
      if (!stayLoggedIn) {
        // Clear any existing session if user doesn't want to stay logged in
        console.log('🔐 AuthService: Stay logged in disabled, clearing session...');
        await supabase.auth.signOut();
      }
      
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth initialization timeout')), 5000); // 5 second timeout
      });
      
      // Get initial session with timeout
      console.log('🔐 AuthService: Getting initial session...');
      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Auth initialization error:', error);
        this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        return;
      }

      console.log('🔐 AuthService: Session retrieved:', { hasSession: !!session, hasUser: !!session?.user });

      if (session?.user && stayLoggedIn) {
        console.log('🔐 AuthService: User found, loading profile...');
        await this.loadUserProfile(session.user.id);
      } else {
        console.log('🔐 AuthService: No user session or stay logged in disabled, checking for guest mode...');
        // Check if user wants to continue as guest
        const guestId = await this.getGuestId();
        if (guestId) {
          console.log('🔐 AuthService: Guest ID found, entering guest mode...');
          this.setGuestMode(guestId);
        } else {
          console.log('🔐 AuthService: No guest ID, showing auth screen...');
          this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          await this.loadUserProfile(session.user.id);
        } else {
          // Check if user wants to continue as guest
          const guestId = await this.getGuestId();
          if (guestId) {
            this.setGuestMode(guestId);
          } else {
            this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
          }
        }
      });

    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      if (error instanceof Error && error.message === 'Auth initialization timeout') {
        console.log('⏰ Auth initialization timed out, falling back to guest mode...');
        // Try to enter guest mode as fallback
        try {
          const guestId = await this.getGuestId();
          if (guestId) {
            this.setGuestMode(guestId);
          } else {
            this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
          }
        } catch (guestError) {
          console.error('❌ Guest mode fallback failed:', guestError);
          this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        }
      } else {
        this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
      }
    }
  }

  private async loadUserProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, try to create it
          console.log('User profile not found, attempting to create it...');
          await this.createUserProfile(userId);
          return;
        }
        console.error('Error loading user profile:', error);
        this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        return;
      }

      const authUser: AuthUser = {
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name || undefined,
        avatarUrl: profile.avatar_url || undefined,
        isPremium: profile.is_premium,
        premiumExpiresAt: profile.premium_expires_at || undefined,
        isGuest: false,
      };

      this.updateAuthState({ user: authUser, isLoading: false, isAuthenticated: true, isGuest: false });
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
    }
  }

  private async createUserProfile(userId: string) {
    try {
      // Get the current user from Supabase auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        return;
      }

      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from(TABLES.USER_PROFILES)
        .insert({
          id: userId,
          email: user.email || '',
          display_name: user.user_metadata?.display_name || user.email || 'User',
          is_premium: false,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        return;
      }

      // Create user preferences
      const { error: prefsError } = await supabase
        .from(TABLES.USER_PREFERENCES)
        .insert({
          user_id: userId,
          ...DEFAULT_USER_PREFERENCES,
        });

      if (prefsError) {
        console.error('Error creating user preferences:', prefsError);
        // Don't fail the entire process for this
      }

      // Create notification preferences
      const { error: notifError } = await supabase
        .from(TABLES.NOTIFICATION_PREFERENCES)
        .insert({
          user_id: userId,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        });

      if (notifError) {
        console.error('Error creating notification preferences:', notifError);
        // Don't fail the entire process for this
      }

      // Now load the created profile
      await this.loadUserProfile(userId);
    } catch (error) {
      console.error('Error creating user profile:', error);
      this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
    }
  }

  private async getGuestId(): Promise<string | null> {
    try {
      // Check if user has previously chosen guest mode
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const guestId = await AsyncStorage.getItem('guest_user_id');
      return guestId;
    } catch (error) {
      console.error('Error getting guest ID:', error);
      return null;
    }
  }

  private async saveGuestId(guestId: string): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('guest_user_id', guestId);
    } catch (error) {
      console.error('Error saving guest ID:', error);
    }
  }

  private async clearGuestId(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('guest_user_id');
    } catch (error) {
      console.error('Error clearing guest ID:', error);
    }
  }

  private async getStayLoggedInPreference(): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const preference = await AsyncStorage.getItem('stay_logged_in');
      return preference === 'true';
    } catch (error) {
      console.error('Error getting stay logged in preference:', error);
      return false; // Default to false if error
    }
  }

  private setGuestMode(guestId: string) {
    const guestUser: AuthUser = {
      id: guestId,
      email: 'guest@cybersafenews.com',
      displayName: 'Guest User',
      isPremium: false,
      isGuest: true,
    };

    this.updateAuthState({ 
      user: guestUser, 
      isLoading: false, 
      isAuthenticated: true, 
      isGuest: true 
    });
  }

  private updateAuthState(newState: AuthState) {
    console.log('🔐 AuthService: Updating auth state:', {
      isLoading: newState.isLoading,
      isAuthenticated: newState.isAuthenticated,
      isGuest: newState.isGuest,
      hasUser: !!newState.user
    });
    this.authState = newState;
    this.listeners.forEach(listener => listener(newState));
  }

  public getAuthState(): AuthState {
    return this.authState;
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async signUp(data: SignUpData): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateAuthState({ ...this.authState, isLoading: true });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
          },
        },
      });

      if (authError) {
        console.error('Sign up error:', authError);
        this.updateAuthState({ ...this.authState, isLoading: false });
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        // The user profile will be created automatically by the database trigger
        console.log('Sign up successful, user profile will be created automatically');
        return { success: true };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (error) {
      console.error('Sign up error:', error);
      this.updateAuthState({ ...this.authState, isLoading: false });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  public async signIn(data: SignInData): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateAuthState({ ...this.authState, isLoading: true });

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        console.error('Sign in error:', authError);
        this.updateAuthState({ ...this.authState, isLoading: false });
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        await this.loadUserProfile(authData.user.id);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      this.updateAuthState({ ...this.authState, isLoading: false });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  public async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.authState.isGuest) {
        // For guest users, just clear the state
        await this.clearGuestId();
        this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
        return { success: true };
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
      }

      this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  public async enterGuestMode(): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate a unique guest ID
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save guest ID for persistence
      await this.saveGuestId(guestId);
      
      // Enter guest mode
      this.setGuestMode(guestId);
      
      return { success: true };
    } catch (error) {
      console.error('Error entering guest mode:', error);
      return { success: false, error: 'Failed to enter guest mode' };
    }
  }

  public async convertGuestToUser(data: SignUpData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.isGuest) {
        return { success: false, error: 'Not in guest mode' };
      }

      // Sign up the user
      const signUpResult = await this.signUp(data);
      if (!signUpResult.success) {
        return signUpResult;
      }

      // Clear guest ID
      await this.clearGuestId();

      return { success: true };
    } catch (error) {
      console.error('Error converting guest to user:', error);
      return { success: false, error: 'Failed to convert guest account' };
    }
  }

  public async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'cybersafenews://reset-password',
      });

      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  public async updateProfile(updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('👤 [AuthService] Updating profile:', updates);

      const { error } = await supabase
        .from(TABLES.USER_PROFILES)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.authState.user.id);

      if (error) {
        console.error('❌ [AuthService] Profile update error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [AuthService] Profile updated successfully, reloading user profile');

      // Reload user profile to get the latest data
      await this.loadUserProfile(this.authState.user.id);
      return { success: true };
    } catch (error) {
      console.error('❌ [AuthService] Profile update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Refresh user profile from database
   */
  public async refreshUserProfile(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('🔄 [AuthService] Refreshing user profile for:', this.authState.user.id);
      await this.loadUserProfile(this.authState.user.id);
      return { success: true };
    } catch (error) {
      console.error('❌ [AuthService] Error refreshing user profile:', error);
      return { success: false, error: 'Failed to refresh profile' };
    }
  }

  public async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  public async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Note: In a real app, you might want to implement a soft delete
      // or require additional confirmation steps
      const { error } = await supabase.auth.admin.deleteUser(this.authState.user.id);

      if (error) {
        console.error('Account deletion error:', error);
        return { success: false, error: error.message };
      }

      this.updateAuthState({ user: null, isLoading: false, isAuthenticated: false, isGuest: false });
      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  public async checkAdFreeStatus(email: string): Promise<{ isAdFree: boolean; totalDonated: number }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.DONORS)
        .select('isAdFree, total_donated')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No donor found
          return { isAdFree: false, totalDonated: 0 };
        }
        console.error('Error checking ad-free status:', error);
        return { isAdFree: false, totalDonated: 0 };
      }

      return {
        isAdFree: data.isAdFree || false,
        totalDonated: data.total_donated || 0,
      };
    } catch (error) {
      console.error('Error checking ad-free status:', error);
      return { isAdFree: false, totalDonated: 0 };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
