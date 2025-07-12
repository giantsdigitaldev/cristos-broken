import DatePickerModal from '@/components/DatePickerModal';
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { getFormatedDate } from "react-native-modern-datepicker";
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Header from '../components/Header';
import Input from '../components/Input';
import { COLORS, FONTS, icons, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { validateInput } from '../utils/actions/formActions';
import { launchImagePicker } from '../utils/ImagePickerHelper';
import { reducer } from '../utils/reducers/formReducers';

const isTestMode = true;

const initialState = {
    inputValues: {
        fullName: isTestMode ? 'John Doe' : '',
        email: isTestMode ? 'example@gmail.com' : '',
        nickname: isTestMode ? "" : "",
        phoneNumber: ''
    },
    inputValidities: {
        fullName: false,
        email: false,
        nickname: false,
        phoneNumber: false,
    },
    formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

// Fill Your Profile
const FillYourProfile = () => {
    const { navigate } = useNavigation<Nav>();
    const [image, setImage] = useState<any>(null);
    const [error, setError] = useState();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [openStartDatePicker, setOpenStartDatePicker] = useState(false);
    const { colors, dark } = useTheme();

    const today = new Date();
    const startDate = getFormatedDate(
        new Date(today.setDate(today.getDate() + 1)),
        "YYYY/MM/DD"
    );

    const [startedDate, setStartedDate] = useState("12/12/2023");

    const handleOnPressStartDate = () => {
        setOpenStartDatePicker(!openStartDatePicker);
    };

    const inputChangedHandler = useCallback(
        (inputId: string, inputValue: string) => {
            const result = validateInput(inputId, inputValue)
            dispatchFormState({
                inputId,
                validationResult: result,
                inputValue,
            })
        }, [dispatchFormState]);

    useEffect(() => {
        if (error) {
            Alert.alert('An error occured', error)
        }
    }, [error])

    // Fetch codes from rescountries api
    useEffect(() => {
        fetch("https://restcountries.com/v2/all")
            .then(response => response.json())
            .then(data => {
                let areaData = data.map((item: any) => {
                    return {
                        code: item.alpha2Code,
                        item: item.name,
                        callingCode: `+${item.callingCodes[0]}`,
                        flag: `https://flagsapi.com/${item.alpha2Code}/flat/64.png`
                    }
                });

                setAreas(areaData);
                if (areaData.length > 0) {
                    let defaultData = areaData.filter((a: any) => a.code == "US");

                    if (defaultData.length > 0) {
                        setSelectedArea(defaultData[0])
                    }
                }
            })
    }, [])

    const pickImage = async () => {
        try {
            const tempUri = await launchImagePicker()

            if (!tempUri) return

            setImage({ uri: tempUri })
        } catch (error) { }
    };

    // Render Countries Codes Modal
    function RenderAreasCodesModal() {

        const renderItem = ({ item }: { item: any }) => {
            return (
                <TouchableOpacity
                    style={{
                        padding: 10,
                        flexDirection: "row"
                    }}
                    onPress={() => {
                        setSelectedArea(item),
                            setModalVisible(false)
                    }}>
                    <Image
                        source={{ uri: item.flag }}
                        resizeMode='contain'
                        style={{
                            height: 30,
                            width: 30,
                            marginRight: 10
                        }}
                    />
                    <Text style={{ fontSize: 16, color: "#fff" }}>{item.item}</Text>
                </TouchableOpacity>
            )
        }
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}>
                <TouchableWithoutFeedback
                    onPress={() => setModalVisible(false)}>
                    <View
                        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <View
                            style={{
                                height: SIZES.height,
                                width: SIZES.width,
                                backgroundColor: COLORS.primary,
                                borderRadius: 12
                            }}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeBtn}>
                                <Ionicons name="close-outline" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <FlatList
                                data={areas}
                                renderItem={renderItem}
                                horizontal={false}
                                keyExtractor={(item) => item.code}
                                style={{
                                    padding: 20,
                                    marginBottom: 20
                                }}
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
                <Header title="Fill Your Profile" />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ alignItems: "center", marginVertical: 12 }}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={image === null ? icons.userDefault2 : image}
                                resizeMode="cover"
                                style={styles.avatar} />
                            <TouchableOpacity
                                onPress={pickImage}
                                style={styles.pickImage}>
                                <MaterialCommunityIcons
                                    name="pencil-outline"
                                    size={24}
                                    color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View>
                        <Input
                            id="fullName"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['fullName']}
                            placeholder="Full Name"
                            placeholderTextColor={COLORS.gray} />
                        <Input
                            id="nickname"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['nickname']}
                            placeholder="Nickname"
                            placeholderTextColor={COLORS.gray} />
                        <Input
                            id="email"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['email']}
                            placeholder="Email"
                            placeholderTextColor={COLORS.gray}
                            keyboardType="email-address" />
                        <View style={{ width: SIZES.width - 32 }}>
                            <TouchableOpacity
                                style={[styles.inputBtn, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                    borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                }]}
                                onPress={handleOnPressStartDate}>
                                <Text style={{ ...FONTS.body4, color: COLORS.grayscale400 }}>{startedDate}</Text>
                                <Feather name="calendar" size={24} color={COLORS.grayscale400} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.inputContainer, {
                            backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                            borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                        }]}>
                            <TouchableOpacity
                                style={styles.selectFlagContainer}
                                onPress={() => setModalVisible(true)}>
                                <View style={{ justifyContent: "center" }}>
                                    <Image
                                        source={icons.down}
                                        resizeMode='contain'
                                        style={styles.downIcon}
                                    />
                                </View>
                                <View style={{ justifyContent: "center", marginLeft: 5 }}>
                                    <Image
                                        source={{ uri: selectedArea?.flag }}
                                        resizeMode="contain"
                                        style={styles.flagIcon}
                                    />
                                </View>
                                <View style={{ justifyContent: "center", marginLeft: 5 }}>
                                    <Text style={{ color: dark ? COLORS.white : "#111", fontSize: 12 }}>{selectedArea?.callingCode}</Text>
                                </View>
                            </TouchableOpacity>
                            {/* Phone Number Text Input */}
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your phone number"
                                placeholderTextColor={COLORS.gray}
                                selectionColor="#111"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
            <DatePickerModal
                open={openStartDatePicker}
                startDate={startDate}
                selectedDate={startedDate}
                onClose={() => setOpenStartDatePicker(false)}
                onChangeStartDate={(date) => setStartedDate(date)}
            />
            {RenderAreasCodesModal()}
            <View style={styles.bottomContainer}>
                <Button
                    title="Skip"
                    style={{
                        width: (SIZES.width - 32) / 2 - 8,
                        borderRadius: 32,
                        backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                        borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
                    }}
                    textColor={dark ? COLORS.white : COLORS.primary}
                    onPress={() => navigate("createnewpin")}
                />
                <Button
                    title="Continue"
                    filled
                    style={styles.continueButton}
                    onPress={() => navigate("createnewpin")}
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
    avatarContainer: {
        marginVertical: 12,
        alignItems: "center",
        width: 130,
        height: 130,
        borderRadius: 65,
    },
    avatar: {
        height: 130,
        width: 130,
        borderRadius: 65,
    },
    pickImage: {
        height: 42,
        width: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 0,
        right: 0,
    },
    inputContainer: {
        flexDirection: "row",
        borderColor: COLORS.greyscale500,
        borderWidth: .4,
        borderRadius: 12,
        height: 52,
        width: SIZES.width - 32,
        alignItems: 'center',
        marginVertical: 12,
        backgroundColor: COLORS.greyscale500,
    },
    downIcon: {
        width: 10,
        height: 10,
        tintColor: "#111"
    },
    selectFlagContainer: {
        width: 90,
        height: 50,
        marginHorizontal: 5,
        flexDirection: "row",
    },
    flagIcon: {
        width: 30,
        height: 30
    },
    input: {
        flex: 1,
        marginVertical: 10,
        height: 40,
        fontSize: 14,
        color: "#111"
    },
    inputBtn: {
        borderWidth: 1,
        borderRadius: 12,
        borderColor: COLORS.greyscale500,
        height: 52,
        paddingLeft: 8,
        fontSize: 18,
        justifyContent: "space-between",
        marginTop: 4,
        backgroundColor: COLORS.greyscale500,
        flexDirection: "row",
        alignItems: "center",
        paddingRight: 8
    },
    rowContainer: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
    bottomContainer: {
        position: "absolute",
        bottom: 32,
        right: 16,
        left: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        width: SIZES.width - 32,
        alignItems: "center"
    },
    continueButton: {
        width: (SIZES.width - 32) / 2 - 8,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    closeBtn: {
        width: 42,
        height: 42,
        borderRadius: 999,
        backgroundColor: COLORS.white,
        position: "absolute",
        right: 16,
        top: 32,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
    }
})

export default FillYourProfile