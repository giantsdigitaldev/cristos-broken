import UserAvatar from '@/components/UserAvatar';
import { COLORS, icons, images } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React from 'react';
import { FlatList, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TeamMember {
    id: string;
    name: string;
    avatar?: string;
    isCurrentUser?: boolean;
}

const teamMembers: TeamMember[] = [
    { id: "1", name: "You", isCurrentUser: true },
    { id: "2", name: "Jenny", avatar: images.user2 },
    { id: "3", name: "Esther", avatar: images.user3 },
    { id: "4", name: "Wade", avatar: images.user4 },
    { id: "5", name: "Andrew", avatar: images.user5 },
    { id: "6", name: "Jane", avatar: images.user6 },
    { id: "7", name: "Theresa", avatar: images.user7 },
    { id: "8", name: "Jake", avatar: images.user8 },
    { id: "9", name: "Sarah", avatar: images.user9 },
    { id: "10", name: "Luke", avatar: images.user1 },
    { id: "11", name: "Angelina", avatar: images.user2 },
    { id: "12", name: "Priscilla", avatar: images.user3 },
];

const InboxTeamVoiceCall = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    /**
     * Render header
    */
    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}>
                        <Image
                            source={icons.back}
                            resizeMode='contain'
                            style={[styles.backIcon, {
                                tintColor: dark ? COLORS.white : COLORS.black
                            }]} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>{" "}</Text>
                </View>
                <View style={styles.viewRightContainer}>
                    <TouchableOpacity>
                        <Image
                            source={icons.moreCircle}
                            resizeMode='contain'
                            style={[styles.moreIcon, {
                                tintColor: dark ? COLORS.secondaryWhite : COLORS.black
                            }]}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        )
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <FlatList
                    data={teamMembers}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    renderItem={({ item }) => (
                        <View style={[styles.memberContainer, {
                            backgroundColor: dark ? COLORS.dark2 : "#f5f5f5",
                        }]}>
                            {item.isCurrentUser ? (
                                <UserAvatar
                                    size={70}
                                    style={styles.avatar}
                                />
                            ) : (
                                <Image source={item.avatar as ImageSourcePropType} style={styles.avatar} />
                            )}
                            <Text style={[styles.name, {
                                color: dark ? COLORS.white : COLORS.greyscale900,
                            }]}>{item.name}</Text>
                        </View>
                    )}
                />
                <View style={styles.actionContainer}>
                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.button, {
                            backgroundColor: "#FF4D67"
                        }]}>
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, {
                            backgroundColor: COLORS.primary
                        }]}>
                            <Ionicons name="volume-high" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
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
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 16
    },
    scrollView: {
        backgroundColor: COLORS.tertiaryWhite
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black,
        marginRight: 16
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    moreIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black
    },
    starIcon: {
        width: 28,
        height: 28,
        marginRight: 12
    },
    viewRightContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    memberContainer: {
        alignItems: "center",
        margin: 10,
        backgroundColor: "#f5f5f5",
        padding: 15,
        borderRadius: 15,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginBottom: 10,
    },
    name: {
        fontSize: 14,
        fontFamily: "bold",
        color: COLORS.greyscale900,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 20,
    },
    button: {
        backgroundColor: "red",
        padding: 15,
        borderRadius: 50,
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 20,
    },
    actionContainer: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%"
    }
})
export default InboxTeamVoiceCall