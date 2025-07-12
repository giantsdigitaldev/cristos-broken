import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useReducer, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicOnlyRoute } from '../components/AuthGuard';
import Button from '../components/Button';
import Header from '../components/Header';
import Input from '../components/Input';
import OrSeparator from '../components/OrSeparator';
import SocialButton from '../components/SocialButton';
import Toast from '../components/Toast';
import { COLORS, SIZES, icons } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { validateInput } from '../utils/actions/formActions';
import { reducer } from '../utils/reducers/formReducers';

const isTestMode = false;

const initialState = {
    inputValues: {
        email: isTestMode ? 'test@example.com' : '',
        password: isTestMode ? 'password123' : '',
        firstName: isTestMode ? 'Test' : '',
        lastName: isTestMode ? 'User' : '',
    },
    inputValidities: {
        email: undefined,
        password: undefined,
        firstName: undefined,
        lastName: undefined
    },
    formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

// Signup Screen
const Signup = () => {
    const { navigate } = useNavigation<Nav>();
    const router = useRouter();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const { colors, dark } = useTheme();
    const { signUp } = useAuth();
    
    // Toast state
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error');

    // Keyboard state management
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    
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
                inputValue,
            })
        },
        [dispatchFormState]);



    const handleSignup = async () => {
        const { email, password, firstName, lastName } = formState.inputValues;
        
        console.log('🔘 Signup attempt:', { email, password, firstName, lastName });
        console.log('📋 FormState:', formState);
        console.log('✅ Validation state:', {
            email: formState.inputValidities.email,
            password: formState.inputValidities.password,
            isChecked: isChecked
        });
        
        if (!email || !password) {
            console.log('❌ Missing email or password');
            showToast('Please fill in all required fields');
            return;
        }

        // Validation error messages are stored as strings when invalid, undefined when valid
        // Check if there are validation errors (error messages exist)
        if (formState.inputValidities.email) {
            console.log('❌ Email validation failed:', formState.inputValidities.email);
            showToast('Please enter a valid email address');
            return;
        }

        if (formState.inputValidities.password) {
            console.log('❌ Password validation failed:', formState.inputValidities.password);
            showToast('Password must be at least 6 characters long');
            return;
        }

        if (!isChecked) {
            console.log('❌ Privacy policy not accepted');
            showToast('Please accept our Privacy Policy to continue');
            return;
        }

        console.log('✅ All validations passed, proceeding with signup...');
        setIsLoading(true);

        try {
            const fullName = `${firstName || ''} ${lastName || ''}`.trim();
            console.log('🚀 Calling signUp with:', { email, password, firstName, lastName, fullName });
            // Pass undefined for avatar since we removed profile picture functionality
            const result = await signUp(email, password, fullName, firstName, lastName, undefined);
            console.log('📨 SignUp result:', result);
            
            if (result.success && 'user' in result && result.user && result.user.id) {
                console.log('✅ Signup successful, navigating to email confirmation...');
                // Store email in AsyncStorage as backup
                await AsyncStorage.setItem('signup_email', email);
                console.log('💾 Email stored in AsyncStorage as backup');
                // Navigate to email confirmation screen with the email address
                router.push({
                    pathname: '/emailconfirmation',
                    params: { email: email }
                });
            } else if (result.error) {
                console.log('❌ Signup failed:', result.error);
                showToast(result.error || 'Registration failed. Please try again.');
            }
        } catch (err: any) {
            console.error('💥 Signup error:', err);
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
        showToast('Google Sign-In coming soon!', 'info');
    };

    // Keyboard event handlers
    React.useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                const keyboardHeight = event.endCoordinates.height;
                setKeyboardVisible(true);
                setKeyboardHeight(keyboardHeight);
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                setKeyboardVisible(false);
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    return (
        <PublicOnlyRoute>
            <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
                <Toast
                    visible={toastVisible}
                    message={toastMessage}
                    type={toastType}
                    onHide={hideToast}
                />
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <Header title="" />
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={24}
                    >
                        <KeyboardAwareScrollView
                            showsVerticalScrollIndicator={false}
                            enableOnAndroid
                            extraScrollHeight={24}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.titleContainer}>
                                <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Create Your Account</Text>
                            </View>

                            {/* Name Row */}
                            <View style={styles.nameRow}>
                                <View style={styles.nameInputContainer}>
                                    <Input
                                        id="firstName"
                                        onInputChanged={inputChangedHandler}
                                        errorText={formState.inputValidities['firstName']}
                                        placeholder="First Name"
                                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                                        icon={icons.profile}
                                        autoCapitalize="words"
                                        autoComplete="given-name"
                                        returnKeyType="next"
                                    />
                                </View>
                                <View style={styles.nameInputContainer}>
                                    <Input
                                        id="lastName"
                                        onInputChanged={inputChangedHandler}
                                        errorText={formState.inputValidities['lastName']}
                                        placeholder="Last Name"
                                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                                        icon={icons.profile}
                                        autoCapitalize="words"
                                        autoComplete="family-name"
                                        returnKeyType="next"
                                    />
                                </View>
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
                                onInputChanged={inputChangedHandler}
                                errorText={formState.inputValidities['password']}
                                autoCapitalize="none"
                                id="password"
                                placeholder="Password"
                                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                                icon={icons.padlock}
                                secureTextEntry={true}
                                autoComplete="password-new"
                                returnKeyType="done"
                                onSubmitEditing={handleSignup}
                            />
                            <View style={styles.checkBoxContainer}>
                                <View style={{ flexDirection: 'row' }}>
                                    <Checkbox
                                        style={styles.checkbox}
                                        value={isChecked}
                                        color={isChecked ? COLORS.primary : dark ? COLORS.primary : "gray"}
                                        onValueChange={setChecked}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.privacy, {
                                            color: dark ? COLORS.white : COLORS.black
                                        }]}>By continuing you accept our Privacy Policy and Terms of Service</Text>
                                    </View>
                                </View>
                            </View>
                            <Button
                                title={isLoading ? "Creating Account..." : "Sign Up"}
                                filled
                                onPress={() => {
                                    console.log('🔘 Sign Up button pressed');
                                    if (!isChecked) {
                                        showToast('Please accept our Privacy Policy to continue');
                                        return;
                                    }
                                    handleSignup();
                                }}
                                style={styles.button}
                                disabled={isLoading}
                            />

                            <View style={styles.signInLinkContainer}>
                                <Text style={[styles.bottomLeft, {
                                    color: dark ? COLORS.white : COLORS.black
                                }]}>Already have an account ?</Text>
                                <TouchableOpacity
                                    onPress={() => navigate("login")}
                                >
                                    <Text style={styles.bottomRight}> Sign In</Text>
                                </TouchableOpacity>
                            </View>

                            <View>
                                <OrSeparator text="or continue with" />
                                <View style={styles.socialBtnContainer}>
                                    <SocialButton
                                        icon={icons.appleLogo}
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
                            </View>
                        </KeyboardAwareScrollView>
                    </KeyboardAvoidingView>
                </View>
            </SafeAreaView>
        </PublicOnlyRoute>
    )
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
    logo: {
        width: 100,
        height: 100,
        tintColor: COLORS.primary
    },
    logoContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 32
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    titleContainer: {
        marginVertical: 24
    },
    title: {
        fontSize: 48,
        fontFamily: "bold",
        color: "#212121",
    },

    checkBoxContainer: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 18,
    },
    checkbox: {
        marginRight: 8,
        height: 16,
        width: 16,
        borderRadius: 4,
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    privacy: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.black,
    },
    socialTitle: {
        fontSize: 19.25,
        fontFamily: "medium",
        color: COLORS.black,
        textAlign: "center",
        marginVertical: 26
    },
    socialBtnContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    bottomContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 18,
        position: "absolute",
        bottom: 12,
        right: 0,
        left: 0,
    },
    bottomLeft: {
        fontSize: 14,
        fontFamily: "regular",
        color: "black"
    },
    bottomRight: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.primary
    },
    button: {
        marginVertical: 6,
        width: SIZES.width - 32,
        borderRadius: 30
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 8,
    },
    nameInputContainer: {
        flex: 1,
    },
    signInLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
})

export default Signup