import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import Button from './Button';

interface PrivacyPolicyModalProps {
    visible: boolean;
    onClose: () => void;
    onAccept: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
    visible,
    onClose,
    onAccept,
}) => {
    const { dark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 300,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, fadeAnim, slideAnim]);

    const handleAccept = () => {
        onAccept();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={styles.overlayTouchable}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: dark ? COLORS.greyscale900 : COLORS.white,
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.black }]}>
                            Privacy Policy
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons
                                name="close"
                                size={24}
                                color={dark ? COLORS.white : COLORS.black}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                                1. Types of Data We Collect
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                We may collect the following types of data:
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Personal Information: This includes but is not limited to your name, email address, and other contact details provided during account registration or usage of our services.
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Usage Information: We may collect information about how you interact with our services, including but not limited to IP addresses, device information, and browsing history.
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Cookies and Similar Technologies: We use cookies and similar technologies to enhance your experience and gather information about your preferences.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                                2. Use of Your Personal Data
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                We may use your personal data for the following purposes:
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Service Delivery: To provide and maintain our services, including personalized content and features.
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Communication: To communicate with you, respond to your inquiries, and provide important information about our services.
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Analytics: To analyze usage patterns, improve our services, and customize content based on user preferences.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                                3. Disclosure of Your Personal Data
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                We may disclose your personal data in the following situations:
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Legal Obligations: To comply with legal obligations, such as responding to lawful requests or court orders.
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Third-Party Service Providers: We may share your information with third-party service providers who assist us in delivering our services, subject to confidentiality agreements.
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                Business Transactions: In the event of a merger, acquisition, or sale of all or a portion of our assets, your personal data may be transferred as part of the transaction.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                                4. Data Security
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                We implement appropriate security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                                5. Your Rights
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                You have the right to access, correct, or delete your personal data. You may also have the right to restrict or object to certain processing of your data. To exercise these rights, please contact us.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                                6. Changes to This Policy
                            </Text>
                            <Text style={[styles.bodyText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button
                            title="I Accept"
                            filled
                            onPress={handleAccept}
                            style={styles.acceptButton}
                        />
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        width: Dimensions.get('window').width * 0.9,
        maxHeight: Dimensions.get('window').height * 0.8,
        borderRadius: 16,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    title: {
        fontSize: 20,
        fontFamily: 'bold',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'bold',
        marginBottom: 8,
    },
    bodyText: {
        fontSize: 14,
        fontFamily: 'regular',
        lineHeight: 20,
        marginBottom: 8,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.grayscale200,
    },
    acceptButton: {
        width: '100%',
    },
});

export default PrivacyPolicyModal; 