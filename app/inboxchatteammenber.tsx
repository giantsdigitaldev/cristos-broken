import { COLORS, icons, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TeamMember {
    id: string;
    name: string;
    username: string;
    avatar: any;
    isYou?: boolean;
}

const InboxChatTeamMenber = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const { user } = useAuth();
    const [teamInboxMembers, setTeamInboxMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Load team members from database
    useEffect(() => {
        const loadTeamMembers = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // For now, return empty array since we don't have a team_members table
                // In a real app, you would fetch from the database
                setTeamInboxMembers([]);
            } catch (error) {
                console.error('Error loading team members:', error);
                setTeamInboxMembers([]);
            } finally {
                setLoading(false);
            }
        };

        loadTeamMembers();
    }, [user?.id]);

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
                    }]}>Team Menber ({teamInboxMembers.length})</Text>
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
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : teamInboxMembers.length > 0 ? (
                    <FlatList
                        data={teamInboxMembers}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.memberContainer}>
                                <Image source={item.avatar} style={styles.avatar} />
                                <View style={styles.info}>
                                    <Text style={[styles.name, {
                                        color: dark ? COLORS.white : COLORS.greyscale900,
                                    }]}>{item.name} {item.isYou && "(You)"}</Text>
                                    <Text style={[styles.username, {
                                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                                    }]}>@{item.username}</Text>
                                </View>
                                <View style={styles.actions}>
                                    <TouchableOpacity>
                                        <Ionicons name="call-outline" size={24} color="blue" />
                                    </TouchableOpacity>
                                    <TouchableOpacity>
                                        <Ionicons name="videocam-outline" size={24} color="blue" style={styles.iconSpacing} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No team members available</Text>
                    </View>
                )}
            </View>
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.addBtn}>
                    <Image
                        source={icons.addPlus}
                        resizeMode='contain'
                        style={styles.addIcon}
                    />
                    <Text style={styles.addText}>Add Menber</Text>
                </TouchableOpacity>
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
    bottomContainer: {
        height: 64,
        width: "100%",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        bottom: 0,
        borderTopColor: COLORS.grayscale100,
        borderTopWidth: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    addBtn: {
        width: SIZES.width - 32,
        height: 52,
        borderRadius: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        marginBottom: 16
    },
    addIcon: {
        height: 18,
        width: 18,
        tintColor: COLORS.white,
        marginRight: 8
    },
    addText: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.white
    },
    memberContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.greyscale900,
        marginBottom: 4
    },
    username: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    actions: {
        flexDirection: "row",
    },
    iconSpacing: {
        marginLeft: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.grayscale700
    },
});

export default InboxChatTeamMenber