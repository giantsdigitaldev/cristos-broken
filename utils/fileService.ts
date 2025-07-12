import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  storage_path: string; // Updated to match database schema
  file_size: number;
  file_type: string;
  storage_provider: 'supabase' | 'vps'; // Track where file is stored
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  description?: string;
  download_url?: string; // For VPS-stored files
  
  // VPS Processing fields
  raw_text?: string; // Extracted text content
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_method?: 'tika' | 'tesseract' | 'direct';
  language_detected?: string[]; // Array of detected languages
  processing_metadata?: any; // JSON metadata from processing
  word_count?: number; // Number of words in extracted text
  processing_error?: string; // Error message if processing failed
  
  uploaded_by_profile?: {
    username: string;
    avatar_url: string;
  };
}

export class FileService {
  private static readonly SUPABASE_BUCKET = 'project-files';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for Supabase

  /**
   * Pick files using the document picker
   */
  static async pickFiles(allowMultiple: boolean = true): Promise<DocumentPicker.DocumentPickerResult | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: allowMultiple,
      });

      if (!result.canceled) {
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error picking files:', error);
      throw new Error('Failed to pick files');
    }
  }

  /**
   * Upload a file to Supabase storage (web and mobile compatible)
   */
  static async uploadFile(
    projectId: string,
    fileUri: string | File,
    fileName: string,
    fileType: string,
    fileSize: number,
    description?: string
  ): Promise<ProjectFile | null> {
    try {
      console.log('📁 Starting file upload for project:', projectId);
      console.log('📊 File size:', this.formatFileSize(fileSize));

      // Validate file size
      if (fileSize > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Create unique file path
      const timestamp = Date.now();
      const uniqueFileName = `${projectId}/${timestamp}_${fileName}`;

      // Handle file reading differently for web vs mobile
      let fileData: Uint8Array;
      
      if (Platform.OS === 'web') {
        // For web, handle File object or blob URL
        let file: File;
        
        if (fileUri instanceof File) {
          file = fileUri;
        } else if (typeof fileUri === 'string' && fileUri.startsWith('blob:')) {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          file = new File([blob], fileName, { type: fileType });
        } else {
          throw new Error('Invalid file format for web upload');
        }
        
        // Convert File to ArrayBuffer then to Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
      } else {
        // For mobile, use FileSystem to read the file
        const fileBase64 = await FileSystem.readAsStringAsync(fileUri as string, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to binary for upload
        const byteCharacters = atob(fileBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        fileData = new Uint8Array(byteNumbers);
      }

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.SUPABASE_BUCKET)
        .upload(uniqueFileName, fileData, {
          contentType: fileType,
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Supabase storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ File uploaded to Supabase storage:', uploadData.path);

      // Save file metadata to database (updated field names)
      const { data: fileMetadata, error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_name: fileName,
          storage_path: uploadData.path, // Updated field name
          file_size: fileSize,
          file_type: fileType,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        
        // Cleanup uploaded file on error
        try {
          await supabase.storage
            .from(this.SUPABASE_BUCKET)
            .remove([uploadData.path]);
        } catch (cleanupError) {
          console.error('❌ Cleanup error:', cleanupError);
        }
        
        throw dbError;
      }

      console.log('✅ File metadata saved to database');
      return fileMetadata;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Get all files for a project (accessible to team members)
   */
  static async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select(`
          *,
          uploaded_by_profile:profiles!project_files_uploaded_by_fkey(username, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching project files:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting project files:', error);
      return [];
    }
  }

  /**
   * Delete a file from Supabase storage
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file info first
      const { data: fileData, error: fetchError } = await supabase
        .from('project_files')
        .select('storage_path') // Updated field name
        .eq('id', fileId)
        .single();

      if (fetchError || !fileData) {
        throw new Error('File not found');
      }

      // Delete from Supabase storage
      const { error: storageError } = await supabase.storage
        .from(this.SUPABASE_BUCKET)
        .remove([fileData.storage_path]); // Updated field name

      if (storageError) {
        console.error('❌ Supabase storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('❌ Database delete error:', dbError);
        throw dbError;
      }

      console.log('✅ File deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get download URL for a file (secure signed URL)
   */
  static async getFileDownloadUrl(filePath: string): Promise<string | null> {
    try {
      // For Supabase storage, create signed URL
      const { data, error } = await supabase.storage
        .from(this.SUPABASE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('❌ Error creating Supabase signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('❌ Error getting download URL:', error);
      return null;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on file type
   */
  static getFileIcon(fileType: string): string {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) return 'document-text';
    if (type.includes('image')) return 'image';
    if (type.includes('video')) return 'videocam';
    if (type.includes('audio')) return 'volume-high';
    if (type.includes('text') || type.includes('doc')) return 'document-text';
    if (type.includes('sheet') || type.includes('excel')) return 'grid';
    if (type.includes('zip') || type.includes('archive')) return 'archive';
    
    return 'document'; // Default icon
  }

  /**
   * Get storage stats for project
   */
  static async getProjectStorageStats(projectId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    supabaseFiles: number;
    supabaseSize: number;
    vpsFiles: number;
    vpsSize: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('file_size, storage_provider')
        .eq('project_id', projectId);

      if (error) throw error;

      const stats = {
        totalFiles: data.length,
        totalSize: 0,
        supabaseFiles: data.length, // All files are in Supabase for now
        supabaseSize: 0,
        vpsFiles: 0,
        vpsSize: 0,
      };

      data.forEach(file => {
        stats.totalSize += file.file_size;
        stats.supabaseSize += file.file_size;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        supabaseFiles: 0,
        supabaseSize: 0,
        vpsFiles: 0,
        vpsSize: 0,
      };
    }
  }

  /**
   * Check if user can access project files
   */
  static async canUserAccessProjectFiles(projectId: string): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return false;
      }

      // Check if user is project owner or team member
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          id,
          created_by,
          project_team_members!inner(user_id)
        `)
        .eq('id', projectId)
        .or(`created_by.eq.${user.id},project_team_members.user_id.eq.${user.id}`)
        .single();

      return !projectError && !!project;
    } catch (error) {
      console.error('❌ Error checking project access:', error);
      return false;
    }
  }
} 