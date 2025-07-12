import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { getFormatedDate } from "react-native-modern-datepicker";
import RNPickerSelect from 'react-native-picker-select';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import DatePickerModal from '../components/DatePickerModal';
import Header from '../components/Header';
import Input from '../components/Input';
import OptimizedUserAvatar from '../components/OptimizedUserAvatar';
import ProfileImageModal from '../components/ProfileImageModal';
import { COLORS, FONTS, icons, SIZES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { validateInput } from '../utils/actions/formActions';
import { cacheService } from '../utils/cacheService';
import { ProfileService } from '../utils/profileService';
import { reducer } from '../utils/reducers/formReducers';
import { SetupTester } from '../utils/testSetup';

interface CountryItem {
    flag: string;
    item: string;
    code: string;
    callingCode: string;
}

interface RenderItemProps {
    item: CountryItem;
}

// Static country data to avoid API dependency
const COUNTRIES_DATA: CountryItem[] = [
    { code: "US", item: "United States", callingCode: "+1", flag: "🇺🇸" },
    { code: "CA", item: "Canada", callingCode: "+1", flag: "🇨🇦" },
    { code: "GB", item: "United Kingdom", callingCode: "+44", flag: "🇬🇧" },
    { code: "AU", item: "Australia", callingCode: "+61", flag: "🇦🇺" },
    { code: "DE", item: "Germany", callingCode: "+49", flag: "🇩🇪" },
    { code: "FR", item: "France", callingCode: "+33", flag: "🇫🇷" },
    { code: "JP", item: "Japan", callingCode: "+81", flag: "🇯🇵" },
    { code: "KR", item: "South Korea", callingCode: "+82", flag: "🇰🇷" },
    { code: "CN", item: "China", callingCode: "+86", flag: "🇨🇳" },
    { code: "IN", item: "India", callingCode: "+91", flag: "🇮🇳" },
    { code: "BR", item: "Brazil", callingCode: "+55", flag: "🇧🇷" },
    { code: "MX", item: "Mexico", callingCode: "+52", flag: "🇲🇽" },
    { code: "ES", item: "Spain", callingCode: "+34", flag: "🇪🇸" },
    { code: "IT", item: "Italy", callingCode: "+39", flag: "🇮🇹" },
    { code: "NL", item: "Netherlands", callingCode: "+31", flag: "🇳🇱" },
];

const isTestMode = false;

const initialState = {
    inputValues: {
        fullName: '',
        email: '',
        nickname: '',
        phoneNumber: '',
        occupation: '',
    },
    inputValidities: {
        fullName: false,
        email: false,
        nickname: false,
        phoneNumber: false,
        occupation: false,
    },
    formIsValid: false,
}

// Edit Profile Screen
const EditProfile = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const { user } = useAuth();
    // Avatar cache invalidation helper
    const invalidateAvatarCache = async () => {
        if (user?.id) {
            await cacheService.invalidate(`user_avatar:${user.id}`);
            console.log('🗑️ Avatar cache invalidated');
        }
    };
    const [image, setImage] = useState<any>(null);
    const [error, setError] = useState();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [areas, setAreas] = useState<CountryItem[]>(COUNTRIES_DATA);
    const [selectedArea, setSelectedArea] = useState<CountryItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [openStartDatePicker, setOpenStartDatePicker] = useState(false);
    const [selectedGender, setSelectedGender] = useState('');
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
    ];

    const handleGenderChange = (value: any) => {
        setSelectedGender(value);
    };

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
    }, [error]);

    // Load user profile data
    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            
            try {
                console.log('Loading profile for user:', user.id);
                console.log('User data:', user);
                
                // Always initialize email field first
                dispatchFormState({
                    inputId: 'email',
                    validationResult: true,
                    inputValue: user.email || '',
                });
                
                // Get profile from database
                const profile = await ProfileService.getProfile(user.id);
                console.log('Profile response:', profile);
                
                if (profile.success && profile.data) {
                    setProfileData(profile.data);
                    
                    // Set form values from database
                    if (profile.data.full_name) {
                        dispatchFormState({
                            inputId: 'fullName',
                            validationResult: true,
                            inputValue: profile.data.full_name,
                        });
                    } else if (user.user_metadata?.full_name) {
                        // Fallback to user metadata
                        dispatchFormState({
                            inputId: 'fullName',
                            validationResult: true,
                            inputValue: user.user_metadata.full_name,
                        });
                    }
                    
                    if (profile.data.username) {
                        dispatchFormState({
                            inputId: 'nickname',
                            validationResult: true,
                            inputValue: profile.data.username,
                        });
                    } else if (user.email) {
                        // Fallback to email username
                        dispatchFormState({
                            inputId: 'nickname',
                            validationResult: true,
                            inputValue: user.email.split('@')[0],
                        });
                    }
                    
                    // Set image from profile
                    if (profile.data.avatar_url) {
                        console.log('Setting image from profile:', profile.data.avatar_url);
                        setImage({ uri: profile.data.avatar_url });
                    }
                    
                } else {
                    // Handle profile loading error - still initialize with user data
                    console.log('Profile load failed:', profile.error);
                    if (profile.error?.includes('permission denied') || profile.error?.includes('access denied')) {
                        Alert.alert(
                            'Database Setup Required',
                            'The database needs to be configured properly. Please run the setup script or contact support.\n\nYou can still edit your profile - it will create a new profile entry when saved.',
                            [{ text: 'OK' }]
                        );
                    }
                    
                    // Pre-fill form with user data even if profile loading failed
                    dispatchFormState({
                        inputId: 'fullName',
                        validationResult: true,
                        inputValue: user.user_metadata?.full_name || '',
                    });
                    
                    dispatchFormState({
                        inputId: 'nickname',
                        validationResult: true,
                        inputValue: user.email?.split('@')[0] || '',
                    });
                }
                
                // Load extended fields from user metadata (always available)
                dispatchFormState({
                    inputId: 'occupation',
                    validationResult: true,
                    inputValue: user.user_metadata?.occupation || '',
                });
                
                if (user.user_metadata?.gender) {
                    setSelectedGender(user.user_metadata.gender);
                }
                
                if (user.user_metadata?.date_of_birth) {
                    setStartedDate(user.user_metadata.date_of_birth);
                }
                
                if (user.user_metadata?.phone_number) {
                    dispatchFormState({
                        inputId: 'phoneNumber',
                        validationResult: true,
                        inputValue: user.user_metadata.phone_number,
                    });
                }
                
            } catch (error) {
                console.error('Error loading profile:', error);
                Alert.alert('Error', 'Failed to load profile data. You can still edit and save your profile.');
                
                // Still initialize basic fields on error
                dispatchFormState({
                    inputId: 'fullName',
                    validationResult: true,
                    inputValue: user.user_metadata?.full_name || '',
                });
                
                dispatchFormState({
                    inputId: 'nickname',
                    validationResult: true,
                    inputValue: user.email?.split('@')[0] || '',
                });
            }
        };

        loadProfile();
    }, [user]);

    useEffect(() => {
        // Set default country (US)
        const defaultCountry = COUNTRIES_DATA.find(country => country.code === "US");
        if (defaultCountry) {
            setSelectedArea(defaultCountry);
        }
    }, []);

    const handleImageSelected = async (result: { success: boolean; url?: string; error?: string }) => {
        if (result.success && result.url) {
            // Set the uploaded image URL immediately
            setImage({ uri: result.url });
            
            // Also update the profile in the database immediately with the new avatar
            try {
                const currentProfileData = {
                    full_name: formState.inputValues.fullName?.trim() || profileData?.full_name,
                    username: formState.inputValues.nickname?.trim() || profileData?.username,
                    avatar_url: result.url, // Use the new uploaded image URL
                };
                
                console.log('Updating profile with new avatar:', currentProfileData);
                
                const updateResponse = await ProfileService.updateProfile(currentProfileData);
                
                if (updateResponse.success) {
                    console.log('Profile updated with new avatar successfully');
                    setProfileData(updateResponse.data);
                    // Invalidate avatar cache
                    await invalidateAvatarCache();
                    Alert.alert('Success', 'Profile image updated successfully!');
                } else {
                    console.warn('Failed to update profile with new avatar:', updateResponse.error);
                    Alert.alert('Warning', 'Image uploaded but failed to save to profile. Please click Update Profile to save changes.');
                }
            } catch (profileUpdateError) {
                console.error('Error updating profile with new avatar:', profileUpdateError);
                Alert.alert('Warning', 'Image uploaded but failed to save to profile. Please click Update Profile to save changes.');
            }
            
        } else if (result.error && !result.error.includes('cancelled')) {
            console.error('Image upload failed:', result.error);
            Alert.alert('Upload Failed', result.error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!user) {
            Alert.alert('Error', 'No user session found');
            return;
        }

        setLoading(true);
        try {
            console.log('Updating profile with image:', image);
            
            // Prepare profile data - only store basic fields in database
            const updateData = {
                full_name: formState.inputValues.fullName.trim(),
                username: formState.inputValues.nickname.trim(),
                website: '', // Can be added later if needed
                avatar_url: image?.uri, // Use the current image URI
                // Extended fields will be stored in user metadata
                phone_number: selectedArea ? 
                    `${selectedArea.callingCode}${formState.inputValues.phoneNumber}` : 
                    formState.inputValues.phoneNumber,
                occupation: formState.inputValues.occupation.trim(),
                gender: selectedGender,
                date_of_birth: startedDate,
            };

            console.log('Update data being sent:', updateData);

            // Validate the data
            const validation = ProfileService.validateProfileData(updateData);
            if (!validation.isValid) {
                Alert.alert('Validation Error', validation.errors.join('\n'));
                setLoading(false);
                return;
            }

            // Update profile using ProfileService
            const response = await ProfileService.updateProfile(updateData);
            
            console.log('Profile update response:', response);
            
            if (response.success) {
                // Update the profile data state
                setProfileData(response.data);
                
                // Invalidate avatar cache after successful profile update
                await invalidateAvatarCache();
                
                Alert.alert(
                    'Success', 
                    'Profile updated successfully!', 
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', response.error || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const testSetup = async () => {
        if (!user) return;
        
        console.log('Testing setup...');
        const results = await SetupTester.runFullTest(user.id);
        console.log('Setup test results:', results);
        
        let message = 'Setup Test Results:\n\n';
        message += `Database: ${results.database.success ? '✅ Connected' : '❌ ' + results.database.error}\n`;
        message += `Storage: ${results.storage.success ? '✅ Connected' : '❌ ' + results.storage.error}\n`;
        if (results.storage.buckets) {
            message += `Available buckets: ${results.storage.buckets.join(', ')}\n`;
        }
        if (results.profile) {
            message += `Profile: ${results.profile.success ? '✅ Accessible' : '❌ ' + results.profile.error}\n`;
            if (results.profile.profile) {
                message += `Profile data: ${JSON.stringify(results.profile.profile, null, 2)}\n`;
            }
        }
        
        Alert.alert('Setup Test Results', message);
    };

    // Render countries codes modal
    function RenderAreasCodesModal() {
        const renderItem = ({ item }: RenderItemProps) => {
            return (
                <TouchableOpacity
                    style={{
                        padding: 10,
                        flexDirection: "row",
                        alignItems: "center"
                    }}
                    onPress={() => {
                        setSelectedArea(item);
                        setModalVisible(false);
                    }}
                >
                    <Text style={{ fontSize: 24, marginRight: 10 }}>{item.flag}</Text>
                    <Text style={{ fontSize: 16, color: dark ? COLORS.white : COLORS.black, flex: 1 }}>
                        {item.item} ({item.callingCode})
                    </Text>
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
                        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View
                            style={{
                                height: 400,
                                width: SIZES.width * 0.8,
                                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                                borderRadius: 12
                            }}
                        >
                            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }}>
                                <Text style={{ fontSize: 18, fontFamily: 'semiBold', color: dark ? COLORS.white : COLORS.black, textAlign: 'center' }}>
                                    Select Country
                                </Text>
                            </View>
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
        <SafeAreaView style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
            <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
                <Header title="Personal Profile" />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ alignItems: "center", marginVertical: 12 }}>
                        <View style={styles.avatarContainer}>
                            {image ? (
                                <Image
                                    source={image}
                                    resizeMode="cover"
                                    style={styles.avatar}
                                />
                            ) : (
                                <OptimizedUserAvatar
                                    size={130}
                                    style={styles.avatar}
                                    showLoading={true}
                                    showCacheIndicator={false}
                                />
                            )}
                            <TouchableOpacity
                                onPress={() => setShowAvatarModal(true)}
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
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            value={formState.inputValues.fullName}
                        />
                        <Input
                            id="nickname"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['nickname']}
                            placeholder="Username"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            value={formState.inputValues.nickname}
                        />
                        <Input
                            id="email"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['email']}
                            placeholder="Email"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            keyboardType="email-address"
                            value={formState.inputValues.email}
                            editable={false} // Email shouldn't be editable in profile
                            style={{ opacity: 0.7 }}
                        />
                        <View style={{
                            width: SIZES.width - 32
                        }}>
                            <TouchableOpacity
                                style={[styles.inputBtn, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                    borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                }]}
                                onPress={handleOnPressStartDate}
                            >
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
                                        source={icons.arrowDown}
                                        resizeMode='contain'
                                        style={styles.downIcon}
                                    />
                                </View>
                                <View style={{ justifyContent: "center", marginLeft: 5 }}>
                                    <Text style={{ fontSize: 20 }}>{selectedArea?.flag || "🇺🇸"}</Text>
                                </View>
                                <View style={{ justifyContent: "center", marginLeft: 5 }}>
                                    <Text style={{ color: dark ? COLORS.white : "#111", fontSize: 12 }}>
                                        {selectedArea?.callingCode || "+1"}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            {/* Phone Number Text Input */}
                            <TextInput
                                style={[styles.input, { color: dark ? COLORS.white : "#111" }]}
                                placeholder="Enter your phone number"
                                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                                selectionColor="#111"
                                keyboardType="numeric"
                                value={formState.inputValues.phoneNumber}
                                onChangeText={(text) => inputChangedHandler('phoneNumber', text)}
                            />
                        </View>
                        <View>
                            <RNPickerSelect
                                placeholder={{ label: 'Select Gender', value: '' }}
                                items={genderOptions}
                                onValueChange={(value) => handleGenderChange(value)}
                                value={selectedGender}
                                style={{
                                    inputIOS: {
                                        fontSize: 16,
                                        paddingHorizontal: 10,
                                        borderRadius: 4,
                                        color: dark ? COLORS.white : COLORS.greyscale600,
                                        paddingRight: 30,
                                        height: 52,
                                        width: SIZES.width - 32,
                                        alignItems: 'center',
                                        backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                    },
                                    inputAndroid: {
                                        fontSize: 16,
                                        paddingHorizontal: 10,
                                        borderRadius: 8,
                                        color: dark ? COLORS.white : COLORS.greyscale600,
                                        paddingRight: 30,
                                        height: 52,
                                        width: SIZES.width - 32,
                                        alignItems: 'center',
                                        backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                    },
                                }}
                            />
                        </View>
                        <Input
                            id="occupation"
                            onInputChanged={inputChangedHandler}
                            errorText={formState.inputValidities['occupation']}
                            placeholder="Occupation"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            value={formState.inputValues.occupation}
                        />
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
            
            {/* Profile Image Modal */}
            <ProfileImageModal
                visible={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                onImageSelected={handleImageSelected}
                userId={user?.id || ''}
            />
            
            <View style={styles.bottomContainer}>
                <Button
                    title={loading ? "Updating..." : "Update Profile"}
                    filled
                    style={styles.continueButton}
                    onPress={handleUpdateProfile}
                    disabled={loading}
                />
                
                {/* Temporary test button for debugging */}
                <Button
                    title="Test Setup"
                    style={{
                        marginTop: 12,
                        marginBottom: 12,
                        backgroundColor: COLORS.gray,
                    }}
                    onPress={testSetup}
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
        borderRadius: 6,
        height: 52,
        width: SIZES.width - 32,
        alignItems: 'center',
        marginVertical: 16,
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
        height: 50,
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
        width: SIZES.width - 32,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    genderContainer: {
        flexDirection: "row",
        borderColor: COLORS.greyscale500,
        borderWidth: .4,
        borderRadius: 6,
        height: 58,
        width: SIZES.width - 32,
        alignItems: 'center',
        marginVertical: 16,
        backgroundColor: COLORS.greyscale500,
    }
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingHorizontal: 10,
        color: COLORS.greyscale600,
        paddingRight: 30,
        height: 58,
        width: SIZES.width - 32,
        alignItems: 'center',
        backgroundColor: COLORS.greyscale500,
        borderRadius: 16
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        color: COLORS.greyscale600,
        paddingRight: 30,
        height: 58,
        width: SIZES.width - 32,
        alignItems: 'center',
        backgroundColor: COLORS.greyscale500,
        borderRadius: 16
    },
});

export default EditProfile