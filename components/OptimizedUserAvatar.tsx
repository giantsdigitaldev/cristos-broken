import { COLORS, images } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { cacheService } from '@/utils/cacheService';
import { ProfileService } from '@/utils/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

interface OptimizedUserAvatarProps {
  size?: number;
  userId?: string; // If provided, will fetch avatar for specific user ID
  style?: any;
  borderRadius?: number;
  showLoading?: boolean;
  showCacheIndicator?: boolean; // Show ⚡ when loaded from cache
}

const OptimizedUserAvatar: React.FC<OptimizedUserAvatarProps> = ({
  size = 48,
  userId,
  style,
  borderRadius,
  showLoading = false,
  showCacheIndicator = false,
}) => {
  const { user } = useAuth();
  const [avatarState, setAvatarState] = useState<{
    source: any;
    isLoading: boolean;
    cacheHit: boolean;
    error?: string;
  }>({
    source: null, // Start with null to prevent flash
    isLoading: true,
    cacheHit: false,
  });

  const targetUserId = userId || user?.id;

  const loadAvatar = useCallback(async (forceReload = false) => {
    if (!targetUserId) {
      setAvatarState({
        source: images.user1,
        isLoading: false,
        cacheHit: false,
      });
      return;
    }

    // 1. Check AsyncStorage for a local avatar URI for this user
    const localAvatarKey = `profile_avatar_url:${targetUserId}`;
    const localAvatarUri = await AsyncStorage.getItem(localAvatarKey);
    if (localAvatarUri && !forceReload) {
      setAvatarState({
        source: { uri: localAvatarUri },
        isLoading: false,
        cacheHit: true,
      });
      return;
    }

    try {
      // 🚀 OPTIMIZED: Use cache service for instant avatar loading
      const cacheKey = `user_avatar:${targetUserId}`;
      
      // If forceReload is true, skip cache and reload from database
      const avatarResult = await cacheService.get(
        cacheKey,
        async () => {
          console.log('🔄 Loading avatar from database for user:', targetUserId);
          
          const profileResponse = await ProfileService.getProfile(targetUserId);
          
          if (profileResponse.success && profileResponse.data?.avatar_url) {
            console.log('✅ Found avatar URL:', profileResponse.data.avatar_url);
            
            // Cache the avatar URL in AsyncStorage for instant future access
            await AsyncStorage.setItem(localAvatarKey, profileResponse.data.avatar_url);
            
            // Verify the URL is accessible
            try {
              const testResponse = await fetch(profileResponse.data.avatar_url, { method: 'HEAD' });
              if (testResponse.ok) {
                return { uri: profileResponse.data.avatar_url };
              }
            } catch (urlError) {
              console.warn('Error testing avatar URL:', urlError);
              // Still return the URL even if test fails - it might work in the app
              return { uri: profileResponse.data.avatar_url };
            }
          }

          // Fallback to user metadata avatar (for current user)
          if (!userId && user?.user_metadata?.avatar_url) {
            await AsyncStorage.setItem(localAvatarKey, user.user_metadata.avatar_url);
            return { uri: user.user_metadata.avatar_url };
          }

          // Final fallback - only use template image if no user avatar exists
          return { fallback: true };
        },
        { 
          ttl: 10 * 60 * 1000, // 10 minutes cache for avatars
          forceRefresh: forceReload // Skip cache if forceReload is true
        }
      );

      // Check if this was a cache hit for performance monitoring
      const stats = cacheService.getStats();
      const wasCacheHit = stats.hits > 0 && !forceReload;

      if (wasCacheHit) {
        console.log('⚡ Avatar loaded from cache instantly');
      } else if (forceReload) {
        console.log('🔄 Avatar force reloaded from database');
      }

      // 🚀 CRITICAL: Prioritize user-uploaded avatars over template images
      if (avatarResult?.uri) {
        // User has uploaded their own avatar - use it
        setAvatarState({
          source: { uri: avatarResult.uri },
          isLoading: false,
          cacheHit: wasCacheHit,
        });
      } else {
        // No user avatar found - use template image as fallback
        setAvatarState({
          source: images.user1,
          isLoading: false,
          cacheHit: wasCacheHit,
        });
      }

    } catch (error: any) {
      console.error('Error loading optimized avatar:', error);
      setAvatarState({
        source: images.user1,
        isLoading: false,
        cacheHit: false,
        error: error.message,
      });
    }
  }, [targetUserId, user?.user_metadata?.avatar_url, userId]);

  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: borderRadius !== undefined ? borderRadius : size / 2,
  };

  // Show loading spinner only if explicitly requested and still loading
  if (showLoading && avatarState.isLoading) {
    return (
      <View style={[avatarStyle, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  // Don't render anything until we have a source (prevents flash)
  if (!avatarState.source) {
    return (
      <View style={[avatarStyle, styles.loadingContainer, style]}>
        {showLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
    );
  }

  return (
    <View style={[style]}>
      <Image
        source={avatarState.source}
        style={avatarStyle}
        resizeMode="cover"
      />
      {/* Optional cache indicator */}
      {showCacheIndicator && avatarState.cacheHit && (
        <View style={styles.cacheIndicator}>
          <Text style={styles.cacheText}>⚡</Text>
        </View>
      )}
    </View>
  );
};

// Hook for manual avatar cache management
export const useAvatarCache = () => {
  const { user } = useAuth();

  const invalidateAvatar = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const cacheKey = `user_avatar:${targetUserId}`;
    await cacheService.invalidate(cacheKey);
    console.log('🗑️ Avatar cache invalidated for user:', targetUserId);
  }, [user?.id]);

  const preloadAvatar = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const cacheKey = `user_avatar:${targetUserId}`;
    
    await cacheService.get(
      cacheKey,
      async () => {
        const profileResponse = await ProfileService.getProfile(targetUserId);
        
        if (profileResponse.success && profileResponse.data?.avatar_url) {
          return { uri: profileResponse.data.avatar_url };
        }
        
        return { fallback: true };
      },
      { ttl: 10 * 60 * 1000 }
    );

    console.log('🔄 Avatar preloaded for user:', targetUserId);
  }, [user?.id]);

  return {
    invalidateAvatar,
    preloadAvatar,
  };
};

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: COLORS.grayscale200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cacheIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cacheText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default OptimizedUserAvatar; 