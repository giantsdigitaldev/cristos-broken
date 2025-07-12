import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { ImageStyle, TextStyle, ViewStyle } from 'react-native';

// Performance utilities for memoizing styles and callbacks
export const useOptimizedStyles = <T extends ViewStyle | TextStyle | ImageStyle>(
  styleFactory: () => T,
  dependencies: React.DependencyList
): T => {
  return useMemo(styleFactory, dependencies);
};

// Memoized callback hook with better performance
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T => {
  return useCallback(callback, dependencies);
};

// Higher-order component for automatic memoization
export const withMemoization = <T extends object>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) => {
  return memo(Component, propsAreEqual);
};

// Performance wrapper component for conditional rendering
interface ConditionalRenderProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = memo(({
  condition,
  children,
  fallback = null
}) => {
  return condition ? children as React.ReactElement : fallback as React.ReactElement;
});
ConditionalRender.displayName = 'ConditionalRender';

// Lazy loading wrapper for components
export const LazyComponent = <T extends object>(
  componentFactory: () => Promise<{ default: React.ComponentType<T> }>
) => {
  return React.lazy(componentFactory);
};

// Performance monitoring hook (for development)
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = React.useRef(0);
  const startTime = React.useRef(0);

  React.useEffect(() => {
    renderCount.current += 1;
    startTime.current = performance.now();
    
    if (__DEV__) {
      console.log(`[Performance] ${componentName} - Render #${renderCount.current}`);
    }
    
    return () => {
      if (__DEV__) {
        const endTime = performance.now();
        const renderTime = endTime - startTime.current;
        console.log(`[Performance] ${componentName} - Render time: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return renderCount.current;
};

// Memoized list item component wrapper
export const MemoizedListItem = <T extends object>(
  ItemComponent: React.ComponentType<T>,
  keyExtractor?: (props: T) => string
) => {
  return memo(ItemComponent, (prevProps, nextProps) => {
    if (keyExtractor) {
      return keyExtractor(prevProps) === keyExtractor(nextProps);
    }
    
    // Default shallow comparison for common props
    const keys = Object.keys(prevProps) as (keyof T)[];
    return keys.every(key => prevProps[key] === nextProps[key]);
  });
};

// Optimized FlatList props generator
export const useOptimizedFlatListProps = <T extends unknown>(
  data: T[],
  dependencies: React.DependencyList = []
) => {
  return useMemo(() => ({
    data,
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 10,
    windowSize: 10,
    getItemLayout: undefined, // Should be provided by consumer if item height is fixed
  }), [data, ...dependencies]);
};

// Image optimization props
export const useOptimizedImageProps = (source: any, dependencies: React.DependencyList = []) => {
  return useMemo(() => ({
    source,
    resizeMode: 'cover' as const,
    loadingIndicatorSource: undefined, // Can be set for loading placeholder
    progressiveRenderingEnabled: true,
    fadeDuration: 300,
  }), [source, ...dependencies]);
}; 