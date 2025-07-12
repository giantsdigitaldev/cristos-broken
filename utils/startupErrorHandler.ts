import { Platform } from 'react-native';

// 🚨 FIX: Startup error handler for storage and other initialization issues
export class StartupErrorHandler {
  private static instance: StartupErrorHandler;
  private errors: Error[] = [];
  private isInitialized = false;

  static getInstance(): StartupErrorHandler {
    if (!StartupErrorHandler.instance) {
      StartupErrorHandler.instance = new StartupErrorHandler();
    }
    return StartupErrorHandler.instance;
  }

  // Handle storage initialization errors
  handleStorageError(error: Error): void {
    console.error('🚨 Storage initialization error:', error);
    this.errors.push(error);
    
    // Log platform-specific information
    console.log('Platform info:', {
      platform: Platform.OS,
      version: Platform.Version,
    });
  }

  // Handle general startup errors
  handleStartupError(error: Error, context: string): void {
    console.error(`🚨 Startup error in ${context}:`, error);
    this.errors.push(error);
  }

  // Get all collected errors
  getErrors(): Error[] {
    return [...this.errors];
  }

  // Clear errors
  clearErrors(): void {
    this.errors = [];
  }

  // Check if there are critical errors
  hasCriticalErrors(): boolean {
    return this.errors.some(error => 
      error.message.includes('storage') || 
      error.message.includes('initialization') ||
      error.message.includes('AsyncStorage')
    );
  }

  // Get error summary
  getErrorSummary(): string {
    if (this.errors.length === 0) {
      return 'No errors';
    }

    const errorTypes = this.errors.map(error => error.message.split(':')[0]);
    const uniqueTypes = [...new Set(errorTypes)];
    
    return `${this.errors.length} error(s): ${uniqueTypes.join(', ')}`;
  }

  // Mark as initialized
  markInitialized(): void {
    this.isInitialized = true;
  }

  // Check if app is properly initialized
  isAppInitialized(): boolean {
    return this.isInitialized && !this.hasCriticalErrors();
  }
}

// Global error handler instance
export const startupErrorHandler = StartupErrorHandler.getInstance();

// Note: Global error handling is handled by React Native's built-in error boundary system
// and the ErrorBoundary component we created 