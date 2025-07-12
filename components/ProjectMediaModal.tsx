import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { GeneratedImageData, PollinationsAIService } from '@/utils/aiServices/pollinationsAIService';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from './Toast';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ProjectMediaModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  projectCategory: string;
  currentCoverImage?: string;
  onImageSelected: (imageUrl: string) => void;
}

const ProjectMediaModal: React.FC<ProjectMediaModalProps> = ({
  visible,
  onClose,
  projectId,
  projectTitle,
  projectDescription,
  projectCategory,
  currentCoverImage,
  onImageSelected
}) => {
  const { dark } = useTheme();
  
  // Animation refs
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(screenHeight)).current;
  
  // State management
  const [activeTab, setActiveTab] = useState<'generated' | 'camera' | 'library'>('generated');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageData[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Load generated images when modal opens
  useEffect(() => {
    if (visible) {
      loadGeneratedImages();
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalTranslateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };

  const loadGeneratedImages = async () => {
    try {
      setIsLoading(true);
      const images = await PollinationsAIService.getGeneratedImages(projectId);
      setGeneratedImages(images);
      console.log('📸 [ProjectMediaModal] Loaded generated images:', images.length);
    } catch (error) {
      console.error('❌ [ProjectMediaModal] Error loading generated images:', error);
      showToast('Failed to load generated images', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewImages = async () => {
    if (!customPrompt.trim()) {
      showToast('Please enter a prompt for image generation', 'warning');
      return;
    }

    try {
      setIsGenerating(true);
      showToast('Generating new images...', 'info');

      // Generate images with custom prompt
      const newImages = await PollinationsAIService.generateProjectCoverImages(
        projectTitle,
        projectDescription,
        projectCategory,
        projectId
      );

      if (newImages.length > 0) {
        // Save to project metadata
        await PollinationsAIService.saveGeneratedImagesToProject(projectId, newImages);
        
        // Update local state
        setGeneratedImages(newImages);
        showToast(`Generated ${newImages.length} new images!`, 'success');
      } else {
        showToast('Failed to generate images', 'error');
      }
    } catch (error) {
      console.error('❌ [ProjectMediaModal] Error generating images:', error);
      showToast('Failed to generate images', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelection(result.assets[0].uri, 'camera');
      }
    } catch (error) {
      console.error('❌ [ProjectMediaModal] Error taking photo:', error);
      showToast('Failed to take photo', 'error');
    }
  };

  const pickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageSelection(result.assets[0].uri, 'library');
      }
    } catch (error) {
      console.error('❌ [ProjectMediaModal] Error picking from library:', error);
      showToast('Failed to select image from library', 'error');
    }
  };

  const handleImageSelection = async (imageUri: string, source: 'camera' | 'library') => {
    try {
      showToast('Processing image...', 'info');

      // Compress and resize image
      const processedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800, height: 350 } }],
        {
          compress: 0.8,
          format: SaveFormat.JPEG
        }
      );

      // Upload to Supabase storage
      const response = await fetch(processedImage.uri);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const filename = `${projectId}-${source}-${timestamp}.jpg`;
      const filePath = `project-covers/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      showToast('Image uploaded successfully!', 'success');
      onImageSelected(urlData.publicUrl);
      onClose();
    } catch (error) {
      console.error('❌ [ProjectMediaModal] Error processing image:', error);
      showToast('Failed to process image', 'error');
    }
  };

  const selectGeneratedImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    onImageSelected(imageUrl);
    showToast('Image selected!', 'success');
    onClose();
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const renderTabButton = (tab: 'generated' | 'camera' | 'library', label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton,
        { backgroundColor: activeTab === tab ? COLORS.primary : 'transparent' }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? COLORS.white : dark ? COLORS.white : COLORS.greyscale900} 
      />
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === tab ? COLORS.white : dark ? COLORS.white : COLORS.greyscale900 }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderGeneratedImages = () => (
    <View style={styles.tabContent}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Loading generated images...
          </Text>
        </View>
      ) : generatedImages.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.imageGrid}>
            {generatedImages.map((image, index) => (
              <TouchableOpacity
                key={image.id}
                style={styles.imageCard}
                onPress={() => selectGeneratedImage(image.imageUrl)}
              >
                <Image source={{ uri: image.imageUrl }} style={styles.gridImage} />
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageNumber}>#{index + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color={COLORS.gray} />
          <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            No generated images yet
          </Text>
          <Text style={[styles.emptySubtext, { color: COLORS.gray }]}>
            Generate new images to see them here
          </Text>
        </View>
      )}
    </View>
  );

  const renderCameraTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.cameraOptions}>
        <TouchableOpacity style={styles.cameraOption} onPress={takePhoto}>
          <View style={styles.cameraIconContainer}>
            <Ionicons name="camera" size={32} color={COLORS.primary} />
          </View>
          <Text style={[styles.cameraOptionText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Take Photo
          </Text>
          <Text style={[styles.cameraOptionSubtext, { color: COLORS.gray }]}>
            Use your camera to take a new photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cameraOption} onPress={pickFromLibrary}>
          <View style={styles.cameraIconContainer}>
            <Ionicons name="images" size={32} color={COLORS.primary} />
          </View>
          <Text style={[styles.cameraOptionText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Choose from Library
          </Text>
          <Text style={[styles.cameraOptionSubtext, { color: COLORS.gray }]}>
            Select an image from your photo library
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRegenerateTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.promptContainer}>
        <Text style={[styles.promptLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          Custom Prompt
        </Text>
        <TextInput
          style={[
            styles.promptInput,
            { 
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              color: dark ? COLORS.white : COLORS.greyscale900,
              borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200
            }
          ]}
          placeholder="Describe the image you want to generate in detail..."
          placeholderTextColor={COLORS.gray}
          value={customPrompt}
          onChangeText={setCustomPrompt}
          multiline
          numberOfLines={4}
        />
        <Text style={[styles.promptHint, { color: COLORS.gray }]}>
          Be specific about style, lighting, composition, and details. For best results, describe the scene as if you&apos;re directing a professional photographer.
        </Text>
        
        {/* Prompt suggestions */}
        <View style={styles.promptSuggestions}>
          <Text style={[styles.suggestionsTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            💡 Midjourney-Quality Prompt Tips:
          </Text>
          <Text style={[styles.suggestionText, { color: COLORS.gray }]}>
            • &quot;masterpiece, best quality, ultra-realistic, highly detailed&quot;
          </Text>
          <Text style={[styles.suggestionText, { color: COLORS.gray }]}>
            • &quot;in the style of Greg Rutkowski, Thomas Kinkade, Artgerm&quot;
          </Text>
          <Text style={[styles.suggestionText, { color: COLORS.gray }]}>
            • &quot;8K resolution, sharp focus, professional photography&quot;
          </Text>
          <Text style={[styles.suggestionText, { color: COLORS.gray }]}>
            • &quot;cinematic lighting, award winning, trending on artstation&quot;
          </Text>
          <Text style={[styles.suggestionText, { color: COLORS.gray }]}>
            • &quot;hyperdetailed, intricate details, perfect composition&quot;
          </Text>
          <Text style={[styles.suggestionText, { color: COLORS.gray }]}>
            • &quot;octane render, unreal engine 5, photorealistic&quot;
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
        onPress={generateNewImages}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Ionicons name="sparkles" size={20} color={COLORS.white} />
        )}
        <Text style={styles.generateButtonText}>
          {isGenerating ? 'Generating 4 High-Quality Images...' : 'Generate 4 High-Quality Images'}
        </Text>
      </TouchableOpacity>

      {currentCoverImage && (
        <View style={styles.currentImageContainer}>
          <Text style={[styles.currentImageLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Current Cover Image
          </Text>
          <Image source={{ uri: currentCoverImage }} style={styles.currentImage} />
        </View>
      )}
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
          
          <Animated.View 
            style={[
              styles.modalContainer,
              { 
                transform: [{ translateY: modalTranslateY }],
                backgroundColor: dark ? COLORS.dark1 : COLORS.white
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Edit Project Images
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.greyscale900} />
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {renderTabButton('generated', 'Generated', 'images-outline')}
              {renderTabButton('camera', 'Camera', 'camera-outline')}
              {renderTabButton('library', 'Regenerate', 'refresh-outline')}
            </View>

            {/* Tab Content */}
            {activeTab === 'generated' && renderGeneratedImages()}
            {activeTab === 'camera' && renderCameraTab()}
            {activeTab === 'library' && renderRegenerateTab()}
          </Animated.View>
        </Animated.View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    height: screenHeight * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'regular',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageCard: {
    width: (screenWidth - 60) / 2,
    height: 120,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageNumber: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'semiBold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'regular',
    marginTop: 8,
    textAlign: 'center',
  },
  cameraOptions: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  cameraOption: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  cameraIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraOptionText: {
    fontSize: 18,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  cameraOptionSubtext: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  promptContainer: {
    marginBottom: 24,
  },
  promptLabel: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'regular',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  promptHint: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 8,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'semiBold',
    marginLeft: 8,
  },
  currentImageContainer: {
    marginTop: 24,
  },
  currentImageLabel: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 12,
  },
  currentImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  promptSuggestions: {
    marginTop: 16,
    paddingHorizontal: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: 'regular',
    marginBottom: 4,
  },
});

export default ProjectMediaModal; 