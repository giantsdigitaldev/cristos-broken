import { COLORS, illustrations, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { Buffer } from 'buffer';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Import the actual homepage content
import TabBar from '@/components/TabBar';
import { TabBarProvider } from '@/contexts/TabBarContext';
import HomeScreen from './(tabs)/index';

interface Slide {
  id: string;
  image: any;
  darkImage: any;
  title: string;
  subtitle: string;
}

const slides: Slide[] = [
  {
    id: '1',
    image: illustrations.onboarding1,
    darkImage: illustrations.onboarding1,
    title: 'Transform Ideas Into Reality Naturally',
    subtitle: 'CristOS transforms your conversation into a complete project plan automatically.',
  },
  {
    id: '2',
    image: illustrations.onboarding3,
    darkImage: illustrations.onboarding3,
    title: 'AI That Gets Smarter With Every Project',
    subtitle: 'Learns your style adapts to how you work. You focus on creating, CristOS handles the planning.',
  },
  {
    id: '3',
    image: illustrations.onboarding4,
    darkImage: illustrations.onboarding4,
    title: 'Everything You Need in One Smart App',
    subtitle: 'Stay on top of your work with intuitive tools and no extra hassle.',
  },
];

// Memoized slide component for better performance
const SlideItem = React.memo(({ item, dark }: { item: Slide; dark: boolean }) => {
  return (
    <View style={[styles.slide, { width: SIZES.width }]}>
      <Image 
        source={dark ? item.darkImage : item.image} 
        style={styles.image} 
        resizeMode="contain" 
      />
      <Text style={[styles.title, { color: dark ? COLORS.primary : COLORS.greyscale900 }]}>
        {item.title}
      </Text>
      <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale200 : '#737373' }]}>
        {item.subtitle}
      </Text>
    </View>
  );
});
SlideItem.displayName = 'SlideItem';

// Memoized pagination dot component
const PaginationDot = React.memo(({ isActive }: { isActive: boolean }) => {
  return (
    <View style={[
      styles.dot,
      { backgroundColor: isActive ? COLORS.primary : '#ccc' }
    ]} />
  );
});
PaginationDot.displayName = 'PaginationDot';

const OnboardingScreen: React.FC<{ onDone?: () => void }> = React.memo(({ onDone }) => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const { colors, dark } = useTheme();
  
  const { isAuthenticated, loading } = useAuth();

  // All hooks must be called before any conditional returns
  const containerStyle = useMemo(() => ({
    flex: 1,
    backgroundColor: colors.background,
  }), [colors.background]);

  const footerStyle = useMemo(() => ({
    paddingVertical: 20,
    alignItems: 'center' as const,
  }), []);

  const paginationStyle = useMemo(() => ({
    flexDirection: 'row' as const,
    marginBottom: 20,
  }), []);

  const buttonStyle = useMemo(() => ({
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingHorizontal: 60,
    width: SIZES.width - 32,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 48
  }), []);

  const buttonTextStyle = useMemo(() => ({
    color: '#fff',
    fontSize: 16,
    fontFamily: 'bold',
  }), []);

  // Memoized callbacks
  const handleNext = useMemo(() => () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      listRef.current?.scrollToOffset({ offset: SIZES.width * nextIndex, animated: true });
    } else {
      // Navigate to welcome screen for unauthenticated users
      navigation.navigate('welcome' as never);
    }
  }, [currentIndex, navigation]);

  const onMomentumScrollEnd = useMemo(() => (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SIZES.width);
    setCurrentIndex(newIndex);
  }, []);

  const renderItem = useMemo(() => {
    const RenderItem = ({ item }: { item: Slide }) => (
      <SlideItem item={item} dark={dark} />
    );
    RenderItem.displayName = 'RenderItem';
    return RenderItem;
  }, [dark]);

  const keyExtractor = useMemo(() => (item: Slide) => item.id, []);

  const getItemLayout = useMemo(() => (_: any, index: number) => ({
    length: SIZES.width,
    offset: SIZES.width * index,
    index
  }), []);

  // Memoized view config
  const viewConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 50 }), []);
  const onViewableItemsChanged = useMemo(() => ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  // Memoized button text
  const buttonText = useMemo(() => 
    currentIndex === slides.length - 1 ? 'Get Started' : 'Next',
    [currentIndex]
  );

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <SafeAreaView style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ 
          marginTop: 16, 
          fontSize: 16, 
          color: dark ? COLORS.white : COLORS.black,
          fontFamily: 'medium'
        }}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  // Show actual homepage for authenticated users
  if (isAuthenticated) {
    return (
      <TabBarProvider>
        <View style={{ flex: 1, backgroundColor: dark ? '#1a1a1a' : '#f8f9fa' }}>
          <HomeScreen />
          <TabBar activeTab="home" />
        </View>
      </TabBarProvider>
    );
  }

  return (
    <SafeAreaView style={containerStyle}>
      <StatusBar style="dark" />
      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={listRef}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
      />
      <View style={footerStyle}>
        <View style={paginationStyle}>
          {slides.map((_, index) => (
            <PaginationDot key={index} isActive={currentIndex === index} />
          ))}
        </View>
        <TouchableOpacity 
          style={buttonStyle} 
          onPress={handleNext} 
          activeOpacity={0.7}
        >
          <Text style={buttonTextStyle}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});
OnboardingScreen.displayName = 'OnboardingScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    width: SIZES.width,
    alignItems: 'center',
    paddingTop: 40,
  },
  image: {
    width: SIZES.width * 0.8,
    height: SIZES.height * 0.5,
  },
  title: {
    fontSize: 24,
    fontFamily: 'bold',
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 48,
    color: COLORS.greyscale900,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 30,
    color: '#737373',
    fontFamily: "medium"
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingHorizontal: 60,
    width: SIZES.width - 32,
    alignItems: "center",
    justifyContent: "center",
    height: 48
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'bold',
  },
  background: {
    zIndex: -1,
    position: "absolute",
    top: 300
  }
});

export default OnboardingScreen;
