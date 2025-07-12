import LogoutConfirmationModal from '@/components/LogoutConfirmationModal';
import OptimizedUserAvatar, { useAvatarCache } from '@/components/OptimizedUserAvatar';
import ProfileImageModal from '@/components/ProfileImageModal';
import SettingsItem from '@/components/SettingsItem';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileService } from '@/utils/profileService';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav = {
  navigate: (value: string) => void
}

const Profile = () => {
  const { dark, colors, setScheme } = useTheme();
  const { navigate } = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { invalidateAvatar } = useAvatarCache();
  
  const [avatarKey, setAvatarKey] = useState(0);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Debug logging for logout functionality
  React.useEffect(() => {
    console.log('🏠 Profile component mounted');
  }, []);

  /**
   * Render header
   */

  const renderHeader = () => {
    return (
      <TouchableOpacity style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Image
            source={images.logo}
            resizeMode='contain'
            style={styles.logo}
          />
          <Text style={[styles.headerTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Profile</Text>
        </View>
        <TouchableOpacity>
          <Image
            source={icons.moreCircle}
            resizeMode='contain'
            style={[styles.headerIcon, {
              tintColor: dark ? COLORS.secondaryWhite : COLORS.greyscale900
            }]}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }
  /**
   * Render User Profile
   */
  // Function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleImageSelected = async (result: { success: boolean; url?: string; error?: string }) => {
    if (result.success && result.url) {
      try {
        if (user && user.id) {
          // Update profile with new avatar URL
          const updateResult = await ProfileService.updateProfile({ avatar_url: result.url });
          
          if (updateResult.success) {
            // Store in profile avatar cache for instant display
            await AsyncStorage.setItem(`profile_avatar_url:${user.id}`, result.url);
            setAvatarKey(prev => prev + 1);
            // Invalidate cache to force fresh load everywhere
            await invalidateAvatar(user.id);
            Alert.alert('Success', 'Profile image updated successfully!');
          } else {
            Alert.alert('Warning', 'Image uploaded but failed to save to profile database.');
          }
        }
      } catch {
        Alert.alert('Error', 'Failed to update profile image.');
      }
    } else if (result.error) {
      Alert.alert('Error', result.error || 'Failed to upload image.');
    }
  };

  const renderProfile = () => {

    // Use real user data from Supabase
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
    const firstName = user?.user_metadata?.first_name || fullName.split(' ')[0] || user?.email?.split('@')[0] || 'User';
    const userName = fullName || user?.email?.split('@')[0] || 'User';
    const userEmail = user?.email || 'No email available';
    const greeting = getTimeBasedGreeting();

    return (
      <View style={styles.profileContainer}>
        {/* Personalized Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={[styles.greetingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {greeting}, {firstName}!
          </Text>
          <Text style={[styles.greetingSubtext, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
            Welcome to your profile
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => {
            console.log('🖼️ Profile image tapped, opening modal...');
            setShowAvatarModal(true);
          }} 
          style={{ alignSelf: 'center' }} 
          activeOpacity={0.8}
        >
          <View>
            <OptimizedUserAvatar
              key={avatarKey}
              size={120}
              style={styles.avatar}
              showLoading={true}
              showCacheIndicator={false}
            />
            <View style={styles.picContainer} pointerEvents="none">
              <MaterialIcons name="edit" size={16} color={COLORS.white} />
            </View>
          </View>
        </TouchableOpacity>
        <Text style={[styles.title, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{userName}</Text>
        <Text style={[styles.subtitle, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{userEmail}</Text>
        
        {/* Profile Image Modal */}
        <ProfileImageModal
          visible={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onImageSelected={handleImageSelected}
          userId={user?.id || ''}
        />
      </View>
    )
  }

  const handleSignOut = async () => {
    console.log('🚀 handleSignOut called');
    setIsSigningOut(true);
    console.log('📊 isSigningOut set to true');
    
    try {
      console.log('🔐 Calling signOut from AuthContext...');
      const result = await signOut();
      console.log('📋 signOut result:', result);
      
      if (result.success) {
        console.log('✅ Sign out successful, clearing cache...');
        // Clear any cached data
        try {
          const { cacheService } = await import('@/utils/cacheService');
          await cacheService.clear();
          console.log('🗑️ Cache cleared successfully');
        } catch (cacheError) {
          console.warn('⚠️ Failed to clear cache:', cacheError);
        }
        
        // Navigate to login screen
        console.log('🧭 Navigating to login screen...');
        navigate('login');
        console.log('✅ User signed out successfully and redirected to login');
      } else {
        console.error('❌ Sign out failed:', result.error);
        Alert.alert('Sign Out Error', result.error || 'Failed to sign out');
        setIsSigningOut(false);
      }
    } catch (error: any) {
      console.error('💥 Sign out exception:', error);
      Alert.alert('Sign Out Error', error.message || 'An unexpected error occurred');
      setIsSigningOut(false);
    }
  };

  /**
   * Render Settings
   */

  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    if (dark) {
      setScheme('light');
    } else {
      setScheme('dark');
    }
  };

  const renderSettings = () => {
    // Render settings section
    return (
      <View style={styles.settingsContainer}>
        <SettingsItem
          icon={icons.userOutline}
          name="Edit Profile"
          onPress={() => navigate("editprofile")}
        />
        <SettingsItem
          icon={icons.bell2}
          name="Notifications"
          onPress={() => navigate("settingsnotifications")}
        />

        <SettingsItem
          icon={icons.shieldOutline}
          name="Security"
          onPress={() => navigate("settingssecurity")}
        />
        <TouchableOpacity
          onPress={() => navigate("settingslanguage")}
          style={styles.settingsItemContainer}>
          <View style={styles.leftContainer}>
            <Image
              source={icons.more}
              resizeMode='contain'
              style={[styles.settingsIcon, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]}
            />
            <Text style={[styles.settingsName, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Language & Region</Text>
          </View>
          <View style={styles.rightContainer}>
            <Text style={[styles.rightLanguage, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>English (US)</Text>
            <Image
              source={icons.arrowRight}
              resizeMode='contain'
              style={[styles.settingsArrowRight, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsItemContainer}>
          <View style={styles.leftContainer}>
            <Image
              source={icons.show}
              resizeMode='contain'
              style={[styles.settingsIcon, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]}
            />
            <Text style={[styles.settingsName, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Dark Mode</Text>
          </View>
          <View style={styles.rightContainer}>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              thumbColor={isDarkMode ? '#fff' : COLORS.white}
              trackColor={{ false: '#EEEEEE', true: COLORS.primary }}
              ios_backgroundColor={COLORS.white}
              style={styles.switch}
            />
          </View>
        </TouchableOpacity>
        <SettingsItem
          icon={icons.lockedComputerOutline}
          name="Privacy Policy"
          onPress={() => navigate("settingsprivacypolicy")}
        />
        <SettingsItem
          icon={icons.infoCircle}
          name="Help Center"
          onPress={() => navigate("settingshelpcenter")}
        />
        <SettingsItem
          icon={icons.chatBubble}
          name="Feedback"
          onPress={() => navigate("feedback")}
        />
        <SettingsItem
          icon={icons.people4}
          name="Invite Friends"
          onPress={() => navigate("settingsinvitefriends")}
        />

        <TouchableOpacity
          onPress={() => {
            console.log('🔴 Logout button pressed!');
            if (isSigningOut) {
              console.log('⚠️ Already signing out, ignoring tap');
              return;
            }
            console.log('📱 Showing custom logout confirmation modal');
            setShowLogoutModal(true);
          }}
          disabled={isSigningOut}
          style={{
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderWidth: 2,
            borderColor: 'red',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            marginBottom: 20,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            minHeight: 50
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Image
            source={icons.logout}
            resizeMode='contain'
            style={{
              width: 24,
              height: 24,
              tintColor: "red",
              marginRight: 12
            }}
          />
          <Text style={{
            color: "red",
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'semiBold'
          }}>{isSigningOut ? 'Signing Out...' : 'Logout'}</Text>
        </TouchableOpacity>
      </View>
    )
  }
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          >
          {renderProfile()}
          {renderSettings()}
        </ScrollView>
      </View>
      
      {/* Custom Logout Confirmation Modal */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          console.log('✅ Logout confirmed via custom modal, calling handleSignOut');
          setShowLogoutModal(false);
          handleSignOut();
        }}
        isLoading={isSigningOut}
      />
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90 // Account for tab bar height
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  logo: {
    height: 32,
    width: 32,
    tintColor: COLORS.primary
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginLeft: 12
  },
  headerIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  profileContainer: {
    alignItems: "center",
    borderBottomColor: COLORS.grayscale400,
    borderBottomWidth: .4,
    paddingVertical: 20
  },
  greetingContainer: {
    alignItems: "center",
    marginBottom: 20
  },
  greetingText: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    textAlign: "center"
  },
  greetingSubtext: {
    fontSize: 16,
    fontFamily: "medium",
    color: COLORS.grayscale700,
    textAlign: "center",
    marginTop: 4
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 999
  },
  picContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    position: "absolute",
    right: 0,
    bottom: 12
  },
  title: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginTop: 12
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.greyscale900,
    fontFamily: "medium",
    marginTop: 4
  },
  settingsContainer: {
    marginVertical: 12
  },
  settingsItemContainer: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  settingsName: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginLeft: 12
  },
  settingsArrowRight: {
    width: 24,
    height: 24,
    tintColor: COLORS.greyscale900
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  rightLanguage: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginRight: 8
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: .8 }, { scaleY: .8 }], // Adjust the size of the switch
  },
  logoutContainer: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginVertical: 12,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  logoutLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  logoutName: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginLeft: 12
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32
  },
  logoutButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: "red",
    textAlign: "center",
    marginTop: 12
  },
  bottomSubtitle: {
    fontSize: 20,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 28
  },
  separateLine: {
    width: SIZES.width,
    height: 1,
    backgroundColor: COLORS.grayscale200,
    marginTop: 12
  }
})

export default Profile