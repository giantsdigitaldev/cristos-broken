import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const { dark } = useTheme();
  
  // Modal animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

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

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      closeModal();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleCancel}
        />
        
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: Animated.add(
                      modalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [SIZES.height, 0],
                      }),
                      panY
                    ),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                },
              ]}
            >
              {/* Drag indicator */}
              <View
                style={[
                  styles.dragIndicator,
                  {
                    backgroundColor: dark ? COLORS.gray2 : COLORS.grayscale200,
                  },
                ]}
              />

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  },
                ]}
              >
                <Ionicons name="log-out-outline" size={32} color={COLORS.error} />
              </View>

              {/* Title */}
              <Text
                style={[
                  styles.title,
                  {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  },
                ]}
              >
                Sign Out
              </Text>

              {/* Message */}
              <Text
                style={[
                  styles.message,
                  {
                    color: dark ? COLORS.grayscale200 : COLORS.grayscale700,
                  },
                ]}
              >
                Are you sure you want to sign out? You will need to sign in again to access your account.
              </Text>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                      borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    },
                  ]}
                  onPress={handleCancel}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      styles.cancelButtonText,
                      {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    {
                      backgroundColor: COLORS.error,
                      opacity: isLoading ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleConfirm}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>
                    {isLoading ? 'Signing Out...' : 'Sign Out'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 300,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontFamily: 'medium',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  cancelButtonText: {
    // Color is set dynamically
  },
  confirmButtonText: {
    color: COLORS.white,
  },
});

export default LogoutConfirmationModal; 