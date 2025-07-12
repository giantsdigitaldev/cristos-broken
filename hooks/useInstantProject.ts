import { OptimizedProjectService, Project, ProjectWithFullData } from '@/utils/optimizedProjectService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseInstantProjectOptions {
  enableBackgroundPrefetch?: boolean;
  enableOptimisticUpdates?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseInstantProjectReturn {
  data: ProjectWithFullData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateOptimistic: (updates: Partial<Project>) => Promise<void>;
  clearCache: () => Promise<void>;
  cacheStats: any;
}

/**
 * 🚀 INSTANT PROJECT HOOK: Provides instant loading with zero latency
 */
export function useInstantProject(
  projectId: string | null,
  options: UseInstantProjectOptions = {}
): UseInstantProjectReturn {
  const {
    enableBackgroundPrefetch = true,
    enableOptimisticUpdates = true,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [data, setData] = useState<ProjectWithFullData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  /**
   * 🚀 INSTANT LOAD: Load project data with instant cache access
   */
  const loadProject = useCallback(async (forceRefresh = false) => {
    if (!projectId) return;

    try {
      setError(null);
      
      // Don't show loading on initial load if we have cached data
      if (!isInitialLoadRef.current || forceRefresh) {
        setLoading(true);
      }

      console.log('🚀 Loading project instant:', projectId);
      const startTime = Date.now();
      
      const projectData = await OptimizedProjectService.getProjectInstant(projectId);
      
      const loadTime = Date.now() - startTime;
      console.log(`⚡ Project loaded in ${loadTime}ms:`, projectId);

      if (projectData) {
        setData(projectData);
        lastRefreshRef.current = Date.now();
        
        // Trigger background prefetch for related projects
        if (enableBackgroundPrefetch) {
          // Prefetch in background without blocking UI
          setTimeout(() => {
            OptimizedProjectService.warmProjectCache(projectData.project.user_id || '');
          }, 100);
        }
      } else {
        setError('Project not found');
      }

    } catch (err) {
      console.error('❌ Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [projectId, enableBackgroundPrefetch]);

  /**
   * 🚀 OPTIMISTIC UPDATE: Update project with instant UI feedback
   */
  const updateOptimistic = useCallback(async (updates: Partial<Project>) => {
    if (!projectId || !data || !enableOptimisticUpdates) return;

    try {
      console.log('🚀 Optimistic update for project:', projectId);
      
      // Create optimistic data
      const optimisticData: ProjectWithFullData = {
        ...data,
        project: { ...data.project, ...updates }
      };

      // Update UI immediately
      setData(optimisticData);

      // Update in background
      const result = await OptimizedProjectService.updateProjectOptimistic(
        projectId,
        updates,
        optimisticData
      );

      if (result) {
        setData(result);
        console.log('✅ Project updated successfully');
      } else {
        // Revert on error
        setData(data);
        setError('Failed to update project');
      }

    } catch (err) {
      console.error('❌ Error updating project:', err);
      // Revert optimistic update
      setData(data);
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  }, [projectId, data, enableOptimisticUpdates]);

  /**
   * 🚀 REFRESH: Force refresh project data
   */
  const refresh = useCallback(async () => {
    await loadProject(true);
  }, [loadProject]);

  /**
   * 🚀 CLEAR CACHE: Clear project cache
   */
  const clearCache = useCallback(async () => {
    if (projectId) {
      await OptimizedProjectService.clearProjectCache(projectId);
      console.log('🗑️ Cleared cache for project:', projectId);
    }
  }, [projectId]);

  /**
   * 🚀 AUTO REFRESH: Set up automatic refresh
   */
  useEffect(() => {
    if (autoRefresh && projectId) {
      const interval = setInterval(() => {
        const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
        if (timeSinceLastRefresh >= refreshInterval) {
          console.log('🔄 Auto-refreshing project:', projectId);
          loadProject();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, projectId, refreshInterval]);

  /**
   * 🚀 INITIAL LOAD: Load project on mount or projectId change
   */
  useEffect(() => {
    if (projectId) {
      isInitialLoadRef.current = true;
      loadProject();
    } else {
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, [projectId]);

  /**
   * 🚀 CLEANUP: Clear timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  /**
   * 🚀 CACHE STATS: Get performance statistics
   */
  const cacheStats = useMemo(() => {
    return OptimizedProjectService.getCacheStats();
  }, [data]); // Update when data changes

  return {
    data,
    loading,
    error,
    refresh,
    updateOptimistic,
    clearCache,
    cacheStats
  };
}

/**
 * 🚀 INSTANT PROJECTS LIST HOOK: Get user projects with instant loading
 */
export function useInstantProjects(userId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Loading user projects instant:', userId);
      const startTime = Date.now();
      
      const userProjects = await OptimizedProjectService.getUserProjectsInstant(userId);
      
      const loadTime = Date.now() - startTime;
      console.log(`⚡ User projects loaded in ${loadTime}ms:`, userProjects.length);

      setProjects(userProjects);

    } catch (err) {
      console.error('❌ Error loading user projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProjects();
    } else {
      setProjects([]);
      setError(null);
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    error,
    refresh
  };
} 