import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  quality: 'standard' | 'hd' | 'ultra';
  naturalness: number; // 0-1 scale
}

export interface TTSConfig {
  voice?: string;
  speed?: number; // 0.25 to 4.0
  pitch?: number; // 0.5 to 2.0
  volume?: number; // 0 to 1
  language?: string;
  useOpenAI?: boolean; // Use OpenAI TTS for better quality
}

export class AdvancedTTSService {
  private static readonly OPENAI_TTS_VOICES = [
    'alloy',    // Neutral, balanced
    'echo',     // Male, warm
    'fable',    // Male, storytelling
    'onyx',     // Male, deep
    'nova',     // Female, clear
    'shimmer'   // Female, expressive
  ];

  private static readonly WEB_VOICE_PRIORITY = [
    // Premium natural voices (highest priority)
    'Google UK English Female',
    'Microsoft Aria Online (Natural)',
    'Microsoft Zira Online (Natural)',
    'Google US English Female',
    'Samantha',
    'Victoria',
    'Alex',
    'Karen',
    'Tessa',
    'Daniel',
    'Moira',
    'Fiona',
    'Tom',
    'Alice',
    'Bruce',
    'Fred',
    'Ralph',
    'Vicki',
    'Junior',
    'Kathy',
    'Princess',
    'Cellos',
    'Bells',
    'Boing',
    'Deranged',
    'Good News',
    'Hysterical',
    'Pipe Organ',
    'Trinoids',
    'Whisper',
    'Zarvox',
    // Generic but good quality
    'en-GB',
    'en-US',
    'en-AU',
    'en-CA'
  ];

  /**
   * Get the best available voice for the platform
   */
  static getBestVoice(): TTSVoice | null {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return this.getBestWebVoice();
    } else {
      return this.getBestMobileVoice();
    }
  }

  /**
   * Get the best web voice using advanced selection
   */
  private static getBestWebVoice(): TTSVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // First, try to find premium natural voices
    for (const priorityName of this.WEB_VOICE_PRIORITY) {
      const voice = voices.find(v => 
        v.name === priorityName || 
        v.name.toLowerCase().includes(priorityName.toLowerCase())
      );
      if (voice) {
        return {
          id: voice.voiceURI,
          name: voice.name,
          language: voice.lang,
          gender: this.detectGender(voice.name),
          quality: 'hd',
          naturalness: 0.9
        };
      }
    }

    // Fallback: find any female voice
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('aria') ||
      v.name.toLowerCase().includes('nova')
    );

    if (femaleVoice) {
      return {
        id: femaleVoice.voiceURI,
        name: femaleVoice.name,
        language: femaleVoice.lang,
        gender: 'female',
        quality: 'standard',
        naturalness: 0.7
      };
    }

    // Last resort: any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      return {
        id: englishVoice.voiceURI,
        name: englishVoice.name,
        language: englishVoice.lang,
        gender: this.detectGender(englishVoice.name),
        quality: 'standard',
        naturalness: 0.5
      };
    }

    return null;
  }

  /**
   * Get the best mobile voice
   */
  private static getBestMobileVoice(): TTSVoice {
    return {
      id: 'ios-default',
      name: 'iOS Default',
      language: 'en-US',
      gender: 'female',
      quality: 'hd',
      naturalness: 0.8
    };
  }

  /**
   * Detect gender from voice name
   */
  private static detectGender(voiceName: string): 'male' | 'female' {
    const name = voiceName.toLowerCase();
    if (name.includes('female') || name.includes('samantha') || 
        name.includes('aria') || name.includes('nova') || 
        name.includes('victoria') || name.includes('karen') ||
        name.includes('tessa') || name.includes('alice') ||
        name.includes('kathy') || name.includes('princess')) {
      return 'female';
    }
    if (name.includes('male') || name.includes('daniel') || 
        name.includes('alex') || name.includes('bruce') ||
        name.includes('fred') || name.includes('ralph') ||
        name.includes('tom') || name.includes('junior')) {
      return 'male';
    }
    return 'female'; // Default to female
  }

  /**
   * Speak text with advanced TTS
   */
  static async speak(text: string, config: TTSConfig = {}): Promise<void> {
    const defaultConfig: TTSConfig = {
      speed: 1.0,
      pitch: 1.1,
      volume: 1.0,
      language: 'en-US',
      useOpenAI: false
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      await this.speakWeb(text, finalConfig);
    } else {
      await this.speakMobile(text, finalConfig);
    }
  }

  /**
   * Web TTS with advanced voice selection
   */
  private static async speakWeb(text: string, config: TTSConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Get the best available voice
        const voice = this.getBestWebVoice();
        
        const utterance = new window.SpeechSynthesisUtterance(text);
        
        if (voice) {
          utterance.voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voice.id) || null;
        }
        
        // Apply advanced settings
        utterance.rate = config.speed || 1.0;
        utterance.pitch = config.pitch || 1.1;
        utterance.volume = config.volume || 1.0;
        utterance.lang = config.language || 'en-US';

        // Add natural pauses and emphasis
        const enhancedText = this.enhanceTextForSpeech(text);
        utterance.text = enhancedText;

        // Event handlers
        utterance.onstart = () => {
          console.log('🎤 TTS started:', voice?.name || 'Default');
        };

        utterance.onend = () => {
          console.log('✅ TTS completed');
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ TTS error:', event);
          reject(new Error('TTS failed'));
        };

        // Stop any current speech and start new
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);

      } catch (error) {
        console.error('TTS setup failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Mobile TTS with enhanced settings
   */
  private static async speakMobile(text: string, config: TTSConfig): Promise<void> {
    try {
      const enhancedText = this.enhanceTextForSpeech(text);
      
      await Speech.speak(enhancedText, {
        language: config.language || 'en-US',
        pitch: config.pitch || 1.1,
        rate: config.speed || 1.0,
        volume: config.volume || 1.0
      });
    } catch (error) {
      console.error('Mobile TTS failed:', error);
      // Fallback to basic speech
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.1,
        rate: 1.0
      });
    }
  }

  /**
   * Enhance text for more natural speech
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
   * Use OpenAI TTS for highest quality (requires API key)
   */
  static async speakWithOpenAI(text: string, voice: string = 'nova'): Promise<void> {
    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, falling back to standard TTS');
      return this.speak(text);
    }

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
          model: 'tts-1-hd', // Use HD model for better quality
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
      
      // Play the audio
      const audio = new Audio(audioUrl);
      audio.play();
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
      });

    } catch (error) {
      console.error('OpenAI TTS failed:', error);
      // Fallback to standard TTS
      return this.speak(text);
    }
  }

  /**
   * Get available voices for the current platform
   */
  static getAvailableVoices(): TTSVoice[] {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.speechSynthesis.getVoices().map(voice => ({
        id: voice.voiceURI,
        name: voice.name,
        language: voice.lang,
        gender: this.detectGender(voice.name),
        quality: 'standard',
        naturalness: 0.7
      }));
    } else {
      return [this.getBestMobileVoice()];
    }
  }

  /**
   * Stop current speech
   */
  static stop(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
  }
} 