// Dynamic import to avoid Node.js TypeScript resolution issues
import { MetadataOptimizer } from '../metadataOptimizer';
import { Platform } from 'react-native';

// Re-export existing interfaces for compatibility
export interface ProjectCoverImageData {
  projectId: string;
  imageUrl: string;
  prompt: string;
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
  compressionMetadata?: {
    originalSizeKB: number;
    compressedSizeKB: number;
    compressionQuality: number;
    compressionRatio: number;
  };
}

export interface GeneratedImageData {
  id: string;
  imageUrl: string;
  prompt: string;
  seed: number;
  finishReason: string;
  generatedAt: string;
  status: 'completed' | 'failed';
  error?: string;
  compressionMetadata?: {
    originalSizeKB: number;
    compressedSizeKB: number;
    compressionQuality: number;
    compressionRatio: number;
  };
}

export class PollinationsAIService {
  private static readonly API_BASE_URL = 'https://image.pollinations.ai/prompt';
  
  // Pollinations doesn't need an API key - it's free!
  // Technical blueprint settings optimized for engineering diagrams
  private static readonly GENERATION_CONFIG = {
    // Pollinations uses URL parameters for configuration
    width: 1024,
    height: 1024,
    model: 'flux', // Default model
    samples: 4,   // Generate 4 images by making 4 requests
  };

  // Constants for compression and cropping
  private static readonly COMPRESSION_CONFIG = {
    targetSizeKB: { min: 50, max: 150 },
    dimensions: { width: 800, height: 450 }, // 16:9 aspect ratio (800/450 = 1.778)
    compressionLevels: [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3]
  };

  /**
   * Generate multiple project cover images using Pollinations AI
   */
  static async generateProjectCoverImages(
    projectTitle: string,
    projectDescription: string,
    projectCategory: string,
    projectId: string
  ): Promise<GeneratedImageData[]> {
    console.log('🎨 [PollinationsAIService] Starting multiple image generation for project:', {
      projectId,
      title: projectTitle,
      description: projectDescription,
      category: projectCategory
    });

    try {
      // Generate the prompt using GPT-4o-mini
      console.log('🔄 [PollinationsAIService] Generating prompt with GPT-4o-mini...');
      const prompt = await this.generatePollinationsPrompt(projectTitle, projectDescription, projectCategory);
      
      if (!prompt) {
        console.error('❌ [PollinationsAIService] Failed to generate scene description for Pollinations AI');
        return [];
      }

      console.log('✅ [PollinationsAIService] Scene description generated successfully:', prompt.substring(0, 100) + '...');

      // Generate multiple images by making multiple requests
      const uploadedImages: GeneratedImageData[] = [];
      
      for (let i = 0; i < this.GENERATION_CONFIG.samples; i++) {
        try {
          console.log(`🔄 [PollinationsAIService] Generating image ${i + 1}/${this.GENERATION_CONFIG.samples}...`);
          
          // Call Pollinations API
          const apiResult = await this.callPollinationsAI(prompt, i);
          if (!apiResult.success || !apiResult.buffer) {
            console.warn(`⚠️ [PollinationsAIService] Failed to generate image ${i + 1}, trying placeholder...`);
            
            // Generate placeholder image as fallback
            const placeholderDataUrl = this.generatePlaceholderImage(projectTitle, projectCategory);
            const base64Data = placeholderDataUrl.split(',')[1];
            const uploadResult = await this.uploadImageToStorage(base64Data, projectId, i);
            
            const imageData: GeneratedImageData = {
              id: `${projectId}-${Date.now()}-${i}`,
              imageUrl: uploadResult.imageUrl,
              prompt: `Placeholder image for ${projectTitle} (${projectCategory})`,
              seed: i,
              finishReason: 'PLACEHOLDER',
              generatedAt: new Date().toISOString(),
              status: 'completed',
              compressionMetadata: uploadResult.compressionMetadata
            };
            
            uploadedImages.push(imageData);
            console.log(`✅ [PollinationsAIService] Placeholder image ${i + 1} uploaded successfully:`, uploadResult.imageUrl);
            continue;
          }

          console.log(`✅ [PollinationsAIService] Image ${i + 1} generated successfully`);

          // Upload image to storage
          console.log(`🔄 [PollinationsAIService] Uploading image ${i + 1} to storage...`);
          if (!apiResult.base64) {
            console.error(`❌ [PollinationsAIService] No base64 data received for image ${i + 1}`);
            continue;
          }
          const uploadResult = await this.uploadImageToStorage(apiResult.base64, projectId, i);
          
          const imageData: GeneratedImageData = {
            id: `${projectId}-${Date.now()}-${i}`,
            imageUrl: uploadResult.imageUrl,
            prompt,
            seed: apiResult.seed,
            finishReason: 'SUCCESS',
            generatedAt: new Date().toISOString(),
            status: 'completed',
            compressionMetadata: uploadResult.compressionMetadata
          };
          
          uploadedImages.push(imageData);
          console.log(`✅ [PollinationsAIService] Image ${i + 1} uploaded successfully:`, uploadResult.imageUrl);
        } catch (error) {
          console.error(`❌ [PollinationsAIService] Failed to generate/upload image ${i + 1}:`, error);
          // Continue with other images even if one fails
        }
      }

      console.log(`✅ [PollinationsAIService] Successfully processed ${uploadedImages.length}/${this.GENERATION_CONFIG.samples} images`);
      return uploadedImages;

    } catch (error) {
      console.error('❌ [PollinationsAIService] Error generating project cover images:', error);
      return [];
    }
  }

  /**
   * Generate a single project cover image (backward compatibility)
   */
  static async generateProjectCoverImage(
    projectTitle: string,
    projectDescription: string,
    projectCategory: string,
    projectId: string
  ): Promise<ProjectCoverImageData | null> {
    console.log('🎨 [PollinationsAIService] Starting single image generation for project:', {
      projectId,
      title: projectTitle,
      description: projectDescription,
      category: projectCategory
    });

    try {
      // Generate the prompt using GPT-4o-mini
      console.log('🔄 [PollinationsAIService] Generating prompt with GPT-4o-mini...');
      const prompt = await this.generatePollinationsPrompt(projectTitle, projectDescription, projectCategory);
      
      if (!prompt) {
        console.error('❌ [PollinationsAIService] Failed to generate scene description for Pollinations AI');
        return null;
      }

      console.log('✅ [PollinationsAIService] Scene description generated successfully:', prompt.substring(0, 100) + '...');

      // Call Pollinations AI API
      const apiResult = await this.callPollinationsAI(prompt);
      if (!apiResult.success || !apiResult.buffer) {
        console.warn('⚠️ [PollinationsAIService] External API failed, trying placeholder image...');
        
        // Generate placeholder image as fallback
        const placeholderDataUrl = this.generatePlaceholderImage(projectTitle, projectCategory);
        
        // Convert data URL to base64 for upload
        const base64Data = placeholderDataUrl.split(',')[1];
        const uploadResult = await this.uploadImageToStorage(base64Data, projectId);
        
        // Create and return placeholder image data
        const imageData: ProjectCoverImageData = {
          projectId,
          imageUrl: uploadResult.imageUrl,
          prompt: `Placeholder image for ${projectTitle} (${projectCategory})`,
          generatedAt: new Date().toISOString(),
          status: 'completed',
          compressionMetadata: uploadResult.compressionMetadata
        };
        
        console.log('✅ [PollinationsAIService] Placeholder image generated successfully');
        return imageData;
      }

      console.log('✅ [PollinationsAIService] Image generated successfully');

      // Upload image to storage
      if (!apiResult.base64) {
        console.error('❌ [PollinationsAIService] No base64 data received');
        return this.createErrorResponse(projectId, prompt, 'No image data received');
      }
      const uploadResult = await this.uploadImageToStorage(apiResult.base64, projectId);

      // Create and return image data
      const imageData: ProjectCoverImageData = {
        projectId,
        imageUrl: uploadResult.imageUrl,
        prompt,
        generatedAt: new Date().toISOString(),
        status: 'completed',
        compressionMetadata: uploadResult.compressionMetadata
      };

      return imageData;

    } catch (error) {
      console.error('❌ [PollinationsAIService] Error generating project cover image:', error);
      return this.createErrorResponse(projectId, '', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Call Pollinations AI API with the given prompt
   */
  private static async callPollinationsAI(
    prompt: string, 
    seed?: number
  ): Promise<{ success: boolean; buffer?: Buffer; base64?: string; seed: number; error?: string }> {
    console.log('🔄 [PollinationsAIService] Calling Pollinations AI API...');
    const startTime = Date.now();
    
    // Generate a seed for consistency
    const generatedSeed = seed ?? Math.floor(Math.random() * 1000000);
    
    try {
      // Combine scene description with styling
      const enhancedPrompt = this.enhancePromptForPollinations(prompt);
      console.log('🎨 [PollinationsAIService] Enhanced prompt for Pollinations AI:', enhancedPrompt.substring(0, 150) + '...');

      // Build the API URL
      const apiUrl = `${this.API_BASE_URL}/${encodeURIComponent(enhancedPrompt)}`;
      
      console.log('📡 [PollinationsAIService] Requesting image from Pollinations...');
      
      // Add timeout and retry logic for better reliability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CristOS/1.0)',
            'Accept': 'image/png,image/jpeg,image/*,*/*;q=0.8'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('✅ [PollinationsAIService] Image received, size:', buffer.length, 'bytes');

        // Validate that we actually got an image
        if (buffer.length < 1000) {
          throw new Error('Received response too small to be a valid image');
        }

        // Convert to base64 for compatibility
        const base64 = buffer.toString('base64');

        const endTime = Date.now();
        const generationTime = (endTime - startTime) / 1000;
        console.log(`⏱️ [PollinationsAIService] API call completed in ${generationTime.toFixed(2)} seconds`);

        return { 
          success: true, 
          buffer: buffer, 
          base64, 
          seed: generatedSeed 
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error('❌ [PollinationsAIService] Error calling Pollinations AI:', error);
      
      // Try fallback to a different Pollinations endpoint
      try {
        console.log('🔄 [PollinationsAIService] Trying fallback endpoint...');
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
        
        const response = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CristOS/1.0)',
            'Accept': 'image/png,image/jpeg,image/*,*/*;q=0.8'
          }
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          
          console.log('✅ [PollinationsAIService] Fallback endpoint successful, size:', buffer.length, 'bytes');
          
          return { 
            success: true, 
            buffer: buffer, 
            base64, 
            seed: generatedSeed 
          };
        }
      } catch (fallbackError) {
        console.error('❌ [PollinationsAIService] Fallback endpoint also failed:', fallbackError);
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        seed: seed ?? 0
      };
    }
  }

  /**
   * Enhance the prompt for Pollinations AI with blueprint-style modifiers
   */
  private static enhancePromptForPollinations(sceneDescription: string): string {
    const blueprintModifiers = [
      "technical blueprint style",
      "engineering schematic",
      "architectural drawing",
      "white lines on solid background color rgb(208,238,253)",
      "isometric view",
      "clean vector lines",
      "detailed technical drawing",
      "precise linework",
      "professional blueprint aesthetic",
      "high resolution",
      "centered composition"
    ];

    return `${sceneDescription}, ${blueprintModifiers.join(', ')}`;
  }

  /**
   * Generate a detailed prompt for Pollinations AI using GPT-4o-mini
   */
  private static async generatePollinationsPrompt(
    projectTitle: string,
    projectDescription: string,
    projectCategory: string
  ): Promise<string> {
    console.log('🔄 [PollinationsAIService] Generating prompt with GPT-4o-mini for:', {
      title: projectTitle,
      description: projectDescription,
      category: projectCategory
    });
    
    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = `Project Title: ${projectTitle}
Project Description: ${projectDescription}
Project Category: ${projectCategory}

Generate a detailed prompt for creating a project cover image that represents this project visually.`;

      // Use dynamic import to avoid Node.js TypeScript resolution issues
      try {
        const { GPTService } = await import('./gpt4o-mini-service');
        
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt }
        ];

        console.log('🔄 [PollinationsAIService] Calling GPT-4o-mini API...');
        const response = await GPTService.callGPTAPI(messages, {
          temperature: 0.8,
          max_tokens: 150
        });

        if (!response.success || !response.message) {
          console.error('❌ [PollinationsAIService] Failed to get response from GPT service');
          return this.createFallbackPrompt(projectTitle, projectDescription, projectCategory);
        }

        console.log('✅ [PollinationsAIService] GPT scene description generated successfully');
        return response.message.trim();
        
      } catch (importError) {
        console.error('❌ [PollinationsAIService] Failed to import GPT service:', importError);
        return this.createFallbackPrompt(projectTitle, projectDescription, projectCategory);
      }

    } catch (error) {
      console.error('❌ [PollinationsAIService] Error generating prompt:', error);
      return this.createFallbackPrompt(projectTitle, projectDescription, projectCategory);
    }
  }

  /**
   * Get the system prompt for image generation
   */
  private static getSystemPrompt(): string {
    return `You are an expert at creating concise technical scene descriptions for AI image generation, specializing in technical schematics and blueprint-style visuals.

Your task is to describe a technical scene that represents the project, focusing on creating a technical schematic or blueprint-style visualization.

Scene description requirements:

- Focus on creating a technical schematic or blueprint representation
- Describe the scene as if it's a technical drawing or engineering diagram
- Include specific technical elements, components, or processes relevant to the project
- Keep descriptions extremely concise and technical (maximum 50 words)
- Focus on the core technical aspects of the project
- Use technical terminology and engineering language
- IMPORTANT: Compose the scene with the main technical subject in the center

Output format:

Write a concise technical description (maximum 50 words) that captures the essence of the project through a technical schematic or blueprint visualization. Focus on technical elements, components, and processes. Ensure the main technical subject is centered.

Example Usage:

Project Title: Clean my room
Project Description: To clean my room, make the bed, vacuum.

Technical Scene Description:

A technical schematic showing a bedroom floor plan with labeled cleaning zones. The bed is prominently centered with crisp, geometric lines indicating proper bed-making technique. A vacuum cleaner is positioned strategically with arrows showing optimal cleaning path.

Create a unique, technical scene description based on the project details provided. Keep descriptions under 50 words.`;
  }

  /**
   * Create a fallback prompt when GPT service fails
   */
  private static createFallbackPrompt(projectTitle: string, projectDescription: string, projectCategory: string): string {
    return `A technical schematic diagram of ${projectTitle} showing ${projectDescription}. Blueprint-style engineering drawing with labeled components, technical annotations, and detailed specifications. Category: ${projectCategory}. Centered composition with clean lines and technical precision.`;
  }

  /**
   * Generate a simple placeholder image when external APIs fail
   */
  private static generatePlaceholderImage(projectTitle: string, projectCategory: string): string {
    // Create a simple SVG-based placeholder image
    const svg = `
      <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="450" fill="#d0eefd"/>
        <rect x="50" y="50" width="700" height="350" fill="none" stroke="#2c3e50" stroke-width="3"/>
        <text x="400" y="150" font-family="Arial, sans-serif" font-size="24" fill="#2c3e50" text-anchor="middle">${projectTitle}</text>
        <text x="400" y="200" font-family="Arial, sans-serif" font-size="16" fill="#34495e" text-anchor="middle">${projectCategory}</text>
        <circle cx="400" cy="280" r="40" fill="none" stroke="#3498db" stroke-width="2"/>
        <text x="400" y="290" font-family="Arial, sans-serif" font-size="12" fill="#3498db" text-anchor="middle">AI</text>
      </svg>
    `;
    
    // Convert SVG to base64
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Create an error response
   */
  private static createErrorResponse(projectId: string, prompt: string, error: string): ProjectCoverImageData {
    return {
      projectId,
      imageUrl: '',
      prompt,
      generatedAt: new Date().toISOString(),
      status: 'failed',
      error
    };
  }

  /**
   * Upload the generated image to Supabase storage
   */
  private static async uploadImageToStorage(
    base64Data: string, 
    projectId: string,
    imageIndex: number = 0
  ): Promise<{ imageUrl: string; compressionMetadata: ProjectCoverImageData['compressionMetadata'] }> {
    try {
      console.log(`🔄 [PollinationsAIService] Starting image upload to storage (index: ${imageIndex})...`);
      const { supabase } = await import('../supabase');
      
      // Validate base64 data
      if (!base64Data || base64Data.length < 100) {
        throw new Error('Invalid base64 data received from Pollinations AI');
      }
      
      console.log(`📊 [PollinationsAIService] Base64 data length: ${base64Data.length} characters`);
      
      // Clean and validate base64 data
      const cleanedBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
      if (cleanedBase64.length !== base64Data.length) {
        console.warn('⚠️ [PollinationsAIService] Base64 data contained invalid characters, cleaned');
      }
      
      // Create blob from base64 data - Platform-specific approach
      console.log('🔄 [PollinationsAIService] Creating blob from base64...');
      console.log(`📱 [PollinationsAIService] Platform: ${Platform.OS}`);
      
      let compressedBlob: Blob;
      let finalFileSizeKB: number;
      
      if (Platform.OS === 'web') {
        // Web platform: use direct Uint8Array approach
        try {
          console.log('🔄 [PollinationsAIService] Using web-compatible blob creation...');
          const binaryString = atob(cleanedBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          compressedBlob = new Blob([bytes], { type: 'image/png' });
          finalFileSizeKB = compressedBlob.size / 1024;
          
          console.log(`✅ [PollinationsAIService] Web blob created successfully - Size: ${compressedBlob.size} bytes`);
        } catch (webError) {
          console.error('❌ [PollinationsAIService] Web blob creation failed:', webError);
          throw new Error(`Web blob creation failed: ${webError instanceof Error ? webError.message : 'Unknown error'}`);
        }
      } else {
        // React Native platforms (iOS/Android): use fetch method
        try {
          console.log('🔄 [PollinationsAIService] Using React Native-compatible blob creation...');
          const dataUrl = `data:image/png;base64,${cleanedBase64}`;
          const response = await fetch(dataUrl);
          compressedBlob = await response.blob();
          finalFileSizeKB = compressedBlob.size / 1024;
          
          console.log(`✅ [PollinationsAIService] React Native blob created successfully - Size: ${compressedBlob.size} bytes`);
        } catch (rnError) {
          console.error('❌ [PollinationsAIService] React Native blob creation failed:', rnError);
          
          // Final fallback: try Uint8Array approach as last resort
          try {
            console.log('🔄 [PollinationsAIService] Trying Uint8Array fallback...');
            const binaryString = atob(cleanedBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            compressedBlob = new Blob([bytes], { type: 'image/png' });
            finalFileSizeKB = compressedBlob.size / 1024;
            
            console.log(`✅ [PollinationsAIService] Uint8Array fallback successful - Size: ${compressedBlob.size} bytes`);
          } catch (fallbackError) {
            console.error('❌ [PollinationsAIService] All blob creation methods failed:', fallbackError);
            const errorMessage = rnError instanceof Error ? rnError.message : 'Unknown error';
            throw new Error(`Failed to create blob from base64 data on ${Platform.OS}: ${errorMessage}`);
          }
        }
      }
      
      // Generate unique file path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `pollinations-${projectId}-${timestamp}-${imageIndex}-${randomId}.png`;
      const filePath = `project-covers/${fileName}`;
      
      console.log(`🔄 [PollinationsAIService] Uploading to path: ${filePath}`);
      
      // Upload to Supabase storage with retry logic
      const maxRetries = 3;
      let uploadData: any = null;
      let uploadError: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 [PollinationsAIService] Upload attempt ${attempt}/${maxRetries}...`);
          
          const uploadResult = await supabase.storage
            .from('project-files')
            .upload(filePath, compressedBlob, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false
            });
          
          uploadData = uploadResult.data;
          uploadError = uploadResult.error;
          
          if (!uploadError) {
            console.log(`✅ [PollinationsAIService] Upload successful on attempt ${attempt}`);
            break;
          } else {
            console.warn(`⚠️ [PollinationsAIService] Upload attempt ${attempt} failed:`, uploadError);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        } catch (err) {
          console.error(`❌ [PollinationsAIService] Upload attempt ${attempt} error:`, err);
          uploadError = err;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (uploadError) {
        throw new Error(`Failed to upload after ${maxRetries} attempts: ${uploadError.message || uploadError}`);
      }
      
      if (!uploadData) {
        throw new Error('Upload succeeded but no data returned');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }
      
      console.log(`✅ [PollinationsAIService] Image uploaded successfully: ${urlData.publicUrl}`);
      
      // Return upload result with compression metadata
      return {
        imageUrl: urlData.publicUrl,
        compressionMetadata: {
          originalSizeKB: finalFileSizeKB,
          compressedSizeKB: finalFileSizeKB,
          compressionQuality: 1.0,
          compressionRatio: 1.0
        }
      };
      
    } catch (error) {
      console.error('❌ [PollinationsAIService] Error uploading image to storage:', error);
      throw error;
    }
  }

  /**
   * Update project with generated cover image
   */
  static async updateProjectWithCoverImage(
    projectId: string,
    imageData: ProjectCoverImageData
  ): Promise<boolean> {
    try {
      const { supabase } = await import('../supabase');
      
      // Fetch current metadata
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single();
        
      if (fetchError || !project) {
        console.error('❌ [PollinationsAIService] Error fetching current project metadata:', fetchError);
        return false;
      }
      
      const currentMetadata = project.metadata || {};
      console.log('🔍 [PollinationsAIService] Current metadata:', currentMetadata);
      
      // Create new metadata with AI generated cover
      const newMetadata = {
        ...currentMetadata,
        ai_generated_cover: {
          imageUrl: imageData.imageUrl,
          prompt: imageData.prompt,
          generated_at: imageData.generatedAt,
          status: imageData.status,
          error: imageData.error,
          compressionMetadata: imageData.compressionMetadata
        }
      };
      
      // Optimize metadata to prevent index size issues
      const optimizedMetadata = MetadataOptimizer.optimizeMetadata(newMetadata);
      
      console.log('📊 [PollinationsAIService] Original metadata size:', MetadataOptimizer.getMetadataSize(newMetadata), 'bytes');
      console.log('📊 [PollinationsAIService] Optimized metadata size:', MetadataOptimizer.getMetadataSize(optimizedMetadata), 'bytes');
      
      // Update project with optimized metadata
      const { error } = await supabase
        .from('projects')
        .update({
          cover_image_url: imageData.imageUrl,
          metadata: optimizedMetadata
        })
        .eq('id', projectId);
        
      if (error) {
        console.error('❌ [PollinationsAIService] Error updating project with cover image:', error);
        return false;
      }
      
      console.log('✅ [PollinationsAIService] Project updated with cover image URL:', imageData.imageUrl);
      return true;
    } catch (error) {
      console.error('❌ [PollinationsAIService] Error updating project with cover image:', error);
      return false;
    }
  }

  /**
   * Save multiple generated images to project metadata
   */
  static async saveGeneratedImagesToProject(
    projectId: string,
    generatedImages: GeneratedImageData[]
  ): Promise<boolean> {
    try {
      const { supabase } = await import('../supabase');
      
      // Fetch current metadata
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single();
        
      if (fetchError || !project) {
        console.error('❌ [PollinationsAIService] Error fetching current project metadata:', fetchError);
        return false;
      }
      
      const currentMetadata = project.metadata || {};
      console.log('🔍 [PollinationsAIService] Current metadata:', currentMetadata);
      
      // Merge generated images into existing metadata
      const newMetadata = {
        ...currentMetadata,
        generated_images: generatedImages,
        last_generated_at: new Date().toISOString()
      };
      
      // Optimize metadata to prevent index size issues
      const optimizedMetadata = MetadataOptimizer.optimizeMetadata(newMetadata);
      
      console.log('📊 [PollinationsAIService] Original metadata size:', MetadataOptimizer.getMetadataSize(newMetadata), 'bytes');
      console.log('📊 [PollinationsAIService] Optimized metadata size:', MetadataOptimizer.getMetadataSize(optimizedMetadata), 'bytes');
      
      const { error } = await supabase
        .from('projects')
        .update({
          metadata: optimizedMetadata
        })
        .eq('id', projectId);
        
      if (error) {
        console.error('❌ [PollinationsAIService] Error updating project with generated images:', error);
        return false;
      }
      
      console.log('✅ [PollinationsAIService] Project updated with generated images');
      return true;
    } catch (error) {
      console.error('❌ [PollinationsAIService] Error updating project with generated images:', error);
      return false;
    }
  }

  /**
   * Check if project has a generated cover image
   */
  static async hasGeneratedCoverImage(projectId: string): Promise<boolean> {
    try {
      const { supabase } = await import('../supabase');
      
      const { data, error } = await supabase
        .from('projects')
        .select('cover_image_url, metadata')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        return false;
      }

      return !!(data.cover_image_url && data.metadata?.ai_generated_cover);

    } catch (error) {
      console.error('❌ [PollinationsAIService] Error checking generated cover image:', error);
      return false;
    }
  }

  /**
   * Get generated images for a project
   */
  static async getGeneratedImages(projectId: string): Promise<GeneratedImageData[]> {
    try {
      const { supabase } = await import('../supabase');
      
      const { data, error } = await supabase
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        return [];
      }

      return data.metadata?.generated_images || [];

    } catch (error) {
      console.error('❌ [PollinationsAIService] Error getting generated images:', error);
      return [];
    }
  }

  /**
   * Test React Native compatibility
   */
  static async testReactNativeCompatibility(): Promise<boolean> {
    try {
      console.log('🔄 [PollinationsAIService] Testing React Native compatibility...');
      
      // Test if we can make a simple API call
      const testPrompt = 'A simple test image for React Native compatibility';
      const result = await this.callPollinationsAI(testPrompt);
      
      if (result.success) {
        console.log('✅ [PollinationsAIService] React Native compatibility test passed');
        return true;
      } else {
        console.log('❌ [PollinationsAIService] React Native compatibility test failed:', result.error);
        return false;
      }
      
    } catch (error) {
      console.error('❌ [PollinationsAIService] React Native compatibility test error:', error);
      return false;
    }
  }
}

// Export the service as both named and default export for compatibility
export default PollinationsAIService;

// Re-export for backward compatibility
export { PollinationsAIService as StabilityAIService }; 