import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface SocialButtonProps {
    icon: string;
    onPress: () => void;
    tintColor?: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon, onPress, tintColor }) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.container, {
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                borderColor: dark ? COLORS.dark2 : COLORS.grayscale200
            }]}>
            <Image
                source={icon as ImageSourcePropType}
                resizeMode='contain'
                style={[styles.icon, {
                    tintColor: tintColor
                }]}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 88,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderColor: COLORS.grayscale200,
        borderWidth: 1,
        marginHorizontal: 8
    },
    icon: {
        height: 24,
        width: 24,
    }
});

export default SocialButton;