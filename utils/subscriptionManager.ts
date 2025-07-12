import { supabase } from './supabaseOptimized';

/**
 * 🔗 SUBSCRIPTION MANAGER
 * Manages real-time subscriptions to prevent conflicts and improve reliability
 */
export class SubscriptionManager {
  private static activeSubscriptions = new Map<string, { channel: any; timestamp: number }>();
  private static subscriptionQueue: Array<{ key: string; createFn: () => any; resolve: (channel: any) => void; reject: (error: any) => void }> = [];
  private static isProcessing = false;
  private static lastErrorTimes = new Map<string, number>(); // Track error times per subscription

  /**
   * 📡 CREATE SUBSCRIPTION: Create a subscription with conflict prevention
   */
  static async createSubscription(
    key: string,
    createSubscriptionFn: () => any,
    options: { 
      retryAttempts?: number; 
      retryDelay?: number;
      maxAge?: number;
      minErrorInterval?: number;
    } = {}
  ): Promise<any> {
    const { 
      retryAttempts = 2, 
      retryDelay = 5000, 
      maxAge = 300000, // 5 minutes default
      minErrorInterval = 10000 // 10 seconds minimum between retries
    } = options;

    // Check if we have a recent subscription
    const existing = this.activeSubscriptions.get(key);
    if (existing && (Date.now() - existing.timestamp) < maxAge) {
      console.log(`📡 Reusing existing subscription: ${key}`);
      return existing.channel;
    }

    // Check if we're too soon after a previous error
    const lastErrorTime = this.lastErrorTimes.get(key);
    if (lastErrorTime && (Date.now() - lastErrorTime) < minErrorInterval) {
      console.log(`⏳ Skipping subscription creation for ${key} - too soon after last error`);
      throw new Error('Too soon after last error');
    }

    // Clean up old subscription if it exists
    if (existing) {
      try {
        existing.channel.unsubscribe();
        console.log(`🧹 Cleaned up old subscription: ${key}`);
      } catch (error) {
        console.warn(`Error cleaning up subscription ${key}:`, error);
      }
      this.activeSubscriptions.delete(key);
    }

    // Add to queue to prevent conflicts
    return new Promise((resolve, reject) => {
      this.subscriptionQueue.push({ key, createFn: createSubscriptionFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 🔄 PROCESS QUEUE: Process subscription queue sequentially
   */
  private static async processQueue() {
    if (this.isProcessing || this.subscriptionQueue.length === 0) return;

    this.isProcessing = true;

    while (this.subscriptionQueue.length > 0) {
      const item = this.subscriptionQueue.shift();
      if (!item) continue;

      try {
        // Add longer delay between subscriptions to prevent conflicts
        await new Promise(resolve => setTimeout(resolve, 1000));

        const channel = item.createFn();
        
        // Wait for subscription to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Subscription timeout'));
          }, 15000); // 15 second timeout

          channel.subscribe((status: string) => {
            clearTimeout(timeout);
            
            if (status === 'SUBSCRIBED') {
              this.activeSubscriptions.set(item.key, { channel, timestamp: Date.now() });
              this.lastErrorTimes.delete(item.key); // Clear error time on success
              console.log(`✅ Subscription created successfully: ${item.key}`);
              item.resolve(channel);
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              this.lastErrorTimes.set(item.key, Date.now()); // Record error time
              console.error(`❌ Subscription failed: ${item.key}, status: ${status}`);
              reject(new Error(`Subscription failed: ${status}`));
            }
          });
        });

      } catch (error) {
        console.error(`❌ Error creating subscription ${item.key}:`, error);
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 🧹 REMOVE SUBSCRIPTION: Remove a subscription
   */
  static removeSubscription(key: string) {
    const subscription = this.activeSubscriptions.get(key);
    if (subscription) {
      try {
        subscription.channel.unsubscribe();
        console.log(`🧹 Removed subscription: ${key}`);
      } catch (error) {
        console.warn(`Error removing subscription ${key}:`, error);
      }
      this.activeSubscriptions.delete(key);
    }
    this.lastErrorTimes.delete(key);
  }

  /**
   * 🧹 CLEANUP: Clean up all subscriptions
   */
  static cleanup() {
    for (const [key, subscription] of this.activeSubscriptions.entries()) {
      try {
        subscription.channel.unsubscribe();
        console.log(`🧹 Cleaned up subscription: ${key}`);
      } catch (error) {
        console.warn(`Error cleaning up subscription ${key}:`, error);
      }
    }
    this.activeSubscriptions.clear();
    this.lastErrorTimes.clear();
    this.subscriptionQueue = [];
    this.isProcessing = false;
  }

  /**
   * 📊 GET STATUS: Get subscription status
   */
  static getStatus() {
    return {
      activeSubscriptions: this.activeSubscriptions.size,
      queueLength: this.subscriptionQueue.length,
      isProcessing: this.isProcessing,
      errorCount: this.lastErrorTimes.size
    };
  }
}

/**
 * 🔗 ENHANCED SUPABASE CLIENT
 * Wrapper that uses the subscription manager
 */
export class EnhancedSupabaseClient {
  /**
   * 📡 SUBSCRIBE WITH MANAGER: Subscribe using the subscription manager
   */
  static subscribeToTable(
    table: string, 
    filter: string = '', 
    callback: (payload: any) => void,
    options: { retryAttempts?: number; retryDelay?: number } = {}
  ): () => void {
    const key = `${table}:${filter}`;
    
    SubscriptionManager.createSubscription(
      key,
      () => supabase
        .channel(key)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe(),
      options
    ).catch(error => {
      console.error(`❌ Failed to create subscription for ${key}:`, error);
    });

    // Return cleanup function
    return () => {
      SubscriptionManager.removeSubscription(key);
    };
  }
} 