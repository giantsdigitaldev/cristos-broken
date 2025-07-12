import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const AVATAR_STORAGE_KEY = (userId: string) => `user_avatar_uri:${userId}`;
const AVATAR_LOCAL_DIR = FileSystem.documentDirectory + 'avatars/';

export async function pickAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0].uri;
  }
  return null;
}

export async function saveAvatarLocally(userId: string, imageUri: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(AVATAR_LOCAL_DIR, { intermediates: true }).catch(() => {});
  const fileExt = imageUri.split('.').pop() || 'jpg';
  const localPath = `${AVATAR_LOCAL_DIR}${userId}.${fileExt}`;
  await FileSystem.copyAsync({ from: imageUri, to: localPath });
  await AsyncStorage.setItem(AVATAR_STORAGE_KEY(userId), localPath);
  return localPath;
}

export async function getLocalAvatarUri(userId: string): Promise<string | null> {
  const uri = await AsyncStorage.getItem(AVATAR_STORAGE_KEY(userId));
  if (uri) {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) return uri;
    // If file doesn't exist, remove stale entry
    await AsyncStorage.removeItem(AVATAR_STORAGE_KEY(userId));
  }
  return null;
}

export async function uploadAvatarToSupabase(userId: string, localUri: string): Promise<string | null> {
  const fileExt = localUri.split('.').pop() || 'jpg';
  const fileName = `profile-${userId}-${Date.now()}.${fileExt}`;
  const fileData = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
  const { data, error } = await supabase.storage
    .from('user-content')
    .upload(`$ {userId}/avatars/${fileName}`, Buffer.from(fileData, 'base64'), {
      contentType,
      upsert: true,
    });
  if (error) {
    console.error('Supabase upload error:', error);
    return null;
  }
  // Get public URL
  const { data: publicUrlData } = supabase.storage.from('user-content').getPublicUrl(`${userId}/avatars/${fileName}`);
  return publicUrlData?.publicUrl || null;
}

export async function syncAvatar(userId: string, localUri: string): Promise<string | null> {
  // Upload to Supabase
  const supabaseUrl = await uploadAvatarToSupabase(userId, localUri);
  if (supabaseUrl) {
    // Update user profile with new avatar_url
    await supabase.from('profiles').update({ avatar_url: supabaseUrl }).eq('id', userId);
  }
  return supabaseUrl;
}

export async function getAvatarUri(userId: string, supabaseAvatarUrl?: string): Promise<string | null> {
  // Prefer local
  const localUri = await getLocalAvatarUri(userId);
  if (localUri) return localUri;
  // If not found locally, try Supabase
  if (supabaseAvatarUrl) {
    // Download and cache locally
    try {
      await FileSystem.makeDirectoryAsync(AVATAR_LOCAL_DIR, { intermediates: true }).catch(() => {});
      const fileExt = supabaseAvatarUrl.split('.').pop() || 'jpg';
      const localPath = `${AVATAR_LOCAL_DIR}${userId}.${fileExt}`;
      const downloadRes = await FileSystem.downloadAsync(supabaseAvatarUrl, localPath);
      if (downloadRes.status === 200) {
        await AsyncStorage.setItem(AVATAR_STORAGE_KEY(userId), localPath);
        return localPath;
      }
    } catch (e) {
      console.warn('Failed to cache Supabase avatar locally:', e);
    }
    return supabaseAvatarUrl;
  }
  return null;
} 