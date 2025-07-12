import { COLORS, FONTS, icons } from '@/constants';
import { useAddProjectModal } from '@/contexts/AddProjectModalContext';
import { useTheme } from '@/theme/ThemeProvider';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define the tab configuration
type TabConfig = {
  id: string;
  activeIcon: any;
  inactiveIcon: any;
  label: string;
  route: string;
  screen?: string;
};

// Props for the TabBar component
type TabBarProps = {
  activeTab?: string; // Which tab should be highlighted as active
};

// Memoized tab icon component with consistent styling
const TabIcon = React.memo(({ 
  focused, 
  activeIcon, 
  inactiveIcon, 
  label, 
  dark,
  onPress 
}: {
  focused: boolean;
  activeIcon: any;
  inactiveIcon: any;
  label: string;
  dark: boolean;
  onPress: () => void;
}) => {
  const iconStyle = useMemo(() => ({
    width: 24,
    height: 24,
    tintColor: focused ? COLORS.primary : (dark ? COLORS.gray3 : COLORS.gray3),
  }), [focused, dark]);

  const textStyle = useMemo(() => ({
    ...FONTS.body4,
    color: focused ? COLORS.primary : (dark ? COLORS.gray3 : COLORS.gray3),
    marginTop: 4,
    textAlign: 'center' as const,
  }), [focused, dark]);

  // Consistent container styling with proper flex layout
  const containerStyle = useMemo(() => ({
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 50,
  }), []);

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={focused ? activeIcon : inactiveIcon}
        resizeMode="contain"
        style={iconStyle}
      />
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
});
TabIcon.displayName = 'TabIcon';

// Memoized floating action button with consistent positioning
const FloatingActionButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const buttonStyle = useMemo(() => ({
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    // Consistent shadow styling
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
    // Position the button to overlap the tab bar slightly
    marginTop: -15,
  }), [])

  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <AntDesign name="plus" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );
});
FloatingActionButton.displayName = 'FloatingActionButton';

const TabBar: React.FC<TabBarProps> = ({ 
  activeTab = 'home' 
}) => {
  const { dark } = useTheme();
  const { showModal } = useAddProjectModal();
  const insets = useSafeAreaInsets();

  // Tab configuration - matches the main layout exactly
  const tabs: TabConfig[] = [
    {
      id: 'home',
      activeIcon: icons.home,
      inactiveIcon: icons.home2Outline,
      label: 'Home',
      route: '/',
      screen: undefined
    },
    {
      id: 'projects',
      activeIcon: icons.document2,
      inactiveIcon: icons.document2Outline,
      label: 'Projects',
      route: '(tabs)',
      screen: 'projects'
    },
    {
      id: 'feedback',
      activeIcon: icons.chat,
      inactiveIcon: icons.chatBubble2Outline,
      label: 'Feedback',
      route: '(tabs)',
      screen: 'feedback'
    },
    {
      id: 'profile',
      activeIcon: icons.user,
      inactiveIcon: icons.userOutline,
      label: 'Profile',
      route: '(tabs)',
      screen: 'profile'
    }
  ];

  // Unified tab bar style with consistent theming and positioning
  const tabBarStyle = useMemo(() => ({
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    left: 0,
    elevation: 1000, // High elevation for Android
    zIndex: 1000, // High z-index for iOS
    height: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
    // Consistent shadow styling
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 1,
    borderTopColor: dark ? 'rgba(45, 45, 45, 0.8)' : 'rgba(229, 229, 229, 0.8)',
    // Safe area handling
    paddingBottom: insets.bottom,
    // Flex layout for consistent spacing
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-around' as const,
  }), [dark, insets.bottom]);

  // Navigation handlers
  const handleTabPress = (tab: TabConfig) => {
    if (tab.id === 'home') {
      // Navigate to the actual homepage in tabs
      router.push('/(tabs)/' as any);
    } else if (tab.screen) {
      router.push(`/(tabs)/${tab.screen}` as any);
    } else {
      router.push(`/${tab.route}` as any);
    }
  };

  const handlePlusPress = () => {
    showModal();
  };

  // Split tabs for proper layout around the floating action button
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);

  return (
    <View style={tabBarStyle}>
      {/* Left side tabs */}
      {leftTabs.map((tab) => (
        <TabIcon
          key={tab.id}
          focused={activeTab === tab.id}
          activeIcon={tab.activeIcon}
          inactiveIcon={tab.inactiveIcon}
          label={tab.label}
          dark={dark}
          onPress={() => handleTabPress(tab)}
        />
      ))}
      
      {/* Floating Action Button - Centered */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 8 : 4,
      }}>
        <FloatingActionButton onPress={handlePlusPress} />
      </View>
      
      {/* Right side tabs */}
      {rightTabs.map((tab) => (
        <TabIcon
          key={tab.id}
          focused={activeTab === tab.id}
          activeIcon={tab.activeIcon}
          inactiveIcon={tab.inactiveIcon}
          label={tab.label}
          dark={dark}
          onPress={() => handleTabPress(tab)}
        />
      ))}
    </View>
  );
};

export default TabBar; 