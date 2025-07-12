import { supabase } from './supabase';

export class SetupTester {
  static async testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        return { success: false, error: `Database connection failed: ${error.message}` };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Database connection error: ${error.message}` };
    }
  }

  static async testStorageBucket(): Promise<{ success: boolean; error?: string; buckets?: string[] }> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        return { success: false, error: `Storage access failed: ${error.message}` };
      }
      
      const bucketNames = buckets?.map(b => b.name) || [];
      const hasUserContent = bucketNames.includes('user-content');
      
      if (!hasUserContent) {
        return { 
          success: false, 
          error: 'user-content bucket not found', 
          buckets: bucketNames 
        };
      }
      
      return { success: true, buckets: bucketNames };
    } catch (error: any) {
      return { success: false, error: `Storage error: ${error.message}` };
    }
  }

  static async testUserProfile(userId: string): Promise<{ success: boolean; error?: string; profile?: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        return { success: false, error: `Profile access failed: ${error.message}` };
      }
      
      return { success: true, profile: data };
    } catch (error: any) {
      return { success: false, error: `Profile test error: ${error.message}` };
    }
  }

  static async runFullTest(userId?: string): Promise<{
    database: { success: boolean; error?: string };
    storage: { success: boolean; error?: string; buckets?: string[] };
    profile?: { success: boolean; error?: string; profile?: any };
  }> {
    const results = {
      database: await this.testDatabaseConnection(),
      storage: await this.testStorageBucket(),
    } as any;

    if (userId) {
      results.profile = await this.testUserProfile(userId);
    }

    return results;
  }
} 