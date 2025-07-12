import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { FileService, ProjectFile } from '@/utils/fileService';
import { supabase } from '@/utils/supabase';
import { VPSFileProcessingService } from '@/utils/vpsFileProcessingService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import FileDetailsModal from './FileDetailsModal';

const { height: screenHeight } = Dimensions.get('window');

interface FilesModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const FilesModal: React.FC<FilesModalProps> = ({
  visible,
  onClose,
  projectId,
  projectName
}) => {
  const { dark } = useTheme();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [fileDetailsVisible, setFileDetailsVisible] = useState(false);
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(0)).current;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add these state variables after the existing state declarations:
  const [isDismissing, setIsDismissing] = useState(false);
  const [isGestureDismissing, setIsGestureDismissing] = useState(false);

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load files when modal becomes visible
  useEffect(() => {
    if (visible) {
      showModal();
      loadFiles();
    }
  }, [visible]);

  // Enhanced keyboard event listeners for iOS
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        setKeyboardVisible(true);
        
        // Animate modal up with keyboard on iOS - only enough to keep search field visible
        if (Platform.OS === 'ios') {
          // Calculate how much to move up - just enough to keep search field visible
          const moveUpAmount = Math.min(keyboardHeight - 150, keyboardHeight * 0.3); // Max 30% of keyboard height
          Animated.timing(modalTranslateY, {
            toValue: -moveUpAmount,
            duration: event.duration || 250,
            useNativeDriver: true,
          }).start();
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
        
        // Animate modal back to original position on iOS
        if (Platform.OS === 'ios') {
          Animated.timing(modalTranslateY, {
            toValue: 0,
            duration: event.duration || 250,
            useNativeDriver: true,
          }).start();
        }
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // Create file input for web
  useEffect(() => {
    if (Platform.OS === 'web' && !fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.style.display = 'none';
      input.addEventListener('change', handleWebFileSelect);
      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    return () => {
      if (Platform.OS === 'web' && fileInputRef.current) {
        fileInputRef.current.removeEventListener('change', handleWebFileSelect);
        document.body.removeChild(fileInputRef.current);
        fileInputRef.current = null;
      }
    };
  }, []);

  // Update the showModal and hideModal functions to match AddProjectModal:
  const showModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
        delay: 50,
      }),
    ]).start();
  };

  const hideModal = () => {
    // Update state immediately for responsive button behavior
    onClose();
    
    // Only animate if not gesture dismissing
    if (!isGestureDismissing) {
      // Animate the modal out of view
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Update the useEffect for modal visibility:
  useEffect(() => {
    if (visible && !isGestureDismissing) {
      showModal();
    }
  }, [visible, isGestureDismissing]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const projectFiles = await FileService.getProjectFiles(projectId);
      setFiles(projectFiles);
    } catch (error) {
      console.error('❌ Error loading files:', error);
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleWebFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const selectedFiles = target.files;
    
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log('📁 Uploading file:', file.name);
        
        // Check if file is supported for VPS processing
        if (VPSFileProcessingService.isSupportedFileType(file.type) && 
            VPSFileProcessingService.isFileSizeWithinLimit(file.size)) {
          // Use VPS processing for supported files
          await uploadFileToVPS(file, file.name, file.type, file.size);
        } else {
          // Use regular Supabase upload for unsupported files
          await FileService.uploadFile(
            projectId,
            file,
            file.name,
            file.type,
            file.size
          );
        }
      }
      
      // Reload files after upload
      await loadFiles();
      Alert.alert('Success', `${selectedFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading files:', error);
      Alert.alert('Error', 'Failed to upload files');
    } finally {
      setUploading(false);
      // Reset the input
      if (target) target.value = '';
    }
  };

  const uploadFileToVPS = async (file: File, fileName: string, fileType: string, fileSize: number) => {
    try {
      // First, create a database record with pending status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: fileRecord, error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_name: fileName,
          storage_path: `vps/${projectId}/${Date.now()}_${fileName}`,
          file_size: fileSize,
          file_type: fileType,
          storage_provider: 'vps',
          uploaded_by: user.id,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Upload to VPS for processing
      const vpsFileId = await VPSFileProcessingService.uploadFileForProcessing(
        projectId,
        file,
        fileName,
        fileType,
        fileSize
      );

      console.log('✅ File uploaded to VPS for processing:', vpsFileId);
    } catch (error) {
      console.error('❌ Error uploading to VPS:', error);
      throw error;
    }
  };

  const handleFilePicker = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, trigger the hidden file input
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
        return;
      }

      // For mobile, use expo-image-picker
      const ImagePicker = await import('expo-image-picker');
      
      const result = await ImagePicker.default.launchImageLibraryAsync({
        mediaTypes: ImagePicker.default.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        
        for (const asset of result.assets) {
          if (asset.uri) {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            
            // Create a File object from the blob for mobile
            const fileName = asset.fileName! || `file_${Date.now()}`;
            const fileType = asset.type! || 'application/octet-stream';
            const file = new File([blob], fileName, {
              type: fileType,
            });
            
            // Check if file is supported for VPS processing
            if (VPSFileProcessingService.isSupportedFileType(fileType) && 
                VPSFileProcessingService.isFileSizeWithinLimit(asset.fileSize || 0)) {
              // Use VPS processing for supported files
              await uploadFileToVPS(file, fileName, fileType, asset.fileSize || 0);
            } else {
              // Use regular Supabase upload for unsupported files
              await FileService.uploadFile(
                projectId,
                file,
                fileName,
                fileType,
                asset.fileSize || 0
              );
            }
          }
        }
        
        await loadFiles();
        Alert.alert('Success', `${result.assets.length} file(s) uploaded successfully!`);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string, fileName: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileService.deleteFile(fileId);
              await loadFiles();
              Alert.alert('Success', 'File deleted successfully!');
            } catch (error) {
              console.error('Error deleting file:', error);
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handleFileDownload = async (file: ProjectFile) => {
    try {
      let downloadUrl: string;
      
      if (file.storage_provider === 'vps') {
        downloadUrl = await VPSFileProcessingService.downloadProcessedFile(file.id);
      } else {
        const url = await FileService.getFileDownloadUrl(file.storage_path);
        if (!url) {
          throw new Error('Download URL not available');
        }
        downloadUrl = url;
      }
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For mobile, open in browser or download
        await Linking.openURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const handleFilePress = (file: ProjectFile) => {
    setSelectedFile(file);
    setFileDetailsVisible(true);
  };

  const closeFileDetails = () => {
    setFileDetailsVisible(false);
    setSelectedFile(null);
  };

  // Replace the current gesture handling functions with these exact AddProjectModal matches:

  // Gesture handling for pull-to-dismiss
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === 5) { // END state
      const shouldDismiss = translationY > 80 || (translationY > 50 && velocityY > 500);
      
      if (shouldDismiss) {
        // Dismiss if dragged down more than 80px or with high velocity
        setIsDismissing(true);
        Animated.parallel([
          Animated.timing(panY, {
            toValue: screenHeight,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          dismissWithGesture();
        });
      } else {
        // Snap back to original position with spring animation
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Separate function for gesture-based dismissal to prevent double animation
  const dismissWithGesture = () => {
    // Set flag to prevent natural modal animation
    setIsGestureDismissing(true);
    
    // Set modalAnimation to 0 to prevent bounce
    modalAnimation.setValue(0);
    
    // Update state immediately for responsive button behavior
    onClose();
    
    // Reset gesture values
    setIsDismissing(false);
    panY.setValue(0);
    
    // Reset flag after a short delay to allow modal to close
    setTimeout(() => {
      setIsGestureDismissing(false);
    }, 100);
  };

  // Reset panY when modal opens
  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible]);

  const renderFileItem = ({ item }: { item: ProjectFile }) => (
    <TouchableOpacity
      style={[styles.fileItem, { 
        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
        borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
      }]}
      onPress={() => handleFilePress(item)}
    >
      <View style={styles.fileItemLeft}>
        <View style={[styles.fileIconContainer, {
          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
        }]}>
          <Ionicons 
            name={FileService.getFileIcon(item.file_type) as any} 
            size={24} 
            color={COLORS.primary} 
          />
          {/* Storage provider indicator */}
          <View style={[styles.storageIndicator, {
            backgroundColor: item.storage_provider === 'vps' ? COLORS.success : COLORS.primary,
          }]}>
            <Text style={styles.storageIndicatorText}>
              {item.storage_provider === 'vps' ? 'V' : 'S'}
            </Text>
          </View>
          {/* Processing status indicator */}
          {item.processing_status && item.processing_status !== 'completed' && (
            <View style={[styles.processingIndicator, {
              backgroundColor: item.processing_status === 'processing' ? COLORS.warning : COLORS.error,
            }]}>
              <ActivityIndicator size={8} color={COLORS.white} />
            </View>
          )}
        </View>
        <View style={styles.fileItemInfo}>
          <Text style={[styles.fileName, { 
            color: dark ? COLORS.white : COLORS.greyscale900 
          }]} numberOfLines={1}>
            {item.file_name}
          </Text>
          <View style={styles.fileMetadata}>
            <Text style={[styles.fileSize, { 
              color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
            }]}>
              {FileService.formatFileSize(item.file_size)}
            </Text>
            <Text style={[styles.fileDot, { 
              color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
            }]}>•</Text>
            <Text style={[styles.storageProvider, { 
              color: item.storage_provider === 'vps' ? COLORS.success : COLORS.primary 
            }]}>
              {item.storage_provider === 'vps' ? 'VPS' : 'Supabase'}
            </Text>
            {item.processing_status && (
              <>
                <Text style={[styles.fileDot, { 
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                }]}>•</Text>
                <Text style={[styles.processingStatus, { 
                  color: item.processing_status === 'completed' ? COLORS.success : 
                         item.processing_status === 'processing' ? COLORS.warning : COLORS.error
                }]}>
                  {item.processing_status}
                </Text>
              </>
            )}
            <Text style={[styles.fileDot, { 
              color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
            }]}>•</Text>
            <Text style={[styles.fileDate, { 
              color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
            }]}>
              {new Date(item.uploaded_at).toLocaleDateString()}
            </Text>
          </View>
          {item.description && (
            <Text style={[styles.fileDescription, { 
              color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
            }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.fileItemActions}>
        <TouchableOpacity
          style={styles.fileActionButton}
          onPress={() => handleFileDownload(item)}
        >
          <Ionicons name="download" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fileActionButton}
          onPress={() => handleFileDelete(item.id, item.file_name)}
        >
          <Ionicons name="trash" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Overlay */}
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.overlayTouchable}
              activeOpacity={1}
              onPress={onClose}
            />
          </Animated.View>

          {/* Modal Content */}
          <PanGestureHandler 
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={[-10, 10]}
            failOffsetY={[-100, 100]}
            shouldCancelWhenOutside={false}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                  transform: [
                    {
                      translateY: Animated.add(
                        modalAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [600, 0],
                        }),
                        Animated.add(panY, modalTranslateY)
                      ),
                    },
                  ],
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandleContainer}>
                <Animated.View 
                  style={[
                    styles.dragIndicator, 
                    { 
                      backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                      transform: [
                        {
                          scale: panY.interpolate({
                            inputRange: [0, 100],
                            outputRange: [1, 1.2],
                            extrapolate: 'clamp',
                          })
                        },
                        {
                          rotate: panY.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0deg', '5deg'],
                            extrapolate: 'clamp',
                          })
                        }
                      ]
                    }
                  ]} 
                />
              </View>

              {/* Header - Matching AddProjectModal style */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={[styles.headerIcon, { backgroundColor: COLORS.primary + '20' }]}> 
                    <Ionicons name="folder" size={24} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Project Files</Text>
                    <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]} numberOfLines={1}>
                      {projectName || 'Manage your project files'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons 
                    name="close-circle" 
                    size={28} 
                    color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                  />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={[styles.searchInput, {
                  backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                }]}>
                  <Ionicons 
                    name="search" 
                    size={20} 
                    color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                  />
                  <TextInput
                    style={[styles.searchText, { 
                      color: dark ? COLORS.white : COLORS.greyscale900 
                    }]}
                    placeholder="Search files..."
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              {/* Upload Button */}
              <View style={styles.uploadContainer}>
                <TouchableOpacity
                  style={[styles.uploadButton, {
                    backgroundColor: uploading ? COLORS.grayscale400 : COLORS.primary,
                  }]}
                  onPress={handleFilePicker}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
                      <Text style={styles.uploadButtonText}>Upload Files</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Files List */}
              <View style={styles.filesContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={[styles.loadingText, {
                      color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}>
                      Loading files...
                    </Text>
                  </View>
                ) : filteredFiles.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons 
                      name="folder-open" 
                      size={48} 
                      color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                    />
                    <Text style={[styles.emptyTitle, {
                      color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}>
                      No files found
                    </Text>
                    <Text style={[styles.emptySubtitle, {
                      color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                    }]}>
                      {searchQuery ? 'Try adjusting your search' : 'Upload your first file to get started'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredFiles}
                    renderItem={renderFileItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={[
                      styles.filesList,
                      {
                        paddingBottom: keyboardVisible ? keyboardHeight + 20 : 20,
                      }
                    ]}
                  />
                )}
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </Modal>

      {/* File Details Modal */}
      <FileDetailsModal
        visible={fileDetailsVisible}
        onClose={closeFileDetails}
        file={selectedFile}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
  },

  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
  },
  uploadContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  filesContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'semiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  filesList: {
    paddingBottom: 20,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  fileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  storageIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storageIndicatorText: {
    color: COLORS.white,
    fontSize: 8,
    fontFamily: 'bold',
  },
  processingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileItemInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 4,
  },
  fileMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  fileDot: {
    fontSize: 12,
    fontFamily: 'regular',
    marginHorizontal: 4,
  },
  storageProvider: {
    fontSize: 12,
    fontFamily: 'medium',
  },
  processingStatus: {
    fontSize: 12,
    fontFamily: 'medium',
  },
  fileDate: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  fileDescription: {
    fontSize: 12,
    fontFamily: 'regular',
    fontStyle: 'italic',
  },
  fileItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
});

export default FilesModal; 