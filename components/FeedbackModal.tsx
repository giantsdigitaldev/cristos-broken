
import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { CreateFeedbackData, feedbackService } from '@/utils/feedbackService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: (newFeedback?: any) => void;
  feedback?: any;
  onFeedbackUpdated?: (updatedFeedback?: any) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  onFeedbackSubmitted,
  feedback,
  onFeedbackUpdated,
}) => {
  const { dark } = useTheme();
  const { user } = useAuth();
  
  // Modal animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(0)).current;
  
  // Keyboard animation
  const keyboardAnimation = useRef(new Animated.Value(0)).current;
  const keyboardHeightAnimation = useRef(new Animated.Value(0)).current;

  // Form state
  const [formData, setFormData] = useState<CreateFeedbackData>({
    title: '',
    description: '',
    category: 'bug',
    priority: 'medium'
  });
  const [formLoading, setFormLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'error' as 'success' | 'error' | 'warning' | 'info'
  });

  // Category options
  const categories = [
    { label: 'Bug', value: 'bug', icon: 'bug-outline' },
    { label: 'Pre-MVP', value: 'pre_mvp_feature', icon: 'flag-outline' },
    { label: 'Post-MVP', value: 'post_mvp_feature', icon: 'rocket-outline' }
  ] as const;

  // Priority options
  const priorities = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];

  // CI Color palette for diverse icons
  const iconColors = [
    COLORS.primary,      // Blue
    COLORS.success,      // Green
    COLORS.warning,      // Orange
    COLORS.info,         // Cyan
    COLORS.secondary,    // Purple
    COLORS.tertiary,     // Pink
  ];

  // Keyboard event handlers
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        const moveUpAmount = Math.max(0, Math.min(keyboardHeight - 100, keyboardHeight * 0.3));
        
        Animated.parallel([
          Animated.timing(keyboardAnimation, {
            toValue: 1, // Boolean for height interpolation
            duration: Platform.OS === 'ios' ? event.duration : 250,
            useNativeDriver: false,
          }),
          Animated.timing(keyboardHeightAnimation, {
            toValue: keyboardHeight, // Actual height for content movement
            duration: Platform.OS === 'ios' ? event.duration : 250,
            useNativeDriver: false,
          }),
          Animated.timing(modalTranslateY, {
            toValue: -moveUpAmount, // Move modal background up
            duration: Platform.OS === 'ios' ? event.duration : 250,
            useNativeDriver: true,
          })
        ]).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        Animated.parallel([
          Animated.timing(keyboardAnimation, {
            toValue: 0, // Boolean for height interpolation
            duration: Platform.OS === 'ios' ? event.duration : 250,
            useNativeDriver: false,
          }),
          Animated.timing(keyboardHeightAnimation, {
            toValue: 0, // Actual height for content movement
            duration: Platform.OS === 'ios' ? event.duration : 250,
            useNativeDriver: false,
          }),
          Animated.timing(modalTranslateY, {
            toValue: 0, // Return modal background to original position
            duration: Platform.OS === 'ios' ? event.duration : 250,
            useNativeDriver: true,
          })
        ]).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [keyboardAnimation, keyboardHeightAnimation, modalTranslateY]);

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error') => {
    setToast({ visible: true, message, type });
  };

  // Hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Input change handler
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      showToast('Please enter a title for your feedback', 'error');
      return false;
    }
    if (formData.title.trim().length < 3) {
      showToast('Title must be at least 3 characters long', 'error');
      return false;
    }
    if (formData.description && formData.description.trim().length < 10) {
      showToast('Description must be at least 10 characters long', 'error');
      return false;
    }
    return true;
  };

  // Form submit handler
  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setFormLoading(true);

    try {
      if (feedback) {
        // Edit mode
        const result = await feedbackService.updateFeedback(feedback.id, formData);
        if (result.success) {
          showToast('Feedback updated successfully!', 'success');
          onFeedbackUpdated?.(result.data);
          closeModal();
        } else {
          showToast(result.error || 'Failed to update feedback', 'error');
        }
      } else {
        // Create mode
        const result = await feedbackService.createFeedback(formData);
        if (result.success) {
          showToast('Feedback submitted successfully!', 'success');
          onFeedbackSubmitted?.(result.data);
          closeModal();
        } else {
          showToast(result.error || 'Failed to submit feedback', 'error');
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Modal open/close animation
  const openModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
        delay: 50,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Gesture handler for swipe to close
  const onGestureEvent = (event: any) => {
    const { translationY, state, velocityY } = event.nativeEvent;

    if (state === State.ACTIVE) {
      // Only allow downward dragging (translationY >= 0)
      if (translationY >= 0) {
        panY.setValue(translationY);
      } else {
        panY.setValue(0);
      }
    }

    if (state === State.END) {
      if (translationY > 100 && velocityY > 500) {
        closeModal();
      } else {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Effect to handle modal visibility
  useEffect(() => {
    if (visible) {
      openModal();
    } else {
      closeModal();
    }
  }, [visible]);

  // Effect to handle toast auto-hide
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(hideToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // If editing, pre-fill form
  useEffect(() => {
    if (feedback) {
      setFormData({
        title: feedback.title || '',
        description: feedback.description || '',
        category: feedback.category || 'bug',
        priority: feedback.priority || 'medium',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'bug',
        priority: 'medium',
      });
    }
  }, [feedback, visible]);

  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const renderCategorySelector = () => (
    <View>
        <View style={styles.labelContainer}>
          <Ionicons name="pricetag" size={16} color={iconColors[1]} />
          <Text style={[styles.label, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              Category
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700, marginBottom: 8 }]}>Is it a bug or a feature request?</Text>
        <View style={styles.categoryContainer}>
            {categories.map((cat, index) => (
                <TouchableOpacity
                    key={cat.value}
                    style={[
                        styles.categoryButton,
                        {
                            backgroundColor: formData.category === cat.value ? COLORS.primary : (dark ? COLORS.dark3 : COLORS.grayscale100),
                            borderColor: formData.category === cat.value ? COLORS.primary : (dark ? COLORS.grayscale700 : COLORS.grayscale200),
                            marginLeft: index === 0 ? 0 : 8,
                        },
                    ]}
                    onPress={() => handleInputChange('category', cat.value)}
                >
                    <Ionicons
                        name={cat.icon as any}
                        size={18}
                        color={formData.category === cat.value ? COLORS.white : (dark ? COLORS.grayscale200 : COLORS.grayscale700)}
                    />
                    <Text
                        style={[
                            styles.categoryButtonText,
                            {
                                color: formData.category === cat.value ? COLORS.white : (dark ? COLORS.grayscale200 : COLORS.grayscale700),
                            },
                        ]}
                    >
                        {cat.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
  );

  const renderInputField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    multiline: boolean = false,
    numberOfLines: number = 1,
    textAlignVertical: 'top' | 'bottom' | 'center' = 'top',
    required: boolean = false,
    inputRef?: React.RefObject<TextInput | null>
  ) => (
    <View style={styles.inputSection}>
      <View style={styles.labelContainer}>
        <Ionicons name="create" size={16} color={iconColors[0]} />
        <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          {label} {required && '*'}
        </Text>
      </View>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
        placeholder={placeholder}
        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={textAlignVertical}
        onFocus={() => {
          if (inputRef && inputRef.current && scrollRef.current) {
            scrollRef.current.scrollToFocusedInput(inputRef.current);
          }
        }}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeModal} />
      </Animated.View>
      
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              transform: [
                {
                  translateY: Animated.add(
                    modalAnimation.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
                    Animated.add(panY, modalTranslateY)
                  ),
                },
              ],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={[styles.dragIndicator, { backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: iconColors[0] + '20' }]}>
                <Ionicons name="chatbubble-ellipses" size={24} color={iconColors[0]} />
              </View>
              <View>
                <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Send Feedback
                </Text>
                <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  Help us improve the app
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons 
                name="close-circle" 
                size={28} 
                color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
              />
            </TouchableOpacity>
          </View>

          {/* Form Content with Keyboard Avoidance */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={24}
          >
            <KeyboardAwareScrollView
              ref={scrollRef}
              enableOnAndroid
              extraScrollHeight={24}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.contentContainer}
            >
              {renderInputField("Title", formData.title, (text) => handleInputChange('title', text), "e.g. 'Improve dark mode'", false, 1, 'center', true, titleInputRef)}
              {renderCategorySelector()}
              {renderInputField("Description", formData.description || '', (text) => handleInputChange('description', text), "Describe the issue or suggestion...", true, 4, 'top', false, descriptionInputRef)}

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: formLoading ? COLORS.grayscale400 : COLORS.primary }]}
                onPress={handleFormSubmit}
                disabled={formLoading}
              >
                {formLoading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitButtonText}>{feedback ? 'Update Feedback' : 'Send Feedback'}</Text>}
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </PanGestureHandler>

      {/* Toast */}
      {toast.visible && (
        <View style={[styles.toast, { backgroundColor: toast.type === 'success' ? COLORS.success : COLORS.error }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
          <TouchableOpacity onPress={hideToast}>
            <Ionicons name="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: '60%',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inputSection: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'semibold',
    marginLeft: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'regular',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'regular',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'regular',
    textAlign: 'right',
    marginTop: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    zIndex: 1000,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'semibold',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'regular',
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: 'medium',
    marginLeft: 6,
  },
});

export default FeedbackModal; 