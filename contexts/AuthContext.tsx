import { Session, User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthService } from '../utils/auth';
import { cacheService } from '../utils/cacheService';
import { optimizedSupabase } from '../utils/supabaseOptimized';
import { TeamService } from '../utils/teamService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, firstName?: string, lastName?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string; user: User | null }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  refreshAvatar: () => void;
  clearAuthTokens: () => Promise<void>;
  handleAuthError: (error: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarRefreshTrigger, setAvatarRefreshTrigger] = useState(0);
  const sessionInitializedRef = useRef(false);

  const refreshAvatar = useCallback(() => {
    setAvatarRefreshTrigger(prev => prev + 1);
  }, []);

  /**
   * 🚀 PRELOAD CRITICAL DATA: Preload essential data for instant app startup
   */
  const preloadCriticalData = useCallback(async (userId: string) => {
    try {
      console.log('🚀 Preloading critical data for user:', userId);
      
      // Preload in parallel for maximum speed
      await Promise.allSettled([
        // Preload user profile and dashboard data
        cacheService.preloadCriticalData(userId),
        
        // Warm connection pool for faster subsequent queries
        optimizedSupabase.warmConnectionPool(),
        
        // Preload recent projects (most likely to be accessed first)
        cacheService.get(`user_projects:${userId}:recent`, undefined, { forceRefresh: false }),
        
        // Preload dashboard stats
        cacheService.get(`dashboard_stats:${userId}`, undefined, { forceRefresh: false }),
      ]);
      
      console.log('✅ Critical data preloaded successfully');
    } catch (error) {
      console.warn('⚠️ Critical data preload failed:', error);
      // Don't throw - preload failure shouldn't break the app
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        console.log('🔐 AuthContext: Getting initial session...');
        
        // Initialize persistent authentication first
        await AuthService.initializePersistentAuth();
        
        const session = await AuthService.getSession();
        
        if (mounted) {
          if (session) {
            console.log('✅ AuthContext: Initial session found:', session.user?.email);
            setSession(session);
            setUser(session.user);
          } else {
            console.log('ℹ️ AuthContext: No initial session found');
            setSession(null);
            setUser(null);
          }
          sessionInitializedRef.current = true;
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ AuthContext: Error getting initial session:', error);
        if (mounted) {
          // Clear any invalid tokens on error
          try {
            await AuthService.clearAuthTokens();
          } catch (clearError) {
            console.error('❌ AuthContext: Error clearing tokens:', clearError);
          }
          setSession(null);
          setUser(null);
          sessionInitializedRef.current = true;
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes with improved handling
    const { data: { subscription } } = AuthService.onAuthStateChange(
      (event, session) => {
        console.log('🔐 AuthContext: Auth state changed:', event, session ? `User: ${session.user?.email}` : 'No user');
        
        if (!mounted) return;
        
        // Handle different auth events
        switch (event) {
          case 'INITIAL_SESSION':
            // Only update if we haven't initialized yet
            if (!sessionInitializedRef.current) {
              setSession(session);
              setUser(session?.user ?? null);
              sessionInitializedRef.current = true;
              setLoading(false);
            }
            break;
            
          case 'SIGNED_IN':
            console.log('✅ AuthContext: User signed in');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            
            // 🚀 PRELOAD CRITICAL DATA for instant app startup
            if (session?.user?.id) {
              // Preload in background without blocking UI
              setTimeout(() => {
                preloadCriticalData(session.user.id);
              }, 100);
              
              // Ensure user profile is searchable for team member discovery
              setTimeout(async () => {
                try {
                  await TeamService.ensureProfileSearchable(session.user.id);
                  console.log('✅ Profile searchability ensured for new user');
                } catch (error) {
                  console.warn('⚠️ Failed to ensure profile searchability:', error);
                }
              }, 200);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 AuthContext: User signed out');
            setSession(null);
            setUser(null);
            setLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 AuthContext: Token refreshed');
            setSession(session);
            setUser(session?.user ?? null);
            break;
            
          case 'TOKEN_REFRESH_FAILED':
            console.log('❌ AuthContext: Token refresh failed, clearing auth state');
            // Clear invalid tokens and reset state
            AuthService.clearAuthTokens().then(() => {
              setSession(null);
              setUser(null);
              setLoading(false);
            });
            break;
            
          default:
            // For any other events, update the session
            setSession(session);
            setUser(session?.user ?? null);
            if (sessionInitializedRef.current) {
              setLoading(false);
            }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [preloadCriticalData]);

  const signUp = async (email: string, password: string, fullName?: string, firstName?: string, lastName?: string, avatarUrl?: string) => {
    try {
      console.log('🔐 AuthContext.signUp called with:', { email, password, fullName, firstName, lastName, avatarUrl });
      setLoading(true);
      const result = await AuthService.signUp({ email, password, fullName, firstName, lastName, avatarUrl });
      console.log('📨 AuthContext.signUp result:', result);
      
      if (result.success) {
        console.log('✅ AuthContext.signUp successful');
        // Note: User might need to verify email before they can sign in
        return { success: true, user: result.user ?? null };
      } else {
        console.log('❌ AuthContext.signUp failed:', result.error);
        return { success: false, error: result.error, user: null };
      }
    } catch (error: any) {
      console.error('💥 AuthContext.signUp exception:', error);
      return { success: false, error: error.message || 'Sign up failed', user: null };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext signIn called with:', { email });
      setLoading(true);
      const result = await AuthService.signIn({ email, password });
      console.log('🔐 AuthService.signIn result:', result.success ? 'Success' : `Failed: ${result.error}`);
      
      if (result.success && result.session) {
        // Immediately update context state
        setSession(result.session);
        setUser(result.session.user);
        console.log('✅ AuthContext: Session updated immediately after sign in');
        return { success: true };
      } else {
        console.log('❌ AuthContext: Sign in failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.log('❌ AuthContext: Sign in exception:', error);
      return { success: false, error: error.message || 'Sign in failed' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await AuthService.signOut();
      
      if (result.success) {
        // Clear state immediately
        setUser(null);
        setSession(null);
        console.log('✅ AuthContext: State cleared after sign out');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign out failed' };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const result = await AuthService.resetPassword(email);
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Password reset failed' };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const result = await AuthService.updatePassword(newPassword);
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Password update failed' };
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 AuthContext: Refreshing user session...');
      const session = await AuthService.getSession();
      if (session) {
        setSession(session);
        setUser(session.user);
        console.log('✅ AuthContext: User session refreshed');
      } else {
        console.log('❌ AuthContext: No session found during refresh');
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ AuthContext: Error refreshing user:', error);
    }
  };

  const clearAuthTokens = async () => {
    try {
      await AuthService.clearAuthTokens();
    } catch (error) {
      console.error('❌ AuthContext: Error clearing auth tokens:', error);
    }
  };

  const handleAuthError = async (error: any) => {
    try {
      console.error('❌ AuthContext: Handling auth error:', error);
      await clearAuthTokens();
      await refreshUser();
    } catch (handleError) {
      console.error('❌ AuthContext: Error handling auth error:', handleError);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    // Only consider user authenticated if they have a confirmed email
    isAuthenticated: !!user && !!session && user.email_confirmed_at !== null,
    refreshUser,
    refreshAvatar,
    clearAuthTokens,
    handleAuthError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth hook called outside of AuthProvider context');
    console.error('Make sure the component calling useAuth is wrapped with AuthProvider');
    
    // Return a default state instead of throwing to prevent app crashes
    return {
      user: null,
      session: null,
      loading: true,
      signUp: async () => ({ success: false, error: 'Auth not initialized' }),
      signIn: async () => ({ success: false, error: 'Auth not initialized' }),
      signOut: async () => ({ success: false, error: 'Auth not initialized' }),
      resetPassword: async () => ({ success: false, error: 'Auth not initialized' }),
      updatePassword: async () => ({ success: false, error: 'Auth not initialized' }),
      isAuthenticated: false,
      refreshUser: async () => {},
      refreshAvatar: () => {},
      clearAuthTokens: async () => {},
      handleAuthError: async () => {},
    };
  }
  return context;
} 