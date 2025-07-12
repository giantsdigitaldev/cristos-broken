import { COLORS, icons, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SubTask {
    id: string;
    name: string;
    time: string;
}

const BoardDetailsSubTasks = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const { user } = useAuth();
    const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean }>({});
    const [subTasks, setSubTasks] = useState<SubTask[]>([]);
    const [loading, setLoading] = useState(true);

    // Load subtasks from database
    useEffect(() => {
        const loadSubTasks = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // For now, return empty array since we don't have a subtasks table
                // In a real app, you would fetch from the database using ProjectService.getTaskSubtasks()
                setSubTasks([]);
            } catch (error) {
                console.error('Error loading subtasks:', error);
                setSubTasks([]);
            } finally {
                setLoading(false);
            }
        };

        loadSubTasks();
    }, [user?.id]);

    const handleToggle = (id: string, completed: boolean) => {
        setCompletedTasks((prev) => ({ ...prev, [id]: completed }));
    };
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
                    }]}>Sub-Task ({subTasks.length})</Text>
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
                <ScrollView showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : subTasks.length > 0 ? (
                        <FlatList
                            data={subTasks}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.subtaskItem}>
                                    <Text style={[styles.subtaskText, {
                                        color: dark ? COLORS.white : COLORS.black
                                    }]}>{item.name}</Text>
                                    <Text style={[styles.subtaskTime, {
                                        color: dark ? COLORS.grayscale100 : COLORS.grayscale700
                                    }]}>{item.time}</Text>
                                </View>
                            )}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No subtasks available</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
            <View style={[styles.bottomContainer, { 
                borderTopColor: dark ? COLORS.dark2 : COLORS.grayscale100,
            }]}>
                <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.addBtn}>
                    <Image
                        source={icons.addPlus}
                        resizeMode='contain'
                        style={styles.addIcon}
                    />
                    <Text style={styles.addText}>Add New Sub-Task</Text>
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
        height: 20,
        width: 20,
        tintColor: COLORS.white,
        marginRight: 8
    },
    addText: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.white
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16
    },
    subtaskText: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'bold'
    },
    subtaskTime: {
        fontSize: 16,
        fontFamily: 'regular'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'regular',
        color: COLORS.grayscale700
    }
});

export default BoardDetailsSubTasks