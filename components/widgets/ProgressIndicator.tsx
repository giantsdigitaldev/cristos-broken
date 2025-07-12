import { COLORS } from '@/constants';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressIndicatorProps {
  progress: number;
  completed: number;
  total: number;
  color?: string;
  title?: string;
  onPress?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  completed,
  total,
  color = COLORS.primary,
  title,
  onPress
}) => {
  const percentage = Math.min(100, Math.max(0, progress));
  const displayText = title || `${completed}/${total} completed`;

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${percentage}%`,
                backgroundColor: color
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{displayText}</Text>
      </View>
      <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginVertical: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greyscale900,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.grayscale200,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.grayscale700,
    minWidth: 60,
  },
  percentageText: {
    fontSize: 10,
    color: COLORS.grayscale700,
    textAlign: 'right',
  },
});

export default ProgressIndicator; 