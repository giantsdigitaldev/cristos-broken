import CommentCard from '@/components/CommentCard';
import UserAvatar from '@/components/UserAvatar';
import { COLORS, icons } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProjectComment {
    id: string;
    avatar: any;
    name: string;
    comment: string;
    date: string;
    numLikes: number;
}

const AllComments = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const { user } = useAuth();
    const [comment, setComment] = useState("");
    const [projectComments, setProjectComments] = useState<ProjectComment[]>([]);
    const [loading, setLoading] = useState(true);

    // Load project comments from database
    useEffect(() => {
        const loadProjectComments = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                // For now, return empty array since we don't have a project_comments table
                // In a real app, you would fetch from the database using ProjectService.getProjectComments()
                setProjectComments([]);
            } catch (error) {
                console.error('Error loading project comments:', error);
                setProjectComments([]);
            } finally {
                setLoading(false);
            }
        };

        loadProjectComments();
    }, [user?.id]);

    const handleSend = async () => {
        if (comment.trim().length > 0 && user) {
            try {
                // This is a project comments page, so we need to get the project ID
                // For now, we'll just log the comment since this seems to be a demo page
                console.log("Comment sent:", comment);
                setComment("");
                
                // TODO: Implement actual comment creation when project context is available
                // const newComment = await ProjectService.createProjectComment({
                //     project_id: projectId,
                //     user_id: user?.id || '',
                //     content: comment.trim()
                // });
            } catch (error) {
                console.error('Error sending comment:', error);
                Alert.alert('Error', 'Failed to send comment');
            }
        }
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
                    }]}>Comments ({projectComments.length})</Text>
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
                ) : projectComments.length > 0 ? (
                    <FlatList
                        data={projectComments}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <CommentCard
                                avatar={item.avatar}
                                name={item.name}
                                comment={item.comment}
                                date={item.date}
                                numLikes={item.numLikes}
                            />
                        )}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No comments yet</Text>
                    </View>
                )}
            </View>
            <View style={[styles.inputContainer, {
                backgroundColor: dark ? COLORS.dark2 : "#f8f8f8",
            }]}>
                <UserAvatar
                    size={40}
                    style={styles.profileImage}
                />
                <TextInput
                    style={[styles.input, {
                        color: dark ? COLORS.white : COLORS.black,
                    }]}
                    placeholder="Post a comment..."
                    placeholderTextColor="#aaa"
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    onKeyPress={(e) => {
                        if (e.nativeEvent.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    blurOnSubmit={false}
                    returnKeyType="send"
                />
                <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                    <Ionicons name="send" size={20} color="#007AFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingTop: 16,
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
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8f8f8",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: "regular",
        color: "#333",
    },
    sendButton: {
        padding: 5,
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
        fontSize: 16,
        fontFamily: 'regular',
        color: COLORS.greyscale500,
    },
})
export default AllComments