import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants';
import { cacheService } from '../utils/cacheService';

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  memorySize: number;
  memoryLimit: number;
}

export const PerformanceMonitor: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      try {
        const cacheStats = cacheService.getStats();
        setStats(cacheStats);
      } catch (error) {
        console.log('Error getting cache stats:', error);
      }
    };

    // Update stats immediately
    updateStats();

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const clearCache = async () => {
    try {
      await cacheService.clear();
      console.log('🗑️ Cache cleared successfully');
      // Update stats after clearing
      const cacheStats = cacheService.getStats();
      setStats(cacheStats);
    } catch (error) {
      console.log('Error clearing cache:', error);
    }
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.toggleText}>📊</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ Performance Monitor</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>
      
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cache Hit Rate:</Text>
            <Text style={[styles.statValue, { 
              color: stats.hitRate > 80 ? COLORS.success : 
                     stats.hitRate > 50 ? COLORS.warning : COLORS.error 
            }]}>
              {stats.hitRate.toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cache Hits:</Text>
            <Text style={styles.statValue}>{stats.hits}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cache Misses:</Text>
            <Text style={styles.statValue}>{stats.misses}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Memory Usage:</Text>
            <Text style={styles.statValue}>
              {stats.memorySize}/{stats.memoryLimit}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Operations:</Text>
            <Text style={styles.statValue}>{stats.hits + stats.misses}</Text>
          </View>
        </View>
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.clearButton} onPress={clearCache}>
          <Text style={styles.clearButtonText}>🗑️ Clear Cache</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          🟢 80%+ Excellent | 🟡 50-80% Good | 🔴 &lt;50% Poor
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  toggleText: {
    fontSize: 18,
    color: COLORS.white,
  },
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    fontSize: 18,
    color: COLORS.gray,
    padding: 4,
  },
  statsContainer: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  actions: {
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
    paddingTop: 8,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
  },
}); 