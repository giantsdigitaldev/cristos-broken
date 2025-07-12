import '@/utils/webPolyfills';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AddProjectModal from '@/components/AddProjectModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import StartupStatus from '@/components/StartupStatus';
import { FONTS } from '@/constants/fonts';
import { AddProjectModalProvider, useAddProjectModal } from '@/contexts/AddProjectModalContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { TabBarProvider } from '@/contexts/TabBarContext';
import { TaskProvider } from '@/contexts/TaskContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider as ThemeProvider2 } from '@/theme/ThemeProvider';
import { startupErrorHandler } from '@/utils/startupErrorHandler';


// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

const RootLayoutNav = () => {
  const { isVisible, hideModal, onProjectCreated } = useAddProjectModal();

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgotpasswordemail" options={{ headerShown: false }} />
        <Stack.Screen name="forgotpasswordmethods" options={{ headerShown: false }} />
        <Stack.Screen name="forgotpasswordphonenumber" options={{ headerShown: false }} />
        <Stack.Screen name="otpverification" options={{ headerShown: false }} />
        <Stack.Screen name="createnewpassword" options={{ headerShown: false }} />
        <Stack.Screen name="createnewpin" options={{ headerShown: false }} />
        <Stack.Screen name="enterpin" options={{ headerShown: false }} />
        <Stack.Screen name="fingerprint" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="welcome-confirmed" options={{ headerShown: false }} />
        <Stack.Screen name="fillyourprofile" options={{ headerShown: false }} />
        <Stack.Screen name="emailconfirmation" options={{ headerShown: false }} />
        <Stack.Screen name="changeemail" options={{ headerShown: false }} />
        <Stack.Screen name="changepassword" options={{ headerShown: false }} />
        <Stack.Screen name="changepin" options={{ headerShown: false }} />
        <Stack.Screen name="editprofile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settingsnotifications" options={{ headerShown: false }} />
        <Stack.Screen name="settingssecurity" options={{ headerShown: false }} />
        <Stack.Screen name="settingspayment" options={{ headerShown: false }} />
        <Stack.Screen name="settingshelpcenter" options={{ headerShown: false }} />
        <Stack.Screen name="settingsinvitefriends" options={{ headerShown: false }} />
        <Stack.Screen name="settingsprivacypolicy" options={{ headerShown: false }} />
        <Stack.Screen name="paymentmethods" options={{ headerShown: false }} />
        <Stack.Screen name="addnewcard" options={{ headerShown: false }} />
        <Stack.Screen name="addnewaddress" options={{ headerShown: false }} />
        <Stack.Screen name="address" options={{ headerShown: false }} />
        <Stack.Screen name="topupmethods" options={{ headerShown: false }} />
        <Stack.Screen name="topupamount" options={{ headerShown: false }} />
        <Stack.Screen name="topupconfirmpin" options={{ headerShown: false }} />
        <Stack.Screen name="topupereceipt" options={{ headerShown: false }} />
        <Stack.Screen name="ereceipt" options={{ headerShown: false }} />
        <Stack.Screen name="menbership" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="newproject" options={{ headerShown: false }} />
        <Stack.Screen name="newprojectaddcover" options={{ headerShown: false }} />
        <Stack.Screen name="newprojectsetcolor" options={{ headerShown: false }} />
        <Stack.Screen name="newprojectsetted" options={{ headerShown: false }} />
        <Stack.Screen name="projectdetails" options={{ headerShown: false }} />
        <Stack.Screen name="projectdetailsaddteammenber" options={{ headerShown: false }} />
        <Stack.Screen name="projectdetailsboarddetails" options={{ headerShown: false }} />
        <Stack.Screen name="projectdetailsteammenber" options={{ headerShown: false }} />
        <Stack.Screen name="newprojectboardtaskdetails" options={{ headerShown: false }} />
        <Stack.Screen name="boarddetailssubtasks" options={{ headerShown: false }} />
        <Stack.Screen name="taskdetails" options={{ headerShown: false }} />
        <Stack.Screen name="addnewtaskform" options={{ headerShown: false }} />
        <Stack.Screen name="recentprojects" options={{ headerShown: false }} />
        <Stack.Screen name="inboxchatteammenber" options={{ headerShown: false }} />
        <Stack.Screen name="inboxteamvoicecall" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="chatsessions" options={{ headerShown: false }} />
        <Stack.Screen name="call" options={{ headerShown: false }} />
        <Stack.Screen name="videocall" options={{ headerShown: false }} />
        <Stack.Screen name="aiassistant" options={{ headerShown: false }} />
        <Stack.Screen name="customerservice" options={{ headerShown: false }} />
        <Stack.Screen name="allcomments" options={{ headerShown: false }} />
        <Stack.Screen name="reviewsummary" options={{ headerShown: false }} />
        <Stack.Screen name="acceptinvitation" options={{ headerShown: false }} />
        <Stack.Screen name="authtest" options={{ headerShown: false }} />
        <Stack.Screen name="teamservicetest" options={{ headerShown: false }} />
        <Stack.Screen name="ui-library" options={{ headerShown: false }} />
        <Stack.Screen name="vps-test" options={{ headerShown: false }} />
        <Stack.Screen name="demo" options={{ headerShown: false }} />
        <Stack.Screen name="ai-project-creation-test" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>

      {/* Global AddProjectModal */}
      <AddProjectModal
        visible={isVisible}
        onClose={hideModal}
        onProjectCreated={onProjectCreated}
      />
    </>
  );
};

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      try {
        // 🚨 FIX: Initialize storage safely
        try {
          const { cleanupMMKV } = await import('@/utils/supabase');
          // Clean up any existing storage instances to prevent conflicts
          cleanupMMKV();
        } catch (e) {
          console.log('Storage cleanup not available:', e);
          startupErrorHandler.handleStartupError(e as Error, 'Storage cleanup');
        }

        // Pre-load any critical assets here if needed
        // Could add critical route prefetching here
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for smoother loading
        
        // Mark as initialized
        startupErrorHandler.markInitialized();
      } catch (e) {
        console.warn('Failed to prepare app', e);
        startupErrorHandler.handleStartupError(e as Error, 'app preparation');
      } finally {
        // Mark app as ready to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if ((fontsLoaded || fontError) && appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, appIsReady]);

  // Memoize the loading state check
  const isReady = useMemo(() => {
    return (fontsLoaded || fontError) && appIsReady;
  }, [fontsLoaded, fontError, appIsReady]);

  // Handle deep linking for email confirmation
  useEffect(() => {
    let lastProcessedUrl = '';
    let processingTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleURL = (event: { url: string }) => {
      const url = event.url;
      
      // Prevent duplicate processing of the same URL
      if (url === lastProcessedUrl) {
        console.log('🔗 Skipping duplicate deep link:', url);
        return;
      }
      
      // Clear any existing timeout
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      
      // Debounce URL processing
      processingTimeout = setTimeout(() => {
        console.log('🔗 Deep link received:', url);
        lastProcessedUrl = url;
        
        // Check if it's an email confirmation link
        if (url.includes('welcome-confirmed') || url.includes('confirm-email') || url.includes('confirm')) {
          console.log('✉️ Email confirmation link detected');
          
          try {
            // Handle both custom scheme and universal links
            let email: string | null = null;
            let token: string | null = null;
            
            console.log('🔗 Processing URL:', url);
            
            if (url.includes('cristosjuly2025v3://')) {
              // Custom scheme URL
              console.log('📱 Custom scheme detected');
              const urlObj = new URL(url);
              email = urlObj.searchParams.get('email');
              token = urlObj.searchParams.get('token');
            } else if (url.includes('cristos.ai') || url.includes('ios.cristos.ai') || url.includes('confirm-email')) {
              // Universal link or web URL
              console.log('🌐 Universal link detected');
              const urlObj = new URL(url);
              email = urlObj.searchParams.get('email');
              token = urlObj.searchParams.get('token');
              
              // Also check for path-based parameters (most common for universal links)
              if (!email || !token) {
                const pathParts = urlObj.pathname.split('/');
                console.log('📂 Path parts:', pathParts);
                const confirmIndex = pathParts.findIndex(part => part === 'confirm-email');
                if (confirmIndex !== -1 && pathParts.length > confirmIndex + 2) {
                  email = decodeURIComponent(pathParts[confirmIndex + 1]);
                  token = decodeURIComponent(pathParts[confirmIndex + 2]);
                  console.log('✅ Extracted from path - Email:', email ? 'present' : 'missing', 'Token:', token ? 'present' : 'missing');
                }
              }
            }
            
            console.log('📧 Email confirmation parameters:', { 
              email: email ? 'present' : 'missing', 
              token: token ? 'present' : 'missing' 
            });
            
            // Navigate to welcome-confirmed with parameters
            if (email && token) {
              console.log('✅ Navigating to welcome-confirmed with parameters');
              router.push({
                pathname: '/welcome-confirmed',
                params: { 
                  email: decodeURIComponent(email), 
                  token: decodeURIComponent(token) 
                }
              });
            } else {
              console.log('⚠️ Missing email or token, navigating to welcome-confirmed without parameters');
              router.push('/welcome-confirmed');
            }
          } catch (error) {
            console.error('❌ Error parsing email confirmation URL:', error);
            router.push('/welcome-confirmed');
          }
        } else {
          console.log('🔗 Other deep link received:', url);
          // Handle other deep links if needed
        }
      }, 100); // 100ms debounce
    };

    // Listen for URL changes
    const subscription = Linking.addEventListener('url', handleURL);

    // Check for initial URL when app starts
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 Initial URL:', url);
        handleURL({ url });
      }
    });

    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      subscription?.remove();
    };
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
        <StartupStatus isReady={false} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ThemeProvider2>
            <AuthProvider>
              <NotificationProvider>
                <TaskProvider>
                  <TabBarProvider>
                    <AddProjectModalProvider>
                      <ErrorBoundary>
                        <RootLayoutNav />
                        <StartupStatus isReady={true} />
                      </ErrorBoundary>
                    </AddProjectModalProvider>
                  </TabBarProvider>
                </TaskProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider2>
        </ThemeProvider>
      </View>
    </GestureHandlerRootView>
  );
}