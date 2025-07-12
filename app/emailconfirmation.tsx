import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicOnlyRoute } from '../components/AuthGuard';
import Button from '../components/Button';
import Header from '../components/Header';
import { COLORS, illustrations } from '../constants';
// import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';

type Nav = {
    navigate: (value: string) => void;
}

const EmailConfirmation = () => {
    const { navigate } = useNavigation<Nav>();
    const { colors, dark } = useTheme();
    // const { signIn } = useAuth();
    const params = useLocalSearchParams();
    const [email, setEmail] = useState<string>('');
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        // Get email from navigation params or stored value
        console.log('📧 EmailConfirmation: Received params:', params);
        
        const getEmail = async () => {
            if (params.email) {
                console.log('✅ EmailConfirmation: Setting email from params:', params.email);
                setEmail(params.email as string);
            } else {
                console.log('❌ EmailConfirmation: No email in params, checking AsyncStorage...');
                try {
                    const storedEmail = await AsyncStorage.getItem('signup_email');
                    if (storedEmail) {
                        console.log('✅ EmailConfirmation: Found email in AsyncStorage:', storedEmail);
                        setEmail(storedEmail);
                    } else {
                        console.log('❌ EmailConfirmation: No email found in AsyncStorage either');
                    }
                } catch (error) {
                    console.log('⚠️ EmailConfirmation: Error reading from AsyncStorage:', error);
                }
            }
        };
        
        getEmail();
        
        // Cleanup function to remove stored email when component unmounts
        return () => {
            const cleanup = async () => {
                try {
                    await AsyncStorage.removeItem('signup_email');
                    // Keep avatar URL for later association
                    console.log('🧹 Cleaned up stored email on unmount (keeping avatar URL)');
                } catch (error) {
                    console.log('⚠️ Error cleaning up stored email on unmount:', error);
                }
            };
            cleanup();
        };
    }, [params]);

    const handleOpenEmailApp = async () => {
        try {
            // Try to open email apps to their inbox (not compose new email)
            const emailApps = [
                'googlegmail://co', // Gmail inbox
                'ms-outlook://mail/inbox', // Outlook inbox
                'ymail://mail/inbox', // Yahoo Mail inbox
                'spark://inbox', // Spark inbox
                'message://', // iOS Mail app inbox (not compose)
            ];
            
            for (const app of emailApps) {
                try {
                    const canOpenApp = await Linking.canOpenURL(app);
                    if (canOpenApp) {
                        console.log('📱 Opening email app:', app);
                        await Linking.openURL(app);
                        return;
                    }
                } catch (error) {
                    console.log(`Could not open ${app}:`, error);
                }
            }
            
            // If no specific email app can be opened, try to open the Mail app directly
            // For iOS, we'll try to open the Mail app without composing a new email
            try {
                // Try to open the Mail app directly (this should open to inbox on iOS)
                await Linking.openURL('message://');
                console.log('📱 Opening iOS Mail app');
                return;
            } catch (error) {
                console.log('Could not open iOS Mail app directly:', error);
            }
            
            // Last resort: show instructions to open manually
            Alert.alert(
                'Open Email App',
                'Please open your Mail app manually and check for the confirmation email from CristOS.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error opening email app:', error);
            Alert.alert(
                'Error',
                'Could not open email app. Please open it manually and check for the confirmation email.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleResendEmail = async () => {
        if (!email) {
            Alert.alert('Error', 'Email address not found. Please go back and try signing up again.');
            return;
        }

        setIsResending(true);
        try {
            // Note: Supabase doesn't have a direct resend confirmation method
            // We would need to implement this through the auth API or guide user to signup again
            Alert.alert(
                'Resend Email',
                'If you haven\'t received the email, please check your spam folder or try signing up again.',
                [{ text: 'OK' }]
            );
        } catch {
            Alert.alert('Error', 'Failed to resend confirmation email.');
        } finally {
            setIsResending(false);
        }
    };

    const handleBackToSignup = async () => {
        // Clean up stored email
        try {
            await AsyncStorage.removeItem('signup_email');
            console.log('🧹 Cleaned up stored email from AsyncStorage');
        } catch {
            console.log('⚠️ Error cleaning up stored email');
        }
        navigate('signup');
    };

    const handleGoToLogin = async () => {
        // Clean up stored email
        try {
            await AsyncStorage.removeItem('signup_email');
            console.log('🧹 Cleaned up stored email from AsyncStorage');
        } catch {
            console.log('⚠️ Error cleaning up stored email');
        }
        navigate('login');
    };

    return (
        <PublicOnlyRoute>
            <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <Header title="" />
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
                        <View style={styles.center}>
                            <Image
                                source={illustrations.checked}
                                style={styles.illustrationSmall}
                                resizeMode="contain"
                            />
                            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Check Your Email</Text>
                            <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.greyscale600 }]}>We&apos;ve sent a confirmation link to</Text>
                            <Text style={[styles.email, { color: COLORS.primary }]}>{email ? email : 'No email address found. Please check your signup process.'}</Text>
                            <Text style={[styles.description, { color: dark ? COLORS.grayscale400 : COLORS.greyscale600 }]}>Please check your email (including spam folder) and click the confirmation link to activate your account.</Text>
                            <View style={styles.instructionContainer}>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}><Text style={styles.stepText}>1</Text></View>
                                    <Text style={[styles.stepDescription, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Open your email app</Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}><Text style={styles.stepText}>2</Text></View>
                                    <Text style={[styles.stepDescription, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Find the email from CristOS</Text>
                                </View>
                                <View style={styles.instructionStep}>
                                    <View style={styles.stepNumber}><Text style={styles.stepText}>3</Text></View>
                                    <Text style={[styles.stepDescription, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Click &quot;Confirm Email&quot; button</Text>
                                </View>
                            </View>
                            <Button title="Open Email App" filled onPress={handleOpenEmailApp} style={styles.openEmailButton} />
                            <Button title="Go to Sign In" filled onPress={handleGoToLogin} style={styles.primaryButton} />
                            <TouchableOpacity onPress={handleResendEmail} style={styles.resendButton} disabled={isResending}>
                                <Text style={[styles.resendText, { color: COLORS.primary, opacity: isResending ? 0.5 : 1 }]}>{isResending ? 'Sending...' : 'Didn&apos;t receive the email? Resend'}</Text>
                            </TouchableOpacity>
                            <View style={styles.signInLinkContainer}> 
                                <Text style={[styles.bottomLeft, { color: dark ? COLORS.white : COLORS.black }]}>Back to</Text>
                                <TouchableOpacity onPress={handleBackToSignup}>
                                    <Text style={styles.bottomRight}> Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </PublicOnlyRoute>
    );
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: COLORS.white
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20
    },
    illustration: {
        width: 200,
        height: 200,
        marginBottom: 40
    },
    title: {
        fontSize: 28,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
        textAlign: 'center',
        marginBottom: 16
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'regular',
        color: COLORS.greyscale600,
        textAlign: 'center',
        marginBottom: 8
    },
    email: {
        fontSize: 16,
        fontFamily: 'semiBold',
        color: COLORS.primary,
        textAlign: 'center',
        marginBottom: 24
    },
    description: {
        fontSize: 14,
        fontFamily: 'regular',
        color: COLORS.greyscale600,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        paddingHorizontal: 10
    },
    instructionContainer: {
        width: '100%',
        marginBottom: 32
    },
    instructionStep: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    stepText: {
        color: COLORS.white,
        fontSize: 12,
        fontFamily: 'bold'
    },
    stepDescription: {
        fontSize: 14,
        fontFamily: 'medium',
        color: COLORS.greyscale900,
        flex: 1
    },
    openEmailButton: {
        width: '100%',
        borderRadius: 30,
        marginBottom: 16,
        backgroundColor: COLORS.success
    },
    primaryButton: {
        width: '100%',
        borderRadius: 30,
        marginBottom: 16
    },
    resendButton: {
        paddingVertical: 8,
        marginBottom: 16
    },
    resendText: {
        fontSize: 14,
        fontFamily: 'medium',
        color: COLORS.primary
    },
    signInLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    bottomLeft: {
        fontSize: 14,
        fontFamily: 'regular',
        color: 'black',
    },
    bottomRight: {
        fontSize: 16,
        fontFamily: 'medium',
        color: COLORS.primary,
    },
    illustrationSmall: {
        width: 120,
        height: 120,
        marginBottom: 24,
    },
});

export default EmailConfirmation; 