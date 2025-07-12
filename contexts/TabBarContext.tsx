import React, { createContext, useContext, useRef } from 'react';
import { Animated } from 'react-native';

interface TabBarContextType {
  tabBarTranslateY: Animated.Value;
  showTabBar: () => void;
  hideTabBar: () => void;
  handleScroll: (...args: any[]) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const useTabBar = (): TabBarContextType => {
  const context = useContext(TabBarContext);
  if (!context) {
    throw new Error('useTabBar must be used within a TabBarProvider');
  }
  return context;
};

interface TabBarProviderProps {
  children: React.ReactNode;
}

export const TabBarProvider: React.FC<TabBarProviderProps> = ({ children }) => {
  // Keep tab bar always visible - no animation
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  const showTabBar = () => {
    // Tab bar is always visible, no need to animate
    Animated.timing(tabBarTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideTabBar = () => {
    // Tab bar stays visible, no hiding functionality
    Animated.timing(tabBarTranslateY, {
      toValue: 0, // Changed from 100 to 0 - don't hide
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // No-op scroll handler - tab bar stays visible regardless of scroll
  const handleScroll = () => {
    // Removed scroll-based hiding logic
    // Tab bar remains visible at all times
  };

  const value: TabBarContextType = {
    tabBarTranslateY,
    showTabBar,
    hideTabBar,
    handleScroll,
  };

  return (
    <TabBarContext.Provider value={value}>
      {children}
    </TabBarContext.Provider>
  );
}; 