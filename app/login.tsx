import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicOnlyRoute } from '../components/AuthGuard';
import Button from '../components/Button';
import Header from '../components/Header';
import Input from '../components/Input';
import { useAvatarCache } from '../components/OptimizedUserAvatar';
import OrSeparator from '../components/OrSeparator';
import SocialButton from '../components/SocialButton';
import Toast from '../components/Toast';
import { COLORS, icons } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { validateInput } from '../utils/actions/formActions';
import { ProfileService } from '../utils/profileService';
import { reducer } from '../utils/reducers/formReducers';
import { supabase } from '../utils/supabaseOptimized';

const isTestMode = false;

const initialState = {
    inputValues: {
        email: isTestMode ? 'test@example.com' : '',
        password: isTestMode ? 'password123' : '',
    },
    inputValidities: {
        email: false,
        password: false
    },
    formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

// Login screen
const Login = () => {
    const { navigate } = useNavigation<Nav>();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const { colors, dark } = useTheme();
    const { signIn, refreshUser, user } = useAuth();
    const params = useLocalSearchParams();
    const [showWelcome, setShowWelcome] = useState(false);
    const [isProcessingConfirmation, setIsProcessingConfirmation] = useState(false);
    
    // Toast state
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error');

    const { invalidateAvatar, preloadAvatar } = useAvatarCache();
    const [avatarKey, setAvatarKey] = useState(0);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error') => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    };

    const hideToast = () => {
        setToastVisible(false);
    };

    const inputChangedHandler = useCallback(
        (inputId: string, inputValue: string) => {
            const result = validateInput(inputId, inputValue)
            dispatchFormState({
                inputId,
                validationResult: result,
                inputValue
            })
        }, [dispatchFormState])

    // Handle email confirmation from deep link
    const processEmailConfirmation = async (token: string, email: string) => {
        try {
            setIsProcessingConfirmation(true);
            console.log('🔐 Processing email confirmation with token:', token ? 'present' : 'missing');
            console.log('📧 Email from deep link:', email);
            
            if (!token) {
                console.log('❌ No confirmation token found in URL');
                showToast('Invalid confirmation link. Please check your email and try again.', 'error');
                return;
            }

            console.log('🔄 Attempting email confirmation...');
            
            const { data, error } = await supabase.auth.verifyOtp({
                email: email,
                token: token,
                type: 'signup'
            });

            if (error) {
                console.error('❌ Email confirmation error:', error);
                
                // Try magic link method as fallback
                console.log('🔄 Trying magic link method...');
                const { data: magicData, error: magicError } = await supabase.auth.verifyOtp({
                    email: email,
                    token: token,
                    type: 'magiclink'
                });

                if (magicError) {
                    console.error('❌ Magic link method also failed:', magicError);
                    showToast('Email confirmation failed. Please try again.', 'error');
                    return;
                }

                console.log('✅ Email confirmed successfully with magic link method:', magicData);
            } else {
                console.log('✅ Email confirmed successfully:', data);
            }
            
            // Store confirmation data for later use
            await AsyncStorage.setItem('email_confirmed', 'true');
            await AsyncStorage.setItem('confirmed_email', email);
            await AsyncStorage.setItem('confirmation_token', token);
            
            // Pre-fill the email field
            dispatchFormState({
                inputId: 'email',
                validationResult: undefined,
                inputValue: email
            });
            
            // Show welcome message
            setShowWelcome(true);
            showToast('Email confirmed successfully! 🎉', 'success');
            
            // Auto-hide welcome message after 5 seconds
            setTimeout(() => setShowWelcome(false), 5000);
            
            // Wait a moment for Supabase to process the confirmation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error: any) {
            console.error('❌ Email confirmation exception:', error);
            showToast(error.message || 'Email confirmation failed', 'error');
        } finally {
            setIsProcessingConfirmation(false);
        }
    };

    // Check if user arrived from email confirmation
    useEffect(() => {
        const checkEmailConfirmation = async () => {
            try {
                // Check if email was confirmed via deep link
                const emailConfirmed = await AsyncStorage.getItem('email_confirmed');
                const confirmedEmail = await AsyncStorage.getItem('confirmed_email');
                
                if (emailConfirmed === 'true' && confirmedEmail) {
                    console.log('✅ User arrived from email confirmation');
                    setShowWelcome(true);
                    
                    // Pre-fill the email field
                    dispatchFormState({
                        inputId: 'email',
                        validationResult: undefined,
                        inputValue: confirmedEmail
                    });
                    
                    // Clear the stored confirmation data
                    await AsyncStorage.removeItem('email_confirmed');
                    await AsyncStorage.removeItem('confirmed_email');
                    await AsyncStorage.removeItem('confirmation_token');
                    
                    // Auto-hide welcome message after 5 seconds
                    setTimeout(() => setShowWelcome(false), 5000);
                } else if (params.confirmed === 'true' || params.welcome === 'true') {
                    setShowWelcome(true);
                    // Auto-hide welcome message after 5 seconds
                    setTimeout(() => setShowWelcome(false), 5000);
                }
            } catch (error) {
                console.error('Error checking email confirmation:', error);
            }
        };
        
        checkEmailConfirmation();
    }, [params]);

    // Handle direct email confirmation from URL parameters
    useEffect(() => {
        const handleDirectConfirmation = async () => {
            try {
                console.log('🔗 Login: Checking for direct email confirmation params:', params);
                
                // Extract email and token from URL
                let token = params.token as string;
                let email = params.email as string;
                
                // If not found in query params, check if they're in the path
                if (!token || !email) {
                    const pathname = params.pathname as string;
                    if (pathname && pathname.includes('/confirm-email/')) {
                        const pathParts = pathname.split('/');
                        const confirmIndex = pathParts.findIndex(part => part === 'confirm-email');
                        if (confirmIndex !== -1 && pathParts.length > confirmIndex + 2) {
                            email = decodeURIComponent(pathParts[confirmIndex + 1]);
                            token = decodeURIComponent(pathParts[confirmIndex + 2]);
                            console.log('📧 Found email and token in path:', { email, token: token ? 'present' : 'missing' });
                        }
                    }
                }
                
                if (token && email) {
                    console.log('✅ Found confirmation token and email in URL, processing...');
                    await processEmailConfirmation(token, email);
                }
            } catch (error) {
                console.error('Error handling direct confirmation:', error);
            }
        };
        
        handleDirectConfirmation();
    }, [params]);

    const handleLogin = async () => {
        const { email, password } = formState.inputValues;
        
        if (!email || !password) {
            showToast('Please fill in all fields');
            return;
        }

        // Check if there are validation errors (undefined means valid)
        if (formState.inputValidities.email !== undefined) {
            showToast('Please enter a valid email address');
            return;
        }

        if (formState.inputValidities.password !== undefined) {
            showToast('Please enter a valid password');
            return;
        }

        setIsLoading(true);

        try {
            // Check if this user just confirmed their email
            const emailConfirmed = await AsyncStorage.getItem('email_confirmed');
            const confirmedEmail = await AsyncStorage.getItem('confirmed_email');
            
            if (emailConfirmed === 'true' && confirmedEmail === email) {
                console.log('🔄 User just confirmed email, waiting for Supabase to process...');
                showToast('Email confirmation processing, please wait...', 'info');
                
                // Wait a bit longer for Supabase to fully process the confirmation
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Clear the stored confirmation data
                await AsyncStorage.removeItem('email_confirmed');
                await AsyncStorage.removeItem('confirmed_email');
                await AsyncStorage.removeItem('confirmation_token');
            }
            
            const result = await signIn(email, password);
            
            if (result.success) {
                await refreshUser();
                let retries = 0;
                let currentUser = user;
                while ((!currentUser || !currentUser.id) && retries < 10) {
                    await new Promise(res => setTimeout(res, 100));
                    currentUser = user;
                    retries++;
                }
                if (currentUser && currentUser.id) {
                    // Check for avatar URL (now stored as Supabase URL from signup)
                    const storedAvatarUrl = await AsyncStorage.getItem('signup_avatar_url');
                    if (storedAvatarUrl) {
                        console.log('🖼️ Found stored avatar URL after login, updating profile for user:', currentUser.id);
                        
                        // Update profile with the avatar URL (already uploaded to Supabase)
                        const updateResult = await ProfileService.updateProfile({ avatar_url: storedAvatarUrl });
                        
                        if (updateResult.success) {
                            // Store in profile avatar cache for instant display
                            await AsyncStorage.setItem(`profile_avatar_url:${currentUser.id}`, storedAvatarUrl);
                            await AsyncStorage.removeItem('signup_avatar_url');
                            // Invalidate cache to force fresh load
                            await invalidateAvatar(currentUser.id);
                            console.log('✅ Avatar profile updated successfully');
                        } else {
                            console.warn('⚠️ Failed to update profile with avatar:', updateResult.error);
                        }
                    }
                }
            } else {
                // If login failed and user just confirmed email, give them a helpful message
                if (emailConfirmed === 'true' && confirmedEmail === email) {
                    showToast('Email confirmation is still processing. Please wait a moment and try again.', 'warning');
                } else {
                    showToast(result.error || 'Login failed. Please try again.');
                }
            }
        } catch (err: any) {
            showToast(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Implementing apple authentication
    const appleAuthHandler = () => {
        showToast('Apple Sign In will be available soon', 'info');
    };

    // Implementing facebook authentication
    const facebookAuthHandler = () => {
        showToast('Facebook Sign In will be available soon', 'info');
    };

    // Implementing google authentication
    const googleAuthHandler = () => {
        showToast('Google Sign In will be available soon', 'info');
    };

    return (
        <PublicOnlyRoute>
            <SafeAreaView style={[styles.area, {
                backgroundColor: colors.background
            }]}>
                <Toast
                    visible={toastVisible}
                    message={toastMessage}
                    type={toastType}
                    onHide={hideToast}
                />
                <View style={[styles.container, {
                    backgroundColor: colors.background
                }]}>
                    <Header title="" />
                    {showWelcome && (
                        <View style={styles.welcomeBanner}>
                            <Text style={styles.welcomeTitle}>Welcome to CristOS! 🎉</Text>
                            <Text style={styles.welcomeMessage}>Your email has been confirmed. You can now sign in to your account.</Text>
                        </View>
                    )}
                    {isProcessingConfirmation && (
                        <View style={styles.processingBanner}>
                            <Text style={styles.processingTitle}>Confirming Email...</Text>
                            <Text style={styles.processingMessage}>Please wait while we confirm your email address.</Text>
                        </View>
                    )}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Login to your</Text>
                            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Account</Text>
                        </View>
                        <Input
                            id="email"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['email']}
                            placeholder="Email"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            icon={icons.email}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            returnKeyType="next"
                        />
                        <Input
                            id="password"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['password']}
                            placeholder="Password"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            icon={icons.lock}
                            autoCapitalize="none"
                            autoComplete="password"
                            returnKeyType="done"
                            secureTextEntry={true}
                        />
                        <View style={styles.checkboxContainer}>
                            <Checkbox
                                value={isChecked}
                                onValueChange={setChecked}
                                color={isChecked ? COLORS.primary : undefined}
                            />
                            <Text style={[styles.checkboxText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                                Remember me
                            </Text>
                        </View>
                        <Button
                            title={isLoading ? "Signing In..." : "Sign In"}
                            filled
                            onPress={handleLogin}
                            style={styles.loginButton}
                            disabled={isLoading || isProcessingConfirmation}
                        />
                        <TouchableOpacity
                            style={styles.forgotPasswordButton}
                            onPress={() => navigate('forgotpasswordemail')}
                        >
                            <Text style={[styles.forgotPasswordText, { color: dark ? COLORS.primary : COLORS.primary }]}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>
                        <OrSeparator text="or continue with" />
                        <View style={styles.socialBtnContainer}>
                            <SocialButton
                                icon={icons.apple}
                                onPress={appleAuthHandler}
                                tintColor={dark ? COLORS.white : COLORS.black}
                            />
                            <SocialButton
                                icon={icons.facebook}
                                onPress={facebookAuthHandler}
                            />
                            <SocialButton
                                icon={icons.google}
                                onPress={googleAuthHandler}
                            />
                        </View>
                        <View style={styles.signupContainer}>
                            <Text style={[styles.signupText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Don&apos;t have an account?</Text>
                            <TouchableOpacity onPress={() => navigate('signup')} style={{ marginLeft: 4 }}>
                                <Text style={[styles.signupLink, { color: dark ? COLORS.primary : COLORS.primary }]}>Sign Up</Text>
                            </TouchableOpacity>
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
    titleContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
    },
    loginButton: {
        marginTop: 20,
        borderRadius: 30,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    checkboxText: {
        marginLeft: 10,
        fontSize: 14,
        fontFamily: 'regular',
    },
    forgotPasswordButton: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 10,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: 'medium',
    },
    socialButton: {
        marginTop: 10,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    signupText: {
        fontSize: 14,
        fontFamily: 'regular',
    },
    signupLink: {
        fontSize: 14,
        fontFamily: 'medium',
    },
    welcomeBanner: {
        backgroundColor: COLORS.success,
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
    },
    welcomeTitle: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    welcomeMessage: {
        fontSize: 14,
        fontFamily: 'regular',
        color: COLORS.white,
    },
    processingBanner: {
        backgroundColor: COLORS.primary,
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
    },
    processingTitle: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    processingMessage: {
        fontSize: 14,
        fontFamily: 'regular',
        color: COLORS.white,
    },
    socialBtnContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
});

export default Login;