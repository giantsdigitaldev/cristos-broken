import { useAuth } from '@/contexts/AuthContext';
import { optimizedSupabase } from '@/utils/supabaseOptimized';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseRealTimeDataOptions {
  table: string;
  query?: any;
  cache?: boolean;
  ttl?: number;
  realtime?: boolean;
  batch?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRealTimeDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invalidateCache: () => void;
  performanceMetrics: any;
}

/**
 * 🚀 REAL-TIME DATA HOOK
 * Provides instant loading with real-time updates and intelligent caching
 */
export function useRealTimeData<T>(
  options: UseRealTimeDataOptions
): UseRealTimeDataReturn<T> {
  const {
    table,
    query = {},
    cache = true,
    ttl = 30000,
    realtime = true,
    batch = false,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const lastRefreshRef = useRef<number>(0);

  /**
   * 🚀 LOAD DATA: Load data with optimized client
   */
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    try {
      setError(null);
      
      if (forceRefresh || !data) {
        setLoading(true);
      }

      console.log(`🚀 Loading ${table} data...`);
      const startTime = Date.now();

      const result = await optimizedSupabase.optimizedQuery<T>(
        table,
        query,
        {
          cache,
          ttl,
          realtime,
          batch
        }
      );

      const loadTime = Date.now() - startTime;
      console.log(`⚡ ${table} data loaded in ${loadTime}ms`);

      setData(result);
      lastRefreshRef.current = Date.now();

    } catch (err) {
      console.error(`❌ Error loading ${table} data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [table, query, cache, ttl, realtime, batch, user?.id, data]);

  /**
   * 🚀 SETUP REAL-TIME SUBSCRIPTION
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!realtime || !user?.id) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new subscription
    const unsubscribe = optimizedSupabase.subscribeToTable(
      table,
      JSON.stringify(query),
      (payload) => {
        console.log(`🔄 Real-time update for ${table}:`, payload);
        
        // Invalidate cache and reload data
        optimizedSupabase.invalidateTableCache(table);
        loadData(true);
      }
    );

    unsubscribeRef.current = unsubscribe;
  }, [table, query, realtime, user?.id, loadData]);

  /**
   * 🚀 REFRESH: Force refresh data
   */
  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  /**
   * 🚀 INVALIDATE CACHE: Clear cache for this table
   */
  const invalidateCache = useCallback(() => {
    optimizedSupabase.invalidateTableCache(table);
    console.log(`🗑️ Cache invalidated for ${table}`);
  }, [table]);

  /**
   * 🚀 AUTO REFRESH: Set up automatic refresh
   */
  useEffect(() => {
    if (autoRefresh && user?.id) {
      const interval = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
        if (timeSinceLastRefresh >= refreshInterval) {
          console.log(`🔄 Auto-refreshing ${table} data`);
          loadData();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, user?.id, refreshInterval, table]);

  /**
   * 🚀 INITIAL LOAD: Load data on mount or when dependencies change
   */
  useEffect(() => {
    if (user?.id) {
      loadData();
      setupRealtimeSubscription();
    } else {
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * 🚀 CLEANUP: Clean up subscriptions and timeouts
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  /**
   * 🚀 PERFORMANCE METRICS: Get performance statistics
   */
  const performanceMetrics = optimizedSupabase.getPerformanceMetrics();

  return {
    data,
    loading,
    error,
    refresh,
    invalidateCache,
    performanceMetrics
  };
}

/**
 * 🚀 REAL-TIME PROJECTS HOOK
 * Specialized hook for projects with project-specific optimizations
 */
export function useRealTimeProjects(userId?: string) {
  return useRealTimeData({
    table: 'projects',
    query: { select: '*', match: { user_id: userId } },
    cache: true,
    ttl: 60000, // 1 minute cache
    realtime: true,
    batch: true,
    autoRefresh: true,
    refreshInterval: 30000 // 30 seconds
  });
}

/**
 * 🚀 REAL-TIME TASKS HOOK
 * Specialized hook for tasks with task-specific optimizations
 */
export function useRealTimeTasks(userId?: string) {
  return useRealTimeData({
    table: 'tasks',
    query: { select: '*', match: { user_id: userId } },
    cache: true,
    ttl: 30000, // 30 seconds cache
    realtime: true,
    batch: true,
    autoRefresh: true,
    refreshInterval: 15000 // 15 seconds
  });
}

/**
 * 🚀 REAL-TIME CATEGORIES HOOK
 * Specialized hook for user categories
 */
export function useRealTimeCategories(userId?: string) {
  return useRealTimeData({
    table: 'user_categories',
    query: { select: '*', match: { user_id: userId } },
    cache: true,
    ttl: 120000, // 2 minutes cache
    realtime: false, // Categories don't change often
    batch: false,
    autoRefresh: false
  });
}

/**
 * 🚀 REAL-TIME DASHBOARD HOOK
 * Specialized hook for dashboard data with multiple table optimization
 */
export function useRealTimeDashboard(userId?: string) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Loading dashboard data...');
      const startTime = Date.now();

      // Load multiple tables in parallel with optimized queries
      const [projects, tasks, categories] = await Promise.all([
        optimizedSupabase.optimizedQuery<any[]>(
          'projects',
          { select: 'id, name, status, created_at', match: { user_id: userId } },
          { cache: true, ttl: 60000, realtime: true, batch: true }
        ),
        optimizedSupabase.optimizedQuery<any[]>(
          'tasks',
          { select: 'id, project_id, status, priority', match: { user_id: userId } },
          { cache: true, ttl: 30000, realtime: true, batch: true }
        ),
        optimizedSupabase.optimizedQuery<any[]>(
          'user_categories',
          { select: '*', match: { user_id: userId } },
          { cache: true, ttl: 120000, realtime: false, batch: true }
        )
      ]);

      const loadTime = Date.now() - startTime;
      console.log(`⚡ Dashboard data loaded in ${loadTime}ms`);

      // Calculate dashboard statistics
      const stats = {
        totalProjects: (projects as any[])?.length || 0,
        activeProjects: (projects as any[])?.filter((p: any) => p.status === 'active').length || 0,
        totalTasks: (tasks as any[])?.length || 0,
        completedTasks: (tasks as any[])?.filter((t: any) => t.status === 'completed').length || 0,
        categories: (categories as any[])?.length || 0,
        recentProjects: (projects as any[])?.slice(0, 5) || [],
        highPriorityTasks: (tasks as any[])?.filter((t: any) => t.priority === 'high' || t.priority === 'urgent').length || 0
      };

      setDashboardData(stats);

    } catch (err) {
      console.error('❌ Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  const invalidateCache = useCallback(() => {
    optimizedSupabase.invalidateTableCache('projects');
    optimizedSupabase.invalidateTableCache('tasks');
    optimizedSupabase.invalidateTableCache('user_categories');
  }, []);

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    } else {
      setDashboardData(null);
      setError(null);
      setLoading(false);
    }
  }, [userId]);

  return {
    data: dashboardData,
    loading,
    error,
    refresh,
    invalidateCache,
    performanceMetrics: optimizedSupabase.getPerformanceMetrics()
  };
} 