import { View, Text, StyleSheet, ScrollView } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { COLORS } from '../constants';
import CustomOtpInput from '../components/CustomOtpInput';
import Button from "../components/Button";
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp, useNavigation } from '@react-navigation/native';

// Change Pin Screen
const ChangePIN = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const { colors, dark } = useTheme();

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Change PIN" />
                <ScrollView>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>Change your PIN number to make your account more secure.</Text>
                    <CustomOtpInput
                        numberOfDigits={4}
                        value=""
                        onValueChange={(text) => console.log(text)}
                        tintColor={COLORS.primary}
                        onFilled={(text) => console.log(`OTP is ${text}`)}
                        cellWidth={58}
                        cellHeight={58}
                        cellSpacing={8}
                        autoFocus={true}
                        keyboardType="number-pad"
                    />
                </ScrollView>
                <Button
                    title="Continue"
                    filled
                    style={styles.button}
                    onPress={() => { navigation.goBack() }}
                />
            </View>
        </SafeAreaView>
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
    title: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.greyscale900,
        textAlign: "center",
        marginVertical: 64
    },
    OTPStyle: {
        borderRadius: 8,
        height: 58,
        width: 58,
        backgroundColor: COLORS.secondaryWhite,
        borderBottomColor: "gray",
        borderBottomWidth: .4,
        borderWidth: .4,
        borderColor: "gray"
    },
    codeContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
        justifyContent: "center"
    },
    code: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.greyscale900,
        textAlign: "center"
    },
    time: {
        fontFamily: "medium",
        fontSize: 18,
        color: COLORS.primary
    },
    button: {
        borderRadius: 32
    }
})

export default ChangePIN