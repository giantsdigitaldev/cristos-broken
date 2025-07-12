import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Image cache for better performance
const imageCache = new Map<string, any>();

// Utility to preload critical images
export const preloadImages = async (imageSources: any[]) => {
  const promises = imageSources.map(async (source) => {
    if (typeof source === 'string' && !imageCache.has(source)) {
      try {
        await Image.prefetch(source);
        imageCache.set(source, source);
      } catch (error) {
        console.warn('Failed to preload image:', source, error);
      }
    }
  });

  await Promise.allSettled(promises);
};

// Get optimized image dimensions based on screen size
export const getOptimizedImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number
) => {
  const targetWidth = maxWidth || screenWidth * 0.8;
  const aspectRatio = originalHeight / originalWidth;
  
  return {
    width: Math.min(targetWidth, originalWidth),
    height: Math.min(targetWidth, originalWidth) * aspectRatio,
  };
};

// Clear image cache to free memory
export const clearImageCache = () => {
  imageCache.clear();
};

// Get cache size for monitoring
export const getImageCacheSize = () => {
  return imageCache.size;
};

// Progressive image loading hook
export const useProgressiveImage = (lowQualitySrc: any, highQualitySrc: any) => {
  const [source, setSource] = useState(lowQualitySrc);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHighQualityImage = async () => {
      try {
        if (typeof highQualitySrc === 'string') {
          await Image.prefetch(highQualitySrc);
        }
        
        if (isMounted) {
          setSource(highQualitySrc);
          setIsLoading(false);
        }
      } catch (error) {
      }
    };

    loadHighQualityImage();

    return () => {
      isMounted = false;
    };
  }, [highQualitySrc]);

  return { source, isLoading };
};

// Image lazy loading hook for better performance
export const useLazyImage = (src: any) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // For non-web platforms, show images immediately
    if (Platform.OS !== 'web') {
      setIsVisible(true);
      return;
    }

    // Simple timeout-based lazy loading for web
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return {
    isVisible,
    source: isVisible ? src : undefined,
  };
};

// Cache image source for better performance
export const getCachedImageSource = (source: any) => {
  if (typeof source === 'string') {
    if (imageCache.has(source)) {
      return imageCache.get(source);
    }
    imageCache.set(source, source);
    return source;
  }
  return source;
};

// Optimized image props for better performance
export const getOptimizedImageProps = (source: any, additionalProps: any = {}) => {
  return {
    source: getCachedImageSource(source),
    transition: 300,
    recyclingKey: typeof source === 'string' ? source : undefined,
    ...additionalProps,
  };
}; 