import Button from '@/components/Button';
import Input from '@/components/Input';
import { COLORS, icons, illustrations, images, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { validateInput } from '@/utils/actions/formActions';
import { reducer } from '@/utils/reducers/formReducers';
import { TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useCallback, useReducer, useState } from 'react';
import { FlatList, Image, ImageSourcePropType, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import CustomBottomSheet from '../components/CustomBottomSheet';

const isTestMode = true;

const initialState = {
    inputValues: {
        boardName: isTestMode ? 'Board Name' : '',
    },
    inputValidities: {
        boardName: false
    },
    formIsValid: false,
}

const NewProject = () => {
    
    
    
    
    
    const [selectedDate, setSelectedDate] = useState("2024-12-14");
    const members = [images.user1, images.user2, images.user3];
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark } = useTheme();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Modal state management instead of RBSheet refs
    const [boardModalVisible, setBoardModalVisible] = useState(false);
    const [addCoverModalVisible, setAddCoverModalVisible] = useState(false);
    const [deadlineModalVisible, setDeadlineModalVisible] = useState(false);
    const [deleteProjectModalVisible, setDeleteProjectModalVisible] = useState(false);
    const [addTeamMembersModalVisible, setAddTeamMembersModalVisible] = useState(false);

    const dropdownItems = [
        { label: 'Add Cover', value: 'cover', icon: icons.image },
        { label: 'Add Logo', value: 'addLogo', icon: icons.status2 },
        { label: 'Set Color', value: 'setColor', icon: icons.show },
        { label: 'Add Team Members', value: 'addTeamMembers', icon: icons.user },
        { label: 'Edit Project', value: 'editProject', icon: icons.editText },
        { label: 'Delete Project', value: 'deleteProject', icon: icons.trash2 },
    ];

    const handleDropdownSelect = (item: any) => {
        setSelectedItem(item.value);
        setModalVisible(false);

        // Perform actions based on the selected item
        switch (item.value) {
            case 'cover':
                // Handle Cover action
                setModalVisible(false);
                navigation.navigate("newprojectaddcover")
                break;
            case 'addLogo':
                // Add logo action
                setModalVisible(false);
                break;
            case 'setColor':
                // Set color action
                setModalVisible(false)
                navigation.navigate("newprojectsetcolor")
                break;
            case 'addTeamMembers':
                // Add team members action
                setModalVisible(false);
                setAddTeamMembersModalVisible(true);
                break;
            case 'editProject':
                // Edit project action
                setModalVisible(false)
                break;
            case 'deleteProject':
                // Delete Project action
                setModalVisible(false)
                setDeleteProjectModalVisible(true);
                break;
            default:
                break;
        }
    };

    // Search for users to invite
    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const result = await TeamService.searchUsers(query, 10);
            if (result.users) {
                setSearchResults(result.users);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle user selection
    const handleUserSelect = (user: any) => {
        const isAlreadySelected = selectedTeamMembers.some(member => member.id === user.id);
        if (!isAlreadySelected) {
            setSelectedTeamMembers([...selectedTeamMembers, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    // Remove selected user
    const removeSelectedUser = (userId: string) => {
        setSelectedTeamMembers(selectedTeamMembers.filter(member => member.id !== userId));
    };

    // Save team members for later use in project creation
    const saveTeamMembers = () => {
        // Store selected team members in navigation params or global state
        // This will be used when the project is actually created
        navigation.navigate("newprojectsetted", {
            selectedTeamMembers: selectedTeamMembers
        });
        setAddTeamMembersModalVisible(false);
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

    return (
        <View style={{ flex: 1 }}>
            <StatusBar hidden />
            <View style={styles.banner} />
            {/* Header  */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}>
                    <Image
                        source={icons.back}
                        resizeMode='contain'
                        style={styles.arrowBackIcon}
                    />
                </TouchableOpacity>
                <View style={styles.rightContainer}>
                    <TouchableOpacity>
                        <Image
                            source={icons.search}
                            resizeMode='contain'
                            style={styles.searchIcon}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setModalVisible(true)}>
                        <Image
                            source={icons.moreCircle}
                            resizeMode='contain'
                            style={styles.menuIcon}
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => setAddCoverModalVisible(true)}
                    style={styles.logoContainer}>
                    <Image source={icons.editPencil} style={styles.logo} />
                </TouchableOpacity>
                <View style={styles.membersContainer}>
                    {members.slice(0, 3).map((member, index) => (
                        <Image
                            key={index}
                            source={member as ImageSourcePropType}
                            style={[styles.memberAvatar, { left: index * -14 }]}
                        />
                    ))}
                    {members.length > 3 && (
                        <View style={styles.moreMembers}>
                            <Text style={styles.moreText}>+{members.length - 3}</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : "white" }}>
                <View style={styles.container}>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}>E-Wallet App Project</Text>
                    <Text style={[styles.subtitle, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}>Add Description</Text>
                    <TouchableOpacity
                        onPress={() => setDeadlineModalVisible(true)}
                        style={styles.addBtn}>
                        <Text style={styles.addText}>Set Deadline Project</Text>
                    </TouchableOpacity>
                    <Image
                        source={illustrations.project}
                        resizeMode='contain'
                        style={styles.illustration}
                    />
                </View>
            </View>

            {/* Add Button */}
            <TouchableOpacity
                onPress={() => setBoardModalVisible(true)}
                style={styles.addIconContainer}>
                <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>

            {/* Board Bottom Sheet */}
            <CustomBottomSheet
                visible={boardModalVisible}
                onClose={() => setBoardModalVisible(false)}
                height={250}
                closeOnSwipe={true}
            >
                <Text style={[styles.bottomTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Add New Board</Text>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    marginVertical: 12
                }]} />
                <Input
                    id="boardName"
                    onInputChanged={inputChangedHandler}
                    errorText={formState.inputValidities['boardName']}
                    placeholder="Board Name"
                    placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                />
                <Button
                    title="Create New Board"
                    filled
                    style={{
                        width: SIZES.width - 32,
                        marginTop: 20
                    }}
                    onPress={() => {
                        // Handle board creation
                        setBoardModalVisible(false);
                    }}
                />
            </CustomBottomSheet>

            {/* Add Team Members Modal */}
            <CustomBottomSheet
                visible={addTeamMembersModalVisible}
                onClose={() => setAddTeamMembersModalVisible(false)}
                height={400}
                closeOnSwipe={true}
            >
                <Text style={[styles.bottomTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Add Team Members</Text>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    marginVertical: 12
                }]} />
                
                {/* Search Input */}
                <Input
                    id="searchUsers"
                    placeholder="Search users..."
                    value={searchQuery}
                    onInputChanged={(id, text) => {
                        setSearchQuery(text);
                        searchUsers(text);
                    }}
                    placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                />
                
                                 {/* Search Results */}
                 {searchResults.length > 0 && (
                     <View style={styles.searchResultsContainer}>
                         {searchResults.map((user: any) => (
                             <TouchableOpacity
                                 key={user.id}
                                 style={styles.userItem}
                                 onPress={() => handleUserSelect(user)}
                             >
                                 <Text style={[styles.userName, {
                                     color: dark ? COLORS.white : COLORS.greyscale900
                                 }]}>{user.full_name || user.email}</Text>
                             </TouchableOpacity>
                         ))}
                     </View>
                 )}
                
                {/* Selected Members */}
                {selectedTeamMembers.length > 0 && (
                    <View style={styles.selectedMembers}>
                        <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Selected Members:</Text>
                        {selectedTeamMembers.map((member: any) => (
                            <View key={member.id} style={styles.selectedMember}>
                                <Text style={[styles.memberName, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>{member.full_name || member.email}</Text>
                                <TouchableOpacity
                                    onPress={() => removeSelectedUser(member.id)}
                                    style={styles.removeButton}
                                >
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
                
                <Button
                    title="Save Team Members"
                    filled
                    style={{
                        width: SIZES.width - 32,
                        marginTop: 20
                    }}
                    onPress={saveTeamMembers}
                />
            </CustomBottomSheet>

            {/* Delete Project Modal */}
            <CustomBottomSheet
                visible={deleteProjectModalVisible}
                onClose={() => setDeleteProjectModalVisible(false)}
                height={200}
                closeOnSwipe={true}
            >
                <Text style={[styles.bottomTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Delete Project</Text>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    marginVertical: 12
                }]} />
                <Text style={[styles.deleteText, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Are you sure you want to delete this project? This action cannot be undone.</Text>
                <View style={styles.deleteButtons}>
                    <Button
                        title="Cancel"
                        style={{
                            width: (SIZES.width - 48) / 2,
                            marginRight: 8
                        }}
                        onPress={() => setDeleteProjectModalVisible(false)}
                    />
                    <Button
                        title="Delete"
                        filled
                        style={{
                            width: (SIZES.width - 48) / 2,
                            marginLeft: 8,
                            backgroundColor: COLORS.error
                        }}
                        onPress={() => {
                            // Handle project deletion
                            setDeleteProjectModalVisible(false);
                        }}
                    />
                </View>
            </CustomBottomSheet>

            {/* Add Cover Modal */}
            <CustomBottomSheet
                visible={addCoverModalVisible}
                onClose={() => setAddCoverModalVisible(false)}
                height={300}
                closeOnSwipe={true}
            >
                <Text style={[styles.bottomTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Add Project Cover</Text>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    marginVertical: 12
                }]} />
                <Text style={[styles.coverText, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Choose a cover image for your project</Text>
                <Button
                    title="Select Image"
                    filled
                    style={{
                        width: SIZES.width - 32,
                        marginTop: 20
                    }}
                    onPress={() => {
                        // Handle image selection
                        setAddCoverModalVisible(false);
                    }}
                />
            </CustomBottomSheet>

            {/* Deadline Modal */}
            <CustomBottomSheet
                visible={deadlineModalVisible}
                onClose={() => setDeadlineModalVisible(false)}
                height={300}
                closeOnSwipe={true}
            >
                <Text style={[styles.bottomTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Set Project Deadline</Text>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    marginVertical: 12
                }]} />
                <Text style={[styles.deadlineText, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Choose a deadline for your project</Text>
                <Button
                    title="Set Deadline"
                    filled
                    style={{
                        width: SIZES.width - 32,
                        marginTop: 20
                    }}
                    onPress={() => {
                        // Handle deadline setting
                        setDeadlineModalVisible(false);
                    }}
                />
            </CustomBottomSheet>

            {/* Modal for dropdown selection */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, {
                            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                        }]}>
                            <FlatList
                                data={dropdownItems}
                                keyExtractor={(item) => item.value}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => handleDropdownSelect(item)}
                                    >
                                        <Image
                                            source={item.icon}
                                            resizeMode='contain'
                                            style={styles.modalItemIcon}
                                        />
                                        <Text style={[styles.modalItemText, {
                                            color: dark ? COLORS.white : COLORS.greyscale900,
                                        }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    )
}

export default NewProject

const styles = StyleSheet.create({
    banner: {
        height: 200,
        backgroundColor: COLORS.primary,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
    },
    arrowBackIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.white,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    searchIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.white,
    },
    menuIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: -40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logo: {
        width: 40,
        height: 40,
        tintColor: COLORS.primary,
    },
    membersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    moreMembers: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -14,
    },
    moreText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.greyscale600,
        marginBottom: 24,
    },
    addBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 32,
    },
    addText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    illustration: {
        width: '100%',
        height: 200,
        alignSelf: 'center',
    },
    addIconContainer: {
        position: 'absolute',
        bottom: 32,
        right: 32,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    bottomTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    separateLine: {
        width: '100%',
        height: 1,
    },
    projectDesc: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    attachContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 32,
    },
    attachOptionContainer: {
        alignItems: 'center',
    },
    attachmentBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    attachmentIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.white,
    },
    attachmentText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 16,
        paddingBottom: 32,
        maxHeight: '50%',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    modalItemIcon: {
        width: 24,
        height: 24,
        marginRight: 16,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    // New styles for team members
    searchResultsContainer: {
        marginTop: 16,
        maxHeight: 150,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    searchResultsList: {
        maxHeight: 120,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '500',
    },
    userEmail: {
        fontSize: 12,
        marginTop: 2,
    },
    selectedMembersContainer: {
        marginTop: 16,
        maxHeight: 150,
    },
    selectedMembersList: {
        maxHeight: 120,
    },
    selectedUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    actionButtons: {
        marginTop: 16,
    },
    deleteText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    deleteButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coverText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    deadlineText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    selectedMembers: {
        marginTop: 16,
        maxHeight: 150,
    },
    selectedMember: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    memberName: {
        flex: 1,
    },
    removeButton: {
        padding: 8,
    },
         removeText: {
         color: COLORS.error,
     },
 });