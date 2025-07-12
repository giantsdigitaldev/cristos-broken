import React, { FC, useState } from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, SIZES, WEB_INPUT_STYLES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface InputProps extends TextInputProps {
    id: string;
    icon?: string;
    errorText?: string | string[];
    onInputChanged: (id: string, text: string) => void;
    loading?: boolean;
}

const Input: FC<InputProps> = (props) => {
    const [isFocused, setIsFocused] = useState(false);
    const { dark } = useTheme();

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const onChangeText = (text: string) => {
        props.onInputChanged(props.id, text);
    };

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.inputContainer,
                    {
                        borderColor: isFocused ? COLORS.primary : dark ? COLORS.dark2 : COLORS.greyscale500,
                        backgroundColor: isFocused ? COLORS.tansparentPrimary : dark ? COLORS.dark2 : COLORS.greyscale500,
                    },
                ]}
            >
                {props.icon && (
                    <Image
                        source={props.icon as ImageSourcePropType}
                        style={[
                            styles.icon,
                            {
                                tintColor: isFocused ? COLORS.primary : '#BCBCBC',
                            },
                        ]}
                    />
                )}
                <TextInput
                    {...props}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={[
                        styles.input, 
                        { color: dark ? COLORS.white : COLORS.black },
                        Platform.OS === 'web' && WEB_INPUT_STYLES
                    ]}
                    placeholder={props.placeholder}
                    placeholderTextColor={props.placeholderTextColor}
                    autoCapitalize="none"
                />
                {props.loading && (
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: COLORS.primary, fontSize: 12 }}>Checking...</Text>
                    </View>
                )}
            </View>
            {props.errorText && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{Array.isArray(props.errorText) ? props.errorText.join(', ') : props.errorText}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputContainer: {
        width: '100%',
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding2,
        borderRadius: 12,
        borderWidth: 1,
        marginVertical: 5,
        flexDirection: 'row',
        height: 52,
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
        height: 20,
        width: 20,
        tintColor: '#BCBCBC',
    },
    input: {
        color: COLORS.black,
        flex: 1,
        fontFamily: 'regular',
        fontSize: 14,
        paddingTop: 0,
    },
    errorContainer: {
        marginVertical: 4,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
    },
});

export default Input;