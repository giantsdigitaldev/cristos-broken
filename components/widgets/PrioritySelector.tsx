import { COLORS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PrioritySelectorProps {
  priorityValue: string;
  options?: string[];
  title?: string;
  onPriorityChange?: (priority: string) => void;
  onPress?: () => void;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  priorityValue,
  options = ['low', 'medium', 'high', 'urgent'],
  title,
  onPriorityChange,
  onPress
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return COLORS.error;
      case 'high':
        return COLORS.warning;
      case 'medium':
        return COLORS.primary;
      case 'low':
        return COLORS.success;
      default:
        return COLORS.grayscale400;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'alert-circle';
      case 'high':
        return 'trending-up';
      case 'medium':
        return 'remove';
      case 'low':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const handlePrioritySelect = (priority: string) => {
    onPriorityChange?.(priority);
    setIsExpanded(false);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.priorityContent}>
          <Ionicons 
            name={getPriorityIcon(priorityValue) as any} 
            size={16} 
            color={getPriorityColor(priorityValue)} 
          />
          <Text style={styles.priorityText}>
            {priorityValue.charAt(0).toUpperCase() + priorityValue.slice(1)}
          </Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={COLORS.grayscale400} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                priorityValue === option && styles.selectedOption
              ]}
              onPress={() => handlePrioritySelect(option)}
            >
              <Ionicons 
                name={getPriorityIcon(option) as any} 
                size={14} 
                color={getPriorityColor(option)} 
              />
              <Text style={[
                styles.optionText,
                priorityValue === option && styles.selectedOptionText
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.grayscale100,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityText: {
    fontSize: 14,
    color: COLORS.greyscale900,
    marginLeft: 8,
  },
  optionsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    overflow: 'hidden',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale100,
  },
  selectedOption: {
    backgroundColor: COLORS.primary + '10',
  },
  optionText: {
    fontSize: 14,
    color: COLORS.greyscale900,
    marginLeft: 8,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default PrioritySelector; 