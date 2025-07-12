import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, CalendarProps } from 'react-native-calendars';
import { COLORS } from '../constants';
import CustomBottomSheet from './CustomBottomSheet';

interface CalendarBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  iconColor?: string;
  selectedDate: string;
  onSelectDate: (dateString: string) => void;
  minDate?: string;
  maxDate?: string;
  markedDates?: CalendarProps['markedDates'];
  theme?: CalendarProps['theme'];
}

const CalendarBottomSheetModal: React.FC<CalendarBottomSheetModalProps> = ({
  visible,
  onClose,
  title,
  iconColor = COLORS.primary,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  markedDates,
  theme,
}) => {
  const handleClose = () => {
    console.log('CalendarBottomSheetModal handleClose called');
    onClose();
  };

  return (
    <CustomBottomSheet
      visible={visible}
      onClose={handleClose}
      height={"60%"}
      borderRadius={20}
      backgroundColor={COLORS.white}
      closeOnSwipe={true}
      closeOnTouchOutside={true}
      animationDuration={300}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color={iconColor} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.grayscale700} />
        </TouchableOpacity>
      </View>
      {/* Calendar */}
      <Calendar
        current={selectedDate}
        minDate={minDate}
        maxDate={maxDate}
        onDayPress={day => onSelectDate(day.dateString)}
        markedDates={markedDates}
        theme={theme}
      />
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'bold',
    marginLeft: 8,
    color: COLORS.greyscale900,
  },
});

export default CalendarBottomSheetModal; 