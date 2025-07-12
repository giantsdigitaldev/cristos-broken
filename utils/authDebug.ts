import { Platform } from 'react-native';
import { supabase } from './supabase';

export class AuthDebug {
  /**
   * Test authentication configuration
   */
  static async testAuthSetup() {
    console.log('🔍 Testing Auth Setup...');
    console.log('Platform:', Platform.OS);
    
    // Test environment variables
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment Variables:');
    console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('- SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    
    // Test Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Auth Session Test:', error ? '❌ Error' : '✅ Success');
      if (error) {
        console.error('Session Error:', error);
      } else {
        console.log('Current Session:', data.session ? 'Logged in' : 'Not logged in');
      }
    } catch (error) {
      console.error('Auth Test Failed:', error);
    }
  }

  /**
   * Test login with comprehensive debugging
   */
  static async testLogin(email: string, password: string) {
    console.log('🔐 Testing Login...');
    console.log('Email:', email);
    console.log('Platform:', Platform.OS);
    
    // Validate input
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email format' };
    }
    
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    try {
      // Clean and normalize email
      const cleanEmail = email.trim().toLowerCase();
      console.log('Cleaned email:', cleanEmail);
      
      // Test different auth methods
      console.log('Attempting signInWithPassword...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });
      
      if (error) {
        console.error('❌ Login Error Details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Provide specific error messages
        let userFriendlyError = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          userFriendlyError = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyError = 'Please check your email and click the confirmation link.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyError = 'Too many login attempts. Please wait a few minutes and try again.';
        } else if (error.message.includes('Invalid email')) {
          userFriendlyError = 'Please enter a valid email address.';
        }
        
        return { success: false, error: userFriendlyError };
      }
      
      console.log('✅ Login Success:', data.user?.email);
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('❌ Login Exception:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  }

  /**
   * Test signup with debugging
   */
  static async testSignup(email: string, password: string) {
    console.log('📝 Testing Signup...');
    console.log('Email:', email);
    console.log('Platform:', Platform.OS);
    
    // Validate input
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email format' };
    }
    
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      console.log('Cleaned email:', cleanEmail);
      
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        console.error('❌ Signup Error Details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        let userFriendlyError = error.message;
        
        if (error.message.includes('User already registered')) {
          userFriendlyError = 'An account with this email already exists. Try logging in instead.';
        } else if (error.message.includes('Password should be at least')) {
          userFriendlyError = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('Invalid email')) {
          userFriendlyError = 'Please enter a valid email address.';
        }
        
        return { success: false, error: userFriendlyError };
      }
      
      console.log('✅ Signup Success:', data.user?.email);
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('❌ Signup Exception:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  }

  /**
   * Clear all auth data (for testing)
   */
  static async clearAuthData() {
    console.log('🧹 Clearing Auth Data...');
    try {
      await supabase.auth.signOut();
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  }

  /**
   * Test network connectivity to Supabase
   */
  static async testNetworkConnectivity() {
    console.log('🌐 Testing Network Connectivity...');
    
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        return { success: false, error: 'Supabase URL not configured' };
      }
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      
      if (response.ok) {
        console.log('✅ Network connectivity test passed');
        return { success: true };
      } else {
        console.log('❌ Network connectivity test failed:', response.status);
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error: any) {
      console.error('❌ Network test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all auth tokens and storage
   */
  static async clearAllTokens() {
    console.log('🧹 Clearing all auth tokens...');
    
    try {
      // Clear Supabase auth
      await supabase.auth.signOut();
      
      // Clear storage
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key: string) => window.localStorage.removeItem(key));
          console.log('✅ Cleared web localStorage tokens');
        }
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const keys = await AsyncStorage.getAllKeys();
        const authKeys = keys.filter((key: string) => 
          key.includes('supabase') || key.includes('auth') || key.includes('token')
        );
        if (authKeys.length > 0) {
          await AsyncStorage.multiRemove(authKeys);
          console.log('✅ Cleared AsyncStorage tokens');
        }
      }
      
      console.log('✅ All auth tokens cleared successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error clearing tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Force refresh session
   */
  static async forceRefreshSession() {
    console.log('🔄 Force refreshing session...');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        return { success: false, error: error.message };
      }
      
      if (data.session) {
        console.log('✅ Session refreshed successfully');
        return { success: true, session: data.session };
      } else {
        console.log('⚠️ No session returned from refresh');
        return { success: false, error: 'No session returned' };
      }
    } catch (error: any) {
      console.error('❌ Exception during refresh:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AuthDebug; 