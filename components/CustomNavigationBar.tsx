import { COLORS, FONTS, icons } from '@/constants';
import { useAddProjectModal } from '@/contexts/AddProjectModalContext';
import { useTheme } from '@/theme/ThemeProvider';
import { AntDesign } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
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

// Props for the CustomNavigationBar
type CustomNavigationBarProps = {
  activeTab?: string; // Which tab should be highlighted as active
};

// Memoized tab icon component - EXACT match with main layout
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
    marginTop: 2,
  }), [focused, dark]);

  // EXACT match with main layout - width calculated for 4 tabs only
  const containerStyle = useMemo(() => ({
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    height: '100%' as const,
  }), []);

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress}>
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

// Memoized floating action button - EXACT match with main layout
const FloatingActionButton = React.memo(({ onPress }: { onPress: () => void }) => {
  const buttonStyle = useMemo(() => ({
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    // Adding shadow to match expo-router's style
    elevation: 8,
    marginTop: -11,
  }), [])

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress}>
      <AntDesign name="plus" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );
});
FloatingActionButton.displayName = 'FloatingActionButton';

const CustomNavigationBar: React.FC<CustomNavigationBarProps> = ({ 
  activeTab = 'home' 
}) => {
  const { dark } = useTheme();
  const { showModal } = useAddProjectModal();
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();

  // Tab configuration - matches the main layout exactly
  const tabs: TabConfig[] = [
    {
      id: 'home',
      activeIcon: icons.home,
      inactiveIcon: icons.home2Outline,
      label: 'Home',
      route: '(tabs)',
      screen: 'index'
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

  // Tab bar style - EXACT match with main layout + HIGH Z-INDEX for visibility above modals
  const tabBarStyle = useMemo(() => ({
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    left: 0,
    elevation: 1000, // HIGH elevation for Android
    zIndex: 1000, // HIGH z-index for iOS
    height: Platform.OS === 'ios' ? 90 : 60,
    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
    // Add stronger shadow for visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 1,
    borderTopColor: dark ? 'rgba(45, 45, 45, 0.8)' : 'rgba(229, 229, 229, 0.8)',
    // Ensure it's always visible above modals
    paddingBottom: insets.bottom,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-around' as const,
  }), [dark, insets.bottom]);

  // Navigation handlers
  const handleTabPress = (tab: TabConfig) => {
    if (tab.screen) {
      navigation.navigate(tab.route, { screen: tab.screen });
    } else {
      navigation.navigate(tab.route);
    }
  };

  const handlePlusPress = () => {
    showModal();
  };

  // Calculate positions to match expo-router tab behavior
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);

  return (
    <View style={tabBarStyle}>
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
      }}>
        <FloatingActionButton onPress={handlePlusPress} />
      </View>
      
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

export default CustomNavigationBar; 