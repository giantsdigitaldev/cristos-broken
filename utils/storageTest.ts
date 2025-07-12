import { supabase } from './supabase';

export class StorageTest {
  // Test if storage bucket exists and is accessible
  static async testStorageAccess(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Testing Supabase storage access...');
      
      // List buckets to see if we have access
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        console.error('Error listing buckets:', bucketError);
        return { success: false, error: `Bucket listing error: ${bucketError.message}` };
      }
      
      console.log('Available buckets:', buckets?.map(b => b.name));
      
      // Check if user-content bucket exists
      const userContentBucket = buckets?.find(bucket => bucket.name === 'user-content');
      
      if (!userContentBucket) {
        console.warn('user-content bucket not found. Available buckets:', buckets?.map(b => b.name));
        return { 
          success: false, 
          error: 'user-content bucket not found. Please create it in Supabase dashboard.' 
        };
      }
      
      // Test listing files in the bucket
      const { data: files, error: listError } = await supabase.storage
        .from('user-content')
        .list('avatars', { limit: 1 });
        
      if (listError) {
        console.warn('Error listing files (this might be normal if bucket is empty):', listError);
        // Don't fail for listing errors as the bucket might be empty
      }
      
      console.log('Storage test successful. Bucket is accessible.');
      return { success: true };
      
    } catch (error: any) {
      console.error('Storage test failed:', error);
      return { 
        success: false, 
        error: error.message || 'Storage test failed' 
      };
    }
  }
  
  // Create user-content bucket if it doesn't exist (Note: This requires admin privileges)
  static async createBucketIfNeeded(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.storage.createBucket('user-content', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error && error.message !== 'Bucket already exists') {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to create bucket' 
      };
    }
  }
} 