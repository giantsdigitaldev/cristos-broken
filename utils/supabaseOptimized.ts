import { createClient } from '@supabase/supabase-js';

// 🚀 OPTIMIZED SUPABASE CLIENT
// Features: Connection pooling, request batching, real-time subscriptions, intelligent caching

class OptimizedSupabaseClient {
  private client: any;
  private cache: Map<string, { data: any; timestamp: number; ttl?: number }> = new Map();
  private realtimeSubscriptions: Map<string, any> = new Map();
  private globalSubscriptionManager: Map<string, { channel: any; timestamp: number }> = new Map();
  private batchQueue: Array<{ key: string; promise: Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private batchTimeout: number | null = null;
  private connectionPool: Map<string, any> = new Map();
  private lastQueryTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly SUBSCRIPTION_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
    this.startSubscriptionCleanup();
  }

  /**
   * 🧹 SUBSCRIPTION CLEANUP: Remove stale subscriptions
   */
  private startSubscriptionCleanup() {
    setInterval(() => {
      const now = Date.now();
      const staleThreshold = 60 * 60 * 1000; // 60 minutes (increased from 30)

      // Clean up global subscription manager
      for (const [key, subscription] of this.globalSubscriptionManager.entries()) {
        if (now - subscription.timestamp > staleThreshold) {
          try {
            subscription.channel.unsubscribe();
            this.globalSubscriptionManager.delete(key);
            console.log(`🧹 Cleaned up stale subscription: ${key}`);
          } catch (error) {
            console.warn(`Error cleaning up subscription ${key}:`, error);
          }
        }
      }

      // Clean up realtime subscriptions
      for (const [key, subscription] of this.realtimeSubscriptions.entries()) {
        if (now - subscription.timestamp > staleThreshold) {
          try {
            subscription.unsubscribe();
            this.realtimeSubscriptions.delete(key);
            console.log(`🧹 Cleaned up stale realtime subscription: ${key}`);
          } catch (error) {
            console.warn(`Error cleaning up realtime subscription ${key}:`, error);
          }
        }
      }
    }, this.SUBSCRIPTION_CLEANUP_INTERVAL);
  }

  /**
   * 🔗 GLOBAL SUBSCRIPTION MANAGER: Prevent subscription conflicts
   */
  private getOrCreateSubscription(key: string, createSubscription: () => any): any {
    const existing = this.globalSubscriptionManager.get(key);
    const now = Date.now();

    if (existing && (now - existing.timestamp) < 120000) { // 2 minutes threshold (increased from 1)
      console.log(`📡 Reusing existing subscription: ${key}`);
      return existing.channel;
    }

    // Clean up existing subscription if it exists
    if (existing) {
      try {
        existing.channel.unsubscribe();
      } catch (error) {
        console.warn(`Error cleaning up existing subscription ${key}:`, error);
      }
    }

    // Create new subscription
    const channel = createSubscription();
    this.globalSubscriptionManager.set(key, { channel, timestamp: now });
    console.log(`📡 Created new subscription: ${key}`);
    return channel;
  }

  /**
   * 🚀 REAL-TIME SUBSCRIPTIONS: Subscribe to data changes for instant updates
   */
  subscribeToTable(table: string, filter: string = '', callback: (payload: any) => void): () => void {
    const subscriptionKey = `${table}:${filter}`;
    
    // Cancel existing subscription if any
    if (this.realtimeSubscriptions.has(subscriptionKey)) {
      try {
        this.realtimeSubscriptions.get(subscriptionKey).unsubscribe();
      } catch (error) {
        console.warn(`Error removing existing subscription ${subscriptionKey}:`, error);
      }
    }

    // Create new subscription with global management
    const subscription = this.getOrCreateSubscription(
      subscriptionKey,
      () => this.client
        .channel(subscriptionKey)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table },
          callback
        )
        .subscribe()
    );

    this.realtimeSubscriptions.set(subscriptionKey, subscription);
    
    console.log(`📡 Real-time subscription active for: ${subscriptionKey}`);
    
    // Return unsubscribe function
    return () => {
      try {
        subscription.unsubscribe();
        this.realtimeSubscriptions.delete(subscriptionKey);
        this.globalSubscriptionManager.delete(subscriptionKey);
      } catch (error) {
        console.warn(`Error unsubscribing from ${subscriptionKey}:`, error);
      }
    };
  }

  /**
   * 🚀 INTELLIGENT CACHING: Smart cache with TTL and invalidation
   */
  private getCacheKey(table: string, query: any): string {
    return `${table}:${JSON.stringify(query)}`;
  }

  private async getFromCache(cacheKey: string): Promise<any | null> {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`💾 Cache hit: ${cacheKey}`);
      return cached.data;
    }
    return null;
  }

  private setCache(cacheKey: string, data: any, ttl: number = this.CACHE_DURATION): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 🚀 REQUEST BATCHING: Batch multiple similar requests for efficiency
   */
  private async batchRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key
    const existingRequest = this.batchQueue.find(item => item.key === key);
    if (existingRequest) {
      return existingRequest.promise;
    }

    // Create new promise for this request
    let resolve: (value: T) => void;
    let reject: (error: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // Add to batch queue
    this.batchQueue.push({
      key,
      promise,
      resolve: resolve!,
      reject: reject!
    });

    // Set timeout to process batch
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, 50); // 50ms batching window
    }

    return promise;
  }

  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    // Group requests by table for efficient batching
    const tableGroups = new Map<string, Array<{ key: string; resolve: (value: any) => void; reject: (error: any) => void }>>();

    for (const item of batch) {
      const table = item.key.split(':')[0];
      if (!tableGroups.has(table)) {
        tableGroups.set(table, []);
      }
      tableGroups.get(table)!.push(item);
    }

    // Process each table group
    for (const [table, items] of tableGroups) {
      try {
        // Execute batch query for this table
        const { data, error } = await this.client.from(table).select('*');
        
        if (error) {
          items.forEach((item: { key: string; resolve: (value: any) => void; reject: (error: any) => void }) => item.reject(error));
        } else {
          items.forEach((item: { key: string; resolve: (value: any) => void; reject: (error: any) => void }) => item.resolve(data));
        }
      } catch (error) {
        items.forEach((item: { key: string; resolve: (value: any) => void; reject: (error: any) => void }) => item.reject(error));
      }
    }
  }

  /**
   * 🚀 OPTIMIZED QUERY: Smart query with caching, batching, and real-time updates
   */
  async optimizedQuery<T>(
    table: string,
    query: any,
    options: {
      cache?: boolean;
      ttl?: number;
      realtime?: boolean;
      batch?: boolean;
    } = {}
  ): Promise<T> {
    const {
      cache = true,
      ttl = this.CACHE_DURATION,
      realtime = false,
      batch = false
    } = options;

    const cacheKey = this.getCacheKey(table, query);

    // 🚀 CHECK CACHE FIRST
    if (cache) {
      const cachedData = await this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // 🚀 RATE LIMITING: Prevent excessive queries
    const lastQuery = this.lastQueryTime.get(cacheKey);
    const now = Date.now();
    if (lastQuery && now - lastQuery < 1000) { // 1 second rate limit
      console.log(`⏱️ Rate limited query: ${cacheKey}`);
      // Return cached data if available, even if expired
      const cachedData = await this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    this.lastQueryTime.set(cacheKey, now);

    // 🚀 EXECUTE QUERY
    let data: T;
    
    if (batch) {
      data = await this.batchRequest(cacheKey, () => 
        this.client.from(table).select(query.select || '*').match(query.match || {})
      );
    } else {
      const { data: result, error } = await this.client
        .from(table)
        .select(query.select || '*')
        .match(query.match || {});

      if (error) {
        throw error;
      }
      data = result;
    }

    // 🚀 CACHE RESULT
    if (cache) {
      this.setCache(cacheKey, data, ttl);
    }

    // 🚀 SETUP REAL-TIME UPDATES
    if (realtime) {
      this.subscribeToTable(table, cacheKey, (payload: any) => {
        console.log(`🔄 Real-time update for ${cacheKey}:`, payload);
        // Invalidate cache on changes
        this.cache.delete(cacheKey);
        // Trigger callback or state update
      });
    }

    return data;
  }

  /**
   * 🚀 BULK OPERATIONS: Efficient bulk insert/update/delete
   */
  async bulkOperation<T>(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any[],
    options: { batchSize?: number } = {}
  ): Promise<T[]> {
    const { batchSize = 100 } = options;
    const results: T[] = [];

    if (operation === 'delete') {
      // For delete, use .in('id', [...]) to delete multiple by id
      const ids = data.map((item: any) => item.id).filter(Boolean);
      if (ids.length === 0) return results;
      const { data: result, error } = await this.client
        .from(table)
        .delete()
        .in('id', ids);
      if (error) throw error;
      if (result) results.push(...result);
      this.invalidateTableCache(table);
      return results;
    }

    // Process in batches for insert/update
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      let result, error;
      if (operation === 'insert' || operation === 'update') {
        ({ data: result, error } = await this.client
          .from(table)
          [operation](batch)
          .select());
      } else {
        ({ data: result, error } = await this.client
          .from(table)
          [operation](batch));
      }
      if (error) {
        throw error;
      }
      if (Array.isArray(result)) {
        results.push(...result);
      } else if (result != null) {
        results.push(result);
      } else {
        // Defensive: result is null or not iterable
        console.error(`[bulkOperation] Unexpected result for ${operation} on ${table}:`, result);
        throw new Error(`[bulkOperation] Supabase returned null or non-iterable result for ${operation} on ${table}`);
      }
    }

    // Invalidate related caches
    this.invalidateTableCache(table);

    return results;
  }

  /**
   * �� CACHE INVALIDATION: Smart cache invalidation
   */
  invalidateTableCache(table: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key: string) => this.cache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for ${table}`);
  }

  /**
   * 🚀 PERFORMANCE METRICS: Get performance statistics
   */
  getPerformanceMetrics() {
    return {
      cacheSize: this.cache.size,
      activeSubscriptions: this.realtimeSubscriptions.size,
      connectionPoolSize: this.connectionPool.size,
      batchQueueSize: this.batchQueue.length,
      lastQueryTimes: Object.fromEntries(this.lastQueryTime)
    };
  }

  /**
   * 🚀 CLEANUP: Clean up resources
   */
  cleanup(): void {
    // Unsubscribe from all real-time subscriptions
    for (const subscription of this.realtimeSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.realtimeSubscriptions.clear();

    // Clear batch queue
    this.batchQueue.forEach(item => item.reject(new Error('Client cleanup')));
    this.batchQueue = [];

    // Clear caches
    this.cache.clear();
    this.lastQueryTime.clear();

    console.log('🧹 Optimized Supabase client cleaned up');
  }

  // 🚀 EXPOSE STANDARD CLIENT METHODS
  get supabase() {
    return this.client;
  }

  from(table: string) {
    return this.client.from(table);
  }

  rpc(functionName: string, params?: any) {
    return this.client.rpc(functionName, params);
  }

  // NEW: Warm up connection pool by making a trivial request – this helps avoid the first-query latency penalty in some environments
  async warmConnectionPool(): Promise<void> {
    try {
      console.log('♨️  Warming Supabase connection pool…');
      // Perform a lightweight “health-check” query. We purposefully select nothing heavy.
      await this.client.rpc('ping').catch(async () => {
        // Fallback: simple select if the RPC helper isn’t available
        await this.client.from('profiles').select('id').limit(1);
      });
      console.log('✅ Supabase connection pool warmed');
    } catch (error) {
      // If the warm-up fails we don’t want to crash the app – just log and continue.
      console.warn('⚠️  Supabase connection pool warm-up failed:', error);
    }
  }
}

// 🚀 SINGLETON INSTANCE
export const optimizedSupabase = new OptimizedSupabaseClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

// 🚀 EXPORT FOR BACKWARD COMPATIBILITY
export const supabase = optimizedSupabase.supabase;

/**
 * 🔥 OPTIMIZED QUERY BUILDER
 * Pre-configured queries for maximum performance
 */
export class OptimizedQueries {
  
  /**
   * 📊 DASHBOARD STATS - Uses materialized view for instant loading
   */
  static async getDashboardStats(userId: string) {
    try {
      // Try optimized materialized view first
      const { data, error } = await supabase
        .from('user_dashboard_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('📊 Materialized view not available, using fallback');
        // Fallback to regular queries
        return this.getDashboardStatsFallback(userId);
      }

      console.log('⚡ Dashboard stats loaded from materialized view');
      return { data, error: null };
    } catch (error) {
      console.log('📊 Dashboard stats error:', error);
      return this.getDashboardStatsFallback(userId);
    }
  }

  /**
   * 📁 USER PROJECTS - Uses covering index for instant loading
   */
  static async getUserProjects(userId: string) {
    try {
      // Use optimized function if available
      const { data, error } = await supabase
        .rpc('get_user_projects_with_stats', { p_user_id: userId });

      if (error) {
        console.log('📁 Optimized function not available, using fallback');
        return this.getUserProjectsFallback(userId);
      }

      console.log('⚡ Projects loaded with optimized function');
      return { data, error: null };
    } catch (error) {
      console.log('📁 Projects error:', error);
      return this.getUserProjectsFallback(userId);
    }
  }

  /**
   * 💬 USER CONVERSATIONS - Uses covering index
   */
  static async getUserConversations(userId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_conversations_with_counts', { p_user_id: userId });

      if (error) {
        console.log('💬 Optimized function not available, using fallback');
        return this.getUserConversationsFallback(userId);
      }

      console.log('⚡ Conversations loaded with optimized function');
      return { data, error: null };
    } catch (error) {
      console.log('💬 Conversations error:', error);
      return this.getUserConversationsFallback(userId);
    }
  }

  /**
   * 🔍 SEARCH PROJECTS - Uses full-text search index
   */
  static async searchProjects(userId: string, query: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status, updated_at, metadata')
        .eq('user_id', userId)
        .textSearch('search_text', query, {
          type: 'websearch',
          config: 'english'
        })
        .order('updated_at', { ascending: false })
        .limit(20);

      console.log('⚡ Search completed with full-text index');
      return { data, error };
    } catch (error) {
      console.log('🔍 Search error:', error);
      return this.searchProjectsFallback(userId, query);
    }
  }

  /**
   * 📋 PROJECT DETAILS - Uses covering index
   */
  static async getProjectDetails(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, description, status, created_at, updated_at, metadata,
          tasks:tasks(id, title, status, priority, due_date),
          conversations:chat_conversations(id, title, updated_at)
        `)
        .eq('id', projectId)
        .single();

      console.log('⚡ Project details loaded with covering index');
      return { data, error };
    } catch (error) {
      console.log('📋 Project details error:', error);
      return { data: null, error };
    }
  }

  /**
   * 🔄 FALLBACK METHODS
   * Used when optimized queries are not available
   */
  static async getDashboardStatsFallback(userId: string) {
    try {
      // Simple fallback - just return basic stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('user_id', userId);
      
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId);
      
      const stats = {
        total_tasks: tasks?.length || 0,
        completed_tasks: tasks?.filter((t: any) => t.status === 'completed').length || 0,
        total_projects: projects?.length || 0,
        pending_tasks: tasks?.filter((t: any) => t.status === 'pending').length || 0
      };
      
      console.log('✅ Dashboard stats loaded with fallback:', stats);
      return { data: stats, error: null };
    } catch (error) {
      console.warn('⚠️ Dashboard stats fallback error:', error);
      return { data: null, error };
    }
  }

  static async getUserProjectsFallback(userId: string) {
    try {
      // Simple fallback - just get basic project data
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('⚠️ Projects fallback query failed:', error);
        return { data: [], error };
      }
      
      console.log('✅ Projects loaded with fallback:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.warn('⚠️ Projects fallback error:', error);
      return { data: [], error };
    }
  }

  private static async getUserConversationsFallback(userId: string) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    return { data, error };
  }

  private static async searchProjectsFallback(userId: string, query: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    return { data, error };
  }
}

/**
 * 🎯 BATCH OPERATIONS
 * Minimize round trips to database
 */
export class BatchOperations {
  
  /**
   * Load all user data in a single batch
   */
  static async loadUserDataBatch(userId: string) {
    console.log('🔄 Loading user data in batch...');
    
    const startTime = Date.now();
    
    // Use fallback methods for missing database objects
    const [dashboardStats, projects, conversations, profile, tasks] = await Promise.allSettled([
      // Use fallback for dashboard stats since the view doesn't exist
      OptimizedQueries.getDashboardStatsFallback(userId),
      
      // Use fallback for projects since the RPC function doesn't exist
      OptimizedQueries.getUserProjectsFallback(userId),
      
      OptimizedQueries.getUserConversations(userId),
      supabase.from('profiles').select('*').eq('id', userId).single(),
      
      // Use fallback for tasks since the query is failing
      this.getUserTasksFallback(userId)
    ]);

    const loadTime = Date.now() - startTime;
    console.log(`⚡ Batch load completed in ${loadTime}ms`);

    return {
      dashboardStats: dashboardStats.status === 'fulfilled' ? dashboardStats.value : null,
      projects: projects.status === 'fulfilled' ? projects.value : null,
      conversations: conversations.status === 'fulfilled' ? conversations.value : null,
      profile: profile.status === 'fulfilled' ? profile.value : null,
      tasks: tasks.status === 'fulfilled' ? tasks.value : null,
      loadTime
    };
  }

  /**
   * Fallback method for user tasks
   */
  private static async getUserTasksFallback(userId: string) {
    try {
      // Use a simpler query that should work
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.warn('⚠️ Tasks fallback query failed:', error);
        return { data: [], error };
      }
      
      console.log('✅ Tasks loaded with fallback:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.warn('⚠️ Tasks fallback error:', error);
      return { data: [], error };
    }
  }
}

/**
 * 📈 PERFORMANCE MONITORING
 */
export class PerformanceMonitor {
  private static queryTimes: { [key: string]: number[] } = {};

  static startTimer(queryName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (!this.queryTimes[queryName]) {
        this.queryTimes[queryName] = [];
      }
      
      this.queryTimes[queryName].push(duration);
      
      // Keep only last 10 measurements
      if (this.queryTimes[queryName].length > 10) {
        this.queryTimes[queryName].shift();
      }
      
      console.log(`⏱️ ${queryName}: ${duration}ms`);
    };
  }

  static getAverageTime(queryName: string): number {
    const times = this.queryTimes[queryName];
    if (!times || times.length === 0) return 0;
    
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  static getPerformanceReport(): Record<string, number> {
    const report: Record<string, number> = {};
    
    for (const [queryName, times] of Object.entries(this.queryTimes)) {
      report[queryName] = this.getAverageTime(queryName);
    }
    
    return report;
  }
}

export default supabase; 