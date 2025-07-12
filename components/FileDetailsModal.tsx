import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectFile } from '@/utils/fileService';
import { supabase } from '@/utils/supabase';
import { VPSFileProcessingService } from '@/utils/vpsFileProcessingService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface FileDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  file: ProjectFile | null;
}

const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  visible,
  onClose,
  file
}) => {
  const { dark } = useTheme();
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Load processing status when modal becomes visible
  useEffect(() => {
    if (visible && file) {
      showModal();
      if (file.processing_status === 'pending' || file.processing_status === 'processing') {
        startPolling();
      }
    }
  }, [visible, file]);

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
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const startPolling = async () => {
    if (!file || isPolling) return;

    setIsPolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await VPSFileProcessingService.pollProcessingStatus(
        file.id,
        file.project_id,
        user.id,
        30, // max attempts
        (status) => {
          setProcessingStatus(status);
        }
      );
    } catch (error) {
      console.error('Error polling processing status:', error);
    } finally {
      setIsPolling(false);
    }
  };

  const handleFileDownload = async () => {
    if (!file) return;

    try {
      let downloadUrl: string;

      if (file.storage_provider === 'vps') {
        downloadUrl = await VPSFileProcessingService.downloadProcessedFile(file.id);
      } else {
        // For Supabase files, use the existing download logic
        downloadUrl = file.download_url || '';
      }

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await Linking.openURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.success;
      case 'processing':
        return COLORS.warning;
      case 'failed':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'processing':
        return 'time';
      case 'failed':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onGestureEvent = (event: any) => {
    const { translationY, state, velocityY } = event.nativeEvent;

    if (state === State.ACTIVE) {
      if (translationY >= 0) {
        panY.setValue(translationY);
      } else {
        panY.setValue(0);
      }
    }

    if (state === State.END) {
      if (translationY > 150 || velocityY > 500) {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(panY, {
            toValue: 800,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
          panY.setValue(0);
        });
      } else {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  if (!file) return null;

  return (
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
          activeOffsetY={[-10, 10]}
          failOffsetX={[-15, 15]}
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
                      panY
                    ),
                  },
                ],
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.dragHandle, {
                backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
              }]} />
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.modalTitle, { 
                    color: dark ? COLORS.white : COLORS.greyscale900 
                  }]}>
                    File Details
                  </Text>
                  <Text style={[styles.modalSubtitle, { 
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                  }]}>
                    {file.file_name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.greyscale900} />
                </TouchableOpacity>
              </View>
            </View>

            {/* File Info */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* File Metadata */}
              <View style={[styles.section, { 
                backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
                borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
              }]}>
                <Text style={[styles.sectionTitle, { 
                  color: dark ? COLORS.white : COLORS.greyscale900 
                }]}>
                  File Information
                </Text>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, { 
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                  }]}>Size:</Text>
                  <Text style={[styles.metadataValue, { 
                    color: dark ? COLORS.white : COLORS.greyscale900 
                  }]}>{formatFileSize(file.file_size)}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, { 
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                  }]}>Type:</Text>
                  <Text style={[styles.metadataValue, { 
                    color: dark ? COLORS.white : COLORS.greyscale900 
                  }]}>{file.file_type}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, { 
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                  }]}>Storage:</Text>
                  <Text style={[styles.metadataValue, { 
                    color: file.storage_provider === 'vps' ? COLORS.success : COLORS.primary 
                  }]}>{file.storage_provider === 'vps' ? 'VPS (Secure)' : 'Supabase'}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={[styles.metadataLabel, { 
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                  }]}>Uploaded:</Text>
                  <Text style={[styles.metadataValue, { 
                    color: dark ? COLORS.white : COLORS.greyscale900 
                  }]}>{new Date(file.uploaded_at).toLocaleDateString()}</Text>
                </View>
              </View>

              {/* Processing Status */}
              <View style={[styles.section, { 
                backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
                borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
              }]}>
                <Text style={[styles.sectionTitle, { 
                  color: dark ? COLORS.white : COLORS.greyscale900 
                }]}>
                  Processing Status
                </Text>
                <View style={styles.statusContainer}>
                  <Ionicons 
                    name={getStatusIcon(file.processing_status || 'pending') as any} 
                    size={24} 
                    color={getStatusColor(file.processing_status || 'pending')} 
                  />
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusText, { 
                      color: getStatusColor(file.processing_status || 'pending'),
                      fontWeight: 'bold'
                    }]}>
                      {file.processing_status?.toUpperCase() || 'PENDING'}
                    </Text>
                    {file.processing_method && (
                      <Text style={[styles.statusSubtext, { 
                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                      }]}>
                        Method: {file.processing_method}
                      </Text>
                    )}
                    {file.word_count && (
                      <Text style={[styles.statusSubtext, { 
                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                      }]}>
                        Words: {file.word_count.toLocaleString()}
                      </Text>
                    )}
                    {file.language_detected && file.language_detected.length > 0 && (
                      <Text style={[styles.statusSubtext, { 
                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                      }]}>
                        Languages: {file.language_detected.join(', ')}
                      </Text>
                    )}
                  </View>
                  {(file.processing_status === 'pending' || file.processing_status === 'processing') && isPolling && (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  )}
                </View>
                {file.processing_error && (
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: COLORS.error }]}>
                      Error: {file.processing_error}
                    </Text>
                  </View>
                )}
              </View>

              {/* Extracted Text */}
              {file.raw_text && (
                <View style={[styles.section, { 
                  backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                }]}>
                  <Text style={[styles.sectionTitle, { 
                    color: dark ? COLORS.white : COLORS.greyscale900 
                  }]}>
                    Extracted Text
                  </Text>
                  <ScrollView 
                    style={[styles.textContainer, { 
                      backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                      borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    }]}
                    showsVerticalScrollIndicator={true}
                  >
                    <Text style={[styles.extractedText, { 
                      color: dark ? COLORS.white : COLORS.greyscale900 
                    }]}>
                      {file.raw_text}
                    </Text>
                  </ScrollView>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, {
                    backgroundColor: COLORS.primary,
                  }]}
                  onPress={handleFileDownload}
                >
                  <Ionicons name="download" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Download File</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
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
    height: '85%',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  metadataValue: {
    fontSize: 14,
    fontFamily: 'medium',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 12,
    fontFamily: 'regular',
    marginBottom: 2,
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(247, 85, 85, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  textContainer: {
    maxHeight: 200,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  extractedText: {
    fontSize: 14,
    fontFamily: 'regular',
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
});

export default FileDetailsModal; 