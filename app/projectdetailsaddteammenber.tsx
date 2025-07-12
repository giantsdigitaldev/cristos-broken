import EnhancedTeamMembersModal from '@/components/EnhancedTeamMembersModal';
import RoleSelector from '@/components/RoleSelector';
import UserAvatar from '@/components/UserAvatar';
import { COLORS, icons, WEB_INPUT_STYLES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { SearchUser, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProjectDetailsAddTeamMember = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const params = useLocalSearchParams();
    const projectId = params.projectId as string;
    
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [invitePhone, setInvitePhone] = useState("");
    const [inviteRole, setInviteRole] = useState<'sponsor' | 'lead' | 'team' | 'fyi'>('fyi');
    const [inviteMessage, setInviteMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showTeamMembersModal, setShowTeamMembersModal] = useState(false);

    // Search for users with debouncing
    const searchUsers = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        
        try {
            setSearchLoading(true);
            // Use enhanced search with higher limit to ensure all users are found
            const result = await TeamService.searchUsers(query, 200);
            
            if (result.error) {
                console.error('Search error:', result.error);
                Alert.alert('Error', 'Failed to search users');
                setSearchResults([]);
                return;
            }
            
            console.log(`🔍 Search for "${query}": Found ${result.users?.length || 0} users`);
            setSearchResults(result.users);
        } catch (error) {
            console.error('Search error:', error);
            Alert.alert('Error', 'Failed to search users');
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [projectId]);

    // Debug effect to run once on component mount
    useEffect(() => {
        const runDebug = async () => {
            console.log('🔍 Running user discovery debug...');
            const debugInfo = await TeamService.debugUserDiscovery();
            console.log('Debug results:', debugInfo);
        };
        runDebug();
    }, []);

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                searchUsers(searchQuery);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchUsers]);

    // Handle user selection
    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Invite selected users
    const inviteSelectedUsers = async () => {
        if (selectedUsers.length === 0) {
            Alert.alert('No Users Selected', 'Please select at least one user to invite.');
            return;
        }

        try {
            setSending(true);
            const selectedUserData = searchResults.filter(user => selectedUsers.includes(user.id));
            
            for (const user of selectedUserData) {
                await TeamService.inviteTeamMember({
                    projectId,
                    userId: user.id, // Use user ID for registered users instead of email
                    role: inviteRole,
                    message: inviteMessage,
                    sendNotification: true // Enable in-app notifications
                });
            }

            Alert.alert('Success', `Invited ${selectedUsers.length} user(s) successfully!`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Invitation error:', error);
            Alert.alert('Error', 'Failed to send invitations');
        } finally {
            setSending(false);
        }
    };

    // Send email/phone invitation
    const sendDirectInvitation = async () => {
        if (!inviteEmail && !invitePhone) {
            Alert.alert('Missing Information', 'Please enter either an email or phone number.');
            return;
        }

        try {
            setSending(true);
            const result = await TeamService.inviteTeamMember({
                projectId,
                email: inviteEmail || undefined,
                phone: invitePhone || undefined,
                role: inviteRole,
                message: inviteMessage
            });

            if (result.success) {
                Alert.alert('Success', 'Invitation sent successfully!', [
                    { text: 'OK', onPress: () => {
                        setShowInviteModal(false);
                        navigation.goBack();
                    }}
                ]);
            } else {
                Alert.alert('Error', result.error || 'Failed to send invitation');
            }
        } catch (error) {
            console.error('Invitation error:', error);
            Alert.alert('Error', 'Failed to send invitation');
        } finally {
            setSending(false);
        }
    };

    const renderUserItem = ({ item: user }: { item: SearchUser }) => {
        const isSelected = selectedUsers.includes(user.id);
        
        return (
            <TouchableOpacity
                style={[styles.userItem, {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    borderColor: isSelected ? COLORS.primary : (dark ? COLORS.dark3 : COLORS.grayscale200),
                    borderWidth: isSelected ? 2 : 1,
                }]}
                onPress={() => toggleUserSelection(user.id)}
            >
                <View style={styles.userLeft}>
                    <UserAvatar
                        size={40}
                        userId={user.id}
                        style={styles.userAvatar}
                    />
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>
                            {user.full_name || user.username || 'Fetching name...'}
                        </Text>
                        <Text style={[styles.userHandle, {
                            color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                        }]}>
                            @{user.username || 'unknown'}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.userRight}>
                    {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderRoleSelector = () => {
        return (
            <View style={styles.roleSelector}>
                <Text style={[styles.roleSelectorTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Select Role</Text>
                <RoleSelector
                    selectedRole={inviteRole}
                    onRoleSelect={(role) => setInviteRole(role as any)}
                    showDescriptions={true}
                />
            </View>
        );
    };

    const renderInviteModal = () => {
        return (
            <Modal
                visible={showInviteModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowInviteModal(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContent, {
                        backgroundColor: dark ? COLORS.dark1 : COLORS.white
                    }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Invite by Email/Phone</Text>
                            <TouchableOpacity
                                onPress={() => setShowInviteModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.black} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>Email Address</Text>
                                <TextInput
                                    style={[styles.textInput, {
                                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                                        color: dark ? COLORS.white : COLORS.greyscale900
                                    }, WEB_INPUT_STYLES]}
                                    placeholder="Enter email address"
                                    placeholderTextColor={COLORS.grayscale400}
                                    value={inviteEmail}
                                    onChangeText={setInviteEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.orDivider}>
                                <View style={[styles.dividerLine, {
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200
                                }]} />
                                <Text style={[styles.orText, {
                                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                                }]}>OR</Text>
                                <View style={[styles.dividerLine, {
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200
                                }]} />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>Phone Number</Text>
                                <TextInput
                                    style={[styles.textInput, {
                                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                                        color: dark ? COLORS.white : COLORS.greyscale900
                                    }, WEB_INPUT_STYLES]}
                                    placeholder="Enter phone number"
                                    placeholderTextColor={COLORS.grayscale400}
                                    value={invitePhone}
                                    onChangeText={setInvitePhone}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            {renderRoleSelector()}

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>Personal Message (Optional)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.messageInput, {
                                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                                        color: dark ? COLORS.white : COLORS.greyscale900
                                    }, WEB_INPUT_STYLES]}
                                    placeholder="Add a personal message to the invitation..."
                                    placeholderTextColor={COLORS.grayscale400}
                                    value={inviteMessage}
                                    onChangeText={setInviteMessage}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.cancelButton, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200
                                }]}
                                onPress={() => setShowInviteModal(false)}
                            >
                                <Text style={[styles.cancelButtonText, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.sendButton, {
                                    backgroundColor: COLORS.primary,
                                    opacity: sending ? 0.7 : 1
                                }]}
                                onPress={sendDirectInvitation}
                                disabled={sending}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text style={styles.sendButtonText}>Send Invitation</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        );
    };

    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={icons.back}
                            resizeMode='contain'
                            style={[styles.backIcon, {
                                tintColor: dark ? COLORS.white : COLORS.black
                            }]} 
                        />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>Add Team Member</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                
                {/* Search Section */}
                <View style={styles.searchSection}>
                    <Text style={[styles.sectionTitle, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>Search Users</Text>
                    
                    <View style={[styles.searchContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Ionicons name="search" size={20} color={COLORS.grayscale400} />
                        <TextInput
                            style={[styles.searchInput, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }, WEB_INPUT_STYLES]}
                            placeholder="Search by name or username..."
                            placeholderTextColor={COLORS.grayscale400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchLoading && (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        )}
                    </View>
                </View>

                {/* Search Results */}
                <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
                    {searchQuery.length >= 2 && (
                        <View style={styles.resultsSection}>
                            <Text style={[styles.resultsTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Search Results ({searchResults.length})</Text>
                            
                            {searchResults.length > 0 ? (
                                <FlatList
                                    data={searchResults}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderUserItem}
                                    scrollEnabled={false}
                                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                                />
                            ) : !searchLoading && (
                                <View style={styles.noResults}>
                                    <Ionicons name="search-outline" size={48} color={COLORS.grayscale400} />
                                    <Text style={[styles.noResultsText, {
                                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                                    }]}>No users found</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Other Options</Text>
                        
                        <TouchableOpacity
                            style={[styles.actionButton, {
                                backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                            }]}
                            onPress={() => setShowInviteModal(true)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${COLORS.primary}20` }]}>
                                <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.actionContent}>
                                <Text style={[styles.actionTitle, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>Invite by Email or Phone</Text>
                                <Text style={[styles.actionDescription, {
                                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                                }]}>Send invitation to someone not yet registered</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.grayscale400} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Bottom Actions */}
                {selectedUsers.length > 0 && (
                    <View style={[styles.bottomContainer, {
                        borderTopColor: dark ? COLORS.dark2 : COLORS.grayscale100
                    }]}>
                        <View style={styles.selectionInfo}>
                            <Text style={[styles.selectionText, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>{selectedUsers.length} user(s) selected</Text>
                            {renderRoleSelector()}
                        </View>
                        <TouchableOpacity
                            style={[styles.inviteButton, {
                                backgroundColor: COLORS.primary,
                                opacity: sending ? 0.7 : 1
                            }]}
                            onPress={inviteSelectedUsers}
                            disabled={sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color={COLORS.white} />
                                    <Text style={styles.inviteButtonText}>
                                        Invite Selected ({selectedUsers.length})
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {renderInviteModal()}

            <EnhancedTeamMembersModal
                visible={showTeamMembersModal}
                onClose={() => setShowTeamMembersModal(false)}
                onAdd={async (members: { user: SearchUser; role: string }[]) => {
                    for (const member of members) {
                        await TeamService.inviteTeamMember({
                            projectId,
                            userId: member.user.id,
                            role: member.role as any,
                            message: `You've been invited to join the project as ${member.role}`
                        });
                    }
                    setShowTeamMembersModal(false);
                    navigation.goBack();
                }}
                selectedMembers={[]}
                existingMembers={[]}
                projectId={projectId}
                currentMembers={[]}
                pendingInvitations={[]}
                isNewProject={false}
                memberRoles={{}}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        padding: 16
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 20
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    backIcon: {
        height: 24,
        width: 24,
        marginRight: 16
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "bold"
    },
    searchSection: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: "bold",
        marginBottom: 12
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondaryWhite,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: "regular",
        marginLeft: 12
    },
    resultsContainer: {
        flex: 1
    },
    resultsSection: {
        marginBottom: 24
    },
    resultsTitle: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 12
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1
    },
    userLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12
    },
    placeholderAvatar: {
        backgroundColor: COLORS.grayscale200,
        alignItems: 'center',
        justifyContent: 'center'
    },
    userInfo: {
        flex: 1
    },
    userName: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 2
    },
    userHandle: {
        fontSize: 14,
        fontFamily: "regular"
    },
    userRight: {
        marginLeft: 12
    },
    noResults: {
        alignItems: 'center',
        padding: 40
    },
    noResultsText: {
        fontSize: 16,
        fontFamily: "medium",
        marginTop: 12
    },
    quickActions: {
        marginBottom: 20
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 8
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    actionContent: {
        flex: 1
    },
    actionTitle: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 2
    },
    actionDescription: {
        fontSize: 14,
        fontFamily: "regular"
    },
    bottomContainer: {
        borderTopWidth: 1,
        paddingTop: 16,
        paddingBottom: 8
    },
    selectionInfo: {
        marginBottom: 12
    },
    selectionText: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 8
    },
    roleSelector: {
        marginTop: 12
    },
    roleSelectorTitle: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 8
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 25,
        height: 50,
        marginTop: 8
    },
    inviteButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontFamily: "bold",
        marginLeft: 8
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: "bold"
    },
    closeButton: {
        padding: 4
    },
    modalBody: {
        padding: 20
    },
    inputGroup: {
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 8
    },
    textInput: {
        backgroundColor: COLORS.secondaryWhite,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: "regular"
    },
    messageInput: {
        height: 80,
        textAlignVertical: 'top'
    },
    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.grayscale200
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 14,
        fontFamily: "medium"
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.grayscale200
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8
    },
    cancelButtonText: {
        fontSize: 16,
        fontFamily: "semibold"
    },
    sendButton: {
        flex: 2,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8
    },
    sendButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontFamily: "bold"
    },
});

export default ProjectDetailsAddTeamMember;