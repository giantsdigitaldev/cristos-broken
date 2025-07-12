import { COLORS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CalendarBottomSheetModal from '../CalendarBottomSheetModal';

interface DatePickerProps {
  dateValue: string;
  minDate?: string;
  maxDate?: string;
  title?: string;
  onDateChange?: (date: string) => void;
  onPress?: () => void;
}

const DatePicker: React.FC<DatePickerProps> = ({
  dateValue,
  minDate,
  maxDate,
  title,
  onDateChange,
  onPress
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Select date';
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

  const handleDateSelect = (dateString: string) => {
    onDateChange?.(dateString);
    setIsModalVisible(false);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setIsModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.dateContent}>
          <Ionicons name="calendar" size={16} color={COLORS.primary} />
          <Text style={styles.dateText}>{formatDate(dateValue)}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={COLORS.grayscale400} />
      </TouchableOpacity>

      <CalendarBottomSheetModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Select Date"
        onSelectDate={handleDateSelect}
        selectedDate={dateValue}
        minDate={minDate}
        maxDate={maxDate}
      />
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
  dateButton: {
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
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.greyscale900,
    marginLeft: 8,
  },
});

export default DatePicker; 