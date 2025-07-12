import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Platform-specific file system imports
let FileSystem: any;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system');
}

export interface ProfileData {
  id?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
  // Extended fields stored in metadata for web compatibility
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  occupation?: string;
  bio?: string;
  location?: string;
}

export interface ProfileResponse {
  success: boolean;
  data?: ProfileData;
  error?: string;
}

export class ProfileService {
  // Web-compatible file to base64 conversion
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  // Upload image to Supabase Storage (Web and Mobile compatible)
  static async uploadProfileImage(imageUri: string, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('Starting image upload for user:', userId);
      console.log('Image URI:', imageUri);

      let arrayBuffer: ArrayBuffer;
      let fileExt: string;

      if (Platform.OS === 'web') {
        // Web implementation
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
        
        // Try to determine file extension from the blob type or URI
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
          fileExt = 'jpg';
        } else if (contentType?.includes('png')) {
          fileExt = 'png';
        } else {
          // Fallback to jpg
          fileExt = 'jpg';
        }
      } else {
        // Mobile implementation
        if (!FileSystem) {
          throw new Error('FileSystem not available on this platform');
        }

        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        arrayBuffer = decode(base64);
        fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      }

      console.log('File extension:', fileExt);
      console.log('Array buffer size:', arrayBuffer.byteLength);

      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/avatars/${fileName}`;

      console.log('Uploading file to path:', filePath);

      // Test storage bucket access first
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        console.log('Available buckets:', buckets);
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError);
        }
        
        const userContentBucket = buckets?.find(bucket => bucket.name === 'user-content');
        if (!userContentBucket) {
          console.error('user-content bucket not found. Available buckets:', buckets?.map(b => b.name));
          return { 
            success: false, 
            error: `Storage bucket "user-content" not found. 

🔧 Quick Fix:
1. Open your Supabase Dashboard
2. Go to Storage → Create bucket named "user-content" 
3. Set it to Public with 5MB limit
4. Run the SQL policies

📖 Full instructions: See STORAGE_BUCKET_SETUP.md file` 
          };
        }
      } catch (bucketError) {
        console.error('Error checking buckets:', bucketError);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-content')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      console.log('Upload response:', { data, error });

      if (error) {
        console.error('Storage upload error:', error);
        if (error.message.includes('new row violates row-level security policy')) {
          return { 
            success: false, 
            error: 'Storage access denied. Please run the database setup script to configure storage policies.' 
          };
        }
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrlData.publicUrl);
      
      // Test if the URL is accessible
      try {
        const testResponse = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', testResponse.status, testResponse.statusText);
      } catch (testError) {
        console.warn('URL accessibility test failed:', testError);
      }
      
      return { 
        success: true, 
        url: publicUrlData.publicUrl 
      };
    } catch (error: any) {
      console.error('Image upload error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to upload image' 
      };
    }
  }

  // Get user profile
  static async getProfile(userId?: string): Promise<ProfileResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        return { success: false, error: 'No user ID provided' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('Profile not found, creating new profile...');
          return await this.createProfile(targetUserId, user);
        } else if (error.code === '42501') {
          // Permission denied - RLS policy issue
          console.error('Permission denied accessing profile. Check RLS policies.');
          return { 
            success: false, 
            error: 'Profile access denied. Please check database permissions.' 
          };
        } else {
          console.error('Error fetching profile:', error);
          return { success: false, error: error.message };
        }
      }

      return { 
        success: true, 
        data: data 
      };
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch profile' 
      };
    }
  }

  // Create a new profile for the user
  static async createProfile(userId: string, user: any): Promise<ProfileResponse> {
    try {
      const profileData = {
        id: userId,
        full_name: user?.user_metadata?.full_name || user?.user_metadata?.first_name && user?.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
          : null,
        username: user?.email?.split('@')[0] || null,
        avatar_url: user?.user_metadata?.avatar_url || null,
        website: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return { 
          success: false, 
          error: `Failed to create profile: ${error.message}` 
        };
      }

      console.log('Profile created successfully:', data);
      return { 
        success: true, 
        data: data 
      };
    } catch (error: any) {
      console.error('Profile creation error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create profile' 
      };
    }
  }

  // Update or create user profile (only using existing database columns)
  static async updateProfile(profileData: Partial<ProfileData>, imageUri?: string): Promise<ProfileResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      let avatarUrl = profileData.avatar_url;

      // Upload image if provided
      if (imageUri && imageUri !== profileData.avatar_url) {
        const uploadResult = await this.uploadProfileImage(imageUri, user.id);
        if (uploadResult.success) {
          avatarUrl = uploadResult.url;
        } else {
          console.warn('Image upload failed:', uploadResult.error);
          // Continue without image upload - don't fail the entire update
        }
      }

      // Prepare profile data (only fields that exist in the database)
      const updateData = {
        id: user.id,
        full_name: profileData.full_name || null,
        username: profileData.username || null,
        avatar_url: avatarUrl || null,
        website: profileData.website || null,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      console.log('Updating profile with data:', updateData);

      // Use update + eq('id', ...) for RLS compatibility
      const { id, ...fields } = updateData;
      const { data, error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '42501') {
          // Permission denied - RLS policy issue
          console.error('Permission denied updating profile. Check RLS policies.');
          return { 
            success: false, 
            error: 'Profile update denied. Please check database permissions. You may need to run the database setup script first.' 
          };
        }
        console.error('Profile update error:', error);
        return { success: false, error: error.message };
      }

      // Update auth user metadata if name changed
      if (profileData.full_name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { 
            full_name: profileData.full_name,
            // Store extended fields in user metadata
            phone_number: profileData.phone_number,
            date_of_birth: profileData.date_of_birth,
            gender: profileData.gender,
            occupation: profileData.occupation,
          }
        });
        
        if (authError) {
          console.warn('Auth metadata update failed:', authError.message);
          // Don't fail the entire operation for this
        }
      }

      console.log('Profile updated successfully:', data);
      
      return { 
        success: true, 
        data: data 
      };
    } catch (error: any) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update profile' 
      };
    }
  }

  // Delete profile image
  static async deleteProfileImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get last two parts (bucket/filename)

      const { error } = await supabase.storage
        .from('user-content')
        .remove([filePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to delete image' 
      };
    }
  }

  // Get profile image picker options
  static async getImagePickerOptions(): Promise<ImagePicker.ImagePickerOptions> {
    return {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    };
  }

  // Get camera options for selfie
  static async getCameraOptions(): Promise<ImagePicker.ImagePickerOptions> {
    const options: any = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
      cameraType: ImagePicker.CameraType.front,
    };

    // Add mirror property to disable front camera mirroring
    // This property may not be in TypeScript definitions but works at runtime
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      options.mirror = false;
      console.log('📸 Camera options: Mirror disabled for', Platform.OS);
    }

    // Additional camera options that might help with mirroring
    // These are experimental and may not be supported in all versions
    if (Platform.OS === 'ios') {
      options.presentationStyle = 'fullScreen';
    }

    console.log('📸 Camera options configured:', options);
    return options;
  }

  // Pick and upload profile image (mobile)
  static async pickAndUploadProfileImage(userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Permission to access camera roll is required' };
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync(
        await this.getImagePickerOptions()
      );

      if (result.canceled || !result.assets?.[0]) {
        return { success: false, error: 'Image selection cancelled' };
      }

      const imageUri = result.assets[0].uri;
      
      // Upload image
      return await this.uploadProfileImage(imageUri, userId);
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to pick and upload image' 
      };
    }
  }

  // Web-specific image picker
  static async pickAndUploadProfileImageWeb(userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Create a file input element for web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      // Add to DOM temporarily
      document.body.appendChild(input);
      
      return new Promise((resolve) => {
        input.onchange = async (event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          
          // Clean up
          document.body.removeChild(input);
          
          if (!file) {
            resolve({ success: false, error: 'No file selected' });
            return;
          }
          
          try {
            // Convert file to data URL
            const reader = new FileReader();
            reader.onload = async (e) => {
              const dataUrl = e.target?.result as string;
              
              // Upload the image
              const uploadResult = await this.uploadProfileImage(dataUrl, userId);
              resolve(uploadResult);
            };
            reader.readAsDataURL(file);
          } catch (error: any) {
            resolve({ 
              success: false, 
              error: error.message || 'Failed to process image' 
            });
          }
        };
        
        // Trigger file selection
        input.click();
      });
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to pick and upload image' 
      };
    }
  }

  // Update associateAvatarWithUser to upload if avatarUrl is local
  static async associateAvatarWithUser(userId: string, avatarUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔗 Associating avatar with user:', userId, avatarUrl);
      let finalAvatarUrl = avatarUrl;
      // If avatarUrl is a local file URI, upload it first
      if (avatarUrl.startsWith('file://')) {
        const uploadResult = await this.uploadProfileImage(avatarUrl, userId);
        if (!uploadResult.success || !uploadResult.url) {
          return { success: false, error: uploadResult.error || 'Failed to upload avatar image' };
        }
        finalAvatarUrl = uploadResult.url;
      }
      // Update the profile with the avatar URL
      const updateResult = await this.updateProfile({
        id: userId,
        avatar_url: finalAvatarUrl,
      });
      if (updateResult.success) {
        console.log('✅ Avatar associated with user successfully');
        return { success: true };
      } else {
        console.error('❌ Failed to associate avatar with user:', updateResult.error);
        return { success: false, error: updateResult.error };
      }
    } catch (error: any) {
      console.error('❌ Error associating avatar with user:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to associate avatar with user' 
      };
    }
  }

  // Create profile with avatar during signup
  static async createProfileWithAvatar(userId: string, userData: any, avatarUrl?: string): Promise<ProfileResponse> {
    try {
      console.log('👤 Creating profile with avatar for user:', userId);
      
      // Prepare profile data
      const profileData = {
        id: userId,
        full_name: userData.full_name || userData.first_name || userData.last_name || '',
        username: userData.username || userData.email?.split('@')[0] || '',
        avatar_url: avatarUrl || undefined,
        website: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📋 Profile data to create:', profileData);

      // Insert profile data
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - profile already exists
          console.log('⚠️ Profile already exists, updating instead');
          return await this.updateProfile(profileData);
        }
        
        console.error('❌ Profile creation error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Profile created successfully with avatar:', data);
      
      return { 
        success: true, 
        data: data 
      };
    } catch (error: any) {
      console.error('❌ Error creating profile with avatar:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create profile with avatar' 
      };
    }
  }

  // Validate profile data
  static validateProfileData(data: Partial<ProfileData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.full_name && data.full_name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (data.username && data.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    if (data.phone_number && data.phone_number.length > 0) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(data.phone_number)) {
        errors.push('Please enter a valid phone number');
      }
    }

    if (data.website && data.website.length > 0) {
      const urlRegex = /^https?:\/\/.+\..+/;
      if (!urlRegex.test(data.website)) {
        errors.push('Please enter a valid website URL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
} 