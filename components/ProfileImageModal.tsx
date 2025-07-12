import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileService } from '@/utils/profileService';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ProfileImageModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (result: { success: boolean; url?: string; error?: string }) => void;
  userId: string;
}

const { width: screenWidth } = Dimensions.get('window');

const ProfileImageModal: React.FC<ProfileImageModalProps> = ({
  visible,
  onClose,
  onImageSelected,
  userId,
}) => {
  const { dark } = useTheme();

  const requestPermissions = async (type: 'camera' | 'library') => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission is required to take a selfie. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Media Library Permission Required',
            'Media library permission is required to select photos. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request permissions');
      return false;
    }
  };

  const takeSelfie = async () => {
    console.log('📸 Take selfie button pressed');
    
    const hasPermission = await requestPermissions('camera');
    if (!hasPermission) return;

    try {
      console.log('📸 Launching camera...');
      
      const cameraOptions = await ProfileService.getCameraOptions();
      const result = await ImagePicker.launchCameraAsync(cameraOptions);
      
      console.log('📸 Camera result:', result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const uploadResult = await ProfileService.uploadProfileImage(result.assets[0].uri, userId);
        onImageSelected(uploadResult);
        onClose();
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take selfie. Please try again.');
    }
  };

  const pickFromLibrary = async () => {
    console.log('📚 Pick from library button pressed');
    
    const hasPermission = await requestPermissions('library');
    if (!hasPermission) return;

    try {
      console.log('📚 Launching image library...');
      
      const libraryOptions = await ProfileService.getImagePickerOptions();
      const result = await ImagePicker.launchImageLibraryAsync(libraryOptions);
      
      console.log('📚 Image library result:', result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const uploadResult = await ProfileService.uploadProfileImage(result.assets[0].uri, userId);
        onImageSelected(uploadResult);
        onClose();
      }
    } catch (error) {
      console.error('Library picker error:', error);
      Alert.alert('Error', 'Failed to pick image from library. Please try again.');
    }
  };

  const handleWebImageSelection = () => {
    console.log('🌐 Web image selection triggered');
    // For web, we'll use the ProfileService's web-specific method
    ProfileService.pickAndUploadProfileImageWeb(userId)
      .then((result) => {
        onImageSelected(result);
        onClose();
      })
      .catch((error) => {
        console.error('Web image selection error:', error);
        Alert.alert('Error', 'Failed to select image. Please try again.');
      });
  };

  const renderMobileModal = () => (
    <View style={styles.modalOverlay}>
      <View style={[
        styles.modalContent,
        {
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          width: Math.min(screenWidth - 40, 320),
        }
      ]}>
        <Text style={[
          styles.modalTitle,
          { color: dark ? COLORS.white : COLORS.greyscale900 }
        ]}>
          Change Profile Photo
        </Text>
        
        <TouchableOpacity
          onPress={pickFromLibrary}
          style={[
            styles.optionButton,
            {
              backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
              borderColor: dark ? COLORS.dark3 : COLORS.grayscale200
            }
          ]}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.optionText,
            { color: dark ? COLORS.white : COLORS.greyscale900 }
          ]}>
            Choose from Library
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={takeSelfie}
          style={[
            styles.optionButton,
            {
              backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
              borderColor: dark ? COLORS.dark3 : COLORS.grayscale200
            }
          ]}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.optionText,
            { color: dark ? COLORS.white : COLORS.greyscale900 }
          ]}>
            Take Selfie
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelButton}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWebModal = () => (
    <View style={styles.modalOverlay}>
      <View style={[
        styles.modalContent,
        {
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          width: Math.min(screenWidth - 40, 320),
        }
      ]}>
        <Text style={[
          styles.modalTitle,
          { color: dark ? COLORS.white : COLORS.greyscale900 }
        ]}>
          Change Profile Photo
        </Text>
        
        <TouchableOpacity
          onPress={handleWebImageSelection}
          style={[
            styles.optionButton,
            {
              backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
              borderColor: dark ? COLORS.dark3 : COLORS.grayscale200
            }
          ]}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.optionText,
            { color: dark ? COLORS.white : COLORS.greyscale900 }
          ]}>
            Choose Image File
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelButton}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS === 'web' ? renderWebModal() : renderMobileModal()}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default ProfileImageModal; 