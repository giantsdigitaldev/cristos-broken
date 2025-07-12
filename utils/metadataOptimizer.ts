/**
 * Metadata Optimizer
 * Handles optimization of project metadata to prevent database index size issues
 */

export interface OptimizedMetadata {
  category?: string;
  project_lead?: string;
  project_owner?: string;
  selected_categories?: string[];
  ai_generated_cover?: {
    imageUrl?: string;
    prompt?: string;
    full_prompt?: string;
    generated_at?: string;
    status?: string;
    error?: string;
    compressionMetadata?: {
      originalSizeKB?: number;
      compressedSizeKB?: number;
      compressionQuality?: number;
      compressionRatio?: number;
    };
  };
  [key: string]: any;
}

export class MetadataOptimizer {
  private static readonly MAX_METADATA_SIZE = 2000; // bytes
  private static readonly MAX_PROMPT_LENGTH = 500; // characters

  /**
   * Optimize metadata to prevent index size issues
   */
  static optimizeMetadata(metadata: any): OptimizedMetadata {
    if (!metadata) return {};

    const optimized: OptimizedMetadata = { ...metadata };

    // Optimize AI generated cover data
    if (optimized.ai_generated_cover) {
      const cover = optimized.ai_generated_cover;
      
      // Truncate prompt if too long
      if (cover.prompt && cover.prompt.length > this.MAX_PROMPT_LENGTH) {
        cover.prompt = cover.prompt.substring(0, this.MAX_PROMPT_LENGTH) + '...';
      }

      // Store full prompt separately if it exists and is different
      if (cover.full_prompt && cover.full_prompt !== cover.prompt) {
        // Keep full_prompt for reference but don't include in size calculation
        cover.full_prompt = cover.full_prompt;
      }

      // Remove compression metadata if it's too large
      if (cover.compressionMetadata) {
        const compressionSize = JSON.stringify(cover.compressionMetadata).length;
        if (compressionSize > 500) {
          // Keep only essential compression data
          cover.compressionMetadata = {
            compressionRatio: cover.compressionMetadata.compressionRatio,
            compressedSizeKB: cover.compressionMetadata.compressedSizeKB
          };
        }
      }
    }

    // Check total size
    const metadataSize = JSON.stringify(optimized).length;
    
    if (metadataSize > this.MAX_METADATA_SIZE) {
      console.warn(`⚠️ Metadata size (${metadataSize} bytes) exceeds limit, applying aggressive optimization`);
      return this.applyAggressiveOptimization(optimized);
    }

    return optimized;
  }

  /**
   * Apply aggressive optimization when metadata is still too large
   */
  private static applyAggressiveOptimization(metadata: OptimizedMetadata): OptimizedMetadata {
    const minimal: OptimizedMetadata = {};

    // Keep only essential fields
    if (metadata.category) minimal.category = metadata.category;
    if (metadata.project_lead) minimal.project_lead = metadata.project_lead;
    if (metadata.project_owner) minimal.project_owner = metadata.project_owner;
    if (metadata.selected_categories) minimal.selected_categories = metadata.selected_categories;

    // Minimize AI generated cover data
    if (metadata.ai_generated_cover) {
      const cover = metadata.ai_generated_cover;
      minimal.ai_generated_cover = {
        imageUrl: cover.imageUrl,
        status: cover.status,
        generated_at: cover.generated_at,
        prompt: cover.prompt ? cover.prompt.substring(0, 200) + '...' : undefined
      };
    }

    const minimalSize = JSON.stringify(minimal).length;
    console.log(`📊 Minimal metadata size: ${minimalSize} bytes`);

    if (minimalSize > this.MAX_METADATA_SIZE) {
      console.error(`❌ Metadata still too large after aggressive optimization: ${minimalSize} bytes`);
      throw new Error('Metadata too large even after optimization');
    }

    return minimal;
  }

  /**
   * Check if metadata size is acceptable
   */
  static isMetadataSizeAcceptable(metadata: any): boolean {
    if (!metadata) return true;
    const size = JSON.stringify(metadata).length;
    return size <= this.MAX_METADATA_SIZE;
  }

  /**
   * Get metadata size in bytes
   */
  static getMetadataSize(metadata: any): number {
    if (!metadata) return 0;
    return JSON.stringify(metadata).length;
  }

  /**
   * Create a safe metadata update function
   */
  static createSafeMetadataUpdate(
    currentMetadata: any,
    updates: any
  ): OptimizedMetadata {
    const merged = { ...currentMetadata, ...updates };
    return this.optimizeMetadata(merged);
  }
} 