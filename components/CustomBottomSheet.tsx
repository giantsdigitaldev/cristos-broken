import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { COLORS } from '../constants';

const { height: screenHeight } = Dimensions.get('window');

interface CustomBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number | string;
  closeOnTouchOutside?: boolean;
  closeOnSwipe?: boolean;
  animationDuration?: number;
  backgroundColor?: string;
  borderRadius?: number;
}

const CustomBottomSheet: React.FC<CustomBottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = '50%',
  closeOnTouchOutside = true,
  closeOnSwipe = true,
  animationDuration = 300,
  backgroundColor = COLORS.white,
  borderRadius = 20,
}) => {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Pull-to-dismiss gesture handling
  const gestureTranslateY = useRef(new Animated.Value(0)).current;
  const [isGestureDismissing, setIsGestureDismissing] = useState(false);

  // Gesture handling for pull-to-dismiss
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: gestureTranslateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === 5) { // END state
      const shouldDismiss = translationY > 80 || (translationY > 50 && velocityY > 500);
      
      if (shouldDismiss && closeOnSwipe) {
        // Dismiss if dragged down more than 80px or with high velocity
        console.log('Dismissing modal via gesture');
        setIsGestureDismissing(true);
        
        // Set translateY to screenHeight to prevent bounce
        translateY.setValue(screenHeight);
        
        // Animate out with gesture
        Animated.parallel([
          Animated.timing(gestureTranslateY, {
            toValue: screenHeight,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          console.log('Gesture dismissal complete, calling onClose');
          // Reset gesture state before calling onClose
          setIsGestureDismissing(false);
          gestureTranslateY.setValue(0);
          // Call onClose after a small delay to ensure state is reset
          setTimeout(() => {
            onClose();
          }, 50);
        });
      } else {
        // Snap back to original position with spring animation
        Animated.spring(gestureTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Reset gesture values when modal opens
  useEffect(() => {
    if (visible) {
      console.log('Modal becoming visible, resetting gesture values');
      gestureTranslateY.setValue(0);
      setIsGestureDismissing(false);
    }
  }, [visible]);

  useEffect(() => {
    console.log('Modal visibility effect - visible:', visible, 'isGestureDismissing:', isGestureDismissing);
    if (visible && !isGestureDismissing) {
      // Show animation
      console.log('Starting show animation');
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible && !isGestureDismissing) {
      // Hide animation
      console.log('Starting hide animation');
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity, animationDuration, isGestureDismissing]);

  const handleClose = () => {
    console.log('handleClose called, closeOnTouchOutside:', closeOnTouchOutside);
    if (closeOnTouchOutside) {
      onClose();
    }
  };

  // Note: Swipe gesture handling removed for Expo Go compatibility
  // Use closeOnTouchOutside instead

  const sheetHeight = typeof height === 'string' 
    ? (height.includes('%') ? screenHeight * (parseInt(height) / 100) : screenHeight * 0.5)
    : height;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.backdropView,
              { 
                opacity: Animated.multiply(
                  opacity,
                  gestureTranslateY.interpolate({
                    inputRange: [0, 200],
                    outputRange: [1, 0.3],
                    extrapolate: 'clamp',
                  })
                )
              }
            ]}
          />
        </TouchableOpacity>

        {/* Bottom Sheet */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetY={[-10, 10]}
          failOffsetY={[-100, 100]}
          shouldCancelWhenOutside={false}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                height: sheetHeight,
                backgroundColor,
                borderRadius,
                transform: [
                  { 
                    translateY: Animated.add(
                      translateY,
                      gestureTranslateY
                    )
                  }
                ],
                // Add subtle opacity change during gesture
                opacity: gestureTranslateY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0.95],
                  extrapolate: 'clamp',
                }),
                // Dynamic shadow during gesture
                shadowOpacity: gestureTranslateY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0.25, 0.1],
                  extrapolate: 'clamp',
                }),
                shadowRadius: gestureTranslateY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [3.84, 2],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {/* Handle */}
            <Animated.View 
              style={[
                styles.handle,
                {
                  transform: [
                    {
                      scale: gestureTranslateY.interpolate({
                        inputRange: [0, 100],
                        outputRange: [1, 1.2],
                        extrapolate: 'clamp',
                      })
                    },
                    {
                      rotate: gestureTranslateY.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0deg', '5deg'],
                        extrapolate: 'clamp',
                      })
                    }
                  ]
                }
              ]} 
            />
            
            {/* Content */}
            <View style={styles.content}>
              {children}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropView: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default CustomBottomSheet; 