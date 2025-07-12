import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheService } from '../utils/cacheService';
import { supabase } from '../utils/supabase';

// Hook for optimized project data
export function useOptimizedProjects(userId?: string) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadProjects = useCallback(async (forceRefresh = false) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await cacheService.get(
        `user_projects:${userId}`,
        async () => {
          const { data, error } = await supabase.rpc('get_user_projects_with_stats', { 
            p_user_id: userId 
          });

          if (error) throw error;
          return data || [];
        },
        { forceRefresh }
      );

      if (mountedRef.current) {
        setProjects(data);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message);
        console.error('Error loading projects:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  const refresh = useCallback(() => {
    loadProjects(true);
  }, [loadProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    projects,
    loading,
    error,
    refresh
  };
}

// Hook for dashboard stats
export function useDashboardStats(userId?: string) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await cacheService.get(
          `dashboard_stats:${userId}`,
          async () => {
            const { data, error } = await supabase
              .from('user_dashboard_stats')
              .select('*')
              .eq('user_id', userId)
              .single();

            if (error) {
              // Return default stats if materialized view doesn't exist yet
              return {
                user_id: userId,
                total_projects: 0,
                active_projects: 0,
                completed_projects: 0,
                total_tasks: 0,
                completed_tasks: 0,
                pending_tasks: 0,
                overdue_tasks: 0,
                total_conversations: 0,
                total_messages: 0
              };
            }

            return data;
          },
          { ttl: 15 * 60 * 1000 } // 15 minutes
        );

        setStats(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [userId]);

  return { stats, loading, error };
}

// Hook for chat conversations with optimized loading
export function useOptimizedConversations(userId?: string) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await cacheService.get(
          `user_conversations:${userId}`,
          async () => {
            const { data, error } = await supabase.rpc('get_user_conversations_with_counts', { 
              p_user_id: userId 
            });

            if (error) throw error;
            return data || [];
          },
          { ttl: 5 * 60 * 1000 } // 5 minutes
        );

        setConversations(data || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [userId]);

  return { conversations, loading, error };
}

// Hook for search with debouncing and caching
export function useOptimizedSearch(searchType: 'projects' | 'tasks' = 'projects') {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (query: string, userId: string) => {
    if (!query.trim() || !userId) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const cacheKey = `search_${searchType}:${userId}:${query}`;
        
        const data = await cacheService.get(
          cacheKey,
          async () => {
            let searchData;
            
            if (searchType === 'projects') {
              const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', userId)
                .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                .order('updated_at', { ascending: false });
              
              if (error) throw error;
              searchData = data;
            } else {
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .order('updated_at', { ascending: false });
              
              if (error) throw error;
              searchData = data;
            }

            return searchData || [];
          },
          { ttl: 2 * 60 * 1000 } // 2 minutes
        );

        setResults(data);
      } catch (err: any) {
        setError(err.message);
        console.error(`Error searching ${searchType}:`, err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce
  }, [searchType]);

  const clearSearch = useCallback(() => {
    setResults([]);
    setError(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearSearch
  };
} 