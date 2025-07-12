import { COLORS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProjectSummaryCardProps {
  id: string;
  name: string;
  description?: string;
  status?: string;
  numberOfTasks?: number;
  numberOfCompletedTasks?: number;
  numberOfDaysLeft?: number;
  endDate?: string | null;
  onPress?: () => void;
  onEdit?: () => void;
}

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({
  id,
  name,
  description,
  status = 'active',
  numberOfTasks = 0,
  numberOfCompletedTasks = 0,
  numberOfDaysLeft = 0,
  endDate,
  onPress,
  onEdit
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return COLORS.success;
      case 'active':
        return COLORS.primary;
      case 'paused':
        return COLORS.warning;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.grayscale400;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'checkmark-circle';
      case 'active':
        return 'play-circle';
      case 'paused':
        return 'pause-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const progressPercentage = numberOfTasks > 0 
    ? Math.round((numberOfCompletedTasks / numberOfTasks) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.projectName}>{name}</Text>
          <View style={styles.statusContainer}>
            <Ionicons 
              name={getStatusIcon(status) as any} 
              size={12} 
              color={getStatusColor(status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>
        {onEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="list" size={14} color={COLORS.grayscale700} />
          <Text style={styles.statText}>
            {numberOfCompletedTasks}/{numberOfTasks} tasks
          </Text>
        </View>
        
        {numberOfDaysLeft > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="time" size={14} color={COLORS.grayscale700} />
            <Text style={styles.statText}>
              {numberOfDaysLeft} days left
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: getStatusColor(status)
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>

      {endDate && (
        <View style={styles.deadlineContainer}>
          <Ionicons name="calendar" size={12} color={COLORS.grayscale700} />
          <Text style={styles.deadlineText}>
            Due: {formatDate(endDate)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.greyscale900,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  editButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.grayscale700,
    marginBottom: 12,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: COLORS.grayscale700,
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.grayscale200,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.grayscale700,
    minWidth: 30,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
    color: COLORS.grayscale700,
    marginLeft: 4,
  },
});

export default ProjectSummaryCard; 