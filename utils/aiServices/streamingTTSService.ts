import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface StreamingTTSConfig {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
  chunkSize?: number; // Words per chunk
  overlapSize?: number; // Words to overlap between chunks
  immediateStart?: boolean; // Start speaking immediately
}

export class StreamingTTSService {
  private static isSpeaking = false;
  private static currentUtterance: any = null;
  private static speechQueue: string[] = [];
  private static isProcessing = false;
  private static isInterrupted = false; // Add interruption flag

  /**
   * Stream text with immediate TTS start
   */
  static async streamText(text: string, config: StreamingTTSConfig = {}): Promise<void> {
    this.isInterrupted = false; // Reset interruption flag
    const defaultConfig: StreamingTTSConfig = {
      speed: 1.0,
      pitch: 1.1,
      volume: 1.0,
      language: 'en-US',
      chunkSize: 10, // Words per chunk
      overlapSize: 2, // Words to overlap
      immediateStart: true
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Split text into streaming chunks
    const chunks = this.createStreamingChunks(text, finalConfig.chunkSize!, finalConfig.overlapSize!);
    
    // Start speaking immediately with first chunk
    if (chunks.length > 0 && finalConfig.immediateStart && !this.isInterrupted) {
      await this.speakChunk(chunks[0], finalConfig);
    }

    // Process remaining chunks
    for (let i = 1; i < chunks.length && !this.isInterrupted; i++) {
      if (this.isInterrupted) break; // Check interruption before each chunk
      await this.waitForChunkCompletion();
      if (this.isInterrupted) break; // Check again after waiting
      await this.speakChunk(chunks[i], finalConfig);
    }
  }

  /**
   * Create overlapping chunks for smooth streaming
   */
  private static createStreamingChunks(text: string, chunkSize: number, overlapSize: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Speak a single chunk with immediate start
   */
  private static async speakChunk(chunk: string, config: StreamingTTSConfig): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return this.speakChunkWeb(chunk, config);
    } else {
      return this.speakChunkMobile(chunk, config);
    }
  }

  /**
   * Web streaming TTS with immediate start
   */
  private static async speakChunkWeb(chunk: string, config: StreamingTTSConfig): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Stop any current speech immediately
        window.speechSynthesis.cancel();

        const utterance = new window.SpeechSynthesisUtterance(chunk);
        
        // Get best voice
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = voices.find(v => 
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('aria') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('nova')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        // Apply settings for natural speech
        utterance.rate = config.speed || 1.0;
        utterance.pitch = config.pitch || 1.1;
        utterance.volume = config.volume || 1.0;
        utterance.lang = config.language || 'en-US';

        // Enhanced text for natural speech
        utterance.text = this.enhanceTextForSpeech(chunk);

        // Event handlers
        utterance.onstart = () => {
          this.isSpeaking = true;
          console.log('🎤 Streaming TTS started:', chunk.substring(0, 50) + '...');
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          console.log('✅ Chunk completed');
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ Streaming TTS error:', event);
          this.isSpeaking = false;
          resolve();
        };

        // Start immediately
        window.speechSynthesis.speak(utterance);
        this.currentUtterance = utterance;

      } catch (error) {
        console.error('Streaming TTS setup failed:', error);
        resolve();
      }
    });
  }

  /**
   * Mobile streaming TTS with immediate start
   */
  private static async speakChunkMobile(chunk: string, config: StreamingTTSConfig): Promise<void> {
    try {
      // Stop any current speech immediately
      await Speech.stop();

      const enhancedChunk = this.enhanceTextForSpeech(chunk);
      
      await Speech.speak(enhancedChunk, {
        language: config.language || 'en-US',
        pitch: config.pitch || 1.1,
        rate: config.speed || 1.0,
        volume: config.volume || 1.0
      });

      this.isSpeaking = true;
      
      // Wait for completion
      await new Promise<void>(resolve => {
        const checkComplete = () => {
          Speech.isSpeakingAsync().then(speaking => {
            if (!speaking) {
              this.isSpeaking = false;
              resolve();
            } else {
              setTimeout(checkComplete, 100);
            }
          });
        };
        checkComplete();
      });

    } catch (error) {
      console.error('Mobile streaming TTS failed:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Wait for current chunk to complete before next
   */
  private static async waitForChunkCompletion(): Promise<void> {
    return new Promise(resolve => {
      const checkComplete = () => {
        if (!this.isSpeaking || this.isInterrupted) {
          resolve();
        } else {
          setTimeout(checkComplete, 50); // Check every 50ms
        }
      };
      checkComplete();
    });
  }

  /**
   * Enhanced text for natural speech
   */
  private static enhanceTextForSpeech(text: string): string {
    return text
      // Add natural pauses
      .replace(/\./g, '... ')
      .replace(/\!/g, '! ')
      .replace(/\?/g, '? ')
      .replace(/\,/g, ', ')
      // Add emphasis to important words
      .replace(/\*\*(.*?)\*\*/g, '<emphasis>$1</emphasis>')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Stop all streaming TTS immediately
   */
  static stop(): void {
    this.isInterrupted = true; // Set interruption flag
    this.isSpeaking = false;
    this.speechQueue = [];
    this.isProcessing = false;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
  }

  /**
   * Check if currently speaking
   */
  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Stream text with OpenAI TTS for highest quality
   */
  static async streamWithOpenAI(text: string, voice: string = 'nova'): Promise<void> {
    this.isInterrupted = false; // Reset interruption flag
    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, falling back to streaming TTS');
      return this.streamText(text);
    }

    try {
      // For OpenAI TTS, we'll use a different approach since it doesn't support streaming
      // We'll split into smaller chunks and play them sequentially
      const chunks = this.createStreamingChunks(text, 15, 3);
      
      for (const chunk of chunks) {
        if (this.isInterrupted) break; // Check interruption before each chunk
        await this.playOpenAIAudio(chunk, voice);
        if (this.isInterrupted) break; // Check again after playing
        await this.waitForChunkCompletion();
      }

    } catch (error) {
      console.error('OpenAI streaming TTS failed:', error);
      // Fallback to standard streaming TTS
      return this.streamText(text);
    }
  }

  /**
   * Play OpenAI audio chunk
   */
  private static async playOpenAIAudio(text: string, voice: string): Promise<void> {
    if (this.isInterrupted) return; // Don't play if interrupted
    
    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    
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
        headers['Authorization'] = `Bearer ${openaiApiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: text,
          voice: voice,
          response_format: 'mp3',
          speed: 1.0
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio with proper error handling
      const audio = new Audio(audioUrl);
      this.isSpeaking = true;
      
      return new Promise((resolve, reject) => {
        // Handle successful playback completion
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          resolve();
        };
        
        // Handle playback errors
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          console.error('Audio playback error:', error);
          resolve(); // Resolve instead of reject to continue flow
        };
        
        // Handle abort errors gracefully
        audio.onabort = () => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          console.log('Audio playback aborted');
          resolve(); // Resolve instead of reject
        };
        
        // Start playback with error handling
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Handle play() promise rejection (like AbortError)
            if (error.name === 'AbortError') {
              console.log('Audio playback aborted during play()');
              URL.revokeObjectURL(audioUrl);
              this.isSpeaking = false;
              resolve(); // Resolve instead of reject
            } else {
              console.error('Audio play() failed:', error);
              URL.revokeObjectURL(audioUrl);
              this.isSpeaking = false;
              resolve(); // Resolve instead of reject
            }
          });
        }
        
        // Add interruption check
        const checkInterruption = () => {
          if (this.isInterrupted) {
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch (e) {
              // Ignore errors when stopping interrupted audio
              console.log('Audio already stopped');
            }
            URL.revokeObjectURL(audioUrl);
            this.isSpeaking = false;
            resolve();
          } else {
            setTimeout(checkInterruption, 100);
          }
        };
        checkInterruption();
      });

    } catch (error) {
      console.error('OpenAI audio chunk failed:', error);
      this.isSpeaking = false;
      // Don't throw error, just resolve to continue flow
      return Promise.resolve();
    }
  }
} 