import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill';

// Global flag to track if we've already warned about localStorage
// This needs to be module-level to persist across all imports
let localStorageWarningLogged = false;

// Create Supabase client with custom storage adapter
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

console.log('📱 Using AsyncStorage for Expo Go compatibility');

// Storage adapter for Supabase
const storageAdapter = {
  getItem: (key: string) => {
    try {
      if (Platform.OS === 'web') {
        // Check if localStorage is available
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        } else {
          // Only log warning once per session
          if (!localStorageWarningLogged) {
            console.log('🌐 Web environment detected but localStorage not available');
            localStorageWarningLogged = true;
          }
          return null;
        }
      } else {
        // Use AsyncStorage for native platforms
        return AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.warn('Storage getItem error:', error);
      return null;
    }
  },
  
  setItem: (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          // Only log warning once per session
          if (!localStorageWarningLogged) {
            console.log('🌐 Web environment detected but localStorage not available');
            localStorageWarningLogged = true;
          }
        }
      } else {
        AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('Storage setItem error:', error);
    }
  },
  
  removeItem: (key: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        } else {
          // Only log warning once per session
          if (!localStorageWarningLogged) {
            console.log('🌐 Web environment detected but localStorage not available');
            localStorageWarningLogged = true;
          }
        }
      } else {
        AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Storage removeItem error:', error);
    }
  }
};

// Supabase configuration
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize and export the singleton Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
    flowType: 'pkce', // More secure auth flow
    debug: false, // Disabled to prevent GoTrueClient exposure
  },
  global: {
    headers: {
      'X-Client-Info': 'cristos-app',
    },
  },
});

// Configuration logging removed to prevent GoTrueClient exposure

// Export cleanup function for consistency (no-op since we're not using MMKV)
export const cleanupMMKV = () => {
  // Silent cleanup to prevent GoTrueClient exposure
};

// Database types for TypeScript support
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          updated_at: string | null;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          website: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          updated_at?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          website?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          updated_at?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          website?: string | null;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: 'active' | 'completed' | 'archived';
          created_at: string;
          updated_at: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: 'active' | 'completed' | 'archived';
          created_at?: string;
          updated_at?: string;
          metadata?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          status?: 'active' | 'completed' | 'archived';
          updated_at?: string;
          metadata?: any;
        };
      };
      project_comments: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          content?: string;
          updated_at?: string;
        };
      };
      project_comment_likes: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          user_id?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'completed';
          priority: 'low' | 'medium' | 'high';
          due_date: string | null;
          created_at: string;
          updated_at: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'completed';
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'completed';
          priority?: 'low' | 'medium' | 'high';
          due_date?: string | null;
          updated_at?: string;
          metadata?: any;
        };
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string | null;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          metadata?: any;
        };
      };
      user_storage: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          file_name: string;
          file_path: string;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
          metadata?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          mime_type?: string | null;
          metadata?: any;
        };
      };
    };
  };
}; 