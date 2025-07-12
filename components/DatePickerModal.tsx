import React, { FC, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants';

// Conditional import for DateTimePicker
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (error) {
    console.log('DateTimePicker not available on this platform');
  }
}

interface DatePickerModalProps {
  open: boolean;
  startDate: string;
  selectedDate: string;
  onClose: () => void;
  onChangeStartDate: (date: string) => void;
}

const DatePickerModal: FC<DatePickerModalProps> = ({
  open,
  startDate,
  selectedDate,
  onClose,
  onChangeStartDate,
}) => {
  // Convert string date to Date object
  const getDateFromString = (dateString: string): Date => {
    if (!dateString) return new Date();
    try {
      return new Date(dateString);
    } catch {
      return new Date();
    }
  };

  // Convert Date object to YYYY-MM-DD string
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [tempDate, setTempDate] = useState<Date>(getDateFromString(selectedDate));

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, the modal closes automatically
      if (event.type === 'set' && date) {
        const formattedDate = formatDateToString(date);
        onChangeStartDate(formattedDate);
      }
      onClose();
    } else {
      // On iOS, we handle it manually
      if (date) {
        setTempDate(date);
      }
    }
  };

  const handleConfirm = () => {
    const formattedDate = formatDateToString(tempDate);
    onChangeStartDate(formattedDate);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original date
    setTempDate(getDateFromString(selectedDate));
    onClose();
  };

  const handleWebDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(event.target.value);
    setTempDate(date);
  };

  if (!open) return null;

  // Web implementation using native HTML5 date input
  if (Platform.OS === 'web') {
    return (
      <Modal animationType="slide" transparent={true} visible={open}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <View style={styles.webDatePickerContainer}>
              <input
                type="date"
                value={formatDateToString(tempDate)}
                onChange={handleWebDateChange}
                min={startDate}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: COLORS.greyscale900,
                  outline: 'none',
                  boxShadow: 'none',
                }}
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleCancel} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.button, styles.confirmButton]}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Android implementation
  if (Platform.OS === 'android' && DateTimePicker) {
    return (
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="default"
        minimumDate={getDateFromString(startDate)}
        onChange={handleDateChange}
        locale="en_US"
      />
    );
  }

  // iOS and other platforms implementation
  if (DateTimePicker) {
    return (
      <Modal animationType="slide" transparent={true} visible={open}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              minimumDate={getDateFromString(startDate)}
              onChange={handleDateChange}
              locale="en_US"
              textColor={COLORS.greyscale900}
              style={styles.datePicker}
            />
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={handleCancel} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.button, styles.confirmButton]}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Fallback implementation if DateTimePicker is not available
  return (
    <Modal animationType="slide" transparent={true} visible={open}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Date</Text>
          
          <Text style={styles.fallbackText}>
            Date picker is not available on this platform.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.greyscale900,
    marginBottom: 20,
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  webDatePickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  fallbackText: {
    fontSize: 16,
    color: COLORS.grayscale700,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.grayscale200,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.greyscale900,
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DatePickerModal;