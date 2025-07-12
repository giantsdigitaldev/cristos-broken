import { useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import Button from '../components/Button';
import GlobalSettingsItem from '../components/GlobalSettingsItem';
import Header from '../components/Header';
import { COLORS, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

type Nav = {
  navigate: (value: string) => void
}

// Settings for Security 
const SettingsSecurity = () => {
  const { navigate } = useNavigation<Nav>();
  const [isRememberMeEnabled, setIsRememberMeEnabled] = useState(true);
  const [isFaceIDEnabled, setIsFaceIDEnabled] = useState(false);
  const [isBiometricIDEnabled, setIsBiometricIDEnabled] = useState(true);
  const { colors, dark } = useTheme();

  const toggleRememberMe = () => {
    setIsRememberMeEnabled(!isRememberMeEnabled);
  };

  const toggleFaceID = () => {
    setIsFaceIDEnabled(!isFaceIDEnabled);
  };

  const toggleBiometricID = () => {
    setIsBiometricIDEnabled(!isBiometricIDEnabled);
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Security" />
        <ScrollView style={styles.scrollView}
          showsVerticalScrollIndicator={false}>
          <GlobalSettingsItem
            title="Remember me"
            isNotificationEnabled={isRememberMeEnabled}
            toggleNotificationEnabled={toggleRememberMe}
          />
          <GlobalSettingsItem
            title="Face ID"
            isNotificationEnabled={isFaceIDEnabled}
            toggleNotificationEnabled={toggleFaceID}
          />
          <GlobalSettingsItem
            title="Biometric ID"
            isNotificationEnabled={isBiometricIDEnabled}
            toggleNotificationEnabled={toggleBiometricID}
          />
          <TouchableOpacity style={styles.view}>
            <Text style={[styles.viewLeft, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Google Authenticator</Text>
            <Image
              source={icons.arrowRight}
              resizeMode='contain'
              style={[styles.arrowRight, { tintColor: dark ? COLORS.primary : COLORS.greyscale900 }]}
            />
          </TouchableOpacity>
          <Button
            title="Change PIN"
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              marginTop: 22
            }}
            textColor={dark ? COLORS.white : COLORS.primary}
            onPress={() => { navigate("changepin") }}
          />
          <Button
            title="Change Password"
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              marginTop: 22
            }}
            textColor={dark ? COLORS.white : COLORS.primary}
            onPress={() => { navigate("changepassword") }}
          />
          <Button
            title="Change Email"
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              marginTop: 22
            }}
            textColor={dark ? COLORS.white : COLORS.primary}
            onPress={() => { navigate("changeemail") }}
          />
        </ScrollView>
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
    backgroundColor: COLORS.white,
    padding: 16
  },
  scrollView: {
    marginVertical: 22
  },
  arrowRight: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  view: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16
  },
  viewLeft: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginRight: 8
  },
  button: {
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32,
    borderColor: COLORS.tansparentPrimary,
    marginTop: 22
  }
})

export default SettingsSecurity