import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskContext } from '@/contexts/TaskContext';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectService } from '@/utils/projectServiceWrapper';
import { TeamMember, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import CalendarBottomSheetModal from './CalendarBottomSheetModal';
import Toast from './Toast';
import UserAvatar from './UserAvatar';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onTaskCreated: () => void;
}

interface SubTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  projectId,
  onTaskCreated,
}) => {
  const { colors, dark } = useTheme();
  const { user } = useAuth();
  const { addTask } = useTaskContext();
  
  // Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [subtasksInput, setSubtasksInput] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Team member selection state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssigneeSelector, setShowAssigneeSelector] = useState(false);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  
  // Modal state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Pull-to-dismiss gesture handling
  const translateY = useRef(new Animated.Value(0)).current;
  const gestureState = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);
  const [isGestureDismissing, setIsGestureDismissing] = useState(false);

  // ScrollView and subtasks section refs for smooth scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const subtasksSectionRef = useRef<View>(null);
  const subtaskInputRef = useRef<TextInput>(null);

  // CI Color palette for diverse icons
  const iconColors = [
    COLORS.primary,      // Blue
    COLORS.success,      // Green
    COLORS.warning,      // Orange
    COLORS.info,         // Cyan
    COLORS.secondary,    // Purple
    COLORS.tertiary,     // Pink
  ];

  // Role priority for sorting (higher number = higher priority)
  const rolePriority = {
    'lead': 8,
    'admin': 7,
    'editor': 6,
    'creator': 5,
    'viewer': 4,
    'vendor': 3,
    'sponsor': 2,
    'fyi': 1,
  };

  // Load team members when modal opens
  useEffect(() => {
    if (visible && projectId) {
      loadTeamMembers();
    }
  }, [visible, projectId]);

  // Keyboard event listeners for smooth scrolling
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        setKeyboardVisible(true);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // Smooth scroll to subtasks section when input is focused
  const handleSubtaskInputFocus = () => {
    if (subtasksSectionRef.current && scrollViewRef.current) {
      // Measure the subtasks section position
      subtasksSectionRef.current.measureInWindow((x, y, width, height) => {
        // Calculate scroll position to show "Subtasks" title 5px under header
        // Header height is approximately 80px (drag handle + header)
        const headerHeight = 80;
        const targetPosition = y - headerHeight - 5;
        
        // Smooth scroll with keyboard animation timing
        const scrollDuration = Platform.OS === 'ios' ? 250 : 300;
        
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetPosition),
          animated: true,
        });
      });
    }
  };

  // Load team members for the project with enhanced error handling
  const loadTeamMembers = async () => {
    try {
      setLoadingTeamMembers(true);
      console.log('🔍 AddTaskModal: Loading team members for project:', projectId);
      
      const members = await TeamService.getProjectTeamMembers(projectId);
      
      if (members && members.length > 0) {
        // Sort team members by role priority (highest first)
        const sortedMembers = members.sort((a: TeamMember, b: TeamMember) => {
          const priorityA = rolePriority[a.role as keyof typeof rolePriority] || 0;
          const priorityB = rolePriority[b.role as keyof typeof rolePriority] || 0;
          return priorityB - priorityA;
        });
        
        // Ensure all members have valid user names
        const validatedMembers = sortedMembers.map(member => ({
          ...member,
          user_name: member.user_name || 'Fetching name...'
        }));
        
        setTeamMembers(validatedMembers);
        console.log('✅ AddTaskModal: Loaded team members:', validatedMembers.length);
        console.log('✅ AddTaskModal: Team member names:', validatedMembers.map(m => m.user_name));
      } else {
        console.log('⚠️ AddTaskModal: No team members found or error loading');
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('❌ AddTaskModal: Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  // Handle assignee selection
  const handleAssigneeToggle = (userId: string) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Get role color for display
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'sponsor': return COLORS.info;
      case 'lead': return COLORS.primary;
      case 'team': return COLORS.success;
      case 'fyi': return COLORS.grayscale400;
      default: return COLORS.grayscale700;
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sponsor': return 'Sponsor';
      case 'lead': return 'Lead';
      case 'team': return 'Team';
      case 'fyi': return 'FYI';
      default: return role;
    }
  };

  // Animation functions
  const openModal = () => {
    setShowDatePicker(false);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const dismissWithGesture = () => {
    setIsGestureDismissing(true);
    translateY.setValue(0);
    closeModal();
    setTimeout(() => {
      setIsGestureDismissing(false);
    }, 100);
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === 5) { // END state
      const shouldDismiss = translationY > 80 || (translationY > 50 && velocityY > 500);
      
      if (shouldDismiss) {
        setIsDismissing(true);
        Animated.timing(translateY, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          dismissWithGesture();
        });
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Handle adding subtasks
  const handleAddSubtasks = () => {
    if (!subtasksInput.trim()) return;
    
    // Parse comma-separated subtasks
    const newSubtasks = subtasksInput
      .split(',')
      .map(task => task.trim())
      .filter(task => task.length > 0)
      .map(task => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: task,
        description: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        ...(selectedDate && { due_date: selectedDate }),
        assigned_to: selectedAssignees.length > 0 ? selectedAssignees[0] : undefined,
      }));
    
    setSubtasks(prev => [...prev, ...newSubtasks]);
    setSubtasksInput('');
  };

  const handleSubtaskKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleAddSubtasks();
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(task => task.id !== id));
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      showToast('Please enter a task title', 'error');
      return;
    }

    if (!taskDescription.trim()) {
      showToast('Please enter a task description', 'error');
      return;
    }

    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const newTask = {
        title: taskTitle,
        description: taskDescription,
        project_id: projectId,
        status: 'todo' as const,
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        ...(selectedDate && { due_date: selectedDate }),
        assigned_to: selectedAssignees.length > 0 ? selectedAssignees : [user.id],
        created_by: user.id
      };

      // Create the task in the database first to get the real ID
      const createdTask = await ProjectService.createTask(newTask);

      if (!createdTask) {
        throw new Error('Failed to create task');
      }

      // Add the real task to the UI with the actual database ID
      const taskWithProject = {
        ...createdTask,
        project: null // Will be populated by TaskContext
      };
      
      addTask(taskWithProject);

      // Send real-time notification to assigned users (except creator)
      if (createdTask.assigned_to && createdTask.assigned_to.length > 0) {
        const { TeamService } = await import('@/utils/teamService');
        for (const assignedUserId of createdTask.assigned_to) {
          if (assignedUserId !== user.id) {
            try {
              await TeamService.sendInAppNotification(assignedUserId, {
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: `You have been assigned a new task: ${createdTask.title}`,
                data: {
                  taskId: createdTask.id,
                  projectId: createdTask.project_id,
                  assignedBy: user.id
                }
              });
            } catch (err) {
              console.warn('Failed to send real-time notification to user:', assignedUserId, err);
            }
          }
        }
      }

      // Create subtasks if any
      if (subtasks.length > 0) {
        for (const subtask of subtasks) {
          await ProjectService.createSubtask({
            task_id: createdTask.id,
            title: subtask.title,
            description: subtask.description,
            status: 'todo' as const,
            priority: subtask.priority as 'low' | 'medium' | 'high' | 'urgent',
            ...(subtask.due_date && { due_date: subtask.due_date }),
            ...(subtask.assigned_to && { assigned_to: subtask.assigned_to })
          });
        }
      }

      // Call the callback for additional updates
      onTaskCreated();
      
      showToast('Task created successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      showToast('Failed to create task', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render team member item for assignee selector
  const renderTeamMemberItem = ({ item }: { item: TeamMember }) => {
    const isSelected = selectedAssignees.includes(item.user_id);
    const roleColor = getRoleColor(item.role);
    
    return (
      <TouchableOpacity
        style={[styles.teamMemberItem, {
          backgroundColor: isSelected 
            ? (dark ? COLORS.primary + '20' : COLORS.primary + '10')
            : (dark ? COLORS.dark3 : COLORS.grayscale100),
          borderColor: isSelected ? COLORS.primary : 'transparent',
        }]}
        onPress={() => handleAssigneeToggle(item.user_id)}
      >
        <View style={styles.teamMemberInfo}>
          <UserAvatar 
            userId={item.user_id}
            size={32}
          />
          <View style={styles.teamMemberDetails}>
            <Text style={[styles.teamMemberName, {
              color: dark ? COLORS.white : COLORS.greyscale900,
            }]}>
              {item.user_name}
            </Text>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {getRoleDisplayName(item.role)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={[styles.checkbox, {
          backgroundColor: isSelected ? COLORS.primary : 'transparent',
          borderColor: isSelected ? COLORS.primary : (dark ? COLORS.grayscale400 : COLORS.grayscale700),
        }]}>
          {isSelected && (
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Show toast function
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Hide toast function
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Reset form state when modal closes
  useEffect(() => {
    if (!visible) {
      setTaskTitle('');
      setTaskDescription('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSubtasksInput('');
      setSubtasks([]);
      setSelectedAssignees([]);
      // ...reset any other form state as needed
    }
  }, [visible]);

  // Reset translateY when modal opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !isGestureDismissing) {
      openModal();
    }
  }, [visible, isGestureDismissing]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
      presentationStyle="overFullScreen"
  >
      <Animated.View style={[
        styles.container, 
        { 
          opacity: Animated.multiply(
            overlayOpacity,
            translateY.interpolate({
              inputRange: [0, 200],
              outputRange: [1, 0.3],
              extrapolate: 'clamp',
            })
          )
        }
      ]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeModal} />

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetY={[-10, 10]}
          failOffsetY={[-100, 100]}
          shouldCancelWhenOutside={false}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                transform: [
                  {
                    translateY: Animated.add(
                      modalAnimation.interpolate({ inputRange: [0, 1], outputRange: [800, 0] }),
                      translateY
                    ),
                  },
                ],
                // Maintain 100% opacity during gesture - no fading
                opacity: 1,
                // Dynamic shadow during gesture
                shadowOpacity: translateY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0.25, 0.1],
                  extrapolate: 'clamp',
                }),
                shadowRadius: translateY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [8, 4],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle}>
              <Animated.View 
                style={[
                  styles.dragIndicator, 
                  { 
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    transform: [
                      {
                        scale: translateY.interpolate({
                          inputRange: [0, 100],
                          outputRange: [1, 1.2],
                          extrapolate: 'clamp',
                        })
                      },
                      {
                        rotate: translateY.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0deg', '5deg'],
                          extrapolate: 'clamp',
                        })
                      }
                    ]
                  }
                ]} 
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: iconColors[0] + '20' }]}>
                  <Ionicons name="add-circle" size={24} color={iconColors[0]} />
                </View>
                <View>
                  <Text style={[styles.title, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Add New Task
                  </Text>
                  <Text style={[styles.subtitle, {
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                  }]}>
                    Create a new task for your project
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons 
                  name="close-circle" 
                  size={28} 
                  color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                />
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.content} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[
                styles.contentContainer,
                {
                  paddingBottom: keyboardVisible ? keyboardHeight + 120 : 120,
                }
              ]}
              nestedScrollEnabled={true}
            >
              {/* Task Title */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="document-text" size={16} color={iconColors[1]} />
                  <Text style={[styles.label, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Task Title *
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  placeholder="Enter task title..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  autoFocus={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>

              {/* Task Description */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={iconColors[2]} />
                  <Text style={[styles.label, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Description *
                  </Text>
                </View>
                <TextInput
                  style={[styles.textArea, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  placeholder="Describe the task..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>

              {/* Assignees */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="people" size={16} color={iconColors[4]} />
                  <Text style={[styles.label, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Assign To
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.assigneeButton, {
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  onPress={() => setShowAssigneeSelector(true)}
                >
                  <View style={styles.assigneeButtonContent}>
                    <View style={styles.assigneeInfo}>
                      <Ionicons name="people-outline" size={20} color={iconColors[4]} />
                      <Text style={[styles.assigneeText, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}>
                        {selectedAssignees.length > 0 
                          ? `${selectedAssignees.length} team member${selectedAssignees.length > 1 ? 's' : ''} selected`
                          : 'Select team members...'
                        }
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={iconColors[4]} />
                  </View>
                </TouchableOpacity>
                {/* Stacked/overlapping avatars for selected assignees */}
                {selectedAssignees.length > 0 && (
                  <View style={{ flexDirection: 'row', marginTop: 12, marginLeft: 4, height: 40 }}>
                    {selectedAssignees.map((userId, idx) => {
                      const member = teamMembers.find(m => m.user_id === userId);
                      if (!member) return null;
                      return (
                        <View
                          key={userId}
                          style={{
                            marginLeft: idx === 0 ? 0 : -16, // overlap
                            zIndex: selectedAssignees.length - idx,
                          }}
                        >
                          <UserAvatar
                            userId={userId}
                            size={40}
                            style={{ borderWidth: 2, borderColor: COLORS.white, backgroundColor: COLORS.grayscale200 }}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Due Date */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="calendar" size={16} color={iconColors[3]} />
                  <Text style={[styles.label, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Due Date
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.dateButton, {
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateText, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    {new Date(selectedDate).toLocaleDateString()}
                  </Text>
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={iconColors[3]} 
                  />
                </TouchableOpacity>
              </View>

              {/* Subtasks */}
              <View ref={subtasksSectionRef} style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="list" size={16} color={iconColors[4]} />
                  <Text style={[styles.label, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Subtasks
                  </Text>
                </View>
                <Text style={[styles.hint, {
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                }]}>
                  Separate multiple subtasks with commas or press Enter
                </Text>
                <View style={styles.subtaskInputContainer}>
                  <TextInput
                    ref={subtaskInputRef}
                    style={[styles.subtaskInput, {
                      color: dark ? COLORS.white : COLORS.greyscale900,
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                      borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    }]}
                    placeholder="e.g., Research, Design, Implement, Test"
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={subtasksInput}
                    onChangeText={setSubtasksInput}
                    onSubmitEditing={handleAddSubtasks}
                    onFocus={handleSubtaskInputFocus}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    style={[styles.addSubtaskButton, { backgroundColor: iconColors[4] }]}
                    onPress={handleAddSubtasks}
                  >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {/* Subtasks List */}
                {subtasks.length > 0 && (
                  <View style={styles.subtasksList}>
                    <Text style={[styles.subtasksListTitle, {
                      color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}>
                      Added Subtasks:
                    </Text>
                    {subtasks.map((subtask) => (
                      <View key={subtask.id} style={[styles.subtaskItem, {
                        backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                      }]}>
                        <View style={styles.subtaskItemLeft}>
                          <Ionicons name="checkmark-circle-outline" size={16} color={iconColors[4]} />
                          <Text style={[styles.subtaskItemText, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                          }]}>
                            {subtask.title}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeSubtaskButton}
                          onPress={() => handleRemoveSubtask(subtask.id)}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.createTaskButton, {
                  backgroundColor: loading ? COLORS.grayscale400 : COLORS.primary,
                }]}
                onPress={handleCreateTask}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.createTaskButtonText}>Create Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </PanGestureHandler>

        {/* Date Picker Modal */}
        <CalendarBottomSheetModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          title="Select Due Date"
          iconColor={iconColors[3]}
          selectedDate={selectedDate}
          onSelectDate={(dateString) => {
            setSelectedDate(dateString);
            setShowDatePicker(false);
          }}
          minDate={new Date().toISOString().split('T')[0]}
          maxDate="2099-12-31"
          markedDates={{
            [selectedDate]: {
              selected: true,
              selectedColor: iconColors[3],
            },
          }}
          theme={{
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            calendarBackground: dark ? COLORS.dark2 : COLORS.white,
            textSectionTitleColor: dark ? COLORS.white : COLORS.greyscale900,
            selectedDayBackgroundColor: iconColors[3],
            selectedDayTextColor: COLORS.white,
            todayTextColor: iconColors[3],
            dayTextColor: dark ? COLORS.white : COLORS.greyscale900,
            textDisabledColor: dark ? COLORS.grayscale700 : COLORS.grayscale400,
            dotColor: iconColors[3],
            selectedDotColor: COLORS.white,
            arrowColor: iconColors[3],
            monthTextColor: dark ? COLORS.white : COLORS.greyscale900,
            indicatorColor: iconColors[3],
            textDayFontFamily: 'regular',
            textMonthFontFamily: 'semiBold',
            textDayHeaderFontFamily: 'medium',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300',
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 13,
          }}
        />

        {/* Team Member Selector Modal */}
        <Modal
          visible={showAssigneeSelector}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAssigneeSelector(false)}
          presentationStyle="overFullScreen"
        >
          <View style={[styles.assigneeModalContainer, { backgroundColor: 'transparent' }]}>
            <View style={[styles.assigneeModalContent, {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 12,
            }]}>
              <View style={styles.assigneeModalHeader}>
                <Text style={[styles.assigneeModalTitle, {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                }]}>
                  Select Team Members
                </Text>
                <TouchableOpacity onPress={() => setShowAssigneeSelector(false)}>
                  <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.greyscale900} />
                </TouchableOpacity>
              </View>
              
              {loadingTeamMembers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    Loading team members...
                  </Text>
                </View>
              ) : teamMembers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.grayscale400} />
                  <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    No team members found
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={teamMembers}
                  renderItem={renderTeamMemberItem}
                  keyExtractor={(item) => item.user_id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.teamMembersList}
                />
              )}
              
              <View style={styles.assigneeModalFooter}>
                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => setShowAssigneeSelector(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>

      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginLeft: 8,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'regular',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'regular',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  assigneeButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assigneeButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assigneeText: {
    fontSize: 16,
    fontFamily: 'regular',
    marginLeft: 8,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'regular',
  },
  subtaskInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'regular',
  },
  addSubtaskButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtasksList: {
    marginTop: 12,
  },
  subtasksListTitle: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  subtaskItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subtaskItemText: {
    fontSize: 14,
    fontFamily: 'regular',
    marginLeft: 8,
    flex: 1,
  },
  removeSubtaskButton: {
    padding: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  createTaskButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minWidth: 0,
    width: '100%',
    marginTop: 0,
  },
  createTaskButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  datePickerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: 'semiBold',
    marginLeft: 8,
  },
  datePickerButton: {
    fontSize: 16,
    fontFamily: 'medium',
  },
  // Team Member Selector Styles
  assigneeModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  assigneeModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  assigneeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  assigneeModalTitle: {
    fontSize: 18,
    fontFamily: 'semiBold',
  },
  teamMembersList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  teamMemberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  teamMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamMemberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  teamMemberName: {
    fontSize: 16,
    fontFamily: 'medium',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'medium',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  doneButton: {
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'regular',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'regular',
    marginTop: 12,
  },
  // Date Picker Modal Styles
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    zIndex: 2000,
  },
  datePickerOverlayTouchable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  datePickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 2001,
    zIndex: 2001,
    paddingBottom: 20,
  },
  datePickerContentContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  // Calendar Modal Styles
  calendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  calendarCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  calendarModalWrapper: {
    width: '92%',
    maxHeight: '90%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
});

export default AddTaskModal; 