import { images } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { cacheService } from '@/utils/cacheService';
import { ProfileService } from '@/utils/profileService';
import { useCallback, useEffect, useState } from 'react';

export interface OptimizedUserAvatarData {
  uri?: string;
  source: any; // For Image component source prop
  isLoading: boolean;
  error?: string;
  refresh: () => void; // Function to manually refresh the avatar
  cacheHit: boolean; // Indicates if data came from cache
}

export const useOptimizedUserAvatar = (): OptimizedUserAvatarData => {
  const { user } = useAuth();
  const [avatarData, setAvatarData] = useState<{
    uri?: string;
    source: any;
    isLoading: boolean;
    error?: string;
    cacheHit: boolean;
  }>({
    source: images.user1, // Start with fallback but don't show it immediately
    isLoading: true,
    cacheHit: false,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const loadUserAvatarOptimized = async () => {
      if (!user) {
        console.log('No user found, using fallback image');
        setAvatarData({
          source: images.user1,
          isLoading: false,
          cacheHit: false,
        });
        return;
      }

      try {
        // 🚀 OPTIMIZED: Use cache service for instant avatar loading
        const cacheKey = `user_avatar:${user.id}`;
        
        const avatarResult = await cacheService.get(
          cacheKey,
          async () => {
            console.log('🔄 Loading avatar from database for user:', user.id);
            
            // Try to get profile from database
            const profileResponse = await ProfileService.getProfile(user.id);
            
            if (profileResponse.success && profileResponse.data?.avatar_url) {
              console.log('✅ Found avatar URL:', profileResponse.data.avatar_url);
              
              // Verify the URL is accessible
              try {
                const testResponse = await fetch(profileResponse.data.avatar_url, { method: 'HEAD' });
                if (testResponse.ok) {
                  return {
                    uri: profileResponse.data.avatar_url,
                    source: { uri: profileResponse.data.avatar_url },
                    type: 'profile'
                  };
                } else {
                  console.warn('Avatar URL not accessible:', profileResponse.data.avatar_url);
                }
              } catch (urlError) {
                console.warn('Error testing avatar URL:', urlError);
              }
            }

            // Fallback to user metadata avatar
            if (user.user_metadata?.avatar_url) {
              console.log('Using user metadata avatar_url:', user.user_metadata.avatar_url);
              return {
                uri: user.user_metadata.avatar_url,
                source: { uri: user.user_metadata.avatar_url },
                type: 'metadata'
              };
            }

            // Final fallback to static image
            console.log('Using fallback static image');
            return {
              source: images.user1,
              type: 'fallback'
            };
          },
          { 
            forceRefresh: refreshTrigger > 0,
            ttl: 10 * 60 * 1000 // 10 minutes cache for avatars
          }
        );

        // Check if this was a cache hit
        const stats = cacheService.getStats();
        const wasCacheHit = stats.hits > 0;

                 if (wasCacheHit) {
           console.log('⚡ Avatar loaded from cache instantly');
         }

         setAvatarData({
           uri: avatarResult.uri,
           source: avatarResult.source || images.user1,
           isLoading: false,
           cacheHit: wasCacheHit,
         });

      } catch (error: any) {
        console.error('Error loading user avatar:', error);
        setAvatarData({
          source: images.user1,
          isLoading: false,
          error: error.message,
          cacheHit: false,
        });
      }
    };

    loadUserAvatarOptimized();
  }, [user, refreshTrigger]);

  return {
    ...avatarData,
    refresh,
  };
};

// Optimized hook for getting any user's avatar by ID
export const useOptimizedUserAvatarById = (userId?: string): OptimizedUserAvatarData => {
  const [avatarData, setAvatarData] = useState<{
    uri?: string;
    source: any;
    isLoading: boolean;
    error?: string;
    cacheHit: boolean;
  }>({
    source: images.user1,
    isLoading: true,
    cacheHit: false,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const loadUserAvatarOptimized = async () => {
      if (!userId) {
        setAvatarData({
          source: images.user1,
          isLoading: false,
          cacheHit: false,
        });
        return;
      }

      try {
        // 🚀 OPTIMIZED: Use cache service for instant avatar loading
        const cacheKey = `user_avatar:${userId}`;
        
        const avatarResult = await cacheService.get(
          cacheKey,
          async () => {
            const profileResponse = await ProfileService.getProfile(userId);
            
            if (profileResponse.success && profileResponse.data?.avatar_url) {
              return {
                uri: profileResponse.data.avatar_url,
                source: { uri: profileResponse.data.avatar_url },
                type: 'profile'
              };
            } else {
              return {
                source: images.user1,
                type: 'fallback'
              };
            }
          },
          { 
            forceRefresh: refreshTrigger > 0,
            ttl: 10 * 60 * 1000 // 10 minutes cache
          }
        );

        const stats = cacheService.getStats();
        const wasCacheHit = stats.hits > 0;

        setAvatarData({
          ...avatarResult,
          isLoading: false,
          cacheHit: wasCacheHit,
        });

      } catch (error: any) {
        console.error('Error loading user avatar by ID:', error);
        setAvatarData({
          source: images.user1,
          isLoading: false,
          error: error.message,
          cacheHit: false,
        });
      }
    };

    loadUserAvatarOptimized();
  }, [userId, refreshTrigger]);

  return {
    ...avatarData,
    refresh,
  };
};

// Hook to preload and cache user avatar
export const useAvatarPreloader = () => {
  const { user } = useAuth();

  const preloadAvatar = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const cacheKey = `user_avatar:${targetUserId}`;
    
    // Preload avatar data into cache
    await cacheService.get(
      cacheKey,
      async () => {
        const profileResponse = await ProfileService.getProfile(targetUserId);
        
        if (profileResponse.success && profileResponse.data?.avatar_url) {
          return {
            uri: profileResponse.data.avatar_url,
            source: { uri: profileResponse.data.avatar_url },
            type: 'profile'
          };
        }
        
        return {
          source: images.user1,
          type: 'fallback'
        };
      },
      { ttl: 10 * 60 * 1000 }
    );

    console.log('🔄 Avatar preloaded for user:', targetUserId);
  }, [user?.id]);

  const invalidateAvatar = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const cacheKey = `user_avatar:${targetUserId}`;
    await cacheService.invalidate(cacheKey);
    console.log('🗑️ Avatar cache invalidated for user:', targetUserId);
  }, [user?.id]);

  return {
    preloadAvatar,
    invalidateAvatar,
  };
}; 