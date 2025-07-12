import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PublicOnlyRoute } from '../components/AuthGuard';
import Button from '../components/Button';
import Header from '../components/Header';
import Input from '../components/Input';
import { COLORS, SIZES, icons, images } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { validateInput } from '../utils/actions/formActions';
import { reducer } from '../utils/reducers/formReducers';

const isTestMode = true

const initialState = {
    inputValues: {
        email: isTestMode ? 'test@example.com' : '',
    },
    inputValidities: {
        email: false
    },
    formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

// Forgot Password Email Screen
const ForgotPasswordEmail = () => {
    const { navigate } = useNavigation<Nav>();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const { colors, dark } = useTheme();
    const { resetPassword } = useAuth();

    const inputChangedHandler = useCallback(
        (inputId: string, inputValue: string) => {
            const result = validateInput(inputId, inputValue)
            dispatchFormState({
                inputId,
                validationResult: result,
                inputValue
            })
        }, [dispatchFormState])

    useEffect(() => {
        if (error) {
            Alert.alert('Password Reset Error', error, [
                { text: 'OK', onPress: () => setError(null) }
            ]);
        }
    }, [error]);

    const handleResetPassword = async () => {
        const { email } = formState.inputValues;
        
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        if (!formState.inputValidities.email) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await resetPassword(email);
            
            if (result.success) {
                Alert.alert(
                    'Password Reset Email Sent',
                    'Please check your email for instructions to reset your password.',
                    [
                        { 
                            text: 'OK', 
                            onPress: () => navigate('login')
                        }
                    ]
                );
            } else {
                setError(result.error || 'Failed to send password reset email');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PublicOnlyRoute>
            <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <Header title="Forgot Password" />
                    <ScrollView style={{ marginVertical: 54 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={images.logo}
                                resizeMode='contain'
                                style={styles.logo}
                            />
                        </View>
                        <Text style={[styles.title, {
                            color: dark ? COLORS.white : COLORS.black
                        }]}>Enter Your Email</Text>
                        <Text style={[styles.subtitle, {
                            color: dark ? COLORS.gray3 : COLORS.gray
                        }]}>We&apos;ll send you a link to reset your password</Text>
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
                        />
                        <Button
                            title={isLoading ? "Sending..." : "Send Reset Link"}
                            filled
                            onPress={handleResetPassword}
                            style={styles.button}
                            disabled={isLoading}
                        />
                        <TouchableOpacity
                            onPress={() => navigate("login")}>
                            <Text style={styles.forgotPasswordBtnText}>Remember the password? Sign In</Text>
                        </TouchableOpacity>
                    </ScrollView>
                    <View style={styles.bottomContainer}>
                        <Text style={[styles.bottomLeft, {
                            color: dark ? COLORS.white : COLORS.black
                        }]}>Don&apos;t have an account ?</Text>
                        <TouchableOpacity
                            onPress={() => navigate("signup")}>
                            <Text style={styles.bottomRight}>{"  "}Sign Up</Text>
                        </TouchableOpacity>
                    </View>
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
    title: {
        fontSize: 26,
        fontFamily: "semiBold",
        color: COLORS.black,
        textAlign: "center",
        marginBottom: 12
    },
    subtitle: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.gray,
        textAlign: "center",
        marginBottom: 22
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
        fontFamily: "semiBold",
        color: COLORS.primary
    },
    button: {
        marginVertical: 6,
        width: SIZES.width - 32,
        borderRadius: 30
    },
    forgotPasswordBtnText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.primary,
        textAlign: "center",
        marginTop: 12
    }
});

export default ForgotPasswordEmail;