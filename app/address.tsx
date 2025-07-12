import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';
import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserAddressItem from '@/components/UserAddressItem';
import { useAuth } from '@/contexts/AuthContext';
import Button from '../components/Button';
import Header from '../components/Header';

type Nav = {
    navigate: (value: string) => void
};

interface UserAddress {
    id: string;
    name: string;
    address: string;
}

// User Address Location Screen
const Address = () => {
    const { colors } = useTheme();
    const { navigate } = useNavigation<Nav>();
    const { user } = useAuth();
    const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
    const [loading, setLoading] = useState(true);

    // Load user addresses from database
    useEffect(() => {
        const loadUserAddresses = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // For now, return empty array since we don't have a user_addresses table
                // In a real app, you would fetch from the database
                setUserAddresses([]);
            } catch (error) {
                console.error('Error loading user addresses:', error);
                setUserAddresses([]);
            } finally {
                setLoading(false);
            }
        };

        loadUserAddresses();
    }, [user?.id]);

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Address" />
                <ScrollView
                    contentContainerStyle={{ marginVertical: 12 }}
                    showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : userAddresses.length > 0 ? (
                        <FlatList
                            data={userAddresses}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <UserAddressItem
                                    name={item.name}
                                    address={item.address}
                                    onPress={() => console.log("Clicked")}
                                />
                            )}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No addresses saved</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
            <View style={styles.btnContainer}>
                <Button
                    title="Add New Address"
                    onPress={() => navigate("addnewaddress")}
                    filled
                    style={styles.btn}
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
        backgroundColor: COLORS.white,
        padding: 16
    },
    btnContainer: {
        alignItems: "center",
    },
    btn: {
        width: SIZES.width - 32,
        paddingHorizontal: 16,
        marginBottom: 16
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

export default Address