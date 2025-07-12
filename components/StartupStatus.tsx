import { COLORS } from '@/constants';
import { startupErrorHandler } from '@/utils/startupErrorHandler';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface StartupStatusProps {
  isReady: boolean;
}

const StartupStatus: React.FC<StartupStatusProps> = ({ isReady }) => {
  const errors = startupErrorHandler.getErrors();
  const hasErrors = errors.length > 0;
  const isInitialized = startupErrorHandler.isAppInitialized();

  if (isReady && isInitialized && !hasErrors) {
    return null; // Don't show anything if everything is good
  }

  return (
    <View style={styles.container}>
      {!isReady && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Initializing app...</Text>
        </View>
      )}

      {hasErrors && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Startup Issues Detected</Text>
          <Text style={styles.errorText}>
            {startupErrorHandler.getErrorSummary()}
          </Text>
          <Text style={styles.errorMessage}>
            The app will continue to work, but some features may be limited.
          </Text>
        </View>
      )}

      {isReady && !isInitialized && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Some components may not be fully initialized
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.greyscale600,
    fontFamily: 'medium',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.greyscale600,
  },
  warningContainer: {
    padding: 16,
    backgroundColor: '#fef3cd',
    borderRadius: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
});

export default StartupStatus; 