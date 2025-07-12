import { COLORS } from '@/constants';
import { useUserAvatar, useUserAvatarById } from '@/hooks/useUserAvatar';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

interface UserAvatarProps {
  size?: number;
  userId?: string; // If provided, will fetch avatar for specific user ID
  style?: any;
  borderRadius?: number;
  showLoading?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 48,
  userId,
  style,
  borderRadius,
  showLoading = false,
}) => {
  // Use appropriate hook based on whether userId is provided
  const currentUserAvatar = useUserAvatar();
  const specificUserAvatar = useUserAvatarById(userId);
  
  const avatarData = userId ? specificUserAvatar : currentUserAvatar;
  
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: borderRadius !== undefined ? borderRadius : size / 2,
  };

  if (showLoading && avatarData.isLoading) {
    return (
      <View style={[avatarStyle, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Image
      source={avatarData.source}
      style={[avatarStyle, style]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: COLORS.grayscale200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserAvatar; 