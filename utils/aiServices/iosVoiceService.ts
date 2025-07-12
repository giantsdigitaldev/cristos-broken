import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';

export interface IOSVoiceConfig {
  language?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onTTSStart?: () => void;
  onTTSEnd?: () => void;
  onPermissionRequest?: () => void;
}

export class IOSVoiceService {
  private static isListening = false;
  private static isSpeaking = false;
  private static currentConfig: IOSVoiceConfig | null = null;
  private static speechRecognition: any = null;
  private static isExpoGo = false;
  private static isDevelopmentBuild = false;
  private static hasNativeModules = false;

  /**
   * Initialize the iOS voice service with full native support
   */
  static async initialize(): Promise<void> {
    try {
      // Detect environment
      this.detectEnvironment();
      
      if (this.isDevelopmentBuild && this.hasNativeModules) {
        console.log('🚀 Development build detected - enabling full native voice features');
        await this.initializeNativeModules();
      } else if (this.isExpoGo) {
        console.log('📱 Expo Go detected - using fallback voice services');
        await this.initializeExpoGoFallback();
      } else {
        console.log('⚠️ Unknown environment - using basic fallback');
        await this.initializeBasicFallback();
      }
      
      console.log('✅ iOS Voice Service initialized successfully');
    } catch (error) {
      console.error('❌ iOS Voice Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Detect the current environment
   */
  private static detectEnvironment(): void {
    // Check for development build indicators
    try {
      const { NativeModules } = require('react-native');
      
      // Check if we have native modules available
      if (NativeModules.ExpoSpeechRecognition || 
          NativeModules.Voice || 
          NativeModules.ExpoSpeech) {
        this.hasNativeModules = true;
        this.isDevelopmentBuild = true;
        console.log('✅ Native modules detected - development build confirmed');
        return;
      }
    } catch (error) {
      console.log('⚠️ Native modules not available');
    }

    // Check for Expo Go indicators
    if (typeof global !== 'undefined' && (global as any).__EXPO_GO__) {
      this.isExpoGo = true;
      console.log('📱 Expo Go environment detected');
      return;
    }

    // Check for development build URL patterns
    if (typeof global !== 'undefined' && (global as any).__DEV__) {
      this.isDevelopmentBuild = true;
      console.log('🔧 Development environment detected');
    }
  }

  /**
   * Initialize native modules for full voice features
   */
  private static async initializeNativeModules(): Promise<void> {
    try {
      // Try to initialize expo-speech-recognition for STT
      if (Platform.OS === 'ios') {
        const SpeechRecognition = require('expo-speech-recognition');
        this.speechRecognition = SpeechRecognition;
        console.log('✅ Native speech recognition initialized');
      }

      // Initialize expo-speech for TTS
      console.log('✅ Native speech synthesis initialized');
      
    } catch (error) {
      console.warn('⚠️ Some native modules failed to initialize:', error);
      // Fall back to basic functionality
      await this.initializeBasicFallback();
    }
  }

  /**
   * Initialize Expo Go fallback
   */
  private static async initializeExpoGoFallback(): Promise<void> {
    try {
      // Use expo-speech for TTS in Expo Go
      console.log('✅ Expo Go TTS fallback initialized');
    } catch (error) {
      console.warn('⚠️ Expo Go TTS fallback failed:', error);
    }
  }

  /**
   * Initialize basic fallback
   */
  private static async initializeBasicFallback(): Promise<void> {
    try {
      console.log('✅ Basic TTS fallback initialized');
    } catch (error) {
      console.warn('⚠️ Basic TTS fallback failed:', error);
    }
  }

  /**
   * Start speech recognition (STT)
   */
  static async startListening(config: IOSVoiceConfig): Promise<void> {
    if (this.isListening) {
      console.log('🔄 Already listening, skipping start');
      return;
    }

    this.currentConfig = config;
    this.isListening = true;

    try {
      if (this.isDevelopmentBuild && this.speechRecognition) {
        await this.startNativeSTT(config);
      } else {
        await this.startFallbackSTT(config);
      }
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      this.isListening = false;
      config.onError?.(error instanceof Error ? error.message : 'Failed to start listening');
    }
  }

  /**
   * Start native speech recognition
   */
  private static async startNativeSTT(config: IOSVoiceConfig): Promise<void> {
    try {
      // Request permissions
      const { requestPermissionsAsync } = this.speechRecognition;
      const { status } = await requestPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Speech recognition permission denied');
      }

      // Start listening with native module
      await this.speechRecognition.startListeningAsync({
        language: config.language || 'en-US',
        partialResults: true,
        onSpeechStart: () => {
          console.log('🎤 Native STT started');
          config.onSpeechStart?.();
        },
        onSpeechEnd: () => {
          console.log('🛑 Native STT ended');
          this.isListening = false;
          config.onSpeechEnd?.();
        },
        onSpeechResults: (results: any) => {
          if (results && results.length > 0) {
            const text = results[0];
            console.log('🎤 Native STT result:', text);
            config.onFinalResult?.(text);
          }
        },
        onSpeechError: (error: any) => {
          console.error('❌ Native STT error:', error);
          this.isListening = false;
          config.onError?.(error.message || 'Speech recognition error');
        }
      });

    } catch (error) {
      console.error('❌ Native STT failed:', error);
      throw error;
    }
  }

  /**
   * Start fallback speech recognition
   */
  private static async startFallbackSTT(config: IOSVoiceConfig): Promise<void> {
    console.log('📱 Using fallback STT (not available in Expo Go)');
    
    // Show user-friendly message
    Alert.alert(
      'Voice Input Not Available',
      'Speech recognition requires a development build. Please use the development build for full voice features.',
      [
        { text: 'OK', onPress: () => {
          this.isListening = false;
          config.onError?.('Speech recognition not available in Expo Go');
        }}
      ]
    );
  }

  /**
   * Stop speech recognition
   */
  static async stopListening(): Promise<void> {
    if (!this.isListening) {
      console.log('🔄 Not listening, skipping stop');
      return;
    }

    try {
      if (this.speechRecognition) {
        await this.speechRecognition.stopListeningAsync();
      }
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
    } finally {
      this.isListening = false;
      console.log('🛑 STT stopped');
    }
  }

  /**
   * Speak text using TTS
   */
  static async speak(text: string, config: IOSVoiceConfig): Promise<void> {
    if (this.isSpeaking) {
      console.log('🔄 Already speaking, skipping');
      return;
    }

    this.isSpeaking = true;
    config.onTTSStart?.();

    try {
      // Use OpenAI TTS for premium voice quality in development builds
      if (this.isDevelopmentBuild) {
        await this.speakWithOpenAI(text, config);
      } else {
        await this.speakWithExpoSpeech(text, config);
      }
    } catch (error) {
      console.error('❌ TTS failed:', error);
      this.isSpeaking = false;
      config.onError?.(error instanceof Error ? error.message : 'TTS failed');
    }
  }

  /**
   * Speak with OpenAI TTS (ChatGPT-grade Nova voice)
   */
  private static async speakWithOpenAI(text: string, config: IOSVoiceConfig): Promise<void> {
    try {
      const isWeb = Platform.OS === 'web';
      // @ts-ignore
      const isLocalhost = isWeb && (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let endpoint: string;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (isWeb && isLocalhost) {
        // Use local proxy for web development (if available)
        endpoint = 'http://localhost:3001/api/tts';
      } else {
        // Use direct OpenAI API for iOS/Android/production web
        endpoint = 'https://api.openai.com/v1/audio/speech';
        headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'nova', // ChatGPT-grade natural voice
          response_format: 'mp3',
          speed: config.speed || 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        this.isSpeaking = false;
        config.onTTSEnd?.();
      };
      audio.play();

    } catch (error) {
      console.error('❌ OpenAI TTS failed, falling back to expo-speech:', error);
      await this.speakWithExpoSpeech(text, config);
    }
  }

  /**
   * Speak with expo-speech fallback
   */
  private static async speakWithExpoSpeech(text: string, config: IOSVoiceConfig): Promise<void> {
    try {
      await Speech.speak(text, {
        language: config.language || 'en-US',
        pitch: config.pitch || 1.0,
        rate: config.speed || 1.0,
        volume: config.volume || 1.0,
        voice: config.voice,
        onDone: () => {
          console.log('✅ TTS completed');
          this.isSpeaking = false;
          config.onTTSEnd?.();
        },
        onError: (error: any) => {
          console.error('❌ TTS error:', error);
          this.isSpeaking = false;
          config.onError?.(error);
        }
      });
    } catch (error) {
      console.error('❌ expo-speech failed:', error);
      this.isSpeaking = false;
      config.onError?.(error instanceof Error ? error.message : 'expo-speech failed');
    }
  }

  /**
   * Stop speaking
   */
  static async stopSpeaking(): Promise<void> {
    if (!this.isSpeaking) {
      console.log('🔄 Not speaking, skipping stop');
      return;
    }

    try {
      await Speech.stop();
    } catch (error) {
      console.error('❌ Failed to stop speaking:', error);
    } finally {
      this.isSpeaking = false;
      console.log('🛑 TTS stopped');
    }
  }

  /**
   * Check if we're in a development build
   */
  static isDevelopmentBuildEnvironment(): boolean {
    return this.isDevelopmentBuild && this.hasNativeModules;
  }

  /**
   * Check if we're in Expo Go
   */
  static isExpoGoEnvironment(): boolean {
    return this.isExpoGo;
  }

  /**
   * Get current listening state
   */
  static getListeningState(): boolean {
    return this.isListening;
  }

  /**
   * Get current speaking state
   */
  static getSpeakingState(): boolean {
    return this.isSpeaking;
  }
} 