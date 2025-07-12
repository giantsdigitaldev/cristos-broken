import Button from "@/components/Button";
import { useNavigation } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SocialButtonV2 from "../components/SocialButtonV2";
import { COLORS, SIZES, icons, illustrations } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type Nav = {
  navigate: (value: string) => void
}

// welcome screen
const Welcome = () => {
  const { navigate } = useNavigation<Nav>();
  const { colors, dark } = useTheme();

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image source={dark ? illustrations.welcomeDark : illustrations.welcome} resizeMode="contain" style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>Welcome to cristOS</Text>
        <View style={{ marginVertical: 22 }}>
          <SocialButtonV2 title="Continue with Facebook" icon={icons.facebook} onPress={() => navigate("signup")} />
          <SocialButtonV2 title="Continue with Google" icon={icons.google} onPress={() => navigate("signup")} />
          <SocialButtonV2 title="Continue with Apple" icon={icons.appleLogo} onPress={() => navigate("signup")}
            iconStyles={{ tintColor: dark ? COLORS.white : COLORS.black }} />
        </View>
        <View style={styles.lineContainer}>
          <View style={[styles.line, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />
          <Text style={[styles.text, { color: dark ? COLORS.white : COLORS.grayscale700 }]}>Or</Text>
          <View style={[styles.line, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />
        </View>
        <Button
          title="Sign in with email"
          filled
          onPress={() => navigate("login")}
          style={{
            width: "100%",
            marginVertical: 22
          }}
        />
        <View style={{ flexDirection: "row" }}>
          <Text style={[styles.loginTitle, {
            color: dark ? COLORS.white : "black"
          }]}>Don’t have an account? </Text>
          <TouchableOpacity
            onPress={() => navigate("signup")}>
            <Text style={styles.loginSubtitle}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 237,
    height: 200,
    marginBottom: 22,
    marginTop: -22,
  },
  title: {
    fontSize: 32,
    fontFamily: "bold",
    color: COLORS.black,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: "black",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loginTitle: {
    fontSize: 14,
    fontFamily: "regular",
    color: "black",
  },
  loginSubtitle: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    right: 0,
    left: 0,
    width: SIZES.width - 32,
    alignItems: "center",
  },
  bottomTitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.black,
  },
  bottomSubtitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.black,
    textDecorationLine: "underline",
    marginTop: 2,
  },
  lineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.grayscale200,
  },
  text: {
    marginHorizontal: 10,
    color: COLORS.grayscale700,
    fontSize: 18,
    fontFamily: "semiBold"
  },
});

export default Welcome;