import { supabase } from './supabase';

export class StorageDebug {
  /**
   * Test storage bucket access and provide detailed debugging information
   */
  static async testStorageAccess(): Promise<{ 
    success: boolean; 
    buckets?: any[]; 
    userContentBucket?: any;
    error?: string; 
    recommendations?: string[];
  }> {
    try {
      console.log('🔍 Testing Supabase storage access...');
      
      // List all buckets
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        console.error('❌ Error listing buckets:', bucketError);
        return { 
          success: false, 
          error: `Bucket listing error: ${bucketError.message}`,
          recommendations: [
            'Check your Supabase connection',
            'Verify your API keys are correct',
            'Ensure you have storage permissions'
          ]
        };
      }
      
      console.log('📦 Available buckets:', buckets?.map(b => ({ name: b.name, public: b.public })));
      
      // Check if user-content bucket exists
      const userContentBucket = buckets?.find(bucket => bucket.name === 'user-content');
      
      if (!userContentBucket) {
        console.warn('❌ user-content bucket not found');
        return { 
          success: false,
          buckets,
          error: 'user-content bucket not found',
          recommendations: [
            'Create a bucket named "user-content" in Supabase Dashboard',
            'Set the bucket to Public',
            'Configure allowed MIME types: image/png, image/jpg, image/jpeg, image/gif, image/webp',
            'Set file size limit to 5MB',
            'Run the SQL policies from STORAGE_BUCKET_SETUP.md'
          ]
        };
      }
      
      console.log('✅ user-content bucket found:', userContentBucket);
      
      // Test listing files in the bucket (this will test RLS policies)
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('user-content')
          .list('', { limit: 1 });
          
        if (listError) {
          console.warn('⚠️ Cannot list files in bucket (this might be normal):', listError);
        } else {
          console.log('✅ Can access bucket contents');
        }
      } catch (listingError) {
        console.warn('⚠️ File listing test failed (might be normal for empty bucket)');
      }
      
      return { 
        success: true,
        buckets,
        userContentBucket,
        recommendations: [
          'Storage bucket is properly configured!',
          'You can now upload profile images'
        ]
      };
      
    } catch (error: any) {
      console.error('🚨 Storage test failed:', error);
      return { 
        success: false, 
        error: error.message || 'Storage test failed',
        recommendations: [
          'Check your internet connection',
          'Verify Supabase project is active',
          'Check API keys in environment variables'
        ]
      };
    }
  }

  /**
   * Test image upload with a dummy image
   */
  static async testImageUpload(userId: string): Promise<{ 
    success: boolean; 
    url?: string; 
    error?: string; 
    recommendations?: string[];
  }> {
    try {
      console.log('🧪 Testing image upload for user:', userId);
      
      // Create a small test image (1x1 transparent PNG)
      const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const arrayBuffer = Uint8Array.from(atob(testImageData), c => c.charCodeAt(0)).buffer;
      
      const fileName = `test_avatar_${Date.now()}.png`;
      const filePath = `${userId}/avatars/${fileName}`;
      
      console.log('📤 Uploading test file to:', filePath);
      
      // Upload test image
      const { data, error } = await supabase.storage
        .from('user-content')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/png',
          upsert: true,
        });
      
      if (error) {
        console.error('❌ Upload failed:', error);
        
        const recommendations = [];
        if (error.message.includes('bucket')) {
          recommendations.push('Create the user-content bucket in Supabase Dashboard');
        }
        if (error.message.includes('policy')) {
          recommendations.push('Run the storage policies SQL from STORAGE_BUCKET_SETUP.md');
        }
        if (error.message.includes('permission')) {
          recommendations.push('Check storage permissions and RLS policies');
        }
        
        return { 
          success: false, 
          error: error.message,
          recommendations: recommendations.length > 0 ? recommendations : [
            'Follow the STORAGE_BUCKET_SETUP.md guide',
            'Check Supabase Dashboard storage configuration'
          ]
        };
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);
      
      console.log('✅ Test upload successful:', publicUrlData.publicUrl);
      
      // Clean up test file
      try {
        await supabase.storage
          .from('user-content')
          .remove([filePath]);
        console.log('🧹 Test file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up test file');
      }
      
      return { 
        success: true, 
        url: publicUrlData.publicUrl,
        recommendations: [
          'Storage upload is working correctly!',
          'Users can now upload profile images'
        ]
      };
      
    } catch (error: any) {
      console.error('🚨 Image upload test failed:', error);
      return { 
        success: false, 
        error: error.message || 'Image upload test failed',
        recommendations: [
          'Check storage bucket configuration',
          'Verify RLS policies are set up correctly',
          'Follow the STORAGE_BUCKET_SETUP.md guide'
        ]
      };
    }
  }

  /**
   * Run complete storage diagnostic
   */
  static async runDiagnostic(userId?: string): Promise<void> {
    console.log('🏥 Running storage diagnostic...\n');
    
    // Test 1: Storage access
    const accessTest = await this.testStorageAccess();
    console.log('\n📊 Storage Access Test:', accessTest.success ? '✅ PASSED' : '❌ FAILED');
    
    if (!accessTest.success) {
      console.log('❌ Error:', accessTest.error);
      console.log('💡 Recommendations:');
      accessTest.recommendations?.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      return;
    }
    
    // Test 2: Image upload (if user ID provided)
    if (userId) {
      const uploadTest = await this.testImageUpload(userId);
      console.log('\n📤 Image Upload Test:', uploadTest.success ? '✅ PASSED' : '❌ FAILED');
      
      if (!uploadTest.success) {
        console.log('❌ Error:', uploadTest.error);
        console.log('💡 Recommendations:');
        uploadTest.recommendations?.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      } else {
        console.log('✅ Test image uploaded successfully');
      }
    }
    
    console.log('\n🎉 Diagnostic complete!');
  }
} 