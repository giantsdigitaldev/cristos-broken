/**
 * Voice Features Utility
 * 
 * This utility provides functions to check if voice features are enabled
 * and to handle voice feature availability across the app.
 */

/**
 * Check if voice features are enabled via environment variable
 */
export const isVoiceFeaturesEnabled = (): boolean => {
  const voiceFeaturesEnabled = process.env.EXPO_PUBLIC_ENABLE_VOICE_FEATURES;
  return voiceFeaturesEnabled === 'true';
};

/**
 * Get voice features status message
 */
export const getVoiceFeaturesStatus = (): string => {
  if (isVoiceFeaturesEnabled()) {
    return 'Voice features are enabled';
  } else {
    return 'Voice features are disabled';
  }
};

/**
 * Check if voice features should be shown in UI
 */
export const shouldShowVoiceFeatures = (): boolean => {
  return isVoiceFeaturesEnabled();
};

/**
 * Get voice features disabled message
 */
export const getVoiceFeaturesDisabledMessage = (): string => {
  return 'Voice features are currently disabled. Use keyboard input instead.';
};

/**
 * Voice features configuration
 */
export const VOICE_FEATURES_CONFIG = {
  enabled: isVoiceFeaturesEnabled(),
  showInUI: shouldShowVoiceFeatures(),
  disabledMessage: getVoiceFeaturesDisabledMessage(),
}; 