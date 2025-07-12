import { cacheService } from './cacheService';
import { Project, ProjectComment, Task } from './projectTypes';
import { supabase } from './supabase';
import { TeamMember } from './teamService';

interface ProjectWithFullData {
  project: Project;
  tasks: Task[];
  teamMembers: TeamMember[];
  comments: ProjectComment[];
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface PredictiveCacheEntry {
  data: ProjectWithFullData;
  lastAccessed: number;
  accessCount: number;
  predictedNextAccess: number;
}

class OptimizedProjectService {
  private static predictiveCache = new Map<string, PredictiveCacheEntry>();
  private static backgroundPrefetchQueue = new Set<string>();
  private static isPrefetching = false;

  /**
   * 🚀 INSTANT LOADING: Get project with full data in one call
   */
  static async getProjectInstant(projectId: string): Promise<ProjectWithFullData | null> {
    const cacheKey = `project_full:${projectId}`;
    
    // 1. Check predictive cache first (fastest)
    const predictiveEntry = this.predictiveCache.get(projectId);
    if (predictiveEntry && Date.now() - predictiveEntry.lastAccessed < 30000) { // 30s window
      console.log('⚡ Predictive cache hit for project:', projectId);
      predictiveEntry.lastAccessed = Date.now();
      predictiveEntry.accessCount++;
      return predictiveEntry.data;
    }

    // 2. Check persistent cache
    const cachedData = await cacheService.get<ProjectWithFullData>(cacheKey);
    if (cachedData) {
      console.log('💾 Cache hit for project:', projectId);
      // Update predictive cache
      this.updatePredictiveCache(projectId, cachedData);
      return cachedData;
    }

    // 3. Load from database with parallel requests
    console.log('🔄 Loading project from database:', projectId);
    const data = await this.loadProjectFullData(projectId);
    
    if (data) {
      // Cache the result
      await cacheService.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
      this.updatePredictiveCache(projectId, data);
      
      // Trigger background prefetch for related projects
      this.triggerBackgroundPrefetch(projectId);
    }

    return data;
  }

  /**
   * 🚀 PARALLEL LOADING: Load all project data simultaneously
   */
  private static async loadProjectFullData(projectId: string): Promise<ProjectWithFullData | null> {
    try {
      // Execute all queries in parallel for maximum speed
      const [
        projectResult,
        tasksResult,
        teamResult,
        commentsResult,
        progressResult
      ] = await Promise.allSettled([
        // Project details
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single(),
        
        // Project tasks
        supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        
        // Team members
        supabase
          .from('project_members')
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              avatar_url,
              email
            )
          `)
          .eq('project_id', projectId),
        
        // Project comments
        supabase
          .from('project_comments')
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        // Progress calculation
        this.calculateProgressOptimized(projectId)
      ]);

      // Handle results
      const project = projectResult.status === 'fulfilled' ? projectResult.value.data : null;
      const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value.data || []) : [];
      const teamMembers = teamResult.status === 'fulfilled' ? (teamResult.value.data || []) : [];
      const comments = commentsResult.status === 'fulfilled' ? (commentsResult.value.data || []) : [];
      const progress = progressResult.status === 'fulfilled' ? progressResult.value : { completed: 0, total: 0, percentage: 0 };

      if (!project) {
        console.error('❌ Project not found:', projectId);
        return null;
      }

      return {
        project,
        tasks,
        teamMembers,
        comments,
        progress
      };

    } catch (error) {
      console.error('❌ Error loading project full data:', error);
      return null;
    }
  }

  /**
   * 🚀 OPTIMIZED PROGRESS: Calculate progress with single query
   */
  private static async calculateProgressOptimized(projectId: string) {
    try {
      const { data, error } = await supabase.rpc('calculate_project_progress', {
        p_project_id: projectId
      });

      if (error) {
        console.log('Progress calculation error, using fallback:', error);
        return { completed: 0, total: 0, percentage: 0 };
      }

      return data || { completed: 0, total: 0, percentage: 0 };
    } catch (error) {
      console.log('Progress calculation failed:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * 🚀 PREDICTIVE CACHE: Update predictive cache with access patterns
   */
  private static updatePredictiveCache(projectId: string, data: ProjectWithFullData) {
    const now = Date.now();
    const existing = this.predictiveCache.get(projectId);
    
    this.predictiveCache.set(projectId, {
      data,
      lastAccessed: now,
      accessCount: (existing?.accessCount || 0) + 1,
      predictedNextAccess: now + (existing ? 300000 : 600000) // 5-10 minutes
    });

    // Keep cache size manageable
    if (this.predictiveCache.size > 20) {
      this.evictOldestPredictiveEntries();
    }
  }

  /**
   * 🚀 BACKGROUND PREFETCH: Prefetch related projects in background
   */
  private static async triggerBackgroundPrefetch(projectId: string) {
    if (this.backgroundPrefetchQueue.has(projectId)) return;
    
    this.backgroundPrefetchQueue.add(projectId);
    
    if (!this.isPrefetching) {
      this.isPrefetching = true;
      this.runBackgroundPrefetch();
    }
  }

  /**
   * 🚀 BACKGROUND PREFETCH: Run prefetch in background
   */
  private static async runBackgroundPrefetch() {
    try {
      const projectIds = Array.from(this.backgroundPrefetchQueue);
      this.backgroundPrefetchQueue.clear();

      console.log('🔄 Background prefetching projects:', projectIds);

      // Prefetch in parallel with low priority
      await Promise.allSettled(
        projectIds.map(async (projectId) => {
          try {
            const cacheKey = `project_full:${projectId}`;
            const existing = await cacheService.get(cacheKey);
            
            if (!existing) {
              const data = await this.loadProjectFullData(projectId);
              if (data) {
                await cacheService.set(cacheKey, data, 5 * 60 * 1000);
                console.log('✅ Prefetched project:', projectId);
              }
            }
          } catch (error) {
            console.log('⚠️ Prefetch failed for project:', projectId, error);
          }
        })
      );

    } catch (error) {
      console.log('⚠️ Background prefetch error:', error);
    } finally {
      this.isPrefetching = false;
      
      // Continue with remaining items
      if (this.backgroundPrefetchQueue.size > 0) {
        setTimeout(() => this.runBackgroundPrefetch(), 1000);
      }
    }
  }

  /**
   * 🚀 SMART CACHE EVICTION: Remove oldest predictive entries
   */
  private static evictOldestPredictiveEntries() {
    const entries = Array.from(this.predictiveCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 5 entries
    const toRemove = entries.slice(0, 5);
    toRemove.forEach(([key]) => this.predictiveCache.delete(key));
    
    console.log('🗑️ Evicted', toRemove.length, 'predictive cache entries');
  }

  /**
   * 🚀 INSTANT PROJECT LIST: Get user projects with instant loading
   */
  static async getUserProjectsInstant(userId: string): Promise<Project[]> {
    const cacheKey = `user_projects_instant:${userId}`;
    
    const result = await cacheService.get(
      cacheKey,
      async () => {
        console.log('🔄 Loading user projects from database:', userId);
        
        // Use direct query instead of non-existent function
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Database error loading projects:', error);
          // Return empty array instead of mock data to see the actual error
          return [];
        }

        // Filter out any projects with invalid UUIDs
        const validProjects = (data || []).filter(project => {
          const isValid = this.isValidUUID(project.id);
          if (!isValid) {
            console.warn('⚠️ Filtering out project with invalid UUID:', project.id);
          }
          return isValid;
        });

        console.log('✅ Loaded projects from database:', validProjects.length);
        return validProjects as Project[];
      },
      { ttl: 2 * 60 * 1000 } // 2 minutes TTL
    );

    return result || [];
  }

  /**
   * 🚀 VALIDATE UUID: Check if a string is a valid UUID
   */
  private static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * 🚀 OPTIMISTIC UPDATES: Update project with instant UI feedback
   */
  static async updateProjectOptimistic(
    projectId: string, 
    updates: Partial<Project>,
    optimisticData?: ProjectWithFullData
  ): Promise<ProjectWithFullData | null> {
    // 1. Update predictive cache immediately for instant UI feedback
    if (optimisticData) {
      const updatedData = {
        ...optimisticData,
        project: { ...optimisticData.project, ...updates }
      };
      this.updatePredictiveCache(projectId, updatedData);
    }

    // 2. Update persistent cache
    const cacheKey = `project_full:${projectId}`;
    if (optimisticData) {
      await cacheService.set(cacheKey, optimisticData, 5 * 60 * 1000);
    }

    // 3. Update database in background
    try {
      // Update project directly in database
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating project in database:', error);
        return null;
      }

      if (data) {
        // Refresh cache with actual data
        const freshData = await this.loadProjectFullData(projectId);
        if (freshData) {
          await cacheService.set(cacheKey, freshData, 5 * 60 * 1000);
          this.updatePredictiveCache(projectId, freshData);
        }
        return freshData;
      }
    } catch (error) {
      console.error('❌ Error updating project:', error);
      // Revert optimistic update on error
      if (optimisticData) {
        this.predictiveCache.delete(projectId);
        await cacheService.invalidate(cacheKey);
      }
    }

    return null;
  }

  /**
   * 🚀 WARM CACHE: Preload frequently accessed projects
   */
  static async warmProjectCache(userId: string): Promise<void> {
    console.log('🔥 Warming project cache for user:', userId);
    
    try {
      // Get user's recent projects
      const projects = await this.getUserProjectsInstant(userId);
      
      // Preload first 3 projects in background
      const projectsToWarm = projects.slice(0, 3);
      
      await Promise.allSettled(
        projectsToWarm.map(async (project) => {
          try {
            await this.getProjectInstant(project.id);
            console.log('✅ Warmed project cache:', project.id);
          } catch (error) {
            console.log('⚠️ Failed to warm project:', project.id, error);
          }
        })
      );
      
      console.log('✅ Project cache warmed successfully');
    } catch (error) {
      console.warn('⚠️ Project cache warming failed:', error);
    }
  }

  /**
   * 🚀 CLEAR CACHE: Clear all project caches
   */
  static async clearProjectCache(projectId?: string): Promise<void> {
    if (projectId) {
      // Clear specific project cache
      this.predictiveCache.delete(projectId);
      await cacheService.invalidate(`project_full:${projectId}`);
      console.log('🗑️ Cleared cache for project:', projectId);
    } else {
      // Clear all project caches
      this.predictiveCache.clear();
      await cacheService.invalidate('project_full:');
      await cacheService.invalidate('user_projects_instant:');
      console.log('🗑️ Cleared all project caches');
    }
  }

  /**
   * 🚀 GET CACHE STATS: Get performance statistics
   */
  static getCacheStats() {
    return {
      predictiveCacheSize: this.predictiveCache.size,
      backgroundQueueSize: this.backgroundPrefetchQueue.size,
      isPrefetching: this.isPrefetching,
      cacheStats: cacheService.getStats()
    };
  }
}

export { OptimizedProjectService, ProjectWithFullData };
// Re-export types for compatibility
    export type { PendingTaskAssignment, Project, ProjectComment, Task, TaskComment, TaskSubtask } from './projectTypes';

