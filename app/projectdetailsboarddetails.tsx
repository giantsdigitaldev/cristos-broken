import Button from '@/components/Button';
import CommentCard from '@/components/CommentCard';
import SubHeaderItem from '@/components/SubHeaderItem';
import SubtaskCard from '@/components/SubtaskCard';
import UserAvatar from '@/components/UserAvatar';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
// Removed mock data imports - using real task data instead
import { useTheme } from '@/theme/ThemeProvider';
import { Project, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const statuses = ["To-Do", "In-Progress", "Revision", "Completed"];

const ProjectDetailsBoardDetails = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const params = useLocalSearchParams();
    const projectId = params.projectId as string;
    const taskId = params.taskId as string;
    const participants = [images.user2, images.user3, images.user4, images.user5, images.user6, images.user1, images.user7];
    const { user } = useAuth();
    const [comment, setComment] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("To-Do");
    
    
    
    const [selectedDate, setSelectedDate] = useState("2024-12-14");
    const [project, setProject] = useState<Project | null>(null);
    const [task, setTask] = useState<Task | null>(null);
    const [subtasks, setSubtasks] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean }>({});
    
    // Add subtask modal state
    const [showAddSubtaskModal, setShowAddSubtaskModal] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);

    const handleSend = async () => {
        if (comment.trim().length > 0 && user) {
            try {
                const newComment = await ProjectService.createTaskComment({
                    task_id: taskId,
                    user_id: user?.id || '',
                    content: comment.trim()
                });
                
                if (newComment) {
                    // Add user data to the comment immediately
                    const commentWithUser = {
                        ...newComment,
                        user: {
                            id: user.id,
                            full_name: user.user_metadata?.full_name || user.email || 'Current User',
                            avatar_url: user.user_metadata?.avatar_url || null
                        }
                    };
                    setComments([...comments, commentWithUser]);
                    setComment("");
                    console.log("Comment sent:", comment);
                }
            } catch (error) {
                console.error('Error sending comment:', error);
                Alert.alert('Error', 'Failed to send comment');
            }
        }
    };

    const handleToggle = (id: string, completed: boolean) => {
        setCompletedTasks((prev) => ({ ...prev, [id]: completed }));
    };

    // Load project and task data
    const loadData = useCallback(async () => {
        if (!projectId || !taskId) return;
        
        try {
            setLoading(true);
            const [projectData, tasksData, taskSubtasks, taskComments] = await Promise.all([
                ProjectService.getProject(projectId),
                ProjectService.getProjectTasks(projectId),
                ProjectService.getTaskSubtasks(taskId),
                ProjectService.getTaskComments(taskId)
            ]);
            
            setProject(projectData);
            const currentTask = tasksData.find(t => t.id === taskId);
            setTask(currentTask || null);
            setSubtasks(taskSubtasks || []);
            setComments(taskComments || []);
            
            console.log('📋 Loaded task details:', {
                task: currentTask?.title,
                subtasks: taskSubtasks?.length || 0,
                comments: taskComments?.length || 0
            });
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load task data');
        } finally {
            setLoading(false);
        }
    }, [projectId, taskId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Sync selectedStatus and selectedDate with task data when task is loaded
    useEffect(() => {
        if (task?.status) {
            const statusMapping = {
                'todo': 'To-Do',
                'in_progress': 'In-Progress',
                'completed': 'Completed',
                'blocked': 'Revision'
            };
            setSelectedStatus(statusMapping[task.status as keyof typeof statusMapping] || 'To-Do');
        }
        if (task?.due_date) {
            setSelectedDate(task.due_date);
        }
    }, [task?.status, task?.due_date]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Handle task field edit
    const handleTaskEdit = async (field: string, value: any) => {
        if (!task) return;
        
        try {
            const updatedTask = await ProjectService.updateTask(task.id, { [field]: value });
            if (updatedTask) {
                setTask(updatedTask);
                // Update project progress after task change
                await ProjectService.updateProjectProgress(projectId);
            } else {
                Alert.alert('Error', 'Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            Alert.alert('Error', 'Failed to update task');
        }
    };

    // Handle inline editing
    const startEditing = (field: string, currentValue: string) => {
        setEditingField(field);
        setEditValue(currentValue);
    };

    const saveEdit = async () => {
        if (!editingField || !task) return;
        
        await handleTaskEdit(editingField, editValue);
        setEditingField(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingField(null);
        setEditValue('');
    };

    // Handle task delete
    const handleTaskDelete = async () => {
        if (!task) return;
        
        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await ProjectService.deleteTask(task.id);
                            if (success) {
                                await ProjectService.updateProjectProgress(projectId);
                                navigation.goBack();
                            } else {
                                Alert.alert('Error', 'Failed to delete task');
                            }
                        } catch (error) {
                            console.error('Error deleting task:', error);
                            Alert.alert('Error', 'Failed to delete task');
                        }
                    }
                }
            ]
        );
    };

    // Add subtask handling functions
    const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
        try {
            const updatedSubtask = await ProjectService.updateSubtask(subtaskId, {
                status: completed ? 'completed' : 'todo',
                completed_at: completed ? new Date().toISOString() : undefined
            });
            if (updatedSubtask) {
                setSubtasks(prev => prev.map(s => 
                    s.id === subtaskId ? { ...s, completed } : s
                ));
                console.log('✅ Subtask completion updated:', subtaskId, completed);
            } else {
                Alert.alert('Error', 'Failed to update subtask');
            }
        } catch (error) {
            console.error('Error updating subtask:', error);
            Alert.alert('Error', 'Failed to update subtask');
        }
    };

    const handleSubtaskUpdate = async (subtaskId: string, updates: any) => {
        try {
            const updatedSubtask = await ProjectService.updateSubtask(subtaskId, updates);
            if (updatedSubtask) {
                setSubtasks(prev => prev.map(s => 
                    s.id === subtaskId ? { ...s, ...updates } : s
                ));
                console.log('✅ Subtask updated:', subtaskId, updates);
                
                // Check if description was included in updates
                const hasDescription = updates.description;
                if (hasDescription && !updatedSubtask.description) {
                    Alert.alert(
                        'Partial Update', 
                        'Title updated successfully. Note: Description requires database schema update.'
                    );
                } else {
                    Alert.alert('Success', 'Subtask updated successfully');
                }
            } else {
                Alert.alert('Error', 'Failed to update subtask. Please check your connection.');
            }
        } catch (error) {
            console.error('Error updating subtask:', error);
            Alert.alert('Error', 'Failed to update subtask. Please try again.');
        }
    };

    const handleSubtaskDelete = async (subtaskId: string) => {
        try {
            const success = await ProjectService.deleteSubtask(subtaskId);
            if (success) {
                setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
                console.log('✅ Subtask deleted:', subtaskId);
                Alert.alert('Success', 'Subtask deleted successfully');
            } else {
                Alert.alert('Error', 'Failed to delete subtask');
            }
        } catch (error) {
            console.error('Error deleting subtask:', error);
            Alert.alert('Error', 'Failed to delete subtask');
        }
    };

    const handleAddSubtask = async () => {
        if (!newSubtaskTitle.trim()) {
            Alert.alert('Error', 'Please enter a subtask title');
            return;
        }

        if (!task) {
            Alert.alert('Error', 'No task selected');
            return;
        }

        try {
            setIsAddingSubtask(true);
            const newSubtask = await ProjectService.createSubtask({
                task_id: task.id,
                title: newSubtaskTitle.trim(),
                status: 'todo' as const,
                priority: 'medium' as const
            });

            if (newSubtask) {
                setSubtasks(prev => [...prev, newSubtask]);
                setNewSubtaskTitle('');
                setShowAddSubtaskModal(false);
                console.log('✅ Subtask created:', newSubtask.id);
                Alert.alert('Success', 'Subtask added successfully');
            } else {
                Alert.alert('Error', 'Failed to create subtask');
            }
        } catch (error) {
            console.error('Error creating subtask:', error);
            Alert.alert('Error', 'Failed to create subtask');
        } finally {
            setIsAddingSubtask(false);
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
                    }]}>{task?.title || 'Task Details'}</Text>
                </View>
                <View style={styles.viewRightContainer}>
                    <TouchableOpacity>
                        <Image
                            source={icons.starColor}
                            resizeMode='contain'
                            style={styles.starIcon}
                        />
                    </TouchableOpacity>
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

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    Loading task...
                </Text>
            </View>
        );
    }

    if (!project || !task) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
                <Text style={[styles.errorText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    Task not found
                </Text>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const members = project.metadata?.members || [];

    const taskPriority = task.metadata?.priority || task.priority || 'medium';
    const taskCategory = task.metadata?.category || 'General';
    const taskBudget = task.metadata?.budget || 0;

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <StatusBar hidden />
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View>
                        <Image
                            source={images.projectImage}
                            resizeMode='cover'
                            style={styles.projectImage}
                        />
                        <TouchableOpacity style={styles.editIconContainer}>
                            <Image
                                source={icons.editPencil}
                                resizeMode='contain'
                                style={styles.editIcon}
                            />
                        </TouchableOpacity>
                    </View>
                    <View>
                        <Text style={[styles.description, {
                            color: dark ? COLORS.grayscale100 : COLORS.greyscale900
                        }]}>{task?.description || 'No description available'}</Text>
                        <View style={{ marginVertical: 12 }}>
                            {/* Team Section */}
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionLeftContainer}>
                                    <Image
                                        source={icons.people2}
                                        resizeMode='contain'
                                        style={[styles.sectionIcon, {
                                            tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                        }]}
                                    />
                                    <Text style={[styles.sectionTitle, {
                                        color: dark ? "#EEEEEE" : COLORS.grayscale700
                                    }]}>Team</Text>
                                </View>

                                {/* Participants Avatars */}
                                <View style={styles.avatars}>
                                    <FlatList
                                        data={participants}
                                        keyExtractor={(item, index) => index.toString()}
                                        horizontal
                                        renderItem={({ item: member, index }: { item: any; index: number }) => (
                                            <Image
                                                key={index}
                                                source={member}
                                                resizeMode='contain'
                                                style={[styles.participantAvatar, {
                                                    marginLeft: index > 0 ? -10 : 0
                                                }]}
                                            />
                                        )}
                                    />
                                    {members.length > 3 && (
                                        <View style={styles.moreMembers}>
                                            <Text style={styles.moreText}>+{members.length - 3}</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate("projectdetailsteammenber")}
                                    style={styles.plusIcon}>
                                    <Text style={styles.plusText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionLeftContainer}>
                                    <Image
                                        source={icons.user3}
                                        resizeMode='contain'
                                        style={[styles.sectionIcon, {
                                            tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                        }]}
                                    />
                                    <Text style={[styles.sectionTitle, {
                                        color: dark ? "#EEEEEE" : COLORS.grayscale700
                                    }]}>Leader</Text>
                                </View>
                                <UserAvatar
                                    size={32}
                                    style={styles.leaderAvatar}
                                />
                                <Text style={[styles.leaderName, {
                                    color: dark ? COLORS.white : COLORS.greyscale900,
                                }]}>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'}</Text>
                            </View>
                            
                            {/* Assigned To Section */}
                            {task?.assigned_to && task.assigned_to.length > 0 && (
                                <View style={styles.sectionContainer}>
                                    <View style={styles.sectionLeftContainer}>
                                        <Image
                                            source={icons.addUser}
                                            resizeMode='contain'
                                            style={[styles.sectionIcon, {
                                                tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                            }]}
                                        />
                                        <Text style={[styles.sectionTitle, {
                                            color: dark ? "#EEEEEE" : COLORS.grayscale700
                                        }]}>Assigned To</Text>
                                    </View>
                                    <Text style={[styles.dueDateText, {
                                        color: dark ? COLORS.white : COLORS.greyscale900
                                    }]}>{task.assigned_to.length} user{task.assigned_to.length > 1 ? 's' : ''}</Text>
                                </View>
                            )}
                            
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionLeftContainer}>
                                    <Image
                                        source={icons.status}
                                        resizeMode='contain'
                                        style={[styles.sectionIcon, {
                                            tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                        }]}
                                    />
                                    <Text style={[styles.sectionTitle, {
                                        color: dark ? "#EEEEEE" : COLORS.grayscale700
                                    }]}>Status</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setStatusModalVisible(true)}
                                    style={styles.viewContainer}>
                                    <Text style={styles.viewText}>{task?.status?.replace('_', ' ') || 'To-Do'}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionLeftContainer}>
                                    <Image
                                        source={icons.calendar5}
                                        resizeMode='contain'
                                        style={[styles.sectionIcon, {
                                            tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                        }]}
                                    />
                                    <Text style={[styles.sectionTitle, {
                                        color: dark ? "#EEEEEE" : COLORS.grayscale700
                                    }]}>Due Date</Text>
                                </View>
                                <Text style={[styles.dueDateText, {
                                    color: dark ? COLORS.white : COLORS.greyscale900
                                }]}>Due date: {task?.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</Text>
                                <TouchableOpacity
                                    onPress={() => setDueDateModalVisible(true)}>
                                    <Image
                                        source={icons.editText}
                                        resizeMode='contain'
                                        style={styles.editPencilIcon}
                                    />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Priority Section */}
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionLeftContainer}>
                                    <Image
                                        source={icons.flag}
                                        resizeMode='contain'
                                        style={[styles.sectionIcon, {
                                            tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                        }]}
                                    />
                                    <Text style={[styles.sectionTitle, {
                                        color: dark ? "#EEEEEE" : COLORS.grayscale700
                                    }]}>Priority</Text>
                                </View>
                                <View style={[styles.viewContainer, {
                                    backgroundColor: taskPriority === 'high' ? '#ffebee' : 
                                                   taskPriority === 'medium' ? '#fff3e0' : 
                                                   taskPriority === 'urgent' ? '#f3e5f5' : '#e8f5e8'
                                }]}>
                                    <Text style={[styles.viewText, {
                                        color: taskPriority === 'high' ? '#d32f2f' : 
                                               taskPriority === 'medium' ? '#f57c00' : 
                                               taskPriority === 'urgent' ? '#7b1fa2' : '#388e3c'
                                    }]}>{taskPriority || 'Low'}</Text>
                                </View>
                            </View>
                            
                            {/* Attachments Section */}
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionLeftContainer}>
                                    <Image
                                        source={icons.document3}
                                        resizeMode='contain'
                                        style={[styles.sectionIcon, {
                                            tintColor: dark ? "#EEEEEE" : COLORS.grayscale700,
                                        }]}
                                    />
                                    <Text style={[styles.sectionTitle, {
                                        color: dark ? "#EEEEEE" : COLORS.grayscale700
                                    }]}>Attachments</Text>
                                </View>
                                
                                {/* Show actual attachments from task metadata */}
                                {task?.metadata?.attachments && task.metadata.attachments.length > 0 ? (
                                    task.metadata.attachments.map((attachment: any, index: number) => (
                                        <TouchableOpacity key={index} style={styles.refBtn}>
                                            <Image
                                                source={icons.document3}
                                                resizeMode='contain'
                                                style={styles.refBtnText}
                                            />
                                            <Text style={styles.refText}>{attachment.name || `Attachment ${index + 1}`}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={[styles.dueDateText, {
                                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                                        fontSize: 14
                                    }]}>No attachments</Text>
                                )}
                                
                                <TouchableOpacity
                                    onPress={() => setAttachmentModalVisible(true)}
                                    style={styles.addBtn}>
                                    <Image
                                        source={icons.addPlus}
                                        resizeMode='contain'
                                        style={styles.addIcon}
                                    />
                                    <Text style={styles.addText}>Add</Text>
                                </TouchableOpacity>
                            </View>

                            <Button
                                title="Add Custom Section"
                                style={{
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.transparentPrimary,
                                    borderColor: dark ? COLORS.dark2 : COLORS.transparentPrimary,
                                    marginTop: 12
                                }}
                                textColor={dark ? COLORS.white : COLORS.primary}
                            />

                            {/* Show actual subtasks from database */}
                            {subtasks && subtasks.length > 0 && (
                                <>
                                    <SubHeaderItem
                                        title={`Sub-Task (${subtasks.length})`}
                                        navTitle="See All"
                                        onPress={() => navigation.navigate("boarddetailssubtasks")}
                                    />
                                    <FlatList
                                        data={subtasks}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item, index }) => (
                                            <SubtaskCard
                                                subtask={item}
                                                index={index}
                                                totalSubtasks={subtasks.length}
                                                onToggle={handleSubtaskToggle}
                                                onUpdate={handleSubtaskUpdate}
                                                onDelete={handleSubtaskDelete}
                                            />
                                        )}
                                    />
                                </>
                            )}
                            
                            {/* Show message if no subtasks */}
                            {(!subtasks || subtasks.length === 0) && (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: dark ? COLORS.grayscale400 : COLORS.grayscale700, textAlign: 'center', fontSize: 14 }}>
                                        No subtasks yet. Add some to break down this task!
                                    </Text>
                                </View>
                            )}
                            
                            {/* Add Subtask Button */}
                            <TouchableOpacity
                                onPress={() => setShowAddSubtaskModal(true)}
                                style={[styles.addSubtaskBtn, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                                    borderColor: COLORS.primary,
                                }]}>
                                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                                <Text style={[styles.addSubtaskText, {
                                    color: COLORS.primary
                                }]}>Add Subtask</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                onPress={() => navigation.navigate("boarddetailssubtasks")}
                                style={[styles.expandBtn, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.transparentPrimary,
                                    borderColor: dark ? COLORS.dark2 : COLORS.transparentPrimary,
                                }]}>
                                <Image
                                    source={icons.arrowDown}
                                    resizeMode='contain'
                                    style={[styles.expandIcon, {
                                        tintColor: dark ? COLORS.white : COLORS.primary
                                    }]}
                                />
                                <Text style={[styles.expandBtnText, {
                                    color: dark ? COLORS.white : COLORS.primary
                                }]}>Expand More</Text>
                            </TouchableOpacity>

                            {/* Show actual comments from database */}
                            {comments && comments.length > 0 && (
                                <>
                                    <SubHeaderItem
                                        title={`Comments (${comments.length})`}
                                        navTitle="See All"
                                        onPress={() => navigation.navigate("allcomments")}
                                    />
                                    <FlatList
                                        data={comments.slice(0, 3)}
                                        keyExtractor={item => item.id}
                                        renderItem={({ item }) => (
                                            <CommentCard
                                                avatar={item.user_avatar || images.user1}
                                                name={item.user_name || 'Fetching name...'}
                                                comment={item.content}
                                                date={new Date(item.created_at).toLocaleDateString()}
                                                numLikes={0}
                                            />
                                        )}
                                    />
                                </>
                            )}
                            
                            {/* Show no comments message */}
                            {(!comments || comments.length === 0) && (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: dark ? COLORS.grayscale400 : COLORS.grayscale700, textAlign: 'center', fontSize: 14 }}>
                                        No comments yet. Be the first to comment!
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => navigation.navigate("allcomments")}
                                style={[styles.expandBtn, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.transparentPrimary,
                                    borderColor: dark ? COLORS.dark2 : COLORS.transparentPrimary,
                                }]}>
                                <Image
                                    source={icons.arrowDown}
                                    resizeMode='contain'
                                    style={[styles.expandIcon, {
                                        tintColor: dark ? COLORS.white : COLORS.primary
                                    }]}
                                />
                                <Text style={[styles.expandBtnText, {
                                    color: dark ? COLORS.white : COLORS.primary
                                }]}>Expand More</Text>
                            </TouchableOpacity>


                        </View>
                    </View>

                </ScrollView>

            </View>
            <View style={[styles.inputContainer, {
                backgroundColor: dark ? COLORS.dark2 : "#f8f8f8",
            }]}>
                <UserAvatar
                    size={32}
                    style={styles.profileImage}
                />
                <TextInput
                    style={[styles.input, {
                        color: dark ? COLORS.white : "#333",
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

            {/* Status Bottom Sheet */}
            
            {/* Attachment Bottom Sheet */}
            
            {/* Due Date Bottom Sheet */}
            
            
            {/* Add Subtask Modal */}
            <Modal
                visible={showAddSubtaskModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddSubtaskModal(false)}
            >
                <View style={[styles.modalContainer, { 
                    backgroundColor: dark ? COLORS.dark1 : COLORS.white 
                }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowAddSubtaskModal(false);
                            setNewSubtaskTitle('');
                        }}>
                            <Text style={[styles.modalButton, { color: COLORS.primary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { 
                            color: dark ? COLORS.white : COLORS.greyscale900 
                        }]}>Add Subtask</Text>
                        <TouchableOpacity 
                            onPress={handleAddSubtask}
                            disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                            style={{ opacity: (isAddingSubtask || !newSubtaskTitle.trim()) ? 0.5 : 1 }}
                        >
                            <Text style={[styles.modalButton, { color: COLORS.primary }]}>
                                {isAddingSubtask ? 'Adding...' : 'Add'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { 
                                color: dark ? COLORS.white : COLORS.greyscale900 
                            }]}>Subtask Title *</Text>
                            <TextInput
                                style={[styles.textInput, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100,
                                    color: dark ? COLORS.white : COLORS.greyscale900,
                                    borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                                }]}
                                value={newSubtaskTitle}
                                onChangeText={setNewSubtaskTitle}
                                placeholder="Enter subtask title"
                                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                                autoComplete="off"
                                autoCorrect={false}
                                selectTextOnFocus={false}
                                autoFocus
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    projectImage: {
        height: 200,
        width: '100%',
        marginBottom: 24,
        borderRadius: 16
    },
    editIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.white
    },
    editIconContainer: {
        position: "absolute",
        bottom: 42,
        right: 16,
    },
    description: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.greyscale900
    },
    sectionContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12
    },
    sectionLeftContainer: {
        flexDirection: "row",
        alignItems: 'center',
        width: 120
    },
    sectionIcon: {
        width: 20,
        height: 20,
        tintColor: COLORS.grayscale700,
        marginRight: 8
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    avatars: {
        flexDirection: "row",
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: -10,
        borderWidth: 2,
        borderColor: "#fff",
    },
    plusIcon: {
        height: 24,
        width: 24,
        borderWidth: 1.4,
        borderRadius: 10,
        borderColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 18
    },
    plusText: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.primary
    },
    leaderAvatar: {
        height: 28,
        width: 28,
        borderRadius: 999
    },
    leaderName: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.greyscale900,
        marginLeft: 16,
    },
    viewText: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.primary,
    },
    viewContainer: {
        borderColor: COLORS.primary,
        borderWidth: 1.4,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    dueDateText: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.greyscale900,
        marginLeft: 16,
    },
    editPencilIcon: {
        height: 20,
        width: 20,
        tintColor: COLORS.primary,
        marginLeft: 10
    },
    refText: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.primary,
    },
    refBtnText: {
        height: 12,
        width: 12,
        tintColor: COLORS.primary,
        marginRight: 4
    },
    refBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    addBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginLeft: 6
    },
    addIcon: {
        height: 12,
        width: 12,
        tintColor: COLORS.white,
        marginRight: 4
    },
    addText: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.white,
        marginLeft: 4
    },
    expandBtn: {
        width: SIZES.width - 32,
        backgroundColor: COLORS.transparentPrimary,
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        flexDirection: "row",
    },
    expandBtnText: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.primary
    },
    expandIcon: {
        height: 20,
        width: 20,
        tintColor: COLORS.primary,
        marginRight: 16,
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
    bottomTitle: {
        fontSize: 24,
        fontFamily: "semiBold",
        color: COLORS.black,
        textAlign: "center",
        marginTop: 12
    },
    separateLine: {
        width: "100%",
        height: 1,
        backgroundColor: COLORS.grayscale200
    },
    statusOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        width: SIZES.width - 32
    },
    statusText: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    attachmentBtn: {
        height: 80,
        width: 80,
        borderRadius: 999,
        backgroundColor: COLORS.transparentPrimary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6
    },
    attachmentIcon: {
        height: 32,
        width: 32,
        tintColor: COLORS.primary,
    },
    attachmentText: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.greyScale800
    },
    attachOptionContainer: {
        alignItems: "center",
    },
    attachContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 24,
        width: SIZES.width - 32
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'regular',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontFamily: 'semiBold',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
         backButtonText: {
         color: COLORS.white,
         fontSize: 16,
         fontFamily: 'semiBold',
     },
     moreMembers: {
         width: 30,
         height: 30,
         borderRadius: 15,
         backgroundColor: COLORS.primary,
         justifyContent: 'center',
         alignItems: 'center',
         marginLeft: 5,
     },
     moreText: {
         color: COLORS.white,
         fontSize: 12,
         fontFamily: 'bold',
     },
     participantAvatar: {
         width: 30,
         height: 30,
         borderRadius: 15,
         marginLeft: 0,
     },
     addSubtaskBtn: {
         width: SIZES.width - 32,
         paddingHorizontal: SIZES.padding,
         paddingVertical: SIZES.padding,
         borderRadius: 25,
         alignItems: 'center',
         justifyContent: 'center',
         height: 52,
         flexDirection: "row",
     },
     addSubtaskText: {
         fontSize: 16,
         fontFamily: "bold",
         color: COLORS.primary,
     },
     modalContainer: {
         flex: 1,
         padding: 20,
     },
     modalHeader: {
         flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'space-between',
         marginBottom: 20,
     },
     modalButton: {
         fontSize: 18,
         fontFamily: 'bold',
     },
     modalTitle: {
         fontSize: 24,
         fontFamily: 'bold',
     },
     modalContent: {
         flex: 1,
     },
     inputGroup: {
         flex: 1,
     },
     inputLabel: {
         fontSize: 18,
         fontFamily: 'bold',
         marginBottom: 10,
     },
     textInput: {
         flex: 1,
         padding: 10,
         borderWidth: 1,
         borderColor: COLORS.grayscale200,
     },
 });

export default ProjectDetailsBoardDetails