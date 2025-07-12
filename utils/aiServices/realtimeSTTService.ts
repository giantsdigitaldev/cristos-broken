import { Platform } from 'react-native';

export interface RealtimeSTTConfig {
  language?: string;
  interimResults?: boolean;
  continuous?: boolean;
  autoCorrect?: boolean;
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onInterruption?: () => void; // Called if user speaks while AI is speaking
  onVoiceDetected?: (isUserVoice: boolean) => void; // Called when voice is detected
  onTranscript?: (text: string, isFinal: boolean) => void; // Called for each transcript update
  onFinalTranscript?: (text: string) => void; // Called when speech is complete
}

export interface STTResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  error?: string;
  isUserVoice?: boolean;
}

export class RealtimeSTTService {
  private static isListening = false;
  private static isAISpeaking = false;
  private static webRecognition: any = null;
  private static lastConfig: RealtimeSTTConfig | null = null;
  private static restartTimeout: number | null = null;
  private static isRestarting = false;

  /**
   * Set whether the AI is currently speaking (TTS active)
   */
  static setAISpeaking(isSpeaking: boolean) {
    this.isAISpeaking = isSpeaking;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (isSpeaking) {
        // Stop STT when AI starts speaking to prevent echo
        this.stopRealtimeSTT();
      } else {
        // Restart STT when AI stops speaking
        if (this.lastConfig && !this.isListening) {
          setTimeout(() => {
            this.startRealtimeSTT(this.lastConfig!);
          }, 500); // Small delay to ensure TTS is fully stopped
        }
      }
    }
  }

  /**
   * Start real-time speech-to-text
   */
  static startRealtimeSTT(config: RealtimeSTTConfig = {}) {
    if (this.isListening || this.isRestarting || this.isAISpeaking) {
      console.log('🔄 STT already running or AI speaking, skipping start');
      return;
    }

    this.lastConfig = config;
    this.isRestarting = false;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.startWebSTT(config);
    } else {
      this.startMobileSTT(config);
    }
  }

  /**
   * Start web-based STT with standard voice activity detection
   */
  private static startWebSTT(config: RealtimeSTTConfig) {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('❌ Speech recognition not supported in this browser');
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.webRecognition = new SpeechRecognition();

      // Standard configuration
      this.webRecognition.continuous = true;
      this.webRecognition.interimResults = true;
      this.webRecognition.lang = config.language || 'en-US';
      this.webRecognition.maxAlternatives = 1;

      this.webRecognition.onstart = () => {
        console.log('🎤 Web STT started');
        this.isListening = true;
      };

      this.webRecognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;

          if (isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Send interim results for live display
        if (interimTranscript && config.onInterimResult) {
          config.onInterimResult(interimTranscript);
        }

        // Send final results when complete
        if (finalTranscript && config.onFinalResult) {
          config.onFinalResult(finalTranscript);
        }
      };

      this.webRecognition.onerror = (event: any) => {
        console.error('❌ Web STT error:', event.error);
        
        if (event.error === 'no-speech') {
          console.log('🔇 No speech detected, continuing to listen...');
          return;
        }
        
        if (event.error === 'aborted') {
          console.log('🛑 STT aborted, this is normal during interruptions');
          this.isListening = false;
          return;
        }

        // Restart for other errors
        this.restartSTT();
      };

      this.webRecognition.onend = () => {
        console.log('🔚 Web STT ended');
        this.isListening = false;
        
        // Only restart if not manually stopped and AI is not speaking
        if (!this.isAISpeaking && !this.isRestarting) {
          this.restartSTT();
        }
      };

      this.webRecognition.start();
    } catch (error) {
      console.error('❌ Error starting web STT:', error);
    }
  }

  /**
   * Stop real-time speech-to-text
   */
  static stopRealtimeSTT() {
    this.isRestarting = true;
    
    if (Platform.OS === 'web' && this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (error) {
        console.log('🛑 STT already stopped');
      }
    } else if (Platform.OS !== 'web') {
      console.log('🛑 Mobile STT stopped');
    }
    
    this.isListening = false;
  }

  /**
   * Restart STT with delay to prevent rapid cycling
   */
  private static restartSTT() {
    if (this.isRestarting || this.isAISpeaking) return;
    
    this.isRestarting = true;
    const delay = Math.random() * 1000 + 500; // 0.5-1.5 seconds
    
    console.log(`🔄 Restarting STT in ${Math.round(delay)}ms`);
    
    this.restartTimeout = setTimeout(() => {
      this.isRestarting = false;
      if (!this.isAISpeaking && this.lastConfig) {
        this.startRealtimeSTT(this.lastConfig);
      }
    }, delay);
  }

  /**
   * Get current listening status
   */
  static getListeningStatus(): boolean {
    return this.isListening;
  }

  /**
   * Mobile real-time STT with Whisper AI
   */
  private static async startMobileSTT(config: RealtimeSTTConfig): Promise<void> {
    try {
      // For mobile, we'll use a different approach since we need to handle audio recording
      console.log('📱 Mobile STT not yet implemented');
    } catch (error) {
      console.error('❌ Error starting mobile STT:', error);
    }
  }

  /**
   * Process audio chunk with Whisper AI for enhanced transcription
   */
  static async processAudioChunkWithWhisper(
    audioData: ArrayBuffer | Blob,
    sessionId: string
  ): Promise<STTResult> {
    try {
      // Implementation for Whisper AI processing
      console.log('🎤 Processing audio with Whisper AI');
      
      // Placeholder for Whisper AI integration
      return {
        text: '',
        isFinal: true,
        confidence: 0.9
      };
    } catch (error) {
      console.error('❌ Error processing audio with Whisper:', error);
      return {
        text: '',
        isFinal: true,
        error: 'Failed to process audio'
      };
    }
  }

  /**
   * Enhance transcription with AI-powered correction
   */
  static async enhanceTranscriptionWithCorrection(
    originalText: string,
    audioData?: ArrayBuffer | Blob
  ): Promise<string> {
    try {
      // Apply basic corrections
      let correctedText = this.applyBasicCorrections(originalText);
      
      // If we have audio data, use Whisper for enhancement
      if (audioData) {
        const whisperResult = await this.processAudioChunkWithWhisper(audioData, 'enhancement');
        if (whisperResult.text && whisperResult.confidence && whisperResult.confidence > 0.8) {
          correctedText = whisperResult.text;
        }
      }
      
      return correctedText;
    } catch (error) {
      console.error('❌ Error enhancing transcription:', error);
      return originalText;
    }
  }

  /**
   * Apply basic text corrections
   */
  private static applyBasicCorrections(text: string): string {
    return text
      .replace(/\b(um|uh|er|ah)\b/gi, '') // Remove filler words
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Get available languages for speech recognition
   */
  static getAvailableLanguages(): string[] {
    return [
      'en-US',
      'en-GB',
      'es-ES',
      'fr-FR',
      'de-DE',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'ko-KR',
      'zh-CN'
    ];
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
} 