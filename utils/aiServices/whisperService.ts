import { Platform } from 'react-native';
import { supabase } from '../supabase';

export interface WhisperResponse {
  success: boolean;
  transcription: string;
  confidence?: number;
  language?: string;
  processing_time_ms?: number;
  error?: string;
  details?: string;
}

export interface VoiceSession {
  id: string;
  user_id: string;
  conversation_id: string;
  audio_file_path?: string;
  transcription?: string;
  processing_status: 'recording' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface WhisperConfig {
  model: string;
  language?: string;
  temperature: number;
  max_file_size: number;
  supported_formats: string[];
}

export class WhisperService {
  private static readonly DEFAULT_CONFIG: WhisperConfig = {
    model: 'whisper-1',
    language: 'en',
    temperature: 0.0,
    max_file_size: 25 * 1024 * 1024, // 25MB
    supported_formats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
  };

  /**
   * Transcribe audio using Whisper API
   */
  static async transcribeAudio(
    audioData: ArrayBuffer | Blob,
    config: Partial<WhisperConfig> = {}
  ): Promise<WhisperResponse> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎤 Whisper transcription attempt ${attempt}/${maxRetries}`);
        
        const response = await this.makeWhisperRequest(audioData, finalConfig);
        
        console.log('✅ Whisper transcription successful');
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Whisper transcription attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    console.error('🚨 All Whisper transcription attempts failed');
    return {
      success: false,
      transcription: '',
      error: lastError?.message || 'Unknown error',
      details: 'All transcription attempts failed'
    };
  }

  /**
   * Make the actual HTTP request to Whisper API
   */
  private static async makeWhisperRequest(
    audioData: ArrayBuffer | Blob,
    config: WhisperConfig
  ): Promise<WhisperResponse> {
    const startTime = Date.now();
    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file');
    }

    const isWeb = Platform.OS === 'web';
    // @ts-ignore
    const isLocalhost = isWeb && (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    let endpoint: string;
    let headers: Record<string, string> = {};

    if (isWeb && isLocalhost) {
      // Use local proxy for web development (if available)
      endpoint = 'http://localhost:3001/api/whisper';
    } else {
      // Use direct OpenAI API for iOS/Android/production web
      endpoint = 'https://api.openai.com/v1/audio/transcriptions';
      headers['Authorization'] = `Bearer ${openaiApiKey}`;
    }

    // Optimize audio for Whisper
    const audioBlob = await this.optimizeAudioForWhisper(audioData);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', config.model);
    formData.append('language', config.language || 'en');
    formData.append('temperature', config.temperature.toString());

    console.log('📤 Sending audio to Whisper API:', {
      model: config.model,
      language: config.language,
      fileSize: audioBlob.size,
      fileType: audioBlob.type,
      endpoint: endpoint.includes('localhost') ? 'local proxy' : 'OpenAI API'
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Whisper API Error:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 413) {
        throw new Error('Audio file too large. Please use a shorter recording.');
      } else if (response.status >= 500) {
        throw new Error('Whisper service temporarily unavailable. Please try again.');
      } else {
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log('📥 Received Whisper response:', {
      transcriptionLength: data.text?.length || 0,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      transcription: data.text || '',
      confidence: data.confidence,
      language: data.language,
      processing_time_ms: processingTime
    };
  }

  /**
   * Create a voice session in the database
   */
  static async createVoiceSession(
    userId: string,
    conversationId: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('ai_voice_sessions')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          processing_status: 'recording',
          session_data: {}
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to create voice session:', error);
      throw error;
    }
  }

  /**
   * Update voice session with transcription results
   */
  static async updateVoiceSession(
    sessionId: string,
    updates: Partial<VoiceSession>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_voice_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update voice session:', error);
      throw error;
    }
  }

  /**
   * Get voice session by ID
   */
  static async getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
    try {
      const { data, error } = await supabase
        .from('ai_voice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get voice session:', error);
      return null;
    }
  }

  /**
   * Validate audio file format and size
   */
  static validateAudioFile(
    file: File | Blob,
    config: Partial<WhisperConfig> = {}
  ): { valid: boolean; error?: string } {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // Check file size
    if (file.size > finalConfig.max_file_size) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(finalConfig.max_file_size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    // Check file format
    const fileExtension = (file as File).name?.split('.').pop()?.toLowerCase() || 
                         file.type?.split('/').pop()?.toLowerCase() || '';
    
    if (!finalConfig.supported_formats.includes(fileExtension)) {
      return {
        valid: false,
        error: `Unsupported file format: ${fileExtension}. Supported formats: ${finalConfig.supported_formats.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Convert audio to optimal format for Whisper
   */
  static async optimizeAudioForWhisper(audioData: ArrayBuffer | Blob): Promise<Blob> {
    try {
      // If it's already a Blob, return as is
      if (audioData instanceof Blob) {
        return audioData;
      }

      // Platform-specific blob creation
      console.log(`📱 [WhisperService] Platform: ${Platform.OS}`);
      
      if (Platform.OS === 'web') {
        // Web platform: use direct ArrayBuffer approach
        console.log('🔄 [WhisperService] Using web-compatible blob creation...');
        return new Blob([audioData], { type: 'audio/wav' });
      } else {
        // React Native platforms (iOS/Android): use fetch method
        try {
          console.log('🔄 [WhisperService] Using React Native-compatible blob creation...');
          // Convert ArrayBuffer to base64 for React Native compatibility
          const uint8Array = new Uint8Array(audioData);
          const base64 = btoa(String.fromCharCode(...uint8Array));
          const dataUrl = `data:audio/wav;base64,${base64}`;
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          console.log(`✅ [WhisperService] React Native blob created successfully - Size: ${blob.size} bytes`);
          return blob;
        } catch (rnError) {
          console.error('❌ [WhisperService] React Native blob creation failed:', rnError);
          
          // Fallback: try direct ArrayBuffer approach as last resort
          try {
            console.log('🔄 [WhisperService] Trying ArrayBuffer fallback...');
            const blob = new Blob([audioData], { type: 'audio/wav' });
            console.log(`✅ [WhisperService] ArrayBuffer fallback successful - Size: ${blob.size} bytes`);
            return blob;
          } catch (fallbackError) {
            console.error('❌ [WhisperService] All blob creation methods failed:', fallbackError);
            throw new Error(`Failed to create audio blob on ${Platform.OS}: ${rnError instanceof Error ? rnError.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to optimize audio:', error);
      throw new Error('Failed to process audio file');
    }
  }

  /**
   * Generate transcription prompt for better accuracy
   */
  static generateTranscriptionPrompt(context?: string): string {
    return `Please transcribe the following audio accurately. 

Context: ${context || 'General conversation'}

Guidelines:
- Transcribe exactly what is said
- Preserve punctuation and capitalization
- Include filler words (um, uh, etc.) if they help with context
- If unclear, use [inaudible] for unclear portions
- For project management terms, ensure accuracy

Focus on clarity and accuracy for project management conversations.`;
  }

  /**
   * Process real-time audio chunks
   */
  static async processAudioChunk(
    audioChunk: ArrayBuffer,
    sessionId: string,
    config: Partial<WhisperConfig> = {}
  ): Promise<WhisperResponse> {
    try {
      // Update session status to processing
      await this.updateVoiceSession(sessionId, { processing_status: 'processing' });

      // Optimize audio for Whisper
      const optimizedAudio = await this.optimizeAudioForWhisper(audioChunk);

      // Transcribe audio
      const result = await this.transcribeAudio(optimizedAudio, config);

      // Update session with results
      await this.updateVoiceSession(sessionId, {
        transcription: result.transcription,
        processing_status: result.success ? 'completed' : 'failed',
        error_message: result.error,
        processing_time_ms: result.processing_time_ms
      });

      return result;
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
      
      // Update session with error
      await this.updateVoiceSession(sessionId, {
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        transcription: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log transcription usage for monitoring
   */
  static async logTranscriptionUsage(
    sessionId: string,
    usage: any,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const { error: logError } = await supabase
        .from('ai_voice_sessions')
        .update({
          session_data: {
            usage,
            success,
            error,
            logged_at: new Date().toISOString()
          }
        })
        .eq('id', sessionId);

      if (logError) {
        console.warn('Failed to log transcription usage:', logError);
      }
    } catch (error) {
      console.warn('Failed to log transcription usage:', error);
    }
  }
} 