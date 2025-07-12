import InviteFriendCard from '@/components/InviteFriendCard';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import Header from '../components/Header';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface Friend {
    id: string;
    name: string;
    phoneNumber: string;
    avatar: any;
}

// Settings invite friend screen
const SettingsInviteFriends = () => {
    const { colors } = useTheme();
    const { user } = useAuth();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    // Load friends from database
    useEffect(() => {
        const loadFriends = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // For now, return empty array since we don't have a friends table
                // In a real app, you would fetch from the database
                setFriends([]);
            } catch (error) {
                console.error('Error loading friends:', error);
                setFriends([]);
            } finally {
                setLoading(false);
            }
        };

        loadFriends();
    }, [user?.id]);

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Invite Friends" />
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : friends.length > 0 ? (
                        <FlatList
                            data={friends}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <InviteFriendCard
                                    name={item.name}
                                    phoneNumber={item.phoneNumber}
                                    avatar={item.avatar}
                                />
                            )}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No friends available to invite</Text>
                        </View>
                    )}
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
        padding: 16,
    },
    scrollView: {
        paddingVertical: 22
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.black
    }
})

export default SettingsInviteFriends