import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicOnlyRoute } from '../components/AuthGuard';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { supabase } from '../utils/supabaseOptimized';

const WelcomeConfirmed = () => {
    const { colors, dark } = useTheme();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Get URL parameters
    const params = useLocalSearchParams();
    
    // Handle email confirmation and redirect
    useEffect(() => {
        const processEmailConfirmation = async () => {
            try {
                console.log('🔗 WelcomeConfirmed: Processing email confirmation...');
                console.log('📋 Params:', params);
                
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
                
                if (!token || !email) {
                    console.log('⚠️ No confirmation token or email found in URL');
                    setError('Invalid confirmation link. Please check your email and try again.');
                    return;
                }
                
                console.log('✅ Found confirmation token and email in URL');
                console.log('📧 Email:', email);
                console.log('🔑 Token:', token ? 'present' : 'missing');
                
                // Process email confirmation
                console.log('🔄 Attempting email confirmation...');
                
                const { data, error: confirmError } = await supabase.auth.verifyOtp({
                    email: email,
                    token: token,
                    type: 'signup'
                });

                if (confirmError) {
                    console.error('❌ Email confirmation error:', confirmError);
                    
                    // Try magic link method as fallback
                    console.log('🔄 Trying magic link method...');
                    const { data: magicData, error: magicError } = await supabase.auth.verifyOtp({
                        email: email,
                        token: token,
                        type: 'magiclink'
                    });

                    if (magicError) {
                        console.error('❌ Magic link method also failed:', magicError);
                        setError('Email confirmation failed. Please try again.');
                        return;
                    }

                    console.log('✅ Email confirmed successfully with magic link method:', magicData);
                } else {
                    console.log('✅ Email confirmed successfully:', data);
                }
                
                // Store confirmation data for the sign-in page
                await AsyncStorage.setItem('email_confirmed', 'true');
                await AsyncStorage.setItem('confirmed_email', email);
                await AsyncStorage.setItem('confirmation_token', token);
                
                console.log('✅ Email confirmation successful, redirecting to sign-in...');
                
                // Redirect to sign-in page
                router.replace('/login');
                
            } catch (error: any) {
                console.error('❌ Email confirmation exception:', error);
                setError(error.message || 'Email confirmation failed');
            }
        };

        processEmailConfirmation();
    }, [params]);

    return (
        <PublicOnlyRoute>
            <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={styles.center}>
                        {isProcessing && !error ? (
                            <>
                                <Text style={[styles.title, { 
                                    color: dark ? COLORS.white : COLORS.greyscale900 
                                }]}>
                                    Confirming Email...
                                </Text>
                                
                                <ActivityIndicator 
                                    size="large" 
                                    color={COLORS.primary} 
                                    style={styles.spinner}
                                />
                                
                                <Text style={[styles.subtitle, { 
                                    color: dark ? COLORS.grayscale400 : COLORS.greyscale600 
                                }]}>
                                    Please wait while we confirm your email address
                                </Text>
                            </>
                        ) : error ? (
                            <>
                                <Text style={[styles.title, { 
                                    color: COLORS.error 
                                }]}>
                                    Confirmation Failed
                                </Text>
                                
                                <Text style={[styles.subtitle, { 
                                    color: dark ? COLORS.grayscale400 : COLORS.greyscale600 
                                }]}>
                                    {error}
                                </Text>
                                
                                <Text style={[styles.description, { 
                                    color: dark ? COLORS.grayscale400 : COLORS.greyscale600 
                                }]}>
                                    Please check your email and try clicking the confirmation link again, or contact support if the problem persists.
                                </Text>
                            </>
                        ) : null}
                    </View>
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
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    title: {
        fontSize: 24,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
        textAlign: 'center',
        marginBottom: 16
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'semiBold',
        color: COLORS.greyscale600,
        textAlign: 'center',
        marginBottom: 24
    },
    description: {
        fontSize: 14,
        fontFamily: 'regular',
        color: COLORS.greyscale600,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 40,
        paddingHorizontal: 10
    },
    spinner: {
        marginVertical: 20,
    },
});

export default WelcomeConfirmed; 