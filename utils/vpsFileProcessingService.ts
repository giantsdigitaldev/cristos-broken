import { Platform } from 'react-native';
import { supabase } from './supabase';

const VPS_API_URL = 'https://cristos.ai/api/documents';

export interface VPSProcessingResult {
  fileId: string;
  jobStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingResult?: {
    method: string;
    wordCount: number;
    languages: string[];
    processingTime: number;
    extractedText: string;
  };
  error?: string;
}

export class VPSFileProcessingService {
  /**
   * Upload a file to the VPS for processing
   */
  static async uploadFileForProcessing(
    projectId: string,
    file: File | any,
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated.');
      }

      const formData = new FormData();
      
      // Handle different file formats for web vs mobile
      if (Platform.OS === 'web') {
        formData.append('file', file);
      } else {
        // For mobile, create a file-like object
        formData.append('file', {
          uri: file.uri,
          name: fileName,
          type: fileType,
        } as any);
      }

      console.log('📁 Uploading file to VPS:', fileName, 'for project:', projectId);

      const VPS_API_KEY = process.env.EXPO_PUBLIC_HOSTINGER_VPS_API_KEY || '';

      const response = await fetch(`${VPS_API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VPS_API_KEY}`,
          'X-User-Id': session.user.id,
          'X-Project-Id': projectId,
        },
        body: formData,
      });

      const responseBody = await response.json();

      if (!response.ok) {
        console.error('❌ VPS upload failed:', responseBody);
        throw new Error(responseBody.error || 'Failed to upload file to VPS.');
      }

      console.log('✅ File uploaded to VPS successfully, fileId:', responseBody.fileId);
      return responseBody.fileId;
    } catch (error) {
      console.error('❌ Error uploading file to VPS:', error);
      throw error;
    }
  }

  /**
   * Get the processing status of a file from the VPS
   */
  static async getProcessingStatus(fileId: string, projectId: string, userId: string): Promise<VPSProcessingResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated.');
      }

      const VPS_API_KEY = process.env.EXPO_PUBLIC_HOSTINGER_VPS_API_KEY || '';

      const response = await fetch(`${VPS_API_URL}/status/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VPS_API_KEY}`,
          'X-User-Id': userId,
          'X-Project-Id': projectId,
          'Content-Type': 'application/json',
        },
      });

      const responseBody = await response.json();

      if (!response.ok) {
        console.error('❌ Status check failed:', responseBody);
        throw new Error(responseBody.error || 'Failed to get file status.');
      }
      
      return responseBody;
    } catch (error) {
      console.error('❌ Error getting processing status:', error);
      throw error;
    }
  }

  /**
   * Download the processed file from the VPS
   */
  static async downloadProcessedFile(fileId: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated.');
      }
      
      const VPS_API_KEY = process.env.EXPO_PUBLIC_HOSTINGER_VPS_API_KEY || '';

      const response = await fetch(`${VPS_API_URL}/download/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VPS_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file from VPS.');
      }

      // For web, return the URL
      if (Platform.OS === 'web') {
        return `${VPS_API_URL}/download/${fileId}`;
      } else {
        // For mobile, we'll need to handle the download differently
        // This is a placeholder - you might want to use expo-file-system
        return `${VPS_API_URL}/download/${fileId}`;
      }
    } catch (error) {
      console.error('❌ Error downloading processed file:', error);
      throw error;
    }
  }

  /**
   * Update the database with VPS processing results
   */
  static async updateProcessingResults(
    fileId: string,
    processingResult: VPSProcessingResult
  ): Promise<void> {
    try {
      const updateData: any = {
        processing_status: processingResult.jobStatus,
        updated_at: new Date().toISOString(),
      };

      if (processingResult.jobStatus === 'completed' && processingResult.processingResult) {
        updateData.raw_text = processingResult.processingResult.extractedText;
        updateData.processing_method = processingResult.processingResult.method;
        updateData.language_detected = processingResult.processingResult.languages;
        updateData.word_count = processingResult.processingResult.wordCount;
        updateData.processing_metadata = {
          processingTime: processingResult.processingResult.processingTime,
          method: processingResult.processingResult.method,
        };
        updateData.storage_provider = 'vps';
      } else if (processingResult.jobStatus === 'failed') {
        updateData.processing_error = processingResult.error || 'Processing failed';
        updateData.processing_status = 'failed';
      }

      const { error } = await supabase
        .from('project_files')
        .update(updateData)
        .eq('id', fileId);

      if (error) {
        console.error('❌ Error updating processing results:', error);
        throw error;
      }

      console.log('✅ Processing results updated in database');
    } catch (error) {
      console.error('❌ Error updating processing results:', error);
      throw error;
    }
  }

  /**
   * Poll for processing status with smart retry logic
   */
  static async pollProcessingStatus(
    fileId: string,
    projectId: string,
    userId: string,
    maxAttempts: number = 30,
    onStatusUpdate?: (status: VPSProcessingResult) => void
  ): Promise<VPSProcessingResult> {
    let attempt = 0;
    const maxDelay = 10000; // 10 seconds max delay

    while (attempt < maxAttempts) {
      try {
        const status = await this.getProcessingStatus(fileId, projectId, userId);
        
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status.jobStatus === 'completed' || status.jobStatus === 'failed') {
          return status;
        }

        // Smart polling with exponential backoff
        attempt++;
        const delay = Math.min(1000 * Math.pow(1.5, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`❌ Error polling status (attempt ${attempt + 1}):`, error);
        attempt++;
        
        if (attempt >= maxAttempts) {
          throw new Error('Processing timed out');
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Processing timed out');
  }

  /**
   * Check if a file type is supported for VPS processing
   */
  static isSupportedFileType(fileType: string): boolean {
    const supportedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      
      // Images (for OCR)
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'image/gif',
      
      // Additional formats
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
    ];

    return supportedTypes.includes(fileType.toLowerCase());
  }

  /**
   * Get file size in MB
   */
  static getFileSizeMB(fileSize: number): number {
    return fileSize / (1024 * 1024);
  }

  /**
   * Check if file size is within VPS limits (250MB)
   */
  static isFileSizeWithinLimit(fileSize: number): boolean {
    return this.getFileSizeMB(fileSize) <= 250;
  }
} 