import { ProtectedRoute } from "@/components/AuthGuard";
import TabBar from "@/components/TabBar";
import { TabBarProvider } from "@/contexts/TabBarContext";
import { useTheme } from "@/theme/ThemeProvider";
import { Slot, usePathname } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";

const TabsContent = React.memo(() => {
  const { dark, isThemeReady } = useTheme();
  const pathname = usePathname();

  // Determine active tab based on current pathname
  const activeTab = useMemo(() => {
    if (pathname === '/' || pathname.includes('/index') || pathname === '/(tabs)') return 'home';
    if (pathname.includes('/projects')) return 'projects';
    if (pathname.includes('/feedback')) return 'feedback';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  }, [pathname]);

  if (!isThemeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* You can add a loading spinner here */}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#1a1a1a' : '#f8f9fa' }}>
      {/* Main content area */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      
      {/* Unified TabBar component */}
      <TabBar activeTab={activeTab} />
    </View>
  );
});

TabsContent.displayName = 'TabsContent';

const TabLayout = React.memo(() => {
  return (
    <ProtectedRoute>
      <TabBarProvider>
        <TabsContent />
      </TabBarProvider>
    </ProtectedRoute>
  );
});

TabLayout.displayName = 'TabLayout';

export default TabLayout;