import { images } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import {
    getAvatarUri,
    pickAvatar,
    saveAvatarLocally,
    syncAvatar as syncAvatarUtil,
} from '@/utils/avatarStorage';
import { ProfileService } from '@/utils/profileService';
import { useCallback, useEffect, useState } from 'react';

export interface UserAvatarData {
  uri?: string;
  source: any; // For Image component source prop
  isLoading: boolean;
  error?: string;
  refresh: () => void; // Function to manually refresh the avatar
  pickAndSaveAvatar?: () => Promise<void>; // New: pick and save avatar
  syncAvatar?: () => Promise<void>; // New: sync avatar to Supabase
}

export const useUserAvatar = (): UserAvatarData => {
  const { user } = useAuth();
  const [avatarData, setAvatarData] = useState<{
    uri?: string;
    source: any;
    isLoading: boolean;
    error?: string;
  }>({
    source: images.user1, // Default fallback
    isLoading: true,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Pick and save avatar locally
  const pickAndSaveAvatar = useCallback(async () => {
    if (!user) return;
    const pickedUri = await pickAvatar();
    if (pickedUri) {
      const localUri = await saveAvatarLocally(user.id, pickedUri);
      setAvatarData({
        uri: localUri,
        source: { uri: localUri },
        isLoading: false,
      });
    }
  }, [user]);

  // Sync avatar to Supabase
  const syncAvatar = useCallback(async () => {
    if (!user) return;
    const localUri = await getAvatarUri(user.id, user.user_metadata?.avatar_url);
    if (localUri) {
      await syncAvatarUtil(user.id, localUri);
    }
  }, [user]);

  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!user) {
        setAvatarData({
          source: images.user1,
          isLoading: false,
        });
        return;
      }
      setAvatarData(prev => ({ ...prev, isLoading: true }));
      try {
        // Try to get avatar from local storage first, else Supabase
        const profileResponse = await ProfileService.getProfile(user.id);
        const supabaseAvatarUrl = profileResponse.success && profileResponse.data?.avatar_url
          ? profileResponse.data.avatar_url
          : user.user_metadata?.avatar_url;
        const uri = await getAvatarUri(user.id, supabaseAvatarUrl);
        if (uri) {
          setAvatarData({
            uri,
            source: { uri },
            isLoading: false,
          });
        } else {
          setAvatarData({
            source: images.user1,
            isLoading: false,
          });
        }
      } catch (error: any) {
        setAvatarData({
          source: images.user1,
          isLoading: false,
          error: error.message,
        });
      }
    };
    loadUserAvatar();
  }, [user, refreshTrigger]);

  return {
    ...avatarData,
    refresh,
    pickAndSaveAvatar,
    syncAvatar,
  };
};

// Hook for getting any user's avatar by ID (for team members, etc.)
export const useUserAvatarById = (userId?: string): UserAvatarData => {
  const [avatarData, setAvatarData] = useState<{
    uri?: string;
    source: any;
    isLoading: boolean;
    error?: string;
  }>({
    source: images.user1, // Default fallback
    isLoading: true,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // UUID validation function
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!userId || !isValidUUID(userId)) {
        setAvatarData({
          source: images.user1,
          isLoading: false,
        });
        return;
      }
      setAvatarData(prev => ({ ...prev, isLoading: true }));
      try {
        const profileResponse = await ProfileService.getProfile(userId);
        const supabaseAvatarUrl = profileResponse.success && profileResponse.data?.avatar_url
          ? profileResponse.data.avatar_url
          : undefined;
        const uri = await getAvatarUri(userId, supabaseAvatarUrl);
        if (uri) {
          setAvatarData({
            uri,
            source: { uri },
            isLoading: false,
          });
        } else {
          setAvatarData({
            source: images.user1,
            isLoading: false,
          });
        }
      } catch (error: any) {
        setAvatarData({
          source: images.user1,
          isLoading: false,
          error: error.message,
        });
      }
    };
    loadUserAvatar();
  }, [userId, refreshTrigger]);

  return {
    ...avatarData,
    refresh,
  };
}; 