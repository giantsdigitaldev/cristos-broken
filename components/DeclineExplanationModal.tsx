import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface DeclineExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (explanation: string) => void;
  loading?: boolean;
}

const DeclineExplanationModal: React.FC<DeclineExplanationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false
}) => {
  const { dark } = useTheme();
  const [explanation, setExplanation] = useState('');
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
      Animated.timing(modalAnimation, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        opacity: overlayOpacity,
        justifyContent: 'flex-end'
      }}>
        <Animated.View style={{
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          minHeight: 220,
          transform: [{ translateY: modalAnimation }]
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: dark ? COLORS.white : COLORS.greyscale900 }}>
            Decline Invitation
          </Text>
          <Text style={{ color: dark ? COLORS.grayscale400 : COLORS.grayscale700, marginBottom: 12 }}>
            Please provide a reason for declining (optional):
          </Text>
          <TextInput
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              color: dark ? COLORS.white : COLORS.greyscale900,
              minHeight: 80,
              marginBottom: 16
            }}
            placeholder="Type your explanation..."
            placeholderTextColor={COLORS.grayscale400}
            value={explanation}
            onChangeText={setExplanation}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <TouchableOpacity
              style={{ marginRight: 16, paddingVertical: 10, paddingHorizontal: 18 }}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={{ color: COLORS.error, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 22 }}
              onPress={() => onConfirm(explanation)}
              disabled={loading}
            >
              <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Confirm Decline</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default DeclineExplanationModal; 