import { PollinationsAIService } from '@/utils/aiServices/pollinationsAIService';
import { useCallback, useState } from 'react';

export interface UseProjectCoverGenerationReturn {
  isGenerating: boolean;
  generationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  generatedImageUrl: string | null;
  error: string | null;
  generateCoverImage: (projectTitle: string, projectDescription: string, projectCategory: string, projectId: string) => Promise<void>;
  resetGeneration: () => void;
}

export const useProjectCoverGeneration = (): UseProjectCoverGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateCoverImage = useCallback(async (
    projectTitle: string,
    projectDescription: string,
    projectCategory: string,
    projectId: string
  ) => {
    console.log('🎨 [useProjectCoverGeneration] Hook called with:', {
      projectTitle,
      projectDescription,
      projectCategory,
      projectId
    });

    if (!projectTitle || !projectDescription || !projectCategory) {
      console.error('❌ [useProjectCoverGeneration] Missing required fields');
      setError('Project title, description, and category are required');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('generating');
    setError(null);

    try {
      console.log('🎨 [useProjectCoverGeneration] Starting project cover image generation...', {
        projectTitle,
        projectDescription,
        projectCategory,
        projectId
      });

      console.log('🔄 [useProjectCoverGeneration] Calling PollinationsAIService.generateProjectCoverImage...');
      const imageData = await PollinationsAIService.generateProjectCoverImage(
        projectTitle,
        projectDescription,
        projectCategory,
        projectId
      );

      console.log('📊 [useProjectCoverGeneration] PollinationsAIService response:', imageData);

      if (!imageData) {
        throw new Error('Failed to generate image data');
      }

      if (imageData.status === 'failed') {
        throw new Error(imageData.error || 'Image generation failed');
      }

      console.log('🔄 [useProjectCoverGeneration] Updating project with generated image...');
      // Update the project with the generated image
      const updateSuccess = await PollinationsAIService.updateProjectWithCoverImage(projectId, imageData);

      if (!updateSuccess) {
        throw new Error('Failed to update project with generated image');
      }

      setGeneratedImageUrl(imageData.imageUrl);
      setGenerationStatus('completed');
      
      console.log('✅ [useProjectCoverGeneration] Project cover image generated successfully:', imageData.imageUrl);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setGenerationStatus('failed');
      console.error('❌ [useProjectCoverGeneration] Project cover image generation failed:', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setGenerationStatus('idle');
    setGeneratedImageUrl(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    generationStatus,
    generatedImageUrl,
    error,
    generateCoverImage,
    resetGeneration
  };
}; 