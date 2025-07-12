import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from "../components/Button";
import CustomOtpInput from "../components/CustomOtpInput";
import Header from '../components/Header';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

type Nav = {
    navigate: (value: string) => void
}

const OTPVerification = () => {
    const { navigate } = useNavigation<Nav>();
    const [time, setTime] = useState(59);
    const { colors, dark } = useTheme();

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTime((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);
    
    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Forgot Password" />
                <ScrollView>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>Code has been send to +1 111 ******99</Text>
                    <CustomOtpInput
                        numberOfDigits={4}
                        value=""
                        onValueChange={(text) => console.log(text)}
                        onFilled={(text) => console.log(`OTP is ${text}`)}
                        tintColor={COLORS.primary}
                        offTintColor={dark ? COLORS.gray : COLORS.secondaryWhite}
                        cellWidth={58}
                        cellHeight={58}
                        cellSpacing={8}
                        autoFocus
                    />
                    <View style={styles.codeContainer}>
                        <Text style={[styles.code, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Resend code in</Text>
                        <Text style={styles.time}>  {time}  </Text>
                        <Text style={[styles.code, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>s</Text>
                    </View>
                </ScrollView>
                <Button
                    title="Verify"
                    filled
                    style={styles.button}
                    onPress={() => { navigate("createnewpassword") }}
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
        marginVertical: 54
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

export default OTPVerification