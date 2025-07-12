import { COLORS } from '@/constants';
import { isVoiceFeaturesEnabled } from '@/utils/voiceFeatures';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VoiceOrbProps {
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  isListening: boolean;
  isProcessing: boolean;
  hasError: boolean;
  disabled?: boolean;
  isAISpeaking?: boolean;
  onStopAI?: () => void;
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({
  onVoiceStart,
  onVoiceStop,
  isListening,
  isProcessing,
  hasError,
  disabled = false,
  isAISpeaking = false,
  onStopAI,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // VOICE FEATURES DISABLED - Check environment variable
  const isVoiceDisabled = !isVoiceFeaturesEnabled();

  useEffect(() => {
    if (isListening && !isVoiceDisabled) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop pulsing
      pulseAnim.setValue(0);
    }
  }, [isListening, isVoiceDisabled]);

  useEffect(() => {
    if (isProcessing && !isVoiceDisabled) {
      // Start rotation animation
      Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Stop rotation
      rotationAnim.setValue(0);
    }
  }, [isProcessing, isVoiceDisabled]);

  const handlePress = () => {
    if (disabled || isVoiceDisabled) return;
    if (isAISpeaking && onStopAI) {
      onStopAI();
      return;
    }
    if (isListening) {
      onVoiceStop();
    } else {
      onVoiceStart();
    }
  };

  const getOrbColor = () => {
    if (isVoiceDisabled) return COLORS.grayscale400; // Disabled gray
    if (hasError) return COLORS.error;
    if (isAISpeaking) return COLORS.warning;
    if (isProcessing) return COLORS.warning;
    if (isListening) return COLORS.success;
    return COLORS.primary;
  };

  const getIconName = () => {
    if (isVoiceDisabled) return 'mic-off'; // Disabled microphone icon
    if (hasError) return 'alert-circle';
    if (isAISpeaking) return 'stop-circle';
    if (isProcessing) return 'sync';
    if (isListening) return 'mic';
    return 'mic-outline';
  };

  const animatedStyle = {
    transform: [
      {
        scale: scaleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
      {
        rotate: rotationAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
    opacity: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    }),
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.orb,
          { backgroundColor: getOrbColor() },
          (disabled || isVoiceDisabled) && styles.disabled
        ]}
        onPress={handlePress}
        disabled={disabled || isVoiceDisabled}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <Ionicons
            name={getIconName() as any}
            size={28}
            color={COLORS.white}
          />
        </Animated.View>
      </TouchableOpacity>
      {isVoiceDisabled && (
        <Text style={styles.disabledText}>Voice Disabled</Text>
      )}
      {isAISpeaking && !isVoiceDisabled && (
        <Text style={styles.processingText}>AI Speaking (Tap to stop)</Text>
      )}
      {isListening && !isAISpeaking && !isVoiceDisabled && (
        <Text style={styles.listeningText}>Listening...</Text>
      )}
      {isProcessing && !isAISpeaking && !isVoiceDisabled && (
        <Text style={styles.processingText}>Processing...</Text>
      )}
      {hasError && !isVoiceDisabled && (
        <Text style={styles.errorText}>Error</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  listeningText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  processingText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
  },
  disabledText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.grayscale700,
    fontWeight: '600',
  },
});

export default VoiceOrb; 