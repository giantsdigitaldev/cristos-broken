import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';

// Initialize Supabase client with debug logging disabled
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      debug: false,
    },
    global: {
      headers: {
        'X-Client-Info': `supabase-js-web`,
      },
    },
  }
);

const VPS_API_URL = 'https://cristos.ai/api';

/**
 * Uploads a file to the VPS processing server.
 * @param {string} projectId - The ID of the project.
 * @param {any} file - The file object from the document picker.
 * @returns {Promise<string>} - The fileId for tracking.
 */
export const uploadFileForProcessing = async (projectId: string, file: any): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated.');
  }

  const formData = new FormData();
  
  // The 'uri' contains the path to the file on the device
  const fileUri = file.uri;
  const fileName = file.name;
  const fileType = file.mimeType;

  // Append file data to FormData
  // The 'as any' is used here because the type definitions for FormData in React Native can be strict
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as any);

  console.log('Uploading file:', fileName, 'for project:', projectId);

  const response = await fetch(`${VPS_API_URL}/upload/${projectId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      // 'Content-Type': 'multipart/form-data' is set automatically by fetch with FormData
    },
    body: formData,
  });

  const responseBody = await response.json();

  if (!response.ok) {
    console.error('Upload failed:', responseBody);
    throw new Error(responseBody.error || 'Failed to upload file.');
  }

  console.log('Upload successful, fileId:', responseBody.fileId);
  return responseBody.fileId;
};

/**
 * Polls the VPS server for the processing status of a file.
 * @param {string} fileId - The ID of the file to check.
 * @returns {Promise<any>} - The status and result of the processing.
 */
export const getFileProcessingStatus = async (fileId: string): Promise<any> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('User not authenticated.');
    }

    const response = await fetch(`${VPS_API_URL}/status/${fileId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        },
    });

    const responseBody = await response.json();

    if (!response.ok) {
        console.error('Status check failed:', responseBody);
        throw new Error(responseBody.error || 'Failed to get file status.');
    }
    
    return responseBody;
};

/**
 * Downloads the processed file from the VPS.
 * @param {string} fileId - The ID of the file to download.
 * @param {string} originalName - The original name of the file for saving.
 * @returns {Promise<string>} - The local URI of the downloaded file.
 */
export const downloadProcessedFile = async (fileId: string, originalName: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('User not authenticated.');
    }
    
    const downloadUrl = `${VPS_API_URL}/download/${fileId}`;
    const localUri = FileSystem.documentDirectory + originalName;

    const { uri } = await FileSystem.downloadAsync(
        downloadUrl,
        localUri,
        {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            },
        }
    );
    
    console.log('File downloaded to:', uri);
    return uri;
}; 