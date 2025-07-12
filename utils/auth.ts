import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { ProfileService } from './profileService';
import { supabase } from './supabase';

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
  user?: User | null;
  session?: Session | null;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ProfileData {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
}

// Enhanced persistent authentication service
export class AuthService {
  private static readonly DEVICE_ID_KEY = 'auth_device_id';
  private static readonly SESSION_RESTORE_KEY = 'auth_session_restore';
  private static readonly LAST_LOGIN_KEY = 'auth_last_login';
  private static readonly PERSISTENCE_ENABLED_KEY = 'auth_persistence_enabled';

  /**
   * Initialize persistent authentication
   */
  static async initializePersistentAuth(): Promise<void> {
    try {
      console.log('🔐 AuthService: Initializing persistent authentication...');
      
      // Ensure device ID exists
      await this.ensureDeviceId();
      
      // Enable session persistence
      await this.enableSessionPersistence();
      
      // Attempt to restore session
      await this.restoreSession();
      
      console.log('✅ AuthService: Persistent authentication initialized');
    } catch (error) {
      console.error('❌ AuthService: Error initializing persistent auth:', error);
    }
  }

  /**
   * Generate and store a unique device ID
   */
  private static async ensureDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        console.log('🔐 AuthService: Generated new device ID:', deviceId);
      } else {
        console.log('🔐 AuthService: Using existing device ID:', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('❌ AuthService: Error ensuring device ID:', error);
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Enable session persistence
   */
  private static async enableSessionPersistence(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PERSISTENCE_ENABLED_KEY, 'true');
    } catch (error) {
      console.error('❌ AuthService: Error enabling persistence:', error);
    }
  }

  /**
   * Restore session from storage
   */
  private static async restoreSession(): Promise<Session | null> {
    try {
      // Check if persistence is enabled
      const persistenceEnabled = await AsyncStorage.getItem(this.PERSISTENCE_ENABLED_KEY);
      if (persistenceEnabled !== 'true') {
        return null;
      }

      // Get stored session data
      const sessionData = await AsyncStorage.getItem(this.SESSION_RESTORE_KEY);
      if (!sessionData) {
        return null;
      }

      const sessionInfo = JSON.parse(sessionData);
      const now = Date.now();
      
      // Check if session is still valid
      if (sessionInfo.expires_at && sessionInfo.expires_at < now) {
        await this.clearStoredSession();
        return null;
      }

      // Check if it's been too long since last login (30 days)
      const lastLogin = await AsyncStorage.getItem(this.LAST_LOGIN_KEY);
      if (lastLogin) {
        const lastLoginTime = parseInt(lastLogin);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        if (lastLoginTime < thirtyDaysAgo) {
          await this.clearStoredSession();
          return null;
        }
      }

      return sessionInfo;
    } catch (error) {
      await this.clearStoredSession();
      return null;
    }
  }

  /**
   * Store session for persistence
   */
  private static async storeSession(session: Session): Promise<void> {
    try {
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
        expires_in: session.expires_in
      };
      
      await AsyncStorage.setItem(this.SESSION_RESTORE_KEY, JSON.stringify(sessionData));
      await AsyncStorage.setItem(this.LAST_LOGIN_KEY, Date.now().toString());
    } catch (error) {
      // Silent error handling to prevent GoTrueClient exposure
    }
  }

  /**
   * Clear stored session
   */
  private static async clearStoredSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.SESSION_RESTORE_KEY,
        this.LAST_LOGIN_KEY
      ]);
    } catch (error) {
      // Silent error handling to prevent GoTrueClient exposure
    }
  }

  /**
   * Enhanced sign up with persistence
   */
  static async signUp({ email, password, fullName, firstName, lastName, avatarUrl }: SignUpData): Promise<AuthResponse> {
    try {

      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
          },
        },
      });

      if (error) {
        console.error('❌ AuthService.signUp error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // If user was created and avatar was provided, upload to Supabase Storage immediately
      if (data.user && avatarUrl) {
        try {
          // Upload avatar to Supabase Storage
          const uploadResult = await ProfileService.uploadProfileImage(avatarUrl, data.user.id);
          
          if (uploadResult.success && uploadResult.url) {
            // Store the Supabase URL for later profile association
            await AsyncStorage.setItem('signup_avatar_url', uploadResult.url);
          } else {
            // Still store the local URI as fallback
            await AsyncStorage.setItem('signup_avatar_url', avatarUrl);
          }
        } catch (uploadError) {
          // Store local URI as fallback
          await AsyncStorage.setItem('signup_avatar_url', avatarUrl);
        }
      } else if (avatarUrl) {
        // Store local URI as fallback if user creation failed
        await AsyncStorage.setItem('signup_avatar_url', avatarUrl);
      }

      // Store session for persistence if available
      if (data.session) {
        await this.storeSession(data.session);
      }


      return {
        success: true,
        data,
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('💥 AuthService.signUp exception:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Enhanced sign in with persistence
   */
  static async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {

      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AuthService.signIn error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Store session for persistence
      if (data.session) {
        await this.storeSession(data.session);
      }


      return {
        success: true,
        data,
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('💥 AuthService.signIn exception:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Enhanced sign out with persistence cleanup
   */
  static async signOut(): Promise<AuthResponse> {
    try {
      console.log('🔐 AuthService.signOut called');
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ AuthService.signOut error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Clear stored session
      await this.clearStoredSession();

      console.log('✅ AuthService.signOut success');
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('💥 AuthService.signOut exception:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Enhanced get session with persistence
   */
  static async getSession(): Promise<Session | null> {
    try {
      // First try to get session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // Handle specific auth errors
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('Refresh Token Not Found')) {
          await this.clearAuthTokens();
          return null;
        }
        
        return null;
      }
      
      if (session) {
        // Verify session is still valid
        if (session.expires_at && session.expires_at * 1000 < Date.now()) {
          try {
            const refreshedSession = await this.refreshSession();
            if (refreshedSession) {
              await this.storeSession(refreshedSession);
            }
            return refreshedSession;
          } catch (refreshError) {
            await this.clearAuthTokens();
            return null;
          }
        }
        
        // Store updated session
        await this.storeSession(session);
        return session;
      } else {
        // Try to restore from storage
        const restoredSession = await this.restoreSession();
        if (restoredSession) {
          return restoredSession;
        }
        
        return null;
      }
    } catch (error: any) {
      // Handle specific auth errors
      if (error.message?.includes('Invalid Refresh Token') || 
          error.message?.includes('Refresh Token Not Found')) {
        await this.clearAuthTokens();
      }
      
      return null;
    }
  }

  /**
   * Enhanced session refresh with persistence
   */
  static async refreshSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        // If refresh token is invalid, clear all tokens
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('Refresh Token Not Found')) {
          await this.clearAuthTokens();
        }
        
        return null;
      }
      
      if (data.session) {
        // Store refreshed session
        await this.storeSession(data.session);
        
        return data.session;
      } else {
        return null;
      }
    } catch (error: any) {
      // Clear tokens on any refresh error
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('Refresh Token Not Found')) {
        await this.clearAuthTokens();
      }
      
      return null;
    }
  }

  /**
   * Enhanced clear auth tokens with persistence cleanup
   */
  static async clearAuthTokens(): Promise<void> {
    try {
      // Clear Supabase auth session
      await supabase.auth.signOut();
      
      // Clear stored session
      await this.clearStoredSession();
      
      // Clear storage manually to ensure complete cleanup
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          // Clear all Supabase-related keys
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key: string) => window.localStorage.removeItem(key));
        }
      } else {
        // Clear AsyncStorage for React Native
        const keys = await AsyncStorage.getAllKeys();
        const authKeys = keys.filter((key: string) => 
          key.includes('supabase') || key.includes('auth') || key.includes('token')
        );
        if (authKeys.length > 0) {
          await AsyncStorage.multiRemove(authKeys);
        }
      }
    } catch (error) {
      // Silent error handling to prevent GoTrueClient exposure
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'cristosjuly2025v3://reset-password',
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
        user: data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Social auth handlers (for future implementation)
  static async signInWithApple(): Promise<AuthResponse> {
    // TODO: Implement Apple Sign In
    return {
      success: false,
      error: 'Apple Sign In not yet implemented',
    };
  }

  static async signInWithGoogle(): Promise<AuthResponse> {
    // TODO: Implement Google Sign In
    return {
      success: false,
      error: 'Google Sign In not yet implemented',
    };
  }

  static async signInWithFacebook(): Promise<AuthResponse> {
    // TODO: Implement Facebook Sign In
    return {
      success: false,
      error: 'Facebook Sign In not yet implemented',
    };
  }
} 