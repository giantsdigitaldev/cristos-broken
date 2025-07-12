import { useAuth } from '@/contexts/AuthContext';
import { predictiveCacheService } from '@/utils/predictiveCacheService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';

/**
 * 🚀 PREDICTIVE CACHE HOOK
 * Automatically initializes and manages predictive caching for the current user
 */
export function usePredictiveCache() {
  const { user } = useAuth();

  // Initialize predictive cache when user logs in
  useEffect(() => {
    if (user?.id) {
      console.log('🔮 Initializing predictive cache for user:', user.id);
      predictiveCacheService.initializePredictiveCache(user.id);
      
      // Start background sync
      predictiveCacheService.startBackgroundSync(user.id).then(syncInterval => {
        // Store interval for cleanup
        return () => {
          if (syncInterval) {
            clearInterval(syncInterval);
          }
        };
      });
    }
  }, [user?.id]);

  // Track user behavior on screen focus
  const trackBehavior = useCallback((route: string, projectId?: string) => {
    if (user?.id) {
      predictiveCacheService.trackUserBehavior(user.id, route, projectId);
    }
  }, [user?.id]);

  // Warm cache during idle time
  const warmCache = useCallback(async () => {
    if (user?.id) {
      await predictiveCacheService.warmCacheDuringIdle(user.id);
    }
  }, [user?.id]);

  // Get cache performance metrics
  const getCacheMetrics = useCallback(() => {
    return predictiveCacheService.getCacheMetrics();
  }, []);

  return {
    trackBehavior,
    warmCache,
    getCacheMetrics,
    isEnabled: !!user?.id
  };
}

/**
 * 🎯 ROUTE-SPECIFIC PREDICTIVE CACHE HOOK
 * Automatically tracks behavior for a specific route
 */
export function useRoutePredictiveCache(route: string, projectId?: string) {
  const { trackBehavior } = usePredictiveCache();

  useFocusEffect(
    useCallback(() => {
      // Track behavior when screen comes into focus
      trackBehavior(route, projectId);
      
      console.log(`🎯 Tracked behavior for route: ${route}${projectId ? ` (project: ${projectId})` : ''}`);
    }, [trackBehavior, route, projectId])
  );
} 