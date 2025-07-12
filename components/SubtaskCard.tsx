import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectService } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  notes?: string;
}

type SubtaskCardProps = {
  subtask: TaskSubtask;
  onToggle?: (id: string, completed: boolean) => void;
  onUpdate?: (id: string, updates: Partial<TaskSubtask>) => void;
  onDelete?: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  index: number;
  totalSubtasks: number;
};

const SubtaskCard: React.FC<SubtaskCardProps> = ({ 
  subtask, 
  onToggle, 
  onUpdate,
  onDelete,
  onReorder,
  index,
  totalSubtasks
}) => {
  const [completed, setCompleted] = useState(subtask.completed);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [editDescription, setEditDescription] = useState(subtask.description || '');
  const [editNotes, setEditNotes] = useState(subtask.notes || '');
  const [editDueDate, setEditDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { dark } = useTheme();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  // Animation values for modal
  const modalOverlayOpacity = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(0)).current;

  // Calendar ref


  // Update local state when prop changes
  useEffect(() => {
    setCompleted(subtask.completed);
  }, [subtask.completed]);

  // Animate completion - iOS Notes style (simple checkmark animation only)
  useEffect(() => {
    if (completed) {
      // Simple checkmark animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        // Quick celebration animation
        Animated.sequence([
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset scale after animation
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Reset animations smoothly for unchecking
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [completed]);

  const handleShortPress = async () => {
    const newStatus = !completed;
    setCompleted(newStatus);
    
    // Haptic feedback
    if (newStatus) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Optimistic update
    if (onToggle) {
      onToggle(subtask.id, newStatus);
    }

    // Update in database
    try {
      await ProjectService.updateSubtask(subtask.id, {
        status: completed ? 'completed' : 'todo',
        completed_at: completed ? new Date().toISOString() : undefined
      });
    } catch (error) {
      console.error('Error updating subtask:', error);
      // Revert on error
      setCompleted(!newStatus);
      if (onToggle) {
        onToggle(subtask.id, !newStatus);
      }
    }
  };

  const handleLongPress = () => {
    setShowEditModal(true);
    openEditModal();
  };

  const openEditModal = () => {
    Animated.parallel([
      Animated.timing(modalOverlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
    ]).start();
  };

  const closeEditModal = () => {
    Animated.parallel([
      Animated.timing(modalOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowEditModal(false);
    });
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Subtask title cannot be empty');
      return;
    }

    // Only include fields that exist in the database
    const updates: Partial<TaskSubtask> = {
      title: editTitle.trim(),
    };
    
    // Only add description and notes if they have values
    // (The database columns may not exist yet)
    if (editDescription.trim()) {
      updates.description = editDescription.trim();
    }
    if (editNotes.trim()) {
      updates.notes = editNotes.trim();
    }

    if (onUpdate) {
      onUpdate(subtask.id, updates);
    }
    closeEditModal();
  };

  const handleCancelEdit = () => {
    setEditTitle(subtask.title);
    setEditDescription(subtask.description || '');
    setEditNotes(subtask.notes || '');
    setEditDueDate('');
    closeEditModal();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Subtask',
      'Are you sure you want to delete this subtask?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(subtask.id);
            }
            setShowEditModal(false);
          }
        }
      ]
    );
  };

  const handleDateSelect = (date: string) => {
    setEditDueDate(date);
    setShowDatePicker(false);
  };

  // Create drag to close handler for modal
  const createDragToCloseHandler = (closeModal: () => void) => {
    return (event: any) => {
      const { translationY, state } = event.nativeEvent;
      
      if (state === State.END) {
        if (translationY > 100) {
          closeModal();
        }
      }
    };
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity 
        onPress={handleShortPress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[styles.card, { 
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          shadowColor: dark ? 'rgba(231, 230, 230, 0.4)' : 'rgba(0, 0, 0, 0.4)',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: dark ? 0.8 : 0.8,
          shadowRadius: 1,
          elevation: 1,
          borderColor: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
          opacity: completed ? 0.6 : 1,
          marginBottom: 8,
        }]}
      >
        <View style={styles.textContainer}>
          <Text style={[styles.title, { 
            color: dark ? COLORS.white : COLORS.greyscale900,
            textDecorationLine: completed ? 'line-through' : 'none',
          }]}>{subtask.title}</Text>
          {(subtask.description || subtask.notes) && (
            <Text style={[styles.subtitle, { 
              color: dark ? COLORS.grayscale400 : COLORS.greyScale800,
            }]}>
              {subtask.description || subtask.notes}
            </Text>
          )}
          <Text style={[styles.dateTime, { 
            color: dark ? COLORS.grayscale400 : COLORS.greyScale800,
          }]}>
            Created {new Date(subtask.created_at).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleShortPress} 
          style={[styles.checkbox, completed && styles.checked]}
        >
          {completed && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
        </TouchableOpacity>
      </TouchableOpacity>
      
      {/* Celebration Effect */}
      {completed && (
        <Animated.View
          style={[
            styles.celebrationContainer,
            {
              opacity: celebrationAnim,
              transform: [
                {
                  scale: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.celebrationParticle, { backgroundColor: COLORS.success }]} />
          <View style={[styles.celebrationParticle, { backgroundColor: COLORS.primary }]} />
          <View style={[styles.celebrationParticle, { backgroundColor: COLORS.warning }]} />
          <View style={[styles.celebrationParticle, { backgroundColor: COLORS.info }]} />
        </Animated.View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="none"
        onRequestClose={handleCancelEdit}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalOverlayOpacity }]}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            onPress={handleCancelEdit}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                transform: [
                  {
                    translateY: modalSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SIZES.height, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <PanGestureHandler onGestureEvent={createDragToCloseHandler(handleCancelEdit)}>
              <View style={styles.modalHandle}>
                <View style={[styles.modalDragIndicator, {
                  backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                }]} />
              </View>
            </PanGestureHandler>

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Edit Subtask
              </Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.greyscale900} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Title *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter subtask title..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Due Date
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                  // Date picker functionality removed for Expo Go compatibility
                }}
                >
                  <Text style={[styles.dateButtonText, {
                    color: editDueDate ? (dark ? COLORS.white : COLORS.greyscale900) : (dark ? COLORS.grayscale400 : COLORS.grayscale700),
                  }]}>
                    {editDueDate ? new Date(editDueDate).toLocaleDateString() : 'Set due date...'}
                  </Text>
                  <Ionicons name="calendar" size={20} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.textArea, { 
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Enter description (optional)..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Notes
                </Text>
                <TextInput
                  style={[styles.textArea, { 
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Enter notes (optional)..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: COLORS.error }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={16} color={COLORS.white} />
                <Text style={[styles.deleteButtonText, { color: COLORS.white }]}>Delete</Text>
              </TouchableOpacity>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { 
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.cancelButtonText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: COLORS.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>


    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.greyScale800,
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 12,
    color: COLORS.greyScale800,
    fontFamily: "regular",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.grayscale400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
  },
  modalBody: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.greyscale900,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'regular',
    backgroundColor: COLORS.grayscale100,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'regular',
    backgroundColor: COLORS.grayscale100,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginLeft: 8,
    color: COLORS.white,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  saveButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationParticle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    margin: 2,
  },
  modalHandle: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grayscale200,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  datePickerOverlayTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  datePickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'regular',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    fontFamily: 'regular',
  },
  calendarContainer: {
    padding: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginBottom: 20,
  },
});

export default SubtaskCard; 