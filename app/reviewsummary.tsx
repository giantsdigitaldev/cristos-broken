import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, icons, illustrations } from '../constants';
import Header from '../components/Header';
import { ScrollView } from 'react-native';
import { Octicons } from "@expo/vector-icons";
import Button from '../components/Button';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';

// Review Summary
const ReviewSummary = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const [modalVisible, setModalVisible] = useState(false);
    const { colors, dark } = useTheme();

    // Render Modal
    const renderModal = () => {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}>
                <TouchableWithoutFeedback
                    onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalSubContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, }]}>
                            <Image
                                source={illustrations.premium}
                                resizeMode='contain'
                                style={styles.modalIllustration}
                            />
                            <Text style={styles.modalTitle}>Congratulations!</Text>
                            <Text style={[styles.modalSubtitle, {
                                color: dark ? COLORS.grayscale200 : COLORS.greyscale600
                            }]}>
                                You have successfully subscribed 1 month premium. Enjoy the benefits!
                            </Text>
                            <Button
                                title="Continue"
                                filled
                                onPress={() => {
                                    setModalVisible(false)
                                    navigation.navigate("enterpin")
                                }}
                                style={styles.successBtn}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        )
    }


    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Review Summary" />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.btnContainer, {
                            backgroundColor: dark ? COLORS.dark2 : "#FAFAFA"
                        }]}>
                        <View style={{ alignItems: "center" }}>
                            <Image
                                source={icons.premium1}
                                resizeMode='contain'
                                style={styles.premiumIcon}
                            />
                            <View style={styles.priceContainer}>
                                <Text style={[styles.price, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>$9.99</Text>
                                <Text style={[styles.priceMonth, { color: dark ? COLORS.white : COLORS.grayscale700 }]}>/month</Text>
                            </View>
                        </View>
                        <View style={styles.premiumItemContainer}>
                            <View style={styles.premiumItem}>
                                <Octicons name="check" size={24} color={COLORS.primary} />
                                <Text style={[styles.premiumText, { color: dark ? COLORS.white : COLORS.greyScale800 }]}>Unlimited task creation</Text>
                            </View>
                            <View style={styles.premiumItem}>
                                <Octicons name="check" size={24} color={COLORS.primary} />
                                <Text style={[styles.premiumText, { color: dark ? COLORS.white : COLORS.greyScale800 }]}>Collaborate with team members</Text>
                            </View>
                            <View style={styles.premiumItem}>
                                <Octicons name="check" size={24} color={COLORS.primary} />
                                <Text style={[styles.premiumText, { color: dark ? COLORS.white : COLORS.greyScale800 }]}>Priority support</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <View style={[styles.summaryContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    }]}>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>Amount</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>$9.99</Text>
                        </View>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>Tax</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>$1.99</Text>
                        </View>
                        <View style={[styles.separateLine, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200 }]} />
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>Total</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>$11.99</Text>
                        </View>
                    </View>
                    <View style={[styles.cardContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    }]}>
                        <View style={styles.cardLeft}>
                            <Image
                                source={icons.creditCard}
                                resizeMode='contain'
                                style={styles.creditCard}
                            />
                            <Text style={[styles.creditCardNum, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                                •••• •••• •••• •••• 4679</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("addnewcard")}
                        >
                            <Text style={styles.changeBtnText}>Change</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <Button
                    title="Continue"
                    onPress={() => setModalVisible(true)}
                    filled
                    style={styles.continueBtn}
                />
            </View>
            {renderModal()}
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
    btnContainer: {
        width: SIZES.width - 32,
        height: 300,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: COLORS.primary,
        paddingHorizontal: 16,
        marginTop: 28,
        marginBottom: 16,
        backgroundColor: "#FAFAFA"
    },
    premiumIcon: {
        width: 60,
        height: 60,
        tintColor: COLORS.primary,
        marginTop: 12
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12
    },
    price: {
        fontSize: 32,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    priceMonth: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.grayscale700,
    },
    premiumItemContainer: {
        marginTop: 16
    },
    premiumItem: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 6
    },
    premiumText: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.greyScale800,
        marginLeft: 24
    },
    summaryContainer: {
        width: SIZES.width - 32,
        height: 160,
        borderRadius: 16,
        padding: 16,
        backgroundColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 2,
            height: 2
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1
    },
    view: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 12
    },
    viewLeft: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    viewRight: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.greyscale900
    },
    separateLine: {
        width: SIZES.width - 32,
        height: 1,
        backgroundColor: COLORS.grayscale200
    },
    creditCard: {
        width: 44,
        height: 34
    },
    creditCardNum: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.greyscale900,
        marginLeft: 12
    },
    changeBtnText: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.primary
    },
    cardContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 12,
        width: SIZES.width - 32,
        height: 80,
        borderRadius: 16,
        padding: 16,
        backgroundColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    continueBtn: {
        borderRadius: 32,
        position: "absolute",
        bottom: 16,
        width: SIZES.width - 32,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        right: 16,
        left: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: "bold",
        color: COLORS.primary,
        textAlign: "center",
        marginVertical: 12
    },
    modalSubtitle: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.greyscale600,
        textAlign: "center",
        marginVertical: 12
    },
    modalContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)"
    },
    modalSubContainer: {
        height: 460,
        width: SIZES.width * 0.9,
        backgroundColor: COLORS.white,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        padding: 16
    },
    modalIllustration: {
        height: 180,
        width: 180,
        marginVertical: 22
    },
    successBtn: {
        width: "100%",
        marginTop: 12,
        borderRadius: 32
    }
})

export default ReviewSummary