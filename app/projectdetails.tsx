import AddTaskModal from '@/components/AddTaskModal';
import CalendarBottomSheetModal from '@/components/CalendarBottomSheetModal';
import CustomNavigationBar from '@/components/CustomNavigationBar';
import FilesModal from '@/components/FilesModal';
import ProjectAIChat from '@/components/ProjectAIChat';
import ProjectCommentCard from '@/components/ProjectCommentCard';
import ProjectMediaModal from '@/components/ProjectMediaModal';
import RoleSelector from '@/components/RoleSelector';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import Toast from '@/components/Toast';
import UserAvatar from '@/components/UserAvatar';
import { COLORS, icons, images } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskContext } from '@/contexts/TaskContext';
import { useTheme } from '@/theme/ThemeProvider';
import { CachedProjectService } from '@/utils/cachedProjectService';
import { Project, ProjectComment, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { supabase } from '@/utils/supabase';
import { TeamMember, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

// Fix: create animated version of KeyboardAwareScrollView for header animation
const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);

// Missing component definitions
const colors = {
  advanced: COLORS.primary,
  intermediate: "#ff566e",
  medium: "#fbd027",
  weak: "#26c2a3",
  completed: COLORS.greeen
};

// CircularProgress component for the first card
const CircularProgress: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  completed: number;
  total: number;
  color: string;
}> = React.memo(({ progress, size, strokeWidth, completed, total, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E5E5"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center text */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontFamily: 'bold', color: color }}>
          {completed}/{total}
        </Text>
        <Text style={{ fontSize: 10, fontFamily: 'regular', color: '#666' }}>
          Tasks
        </Text>
      </View>
    </View>
  );
});

CircularProgress.displayName = 'CircularProgress';

// TrafficLight component that switches colors based on project status
const TrafficLight: React.FC<{ 
  status: string; 
  onPress: () => void; 
  style?: any; 
}> = React.memo(({ status, onPress, style }) => {
  // Determine which light should be active based on status
  const getActiveLight = () => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active':
      case 'in_progress':
      case 'ongoing':
        return 'green'; // Left light (default - active/good states)
      case 'on_hold':
      case 'paused':
      case 'pending':
      case 'review':
        return 'yellow'; // Center light (caution states)
      case 'archived':
      case 'cancelled':
      case 'failed':
      case 'blocked':
        return 'red'; // Right light (stop/problem states)
      default:
        return 'green'; // Default to green (left light)
    }
  };

  const activeLight = getActiveLight();

  return (
    <TouchableOpacity onPress={onPress} style={style}>
      <Svg width="58" height="29" viewBox="0 0 100 40">
        {/* Traffic light background/frame */}
        <Path
          d="m19 2.5h62c8.3 0 15 6.7 15 15v5c0 8.3-6.7 15-15 15h-62c-8.3 0-15-6.7-15-15v-5c0-8.3 6.7-15 15-15z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        />
        
        {/* Left light (Green) */}
        <Path
          d="m22 30c-5.5 0-10-4.5-10-10 0-5.5 4.5-10 10-10 5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10z"
          fill={activeLight === 'green' ? COLORS.success : 'transparent'}
          stroke="#ffffff"
          strokeWidth="2"
        />
        
        {/* Center light (Yellow) */}
        <Path
          d="m50 30c-5.5 0-10-4.5-10-10 0-5.5 4.5-10 10-10 5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10z"
          fill={activeLight === 'yellow' ? COLORS.warning : 'transparent'}
          stroke="#ffffff"
          strokeWidth="2"
        />
        
        {/* Right light (Red) */}
        <Path
          d="m78 30c-5.5 0-10-4.5-10-10 0-5.5 4.5-10 10-10 5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10z"
          fill={activeLight === 'red' ? COLORS.error : 'transparent'}
          stroke="#ffffff"
          strokeWidth="2"
        />
      </Svg>
    </TouchableOpacity>
  );
});

TrafficLight.displayName = 'TrafficLight';

// Helper functions for role colors and icons
const getRoleColor = (role: string) => {
    switch (role) {
        case 'sponsor': return COLORS.info;
        case 'lead': return COLORS.primary;
        case 'team': return COLORS.success;
        case 'fyi': return COLORS.grayscale400;
        default: return COLORS.grayscale700;
    }
};

const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
  switch (role) {
    case 'sponsor':
      return 'heart';
    case 'lead':
      return 'star';
    case 'team':
      return 'people';
    case 'fyi':
      return 'information-circle';
    default:
      return 'person';
  }
};

// TaskCard component
const TaskCard: React.FC<{ 
  task: Task; 
  onPress: () => void;
  onEdit: (field: string, value: any) => void;
  onDelete: () => void;
}> = React.memo(({ task, onPress, onEdit, onDelete }) => {
  const { dark } = useTheme();

  const handleMorePress = () => {
    Alert.alert(
      'Task Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit Title', 
          onPress: () => {
            Alert.prompt(
              'Edit Task Title',
              'Enter new task title:',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Save', 
                  onPress: (text) => {
                    if (text && text.trim()) {
                      onEdit('title', text.trim());
                    }
                  }
                }
              ],
              'plain-text',
              task.title
            );
          }
        },
        { 
          text: 'Change Status', 
          onPress: () => {
            Alert.alert(
              'Change Status',
              'Select new status:',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'To Do', onPress: () => onEdit('status', 'todo') },
                { text: 'In Progress', onPress: () => onEdit('status', 'in_progress') },
                { text: 'Completed', onPress: () => onEdit('status', 'completed') }
              ]
            );
          }
        },
        { 
          text: 'Change Priority', 
          onPress: () => {
            Alert.alert(
              'Change Priority',
              'Select new priority:',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Low', onPress: () => onEdit('priority', 'low') },
                { text: 'Medium', onPress: () => onEdit('priority', 'medium') },
                { text: 'High', onPress: () => onEdit('priority', 'high') }
              ]
            );
          }
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: onDelete
        }
      ]
    );
  };

  const handleStatusToggle = () => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    onEdit('status', newStatus);
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.todayTaskCard, {
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
        }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.todayTaskCardContent}>
          {/* Left Content */}
          <View style={styles.todayTaskLeft}>
            <Text style={[styles.todayTaskTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900,
            }]}>
              {task.title || 'Untitled Task'}
            </Text>
            <View style={styles.todayTaskMeta}>
              <Text style={[styles.todayTaskTime, {
                color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
              }]}>
                {task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                }) : 'No due date'}
              </Text>
            </View>
            
            {/* Bottom Icons Row - Always visible */}
            <View style={styles.todayTaskBottomIcons}>
              {/* Chat icon - Bottom Left */}
              <View style={styles.todayTaskIconGroup}>
                <Ionicons name="chatbubble-outline" size={16} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                <Text style={[styles.todayTaskIconText, { 
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                }]}>
                  {0} {/* Task doesn't have metadata.comments */}
                </Text>
              </View>
              
              {/* File icon - Bottom Right */}
              <View style={styles.todayTaskIconGroup}>
                <Ionicons name="attach-outline" size={16} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                <Text style={[styles.todayTaskIconText, { 
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                }]}>
                  {0} {/* Task doesn't have metadata.attachments */}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Content - Checkbox and Menu */}
          <View style={styles.todayTaskRight}>
            <TouchableOpacity onPress={handleMorePress} style={styles.todayTaskMenuButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.todayTaskCheckbox, {
                backgroundColor: task.status === 'completed' ? COLORS.primary : 'transparent',
                borderColor: task.status === 'completed' ? COLORS.primary : (dark ? COLORS.grayscale400 : COLORS.grayscale700),
              }]}
              onPress={handleStatusToggle}
            >
              {task.status === 'completed' && (
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
});

TaskCard.displayName = 'TaskCard';

const ProjectDetails = () => {
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const navigation = useRouter();
  const { dark } = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { projectTasks, projectTasksLoading, addTask, updateTask, deleteTask, refreshProjectTasks, refreshTodayTasks } = useTaskContext();
  const insets = useSafeAreaInsets();
  
  const [project, setProject] = useState<Project | null>(null);
  const tasks = projectTasks[projectId] || [];
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAnimation] = useState(new Animated.Value(0));
  const [enhancedProgress, setEnhancedProgress] = useState<{ completed: number; total: number; percentage: number }>({ completed: 0, total: 0, percentage: 0 });
  
  // Scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_MAX_HEIGHT = 180 + insets.top; // Include safe area top inset
  const HEADER_MIN_HEIGHT = 60 + insets.top; // Height for collapsed header (include safe area)
  const HEADER_SCROLL_DISTANCE = 120; // Reduced from 120 to 60 for smoother animation with less content
  
  // Edit modal states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  
  // Modal refs (legacy - keeping for potential future use)
  // All modals now use custom animations instead of RBSheet

  // Title/Description edit modal states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Category management states
  const [projectCategories, setProjectCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Team management states
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<any[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  // Modal animations
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEdcDateModal, setShowEdcDateModal] = useState(false);
  const [showFudDateModal, setShowFudDateModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  
  // Task Details Modal state
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  
  const teamModalAnimation = useRef(new Animated.Value(0)).current;
  const editProjectModalAnimation = useRef(new Animated.Value(0)).current;
  const categoryModalAnimation = useRef(new Animated.Value(0)).current;
  
  // Pull-to-dismiss gesture handling for category modal
  const categoryTranslateY = useRef(new Animated.Value(0)).current;
  const categoryGestureState = useRef(new Animated.Value(0)).current;
  const [isCategoryDismissing, setIsCategoryDismissing] = useState(false);
  const [isCategoryGestureDismissing, setIsCategoryGestureDismissing] = useState(false);
  
  const teamOverlayOpacity = useRef(new Animated.Value(0)).current;
  const editProjectOverlayOpacity = useRef(new Animated.Value(0)).current;
  const categoryOverlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Comments state variables
  const [projectComments, setProjectComments] = useState<ProjectComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  
  // Add state at the top of the component
  const [showInviteConfirmationModal, setShowInviteConfirmationModal] = useState(false);
  const [recentlyInvitedMembers, setRecentlyInvitedMembers] = useState<any[]>([]);
  
  // Keyboard state management
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Keyboard animation values
  // const keyboardAnimation = useRef(new Animated.Value(0)).current;
  // const keyboardHeightAnimation = useRef(new Animated.Value(0)).current;
  // const contentTranslateY = useRef(new Animated.Value(0)).current;
  
  // Comment input ref for keyboard scrolling
  const commentInputRef = useRef<TextInput>(null);
  
  // Add Task Modal handlers
  const openAddTaskModal = () => {
    setShowAddTaskModal(true);
  };

  const closeAddTaskModal = () => {
    setShowAddTaskModal(false);
  };

  const handleTaskCreated = async () => {
    closeAddTaskModal();
    // Only refresh progress, tasks are handled by real-time subscription
    try {
      const progressWithSubtasks = await ProjectService.calculateProjectProgressWithSubtasks(projectId);
      setEnhancedProgress(progressWithSubtasks);
    } catch (error) {
      console.error('❌ Error refreshing progress after task creation:', error);
    }
    // Show success toast
    setToast({ visible: true, message: 'Task created successfully!', type: 'success' });
  };

  // Files modal handlers
  const openFilesModal = () => {
    setShowFilesModal(true);
  };

  const closeFilesModal = () => {
    setShowFilesModal(false);
  };

  // Task Details Modal handlers
  const openTaskDetailsModal = (taskIndex: number) => {
    setCurrentTaskIndex(taskIndex);
    setShowTaskDetailsModal(true);
  };

  const closeTaskDetailsModal = () => {
    console.log('ProjectDetails: Closing task details modal');
    setShowTaskDetailsModal(false);
  };

  const handleTaskUpdate = async (taskId: string, updates: Record<string, any>) => {
    // Optimistically update the UI using the context function
    updateTask(taskId, updates); 

    try {
      // Perform the update in the background
      await ProjectService.updateTask(taskId, updates);
      
      // If the update was a reassignment, show a success toast.
      if ('assigned_to' in updates) {
        setToast({ visible: true, message: 'New member assigned successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      // Optionally, revert the optimistic update here.
      setToast({ visible: true, message: 'Failed to update task', type: 'error' });
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const { ProjectService } = await import('@/utils/projectServiceWrapper');
      await ProjectService.deleteTask(taskId);
      
      // Delete is now handled by TaskContext
      deleteTask(taskId);
      
      // Update progress
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
      setEnhancedProgress({
        completed: completedCount,
        total: updatedTasks.length,
        percentage: updatedTasks.length > 0 ? (completedCount / updatedTasks.length) * 100 : 0
      });
      
      setToast({ visible: true, message: 'Task deleted successfully!', type: 'success' });
    } catch (error) {
      console.error('Error deleting task:', error);
      setToast({ visible: true, message: 'Failed to delete task', type: 'error' });
    }
  };

  // Drag-to-close gesture handling for modals
  // No animation values needed - just gesture detection

  // Create drag-to-close gesture handler function
  const createDragToCloseHandler = (closeModal: () => void) => {
    return (event: any) => {
      const { translationY, state } = event.nativeEvent;
      
      if (state === State.END) {
        // Any downward drag (more than 15px) triggers close - made more sensitive
        if (translationY > 15) {
          closeModal();
        }
      }
      // No visual following during drag - just detect the gesture
    };
  };

  // Create individual gesture handlers
  // const teamPanGestureHandler = createPanGestureHandler(teamPanY, TEAM_MODAL_HEIGHT, closeTeamModal);
  // const datePickerPanGestureHandler = createPanGestureHandler(datePickerPanY, DATE_PICKER_MODAL_HEIGHT, closeDatePickerModal);
  // const editProjectPanGestureHandler = createPanGestureHandler(editProjectPanY, EDIT_PROJECT_MODAL_HEIGHT, closeEditProjectModal);
  // const categoryPanGestureHandler = createPanGestureHandler(categoryPanY, CATEGORY_MODAL_HEIGHT, closeCategoryModal);

  // Animated values for header elements
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const headerElementsOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const headerControlsOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 1], // Always visible
    extrapolate: 'clamp',
  });

  // Load project comments
  const loadProjectComments = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setCommentsLoading(true);
      console.log('💬 Loading project comments for:', projectId);
      
      const comments = await ProjectService.getProjectComments(projectId);
      setProjectComments(comments);
      
      console.log('✅ Comments loaded:', comments.length);
    } catch (error) {
      console.error('❌ Error loading project comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [projectId]);

  // Real-time subscription for project comments
  useEffect(() => {
    if (!projectId || !user?.id) return;

    console.log('🔗 Setting up real-time project comments subscription for project:', projectId);

    const subscription = supabase
      .channel(`project-comments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_comments',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          console.log('💬 New comment received via real-time:', payload);
          
          if (payload.new) {
            const newComment = payload.new as any;
            
            // Fetch user profile for the new comment
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, full_name, avatar_url')
                .eq('id', newComment.user_id)
                .single();

              // Construct full name from first_name and last_name if available
              const firstName = profile?.first_name || '';
              const lastName = profile?.last_name || '';
              const fullName = profile?.full_name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);

              const commentWithUser = {
                ...newComment,
                user: profile ? {
                  ...profile,
                  full_name: fullName
                } : { 
                  id: newComment.user_id, 
                  full_name: 'Unknown User', 
                  avatar_url: null 
                }
              };

              // Add new comment to the top of the list
              setProjectComments(prev => [commentWithUser, ...prev]);
              console.log('✅ New comment added to UI via real-time');
            } catch (error) {
              console.error('❌ Error fetching user profile for new comment:', error);
              // Add comment without user data
              const commentWithUser = {
                ...newComment,
                user: { 
                  id: newComment.user_id, 
                  first_name: '',
                  last_name: '',
                  full_name: 'Unknown User', 
                  avatar_url: null 
                }
              };
              setProjectComments(prev => [commentWithUser, ...prev]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_comments',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          console.log('💬 Comment updated via real-time:', payload);
          
          if (payload.new) {
            const updatedComment = payload.new as any;
            
            // Fetch user profile for the updated comment
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, full_name, avatar_url')
                .eq('id', updatedComment.user_id)
                .single();

              // Construct full name from first_name and last_name if available
              const firstName = profile?.first_name || '';
              const lastName = profile?.last_name || '';
              const fullName = profile?.full_name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);

              const commentWithUser = {
                ...updatedComment,
                user: profile ? {
                  ...profile,
                  full_name: fullName
                } : { 
                  id: updatedComment.user_id, 
                  full_name: 'Unknown User', 
                  avatar_url: null 
                }
              };

              // Update comment in the list
              setProjectComments(prev => 
                prev.map(comment => 
                  comment.id === updatedComment.id ? commentWithUser : comment
                )
              );
              console.log('✅ Comment updated in UI via real-time');
            } catch (error) {
              console.error('❌ Error fetching user profile for updated comment:', error);
              // Update comment without user data
              const commentWithUser = {
                ...updatedComment,
                user: { 
                  id: updatedComment.user_id, 
                  first_name: '',
                  last_name: '',
                  full_name: 'Unknown User', 
                  avatar_url: null 
                }
              };
              setProjectComments(prev => 
                prev.map(comment => 
                  comment.id === updatedComment.id ? commentWithUser : comment
                )
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_comments',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('💬 Comment deleted via real-time:', payload);
          
          if (payload.old) {
            const deletedComment = payload.old as any;
            
            // Remove comment from the list
            setProjectComments(prev => 
              prev.filter(comment => comment.id !== deletedComment.id)
            );
            console.log('✅ Comment removed from UI via real-time');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Project comments subscription status:', status);
      });

    // Cleanup subscription on unmount or project change
    return () => {
      console.log('🔌 Cleaning up project comments subscription');
      subscription.unsubscribe();
    };
  }, [projectId, user?.id]);

  // Real-time subscription for project updates (including cover image generation)
  useEffect(() => {
    if (!projectId || !user?.id) return;

    console.log('🔗 Setting up real-time project updates subscription for project:', projectId);

    const subscription = supabase
      .channel(`project-updates-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        async (payload) => {
          console.log('📋 Project updated via real-time:', payload);
          console.log('📋 [ProjectDetails] Real-time payload details:', {
            old: payload.old,
            new: payload.new,
            hasCoverImageUrl: !!payload.new?.cover_image_url,
            coverImageUrl: payload.new?.cover_image_url,
            hasMetadata: !!payload.new?.metadata,
            metadataKeys: payload.new?.metadata ? Object.keys(payload.new.metadata) : []
          });
          
          if (payload.new) {
            const updatedProject = payload.new as any;
            
            // Update the project state with new data
            setProject(prevProject => {
              if (!prevProject) return updatedProject;
              
              // Merge the updated data with existing project data
              const mergedProject = {
                ...prevProject,
                ...updatedProject,
                // Ensure metadata is properly merged
                metadata: {
                  ...prevProject.metadata,
                  ...updatedProject.metadata
                }
              };
              
              console.log('✅ Project updated in UI via real-time:', {
                cover_image_url: mergedProject.cover_image_url,
                ai_generated_cover: mergedProject.metadata?.ai_generated_cover,
                hasCoverImage: !!mergedProject.cover_image_url,
                hasAIGeneratedCover: !!mergedProject.metadata?.ai_generated_cover?.imageUrl,
                fullProjectData: mergedProject
              });
              
              // Force a re-render by logging the state change
              console.log('🔄 [ProjectDetails] Project state updated, triggering re-render');
              
              return mergedProject;
            });
            
            // Also update the cache with the new data
            try {
              await CachedProjectService.getProject(projectId, true);
            } catch (error) {
              console.error('❌ Error updating cache with real-time data:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Project updates subscription status:', status);
      });

    // Cleanup subscription on unmount or project change
    return () => {
      console.log('🔌 Cleaning up project updates subscription');
      subscription.unsubscribe();
    };
  }, [projectId, user?.id]);

  // Load pending invitations for the project
  const loadPendingInvitations = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoadingInvitations(true);
      const { TeamService } = await import('@/utils/teamService');
      const invitations = await TeamService.getProjectInvitations(projectId);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [projectId]);

  // Load project data with team members
  const loadProjectData = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      console.log('📋 Loading project data for:', projectId);
      
      // Get project with team data
      const { project, teamMembers } = await ProjectService.getProjectWithTeam(projectId);
      
      if (project) {
        setProject(project);
        setTeamMembers(teamMembers);
        
        // Load tasks - now handled by TaskContext
        await refreshProjectTasks(projectId);
        
        // Calculate enhanced progress with subtasks
        const progressWithSubtasks = await ProjectService.calculateProjectProgressWithSubtasks(projectId);
        setEnhancedProgress(progressWithSubtasks);
        
        // Load project comments
        await loadProjectComments();
        
        // Load pending invitations
        await loadPendingInvitations();
        
        console.log('✅ Project loaded:', project.name);
        console.log('👥 Team members:', teamMembers.length);
        console.log('📋 Tasks:', projectTasks.length);
        console.log('📊 Enhanced Progress:', progressWithSubtasks);
      } else {
        console.error('❌ Project not found');
      }
    } catch (error) {
      console.error('❌ Error loading project data:', error);
      Alert.alert('Error', 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  }, [projectId, loadProjectComments, loadPendingInvitations]);

  // Method to refresh enhanced progress (called when returning from task details)
  const refreshEnhancedProgress = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const progressWithSubtasks = await ProjectService.calculateProjectProgressWithSubtasks(projectId);
      setEnhancedProgress(progressWithSubtasks);
      
      // Also reload tasks to get updated statuses - now handled by TaskContext
      await refreshProjectTasks(projectId);
      
      console.log('📊 Progress refreshed:', progressWithSubtasks);
    } catch (error) {
      console.error('❌ Error refreshing progress:', error);
    }
  }, [projectId]);

  // Method to force refresh project data (useful for image generation updates)
  const forceRefreshProject = useCallback(async () => {
    if (!projectId) return;
    
    try {
      console.log('🔄 [ProjectDetails] Force refreshing project data...');
      
      // Fetch fresh project data
      const { project: freshProject, teamMembers: freshTeamMembers } = await ProjectService.getProjectWithTeam(projectId);
      
      if (freshProject) {
        setProject(freshProject);
        setTeamMembers(freshTeamMembers);
        
        // Update cache
        await CachedProjectService.getProject(projectId, true);
        
        console.log('✅ [ProjectDetails] Project data force refreshed:', {
          cover_image_url: freshProject.cover_image_url,
          ai_generated_cover: freshProject.metadata?.ai_generated_cover
        });
      }
    } catch (error) {
      console.error('❌ [ProjectDetails] Error force refreshing project data:', error);
    }
  }, [projectId]);

  // Method to check if image is available and refresh if needed
  const checkImageAvailability = useCallback(async (imageUrl: string) => {
    if (!imageUrl) return;
    
    try {
      console.log('🔄 [ProjectDetails] Checking image availability:', imageUrl);
      
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log('✅ [ProjectDetails] Image is available');
        return true;
      } else {
        console.log('⚠️ [ProjectDetails] Image not available yet, will retry');
        return false;
      }
    } catch (error) {
      console.log('⚠️ [ProjectDetails] Error checking image availability:', error);
      return false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (!projectId) return;

        setLoading(true);

        // 1. Fetch from cache first for instant load
        const cachedProject = await CachedProjectService.getProject(projectId);
        if (cachedProject) {
          setProject(cachedProject);
          // Still show loading as we fetch fresh data, but content is visible
        }

        // 2. Fetch fresh data from the server
        try {
          const { project, teamMembers } = await ProjectService.getProjectWithTeam(projectId);
          if (project) {
            setProject(project);
            setTeamMembers(teamMembers);

            // Tasks are now handled by TaskContext
            await refreshProjectTasks(projectId);
            
            // Also refresh today's tasks to ensure we have the latest data
            console.log('🔄 Refreshing today\'s tasks on project details focus');
            await refreshTodayTasks();

            const progressWithSubtasks = await ProjectService.calculateProjectProgressWithSubtasks(projectId);
            setEnhancedProgress(progressWithSubtasks);

            // Load comments directly here instead of calling loadProjectComments
            try {
              setCommentsLoading(true);
              const comments = await ProjectService.getProjectComments(projectId);
              setProjectComments(comments);
            } catch (error) {
              console.error('❌ Error loading project comments:', error);
            } finally {
              setCommentsLoading(false);
            }

            // 3. Update cache with fresh data
            await CachedProjectService.getProject(projectId, true);
          }
        } catch (error) {
          console.error('❌ Error loading fresh project data:', error);
          if (!cachedProject) { // Only alert if there was no cached data to show
            Alert.alert('Error', 'Failed to load project data');
          }
        } finally {
          setLoading(false);
        }
      };

      loadData();

      return () => {
        setProject(null);
        setTeamMembers([]);
        setProjectComments([]);
        setLoading(true);
        scrollY.setValue(0);
      };
    }, [projectId, scrollY]) // Removed loadProjectComments from dependencies
  );

  // Authentication check and redirect
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to login');
      Alert.alert(
        'Authentication Required',
        'Please log in to access project features.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.push('/login' as any)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  }, [isAuthenticated, authLoading, navigation]);

  // Check image availability when cover image URL changes
  useEffect(() => {
    if (project?.cover_image_url) {
      const imageUrl = project.cover_image_url;
      console.log('🔄 [ProjectDetails] Cover image URL detected, checking availability...');
      
      // Check if image is available
      checkImageAvailability(imageUrl).then((isAvailable) => {
        if (!isAvailable) {
          // If not available, retry after 3 seconds
          setTimeout(() => {
            console.log('🔄 [ProjectDetails] Retrying image availability check...');
            checkImageAvailability(imageUrl).then((retryAvailable) => {
              if (!retryAvailable) {
                console.log('🔄 [ProjectDetails] Image still not available, refreshing project data...');
                forceRefreshProject();
              }
            });
          }, 3000);
        }
      });
    }
  }, [project?.cover_image_url, checkImageAvailability, forceRefreshProject]);

  // Force refresh project data when component mounts to ensure we have the latest data
  useEffect(() => {
    if (projectId) {
      console.log('🔄 [ProjectDetails] Force refreshing project data on mount...');
      forceRefreshProject();
    }
  }, [projectId, forceRefreshProject]);

  // Add a manual refresh trigger for debugging
  const handleManualRefresh = useCallback(async () => {
    console.log('🔄 [ProjectDetails] Manual refresh triggered...');
    await forceRefreshProject();
  }, [forceRefreshProject]);

  // Keyboard event handlers
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        setKeyboardVisible(true);
        setKeyboardHeight(keyboardHeight);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // State for AI chat modal
  const [showAIChat, setShowAIChat] = useState(false);

  // Dropdown menu options
  const dropdownOptions = [
    {
      id: 'add-task',
      title: 'Continue with AI',
      icon: icons.addPlus,
      onPress: () => {
        setShowDropdown(false);
        if (!isAuthenticated) {
          Alert.alert(
            'Authentication Required',
            'Please log in to use AI features.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.push('/login' as any)
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
          return;
        }
        setShowAIChat(true);
      }
    },
    {
      id: 'add-user',
      title: 'Add New User',
      icon: icons.addUser,
      onPress: () => {
        setShowDropdown(false);
        navigation.push("/projectdetailsaddteammenber" as any);
      }
    },
    {
      id: 'edit-images',
      title: 'Edit Images',
      icon: icons.image,
      onPress: () => {
        setShowDropdown(false);
        setShowMediaModal(true);
      }
    }
  ];

  // Show dropdown menu with enhanced spring animation
  const showDropdownMenu = () => {
    setShowDropdown(true);
    Animated.spring(dropdownAnimation, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  // Hide dropdown menu with smooth animation
  const hideDropdownMenu = () => {
    Animated.timing(dropdownAnimation, {
      toValue: 0,
      duration: 200, // Fast, consistent timing for closing
      useNativeDriver: false,
    }).start(() => {
      setShowDropdown(false);
    });
  };

  // Handle edit field
  const handleEditField = (field: string, currentValue: any) => {
    console.log('handleEditField called with:', field, currentValue);
    if (field === 'edc_date') {
      // Ensure the date is properly formatted for the calendar
      const dateToShow = currentValue ? new Date(currentValue + 'T00:00:00').toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setSelectedDate(dateToShow);
      openEdcDateModal();
    } else if (field === 'fud_date') {
      // Ensure the date is properly formatted for the calendar
      const dateToShow = currentValue ? new Date(currentValue + 'T00:00:00').toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setSelectedDate(dateToShow);
      openFudDateModal();
    } else {
      setEditingField(field);
      setEditValue(typeof currentValue === 'string' ? currentValue : String(currentValue || ''));
    }
  };

  // Handle save field
  const handleSaveField = async () => {
    if (!project || !editingField) return;
    
    try {
      let updatedProject: Partial<Project>;
      
      if (['name', 'description', 'status'].includes(editingField)) {
        updatedProject = { [editingField]: editValue };
      } else {
        // For metadata fields, convert numeric values appropriately
        let processedValue: any = editValue;
        if (editingField === 'budget') {
          processedValue = editValue ? parseFloat(editValue) : undefined;
        }
        
        updatedProject = {
          metadata: {
            ...project.metadata,
            [editingField]: processedValue
          }
        };
      }

      const result = await ProjectService.updateProject(project.id, updatedProject);
      if (result) {
        setProject(result);
        setEditingField(null);
        setEditValue('');
        Alert.alert('Success', 'Project updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Error', 'Failed to update project');
    }
  };

  // Handle EDC date save
  const handleEdcDateSave = async (dateString: string) => {
    console.log('handleEdcDateSave called with:', dateString);
    if (!project) return;
    
    try {
      // Ensure the date is treated as local date to avoid timezone issues
      const localDate = new Date(dateString + 'T00:00:00');
      const formattedDate = localDate.toISOString().split('T')[0];
      
      const updatedProject = {
        metadata: {
          ...project.metadata,
          edc_date: formattedDate,
          // Recalculate days left if EDC date is updated
          days_left: ProjectService.calculateDaysLeft(formattedDate)
        }
      };

      const result = await ProjectService.updateProject(project.id, updatedProject);
      if (result) {
        setProject(result);
        closeEdcDateModal();
        Alert.alert('Success', 'EDC Date updated successfully');
      }
    } catch (error) {
      console.error('Error updating EDC date:', error);
      Alert.alert('Error', 'Failed to update EDC date');
    }
  };

  // Handle FUD date save
  const handleFudDateSave = async (dateString: string) => {
    console.log('handleFudDateSave called with:', dateString);
    if (!project) return;
    
    try {
      // Ensure the date is treated as local date to avoid timezone issues
      const localDate = new Date(dateString + 'T00:00:00');
      const formattedDate = localDate.toISOString().split('T')[0];
      
      const updatedProject = {
        metadata: {
          ...project.metadata,
          fud_date: formattedDate,
        }
      };

      const result = await ProjectService.updateProject(project.id, updatedProject);
      if (result) {
        setProject(result);
        closeFudDateModal();
        Alert.alert('Success', 'Follow-up Date updated successfully');
      }
    } catch (error) {
      console.error('Error updating Follow-up date:', error);
      Alert.alert('Error', 'Failed to update Follow-up date');
    }
  };

  // Handle task operations
  const handleTaskEdit = async (task: Task, field: string, value: any) => {
    try {
      const updatedTask = await ProjectService.updateTask(task.id, { [field]: value });
      if (updatedTask) {
        // Update is now handled by TaskContext
        updateTask(task.id, { [field]: value });
        
        // Recalculate enhanced progress after task update
        const progressWithSubtasks = await ProjectService.calculateProjectProgressWithSubtasks(projectId);
        setEnhancedProgress(progressWithSubtasks);
        
        Alert.alert('Success', 'Task updated successfully');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // Team Management Modal Animation Functions
  const openTeamModal = () => {
    setShowTeamModal(true);
    
    // Start overlay fade-in immediately but slowly
    Animated.timing(teamOverlayOpacity, {
      toValue: 1,
      duration: 600, // Slower overlay animation
      useNativeDriver: true,
    }).start();
    
    // Start modal slide-in with a slight delay
    Animated.spring(teamModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,  // Reduced from 100 to make it slower
      friction: 12, // Increased from 8 to reduce bounce/overjump
      delay: 50, // Small delay to let overlay start first
    }).start();
  };

  const closeTeamModal = () => {
    // Animate both overlay and modal out together
    Animated.parallel([
      Animated.timing(teamOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(teamModalAnimation, {
        toValue: 0,
        duration: 400, // Increased from 300ms to make closing slower
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowTeamModal(false);
    });
  };

  // EDC Date Modal Functions - Using CustomBottomSheet like New Project page
  const openEdcDateModal = () => {
    console.log('Opening EDC Date Modal');
    setShowEdcDateModal(true);
  };

  const closeEdcDateModal = () => {
    console.log('Closing EDC Date Modal');
    setShowEdcDateModal(false);
  };

  // FUD Date Modal Functions - Using CustomBottomSheet like New Project page
  const openFudDateModal = () => {
    console.log('Opening FUD Date Modal');
    setShowFudDateModal(true);
  };

  const closeFudDateModal = () => {
    console.log('Closing FUD Date Modal');
    setShowFudDateModal(false);
  };

  // Edit Project Modal Animation Functions
  const openEditProjectModal = () => {
    setShowEditProjectModal(true);
    
    Animated.timing(editProjectOverlayOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    
    Animated.spring(editProjectModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
      delay: 50,
    }).start();
  };

  const closeEditProjectModal = () => {
    Animated.parallel([
      Animated.timing(editProjectOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(editProjectModalAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowEditProjectModal(false);
    });
  };

  // Category Modal Animation Functions
  const openCategoryModal = () => {
    setShowCategoryModal(true);
    
    Animated.parallel([
      Animated.timing(categoryOverlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(categoryModalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
        delay: 50,
      }),
    ]).start();
  };

  const closeCategoryModal = () => {
    // Update state immediately for responsive button behavior
    setShowCategoryModal(false);
    
    // Only animate if not gesture dismissing
    if (!isCategoryGestureDismissing) {
      // Animate the modal out of view - no fade, just slide
      Animated.timing(categoryModalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  // Separate function for gesture-based dismissal to prevent double animation
  const dismissCategoryWithGesture = () => {
    // Set flag to prevent natural modal animation
    setIsCategoryGestureDismissing(true);
    
    // Set modalAnimation to 0 to prevent bounce
    categoryModalAnimation.setValue(0);
    
    // Update state immediately for responsive button behavior
    setShowCategoryModal(false);
    
    // Reset gesture values
    setIsCategoryDismissing(false);
    categoryTranslateY.setValue(0);
    
    // Reset flag after a short delay to allow modal to close
    setTimeout(() => {
      setIsCategoryGestureDismissing(false);
    }, 100);
  };

  // Gesture handling for category modal pull-to-dismiss
  const onCategoryGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: categoryTranslateY } }],
    { useNativeDriver: true }
  );

  const onCategoryHandlerStateChange = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === 5) { // END state
      const shouldDismiss = translationY > 80 || (translationY > 50 && velocityY > 500);
      
      if (shouldDismiss) {
        // Dismiss if dragged down more than 80px or with high velocity
        setIsCategoryDismissing(true);
        Animated.timing(categoryTranslateY, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          dismissCategoryWithGesture();
        });
      } else {
        // Snap back to original position with spring animation
        Animated.spring(categoryTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Reset categoryTranslateY when modal opens
  useEffect(() => {
    if (showCategoryModal) {
      categoryTranslateY.setValue(0);
    }
  }, [showCategoryModal]);

  // Handle category modal visibility changes
  useEffect(() => {
    if (showCategoryModal && !isCategoryGestureDismissing) {
      // Only animate if not already animating
      Animated.parallel([
        Animated.timing(categoryOverlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(categoryModalAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 12,
          delay: 50,
        }),
      ]).start();
    }
  }, [showCategoryModal, isCategoryGestureDismissing]);

  // Team Management Functions
  const handleTeamManagement = () => {
    setSelectedTeamMembers(teamMembers.map(member => member.user_id));
    // Initialize roles for existing team members
    const initialRoles: Record<string, string> = {};
    teamMembers.forEach(member => {
      if (member.user_name === project?.metadata?.project_lead) {
        initialRoles[member.user_id] = 'lead';
      } else {
        initialRoles[member.user_id] = member.role;
      }
    });
    setMemberRoles(initialRoles);
    openTeamModal();
  };

  const searchTeamMembers = async (query: string) => {
    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const { TeamService } = await import('@/utils/teamService');
      const result = await TeamService.searchUsers(query);
      setSearchUsers(result.users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleTeamMemberSelect = (userId: string) => {
    setSelectedTeamMembers(prev => {
      if (prev.includes(userId)) {
        // Remove member and their role
        setMemberRoles(prevRoles => {
          const newRoles = { ...prevRoles };
          delete newRoles[userId];
          return newRoles;
        });
        return prev.filter(id => id !== userId);
      } else {
        // Add member with default role
        setMemberRoles(prevRoles => ({
          ...prevRoles,
          [userId]: 'fyi' // Default role for new members
        }));
        return [...prev, userId];
      }
    });
  };

  const handleSaveTeamMembers = async () => {
    if (!project) return;

    let addedCount = 0;
    let errorMessages = [];

    try {
      const { TeamService } = await import('@/utils/teamService');
      
      // Add new team members
      for (const userId of selectedTeamMembers) {
        if (!teamMembers.find(member => member.user_id === userId)) {
          const assignedRole = memberRoles[userId] || 'fyi';
          const dbRole = assignedRole as TeamMember['role'];
          console.log('Inviting user:', userId, 'with role:', dbRole);
          const result = await TeamService.inviteTeamMember({
            projectId: project.id,
            userId: userId,
            role: dbRole
          });

          if (result.success) {
            addedCount++;
            console.log('Invite result:', result);
          } else {
            errorMessages.push(`Failed to invite user ${userId}: ${result.error}`);
            console.error('Invite failed:', result.error);
          }
        }
      }

      // Update project lead if someone is assigned as Lead
      const leaderUserId = Object.keys(memberRoles).find(
        userId => memberRoles[userId] === 'lead'
      );
      
      if (leaderUserId && project.metadata?.project_lead !== leaderUserId) {
        const { ProjectService } = await import('@/utils/projectServiceWrapper');
        await ProjectService.updateProject(project.id, {
          metadata: {
            ...project.metadata,
            project_lead: leaderUserId
          }
        });
      }

      // Close modal and refresh data
      closeTeamModal();
      setSelectedTeamMembers([]);
      setMemberRoles({});
      
      // Show success message with notification info
      if (addedCount > 0) {
        Alert.alert(
          'Invitations Sent',
          `${addedCount} team member(s) have been invited. They will receive notifications and can accept or decline the invitations.`,
          [{ text: 'OK' }]
        );
      } else if (errorMessages.length > 0) {
        Alert.alert(
          'Invitation Errors',
          errorMessages.join('\n'),
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Changes',
          'No new team members were added.',
          [{ text: 'OK' }]
        );
      }

      // Refresh project data
      loadProjectData();
      
      // Refresh pending invitations
      loadPendingInvitations();

      // Add state at the top of the component
      setRecentlyInvitedMembers(
        searchUsers.filter(user => selectedTeamMembers.includes(user.id))
          .map(user => ({
            id: user.id,
            name: user.full_name || user.username,
                            role: memberRoles[user.id] || 'fyi',
          }))
      );
      setShowInviteConfirmationModal(true);
    } catch (error) {
      console.error('Save team members error:', error);
      Alert.alert('Error', 'Failed to save team changes');
    }
  };

  // Role Management Functions
  const handleRoleChange = (userId: string, role: string) => {
    setMemberRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  // Project Title/Description Edit Functions
  const handleEditProject = () => {
    if (!project) return;
    
    setEditTitle(project.name || '');
    setEditDescription(project.description || '');
    openEditProjectModal();
  };

  const handleSaveProject = async () => {
    if (!project) return;
    
    try {
      const updatedProject = {
        name: editTitle.trim(),
        description: editDescription.trim()
      };

      const result = await ProjectService.updateProject(project.id, updatedProject);
      if (result) {
        setProject(result);
        closeEditProjectModal();
        Alert.alert('Success', 'Project updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Error', 'Failed to update project');
    }
  };

  // Category Management Functions
  const handleCategoryManagement = () => {
    // Parse categories from metadata or use empty array
    const categories = project?.metadata?.categories 
      ? (typeof project.metadata.categories === 'string' 
          ? project.metadata.categories.split(',').map((cat: string) => cat.trim()).filter((cat: string) => cat.length > 0)
          : project.metadata.categories)
      : [];
    setProjectCategories(categories);
    openCategoryModal();
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !projectCategories.includes(newCategory.trim())) {
      setProjectCategories(prev => [...prev, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setProjectCategories(prev => prev.filter(cat => cat !== categoryToRemove));
  };

  const handleSaveCategories = async () => {
    try {
      const updatedProject = {
        ...project!,
        metadata: {
          ...project!.metadata,
          categories: projectCategories
        }
      };

      const result = await ProjectService.updateProject(project!.id, updatedProject);
      if (result) {
        setProject(result);
        closeCategoryModal();
        Alert.alert('Success', 'Categories updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update categories');
      }
    } catch (error) {
      console.error('Error updating categories:', error);
      Alert.alert('Error', 'Failed to update categories');
    }
  };

  // PROJECT COMMENTS FUNCTIONS

  // Post new comment
  const handlePostComment = async () => {
    if (!newComment.trim() || isPostingComment || !user) return;
    
    try {
      setIsPostingComment(true);
      console.log('💬 Posting new comment');
      
      const commentData = {
        project_id: projectId,
        user_id: user?.id || '',
        content: newComment.trim()
      };
      
      const newCommentResult = await ProjectService.createProjectComment(commentData);
      
      if (newCommentResult) {
        // Add user data to the comment immediately for better UX
        const userFirstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '';
        const userLastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
        const userFullName = user.user_metadata?.full_name || (userFirstName && userLastName ? `${userFirstName} ${userLastName}` : userFirstName || user.email || 'Current User');
        
        const commentWithUser = {
          ...newCommentResult,
          user: {
            id: user.id,
            first_name: userFirstName,
            last_name: userLastName,
            full_name: userFullName,
            avatar_url: user.user_metadata?.avatar_url || null
          }
        };
        
        // Add to comments immediately
        setProjectComments(prev => [commentWithUser, ...prev]);
        setNewComment('');
        console.log('✅ Comment posted successfully');
      } else {
        Alert.alert('Error', 'Failed to post comment');
      }
    } catch (error) {
      console.error('❌ Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Handle comment reply
  const handleCommentReply = async (parentCommentId: string, content: string) => {
    try {
      console.log('💬 Posting reply to comment:', parentCommentId);
      
      const replyData = {
        project_id: projectId,
        user_id: user?.id || '',
        content: content.trim(),
        parent_comment_id: parentCommentId
      };
      
      const replyResult = await ProjectService.createProjectComment(replyData);
      
      if (replyResult) {
        // Refresh comments list to show new reply
        await loadProjectComments();
        console.log('✅ Reply posted successfully');
      } else {
        Alert.alert('Error', 'Failed to post reply');
      }
    } catch (error) {
      console.error('❌ Error posting reply:', error);
      Alert.alert('Error', 'Failed to post reply');
    }
  };

  // Handle comment edit
  const handleCommentEdit = async (commentId: string, newContent: string) => {
    try {
      console.log('💬 Editing comment:', commentId);
      
      const updatedComment = await ProjectService.updateProjectComment(commentId, newContent);
      
      if (updatedComment) {
        // Refresh comments list
        await loadProjectComments();
        console.log('✅ Comment updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update comment');
      }
    } catch (error) {
      console.error('❌ Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  // Handle comment delete
  const handleCommentDelete = async (commentId: string) => {
    try {
      console.log('💬 Deleting comment:', commentId);
      
      const success = await ProjectService.deleteProjectComment(commentId);
      
      if (success) {
        // Refresh comments list
        await loadProjectComments();
        console.log('✅ Comment deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete comment');
      }
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment');
    }
  };

  // Handle comment like
  const handleCommentLike = async (commentId: string) => {
    try {
      console.log('💬 Toggling like for comment:', commentId);
      
      const result = await ProjectService.toggleProjectCommentLike(commentId);
      
      if (result) {
        // Refresh comments list to update like status
        await loadProjectComments();
        console.log('✅ Comment like toggled successfully');
      } else {
        Alert.alert('Error', 'Failed to toggle like');
      }
    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      Alert.alert('Error', 'Failed to toggle like');
    }
  };

  // 1. Add necessary imports at the top (reuse from AddProjectModal)
  // import { Ionicons } from '@expo/vector-icons';
  // import { useTheme } from '@/theme/ThemeProvider';
  // import Animated from 'react-native-reanimated';
  // import { Dimensions, Keyboard, Platform } from 'react-native';

  // 2. Add modal state and animation refs near other modal states
  const [showAIModalTab, setShowAIModalTab] = useState<'ai' | 'manual'>('ai');
  const [aiModalOverlayOpacity] = useState(new Animated.Value(0));
  const [aiModalAnimation] = useState(new Animated.Value(0));
  const [aiModalPanY] = useState(new Animated.Value(0));
  const [aiModalTranslateY] = useState(new Animated.Value(0));
  // Use the existing 'dark' from useTheme()
  // const { dark } = useTheme();
  const screenHeight = Dimensions.get('window').height;

  // 3. Keyboard state for modal
  const [aiModalKeyboardVisible, setAIModalKeyboardVisible] = useState(false);
  const [aiModalKeyboardHeight, setAIModalKeyboardHeight] = useState(0);

  useEffect(() => {
    if (showAIChat) {
      // Animate modal in
      Animated.timing(aiModalOverlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.spring(aiModalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      aiModalOverlayOpacity.setValue(0);
      aiModalAnimation.setValue(0);
      aiModalPanY.setValue(0);
      aiModalTranslateY.setValue(0);
    }
  }, [showAIChat]);

  useEffect(() => {
    if (!showAIChat) return;
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        setAIModalKeyboardHeight(keyboardHeight);
        setAIModalKeyboardVisible(true);
        const moveUpAmount = Math.max(0, Math.min(keyboardHeight - 100, keyboardHeight * 0.3));
        Animated.timing(aiModalTranslateY, {
          toValue: -moveUpAmount,
          duration: event.duration || 250,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setAIModalKeyboardHeight(0);
        setAIModalKeyboardVisible(false);
        Animated.timing(aiModalTranslateY, {
          toValue: 0,
          duration: event.duration || 250,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [showAIChat]);

  const aiModalIconColors = [
    COLORS.primary,
    COLORS.success,
    COLORS.warning,
    COLORS.info,
    COLORS.secondary,
    COLORS.tertiary,
  ];
  const AI_MODAL_TABS = [
    { key: 'ai', label: 'AI Assistant', icon: 'chatbubbles' },
    { key: 'manual', label: 'Manual', icon: 'create' },
  ];

  const closeAIModal = () => {
    Animated.parallel([
      Animated.timing(aiModalOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(aiModalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAIChat(false);
      setShowAIModalTab('ai');
    });
  };

  const onAIModalGestureEvent = (event: any) => {
    const { translationY, state, velocityY } = event.nativeEvent;
    if (state === State.ACTIVE) {
      if (translationY >= 0) {
        aiModalPanY.setValue(translationY);
      } else {
        aiModalPanY.setValue(0);
      }
    }
    if (state === State.END) {
      if (translationY > 120 || velocityY > 800) {
        closeAIModal();
        aiModalPanY.setValue(0);
      } else {
        Animated.spring(aiModalPanY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Media modal handlers
  const handleImageSelected = async (imageUrl: string) => {
    try {
      if (!project) return;
      
      // Update project with new cover image
      const updatedProject = {
        cover_image: imageUrl,
        metadata: {
          ...project.metadata,
          ai_generated_cover: {
            imageUrl,
            generated_at: new Date().toISOString(),
            status: 'completed'
          }
        }
      };

      const result = await ProjectService.updateProject(project.id, updatedProject);
      if (result) {
        setProject(result);
        setToast({ visible: true, message: 'Cover image updated successfully!', type: 'success' });
      } else {
        setToast({ visible: true, message: 'Failed to update cover image', type: 'error' });
      }
    } catch (error) {
      console.error('❌ Error updating cover image:', error);
      setToast({ visible: true, message: 'Failed to update cover image', type: 'error' });
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}>
        <View style={[styles.loadingContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {authLoading ? 'Checking authentication...' : 'Loading project...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}>
        <View style={[styles.errorContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
          <Text style={[styles.errorText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Project not found
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const numberOfTask = enhancedProgress.total;
  const numberOfTaskCompleted = enhancedProgress.completed;
  const progress = enhancedProgress.percentage;
  const numberOfDaysLeft = project.metadata?.days_left || 
    (project.metadata?.edc_date ? ProjectService.calculateDaysLeft(project.metadata.edc_date) : 0);

  // After loading comments (e.g., after setProjectComments(comments)), transform to tree:
  const nestedProjectComments = ProjectService.buildCommentTree(projectComments);

  // Animate header controls (icons) upwards by 15px, but slower than the header background for a fluid effect
  const iconTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -15], // Move up by 15px
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}>
      <StatusBar hidden />

      {/* Fixed Header Controls - Always Visible, but animates up 15px slower than header */}
      <Animated.View style={[
        styles.fixedHeaderControls,
        { top: insets.top + 16, left: 0, right: 0, zIndex: 100, transform: [{ translateY: Animated.multiply(iconTranslateY, 0.5) }] }
      ]} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.backButtonContainer}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.back();
            } else {
              navigation.push("/(tabs)/projects" as any);
            }
          }}
        >
          <Image
            source={icons.back}
            resizeMode='contain'
            style={styles.arrowBackIcon}
          />
        </TouchableOpacity>
        <View style={styles.rightContainer}>
          <TouchableOpacity 
            style={styles.menuButtonContainer}
            onPress={showDropdownMenu}
          >
            <Image
              source={icons.moreCircle}
              resizeMode='contain'
              style={styles.menuIcon}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Animated Project Card Style Header - Outside SafeAreaView to extend to top */}
      <Animated.View style={[
          styles.projectCardHeader, 
          { 
            height: HEADER_MAX_HEIGHT,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}>
        {/* Header Image Container */}
        <View style={styles.headerImageContainer}>
          {(() => {
            // Enhanced image source logic with better logging
            let imageSource;
            let sourceType = 'default';
            
            // Debug logging to see what's in the project data
            console.log('🔍 [ProjectDetails] Debug - Project data:', {
              cover_image_url: project.cover_image_url,
              metadata: project.metadata,
              ai_generated_cover: project.metadata?.ai_generated_cover,
              hasCoverImage: !!project.cover_image_url,
              hasAIGeneratedCover: !!project.metadata?.ai_generated_cover?.imageUrl,
              projectId: project.id,
              projectName: project.name
            });
            
            if (project.cover_image_url) {
              imageSource = { uri: project.cover_image_url };
              sourceType = 'cover_image_url';
              console.log('🖼️ [ProjectDetails] Using cover_image_url:', project.cover_image_url);
            } else if (project.metadata?.ai_generated_cover?.status === 'completed' && project.metadata?.ai_generated_cover?.imageUrl) {
              imageSource = { uri: project.metadata.ai_generated_cover.imageUrl };
              sourceType = 'ai_generated_cover';
              console.log('🖼️ [ProjectDetails] Using ai_generated_cover:', project.metadata.ai_generated_cover.imageUrl);
            } else if (project.metadata?.image) {
              imageSource = { uri: project.metadata.image };
              sourceType = 'metadata.image';
              console.log('🖼️ [ProjectDetails] Using metadata.image:', project.metadata.image);
            } else {
              imageSource = images.projectImage;
              sourceType = 'default';
              console.log('🖼️ [ProjectDetails] Using default project image');
            }
            
            console.log('🖼️ [ProjectDetails] Final image source type:', sourceType);
            
            return (
                              <Animated.Image 
                  source={imageSource}
                  style={[styles.headerImage, { height: HEADER_MAX_HEIGHT }]}
                  // Add error handling for image loading
                  onError={(error) => {
                    console.error('❌ [ProjectDetails] Image loading error:', error.nativeEvent);
                    // If image fails to load, try to refresh project data after a delay
                    setTimeout(() => {
                      console.log('🔄 [ProjectDetails] Attempting to refresh project data after image load error');
                      forceRefreshProject();
                    }, 2000);
                  }}
                  onLoad={() => {
                    console.log('✅ [ProjectDetails] Image loaded successfully');
                  }}
                  // Add retry mechanism for React Native
                  defaultSource={images.projectImage}
                />
            );
          })()}
          {/* Header Controls removed from here */}
          {/* Animated Elements - Fade out on scroll */}
          <Animated.View style={[styles.animatedElements, { opacity: headerElementsOpacity }]}> 
            {/* Traffic Light Status Icon - Bottom Left */}
            <TrafficLight 
              status={project.status}
              style={styles.statusTrafficLight}
              onPress={() => {
                Alert.alert(
                  'Change Status',
                  'Select project status:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Active', onPress: () => handleEditField('status', 'active') },
                    { text: 'On Hold', onPress: () => handleEditField('status', 'on_hold') },
                    { text: 'Completed', onPress: () => handleEditField('status', 'completed') },
                    { text: 'Archived', onPress: () => handleEditField('status', 'archived') }
                  ]
                );
              }}
            />

            {/* Budget Display - Next to Traffic Light */}
            <TouchableOpacity 
              style={styles.budgetContainer}
              onPress={() => handleEditField('budget', project.metadata?.budget)}
            >
              <View style={styles.headerBudgetContent}>
                <Ionicons name="wallet" size={16} color={COLORS.white} />
                <Text style={styles.budgetText}>
                  ${project.metadata?.budget ? Number(project.metadata.budget).toLocaleString() : '0'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Team Member Avatars - Bottom Right */}
            <View style={styles.headerTeamMembers}>
              {/* Team Member Avatars with Project Lead First */}
              {(() => {
                // Sort team members so project lead appears first
                const sortedMembers = teamMembers.sort((a, b) => {
                  const aIsLead = a.user_name === project?.metadata?.project_lead;
                  const bIsLead = b.user_name === project?.metadata?.project_lead;
                  if (aIsLead && !bIsLead) return -1;
                  if (!aIsLead && bIsLead) return 1;
                  return 0;
                });

                const visibleMembers = sortedMembers.slice(0, 3);
                
                return visibleMembers.map((member, index) => {
                  const isProjectLead = member.user_name === project?.metadata?.project_lead;
                  // Position from right: leftmost avatar has highest right value
                  // Project lead (index 0) gets position 3, next gets 2, etc.
                  const rightPosition = (visibleMembers.length - index) * 24;
                  
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={handleTeamManagement}
                      style={[styles.headerMemberAvatar, { 
                        right: rightPosition, 
                        zIndex: visibleMembers.length - index
                      }]}
                    >
                      <View style={styles.avatarContainer}>
                        <UserAvatar
                          size={28}
                          userId={member.user_id}
                        />
                      </View>
                      {/* Star icon for project lead */}
                      {isProjectLead && (
                        <View style={styles.projectLeadStar}>
                          <Ionicons name="star" size={10} color={COLORS.warning} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}
              {teamMembers.length > 3 && (
                <TouchableOpacity 
                  style={[styles.headerMoreMembers, { 
                    right: 4 * 24 // Position after the 3 visible avatars
                  }]}
                  onPress={handleTeamManagement}
                >
                  <Text style={styles.headerMoreText}>+{teamMembers.length - 3}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Content inside SafeAreaView with Keyboard Avoidance */}
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={24}
        >
          <AnimatedKeyboardAwareScrollView
            style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            enableOnAndroid
            extraScrollHeight={24}
            keyboardShouldPersistTaps="handled"
          >
           <View style={{ paddingTop: HEADER_MAX_HEIGHT }} />
          {/* Project Info Section - Now scrollable without card frame */}
          <View style={styles.projectInfoScrollable}>
            {/* Title and Days Left Row */}
            <View style={styles.titleDaysRow}>
              <View style={styles.titleDescriptionContainer}>
                            <TouchableOpacity onPress={handleEditProject}>
              <Text style={[styles.projectTitleBelow, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                {project.name}
              </Text>
            </TouchableOpacity>
            {/* Debug refresh button */}
            <TouchableOpacity 
              onPress={handleManualRefresh}
              style={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                backgroundColor: COLORS.primary, 
                padding: 8, 
                borderRadius: 4 
              }}
            >
              <Text style={{ color: COLORS.white, fontSize: 12 }}>🔄</Text>
            </TouchableOpacity>
                <TouchableOpacity onPress={handleEditProject}>
                  <Text style={[styles.projectDescriptionBelow, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                    {project.description || 'Tap to add description'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.daysLeftBelowContainer}>
                <Text style={[styles.daysLeftBelowText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  {numberOfDaysLeft} Days Left
                </Text>
              </View>
            </View>

            {/* Category Tags Section */}
            <View style={styles.categorySection}>
              {(() => {
                const categories = project?.metadata?.categories 
                  ? (typeof project.metadata.categories === 'string' 
                      ? project.metadata.categories.split(',').map((cat: string) => cat.trim()).filter((cat: string) => cat.length > 0)
                      : project.metadata.categories)
                  : [];
                
                const visibleCategories = categories.slice(0, 5);
                const hasMoreCategories = categories.length > 5;
                
                return (
                  <View style={styles.categoryContainerScrollable}>
                    {visibleCategories.map((category: string, index: number) => (
                      <TouchableOpacity 
                        key={index}
                        style={styles.categoryPillScrollable}
                        onPress={handleCategoryManagement}
                      >
                        <Text style={styles.categoryTextScrollable}>{category}</Text>
                      </TouchableOpacity>
                    ))}
                    {hasMoreCategories && (
                      <TouchableOpacity 
                        style={[styles.categoryPillScrollable, styles.moreCategoriesPillScrollable]}
                        onPress={handleCategoryManagement}
                      >
                        <Ionicons name="add" size={12} color={COLORS.white} />
                        <Text style={[styles.categoryTextScrollable, { color: COLORS.white }]}>+{categories.length - 5}</Text>
                      </TouchableOpacity>
                    )}
                    {categories.length === 0 && (
                      <TouchableOpacity 
                        style={[styles.categoryPillScrollable, styles.addCategoryPillScrollable]}
                        onPress={handleCategoryManagement}
                      >
                        <Ionicons name="add" size={12} color={COLORS.white} />
                        <Text style={[styles.categoryTextScrollable, { color: COLORS.white }]}>Add Categories</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Horizontal Slider with Square Cards */}
          <View style={[styles.sliderSection, { 
            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
            marginHorizontal: -16,
            paddingVertical: 24
          }]}>
            <FlatList
              data={[
                {
                  id: 'progress',
                  type: 'progress',
                  title: 'Progress',
                  data: { completed: numberOfTaskCompleted, total: numberOfTask, progress }
                },
                {
                  id: 'flow_status',
                  type: 'flow_status',
                  title: 'Flow Status',
                  data: { status: project.status }
                },
                {
                  id: 'files',
                  type: 'files',
                  title: 'Files',
                  data: { 
                    projectId: projectId,
                    projectName: project.name
                  }
                },
                {
                  id: 'priority',
                  type: 'priority',
                  title: 'Priority',
                  data: { 
                    priority: project.metadata?.priority || 'low'
                  }
                },
                {
                  id: 'budget',
                  type: 'budget',
                  title: 'Budget',
                  data: { 
                    budget: project.metadata?.budget 
                  }
                },
                {
                  id: 'edc_date',
                  type: 'edc_date',
                  title: 'EDC Date',
                  data: { 
                    edc: project.metadata?.edc_date
                  }
                },
                {
                  id: 'fud_date',
                  type: 'fud_date',
                  title: 'FUD Date',
                  data: { 
                    fud: project.metadata?.fud_date
                  }
                },
                {
                  id: 'team_members',
                  type: 'team_members',
                  title: 'Team',
                  data: { 
                    members: teamMembers,
                    totalCount: teamMembers.length
                  }
                }
              ]}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sliderContent}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.sliderCard, 
                    item.type === 'flow_status' ? {
                      backgroundColor: (() => {
                        const status = item.data.status || 'active';
                        switch (status.toLowerCase()) {
                          case 'completed':
                          case 'active':
                          case 'in_progress':
                          case 'ongoing':
                            return 'rgba(34, 197, 94, 0.15)'; // Faded pastel green
                          case 'on_hold':
                          case 'paused':
                          case 'pending':
                          case 'review':
                            return 'rgba(251, 191, 36, 0.15)'; // Faded pastel yellow/orange
                          case 'archived':
                          case 'cancelled':
                          case 'failed':
                          case 'blocked':
                            return 'rgba(239, 68, 68, 0.15)'; // Faded pastel red
                          default:
                            return 'rgba(34, 197, 94, 0.15)'; // Default to green
                        }
                      })()
                    } : { backgroundColor: dark ? COLORS.dark2 : COLORS.white }
                  ]}
                  onPress={() => {
                    // Handle card press based on type
                    switch (item.type) {
                      case 'team_members':
                        handleTeamManagement();
                        break;
                      case 'flow_status':
                        Alert.alert(
                          'Change Status',
                          'Select project status:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Active', onPress: () => handleEditField('status', 'active') },
                            { text: 'On Hold', onPress: () => handleEditField('status', 'on_hold') },
                            { text: 'Completed', onPress: () => handleEditField('status', 'completed') },
                            { text: 'Archived', onPress: () => handleEditField('status', 'archived') }
                          ]
                        );
                        break;
                      case 'files':
                        openFilesModal();
                        break;
                      case 'priority':
                        Alert.alert(
                          'Select Priority',
                          'Choose priority level:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Low', onPress: () => handleEditField('priority', 'low') },
                            { text: 'Medium', onPress: () => handleEditField('priority', 'medium') },
                            { text: 'High', onPress: () => handleEditField('priority', 'high') }
                          ]
                        );
                        break;
                      case 'budget':
                        handleEditField('budget', project.metadata?.budget);
                        break;
                      case 'edc_date':
                        handleEditField('edc_date', project.metadata?.edc_date);
                        break;
                      case 'fud_date':
                        handleEditField('fud_date', project.metadata?.fud_date);
                        break;
                    }
                  }}
                >
                  {/* Card Content Based on Type */}
                  {item.type === 'progress' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.progressCardContent}>
                        <CircularProgress
                          progress={item.data.progress || 0}
                          size={60}
                          strokeWidth={6}
                          completed={item.data.completed || 0}
                          total={item.data.total || 0}
                          color={
                            (item.data.progress || 0) === 1 ? colors.completed :
                            (item.data.progress || 0) >= 0.75 ? colors.advanced :
                            (item.data.progress || 0) >= 0.50 ? colors.intermediate :
                            (item.data.progress || 0) >= 0.35 ? colors.medium : colors.weak
                          }
                        />
                      </View>
                    </View>
                  )}

                  {item.type === 'team_members' && (
                    <TouchableOpacity
                      onPress={() => openTeamModal()}
                      style={styles.sliderCardContent}
                    >
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.teamMembersCardContent}>
                        {/* Apple Watch Style Cluster Layout */}
                        <View style={styles.teamCluster}>
                          {(() => {
                            const members = item.data.members || [];
                            const maxVisible = 7; // Maximum avatars to show in cluster
                            const visibleMembers = members.slice(0, maxVisible);
                            const hasMore = members.length > maxVisible;
                            
                            // Apple Watch style positioning - hexagonal cluster pattern
                            const getAvatarPosition = (index: number, total: number) => {
                              const positions = [
                                // Center position (index 0)
                                { top: 30, left: 30 },
                                // First ring (6 positions around center)
                                { top: 10, left: 30 }, // Top
                                { top: 18, left: 45 }, // Top-right
                                { top: 42, left: 45 }, // Bottom-right
                                { top: 50, left: 30 }, // Bottom
                                { top: 42, left: 15 }, // Bottom-left
                                { top: 18, left: 15 }, // Top-left
                                // Overflow position
                                { top: 30, left: 60 }, // Right side for +X indicator
                              ];
                              
                              if (total === 1) {
                                return positions[0]; // Center only
                              }
                              
                              return positions[index] || positions[0];
                            };
                            
                            return (
                              <>
                                {visibleMembers.map((member, index) => {
                                  const position = getAvatarPosition(index, hasMore ? maxVisible - 1 : visibleMembers.length);
                                  const isProjectLead = member.user_name === project?.metadata?.project_lead;
                                  
                                  return (
                                    <View
                                      key={member.id}
                                      style={[
                                        styles.clusterAvatar,
                                        {
                                          top: position.top,
                                          left: position.left,
                                          zIndex: isProjectLead ? 10 : 5 - index
                                        }
                                      ]}
                                    >
                                      <TouchableOpacity
                                        onPress={(e) => {
                                          e.stopPropagation();
                                          // Open team management modal with this member selected
                                          openTeamModal();
                                        }}
                                        style={styles.clusterAvatarTouchable}
                                      >
                                        <UserAvatar
                                          size={22}
                                          userId={member.user_id}
                                        />
                                        
                                        {/* Action buttons overlay */}
                                        <View style={styles.clusterAvatarActions}>
                                          {/* Edit/Settings button */}
                                          <TouchableOpacity
                                            style={[styles.clusterActionButton, {
                                              backgroundColor: COLORS.primary + '20',
                                              borderColor: COLORS.primary + '40'
                                            }]}
                                            onPress={(e) => {
                                              e.stopPropagation();
                                              // Show role change modal
                                              Alert.alert(
                                                'Change Role',
                                                `Change ${member.user_name}'s role?`,
                                                [
                                                  { text: 'Cancel', style: 'cancel' },
                                                  { text: 'Change', onPress: () => {
                                                    // Open team modal with role selection
                                                    openTeamModal();
                                                  }}
                                                ]
                                              );
                                            }}
                                          >
                                            <Ionicons name="settings-outline" size={10} color={COLORS.primary} />
                                          </TouchableOpacity>
                                          
                                          {/* Delete button */}
                                          <TouchableOpacity
                                            style={[styles.clusterActionButton, {
                                              backgroundColor: COLORS.error + '20',
                                              borderColor: COLORS.error + '40'
                                            }]}
                                            onPress={(e) => {
                                              e.stopPropagation();
                                              Alert.alert(
                                                'Remove Team Member',
                                                `Are you sure you want to remove ${member.user_name} from the team?`,
                                                [
                                                  { text: 'Cancel', style: 'cancel' },
                                                  { 
                                                    text: 'Remove', 
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                      try {
                                                        const success = await TeamService.removeTeamMember(projectId, member.user_id);
                                                        if (success) {
                                                          // Refresh team members
                                                          const updatedMembers = teamMembers.filter(m => m.user_id !== member.user_id);
                                                          setTeamMembers(updatedMembers);
                                                          Alert.alert('Success', `${member.user_name} has been removed from the team.`);
                                                        } else {
                                                          Alert.alert('Error', 'Failed to remove team member. Please try again.');
                                                        }
                                                      } catch (error) {
                                                        console.error('Error removing team member:', error);
                                                        Alert.alert('Error', 'Failed to remove team member. Please try again.');
                                                      }
                                                    }
                                                  }
                                                ]
                                              );
                                            }}
                                          >
                                            <Ionicons name="trash-outline" size={10} color={COLORS.error} />
                                          </TouchableOpacity>
                                        </View>
                                        
                                        {/* Star for project lead */}
                                        {isProjectLead && (
                                          <View style={styles.clusterLeadStar}>
                                            <Ionicons name="star" size={8} color={COLORS.warning} />
                                          </View>
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  );
                                })}
                                
                                {/* Show count if more members */}
                                {hasMore && (
                                  <View style={[styles.clusterAvatar, getAvatarPosition(maxVisible - 1, maxVisible)]}>
                                    <View style={styles.clusterMoreIndicator}>
                                      <Text style={styles.clusterMoreText}>
                                        +{members.length - (maxVisible - 1)}
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              </>
                            );
                          })()}
                        </View>
                        
                        {/* Team count */}
                        <Text style={[styles.teamCountText, { color: dark ? COLORS.grayscale400 : COLORS.greyscale900 }]}>
                          {item.data.totalCount} member{item.data.totalCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {item.type === 'flow_status' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.flowStatusContent}>
                        <TrafficLight 
                          status={item.data.status || 'active'}
                          style={styles.sliderTrafficLight}
                          onPress={() => {}}
                        />
                        <Text style={[styles.statusLabel, { color: dark ? COLORS.grayscale400 : COLORS.greyscale900 }]}>
                          {(item.data.status || 'active').replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}

                  {item.type === 'files' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.filesContent}>
                        <Ionicons name="folder" size={18} color={COLORS.primary} style={{ marginBottom: 8 }} />
                        <View style={styles.filesInfo}>
                          <Text style={[styles.filesText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                            Tap to manage
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {item.type === 'priority' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.priorityContent}>
                        <Ionicons name="flag" size={20} color={COLORS.primary} style={{ marginBottom: 8 }} />
                        <View style={[styles.priorityBadgeSmall, {
                          backgroundColor: item.data.priority === 'high' ? COLORS.error :
                                         item.data.priority === 'medium' ? COLORS.warning : COLORS.success
                        }]}>
                          <Text style={styles.priorityTextSmall}>
                            {item.data.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {item.type === 'budget' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.budgetContent}>
                        <Ionicons name="wallet" size={20} color={COLORS.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.budgetTextLarge, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                          ${item.data.budget ? Number(item.data.budget).toLocaleString() : '0'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {item.type === 'edc_date' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.dateContent}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.dateValueLarge, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                          {item.data.edc ? new Date(item.data.edc + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set Date'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {item.type === 'fud_date' && (
                    <View style={styles.sliderCardContent}>
                      <Text style={[styles.sliderCardTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {item.title}
                      </Text>
                      <View style={styles.dateContent}>
                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={{ marginBottom: 8 }} />
                        <Text style={[styles.dateValueLarge, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                          {item.data.fud ? new Date(item.data.fud + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set Date'}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
          </View>



          {/* Tasks Section */}
          <View style={[styles.tasksSection, {
            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
            marginHorizontal: -16, // Extend to screen edges
            paddingHorizontal: 16, // Add back internal padding
          }]}>
            <View style={styles.tasksSectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: dark ? COLORS.white : COLORS.greyscale900
              }]}>
                Tasks ({tasks.length})
              </Text>
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={openAddTaskModal}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addTaskButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
            
            {tasks.length === 0 ? (
              <View style={styles.emptyTasksContainer}>
                <Ionicons name="clipboard-outline" size={48} color={COLORS.grayscale400} />
                <Text style={[styles.emptyTasksText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  No tasks yet
                </Text>
                <Text style={[styles.emptyTasksSubtext, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  Start by adding your first task
                </Text>
              </View>
            ) : (
              <View style={styles.tasksList}>
                {tasks
                  .filter((task, index, self) => 
                    // Remove duplicates by keeping only the first occurrence of each task ID
                    index === self.findIndex(t => t.id === task.id)
                  )
                  .map((task, index) => (
                    <TaskCard 
                      key={task.id}
                      task={task}
                      onPress={() => openTaskDetailsModal(index)}
                      onEdit={(field, value) => handleTaskEdit(task, field, value)}
                      onDelete={() => handleTaskDelete(task.id)}
                    />
                  ))}
              </View>
            )}
            
            {/* Extra padding to ensure smooth scroll animation */}
            <View style={styles.tasksBottomPadding} />
          </View>

          {/* Comments Section */}
          <View style={[styles.commentsSection, {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            marginHorizontal: -16, // Extend to screen edges
            paddingHorizontal: 16, // Add back internal padding
            marginTop: 16,
          }]}>
            <View style={styles.commentsSectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: dark ? COLORS.white : COLORS.greyscale900
              }]}>
                Team Comments ({nestedProjectComments.length})
              </Text>
            </View>

            {/* New Comment Input */}
            <View style={[styles.newCommentContainer, {
              backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
              borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            }]}>
              <UserAvatar
                size={40}
                style={styles.commentInputAvatar}
              />
              <View style={styles.commentInputSection}>
                <TextInput
                  ref={commentInputRef}
                  style={[styles.commentInput, {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Share your thoughts with the team..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  multiline
                  maxLength={500}
                  onFocus={() => {
                    // Scroll to the input when focused
                    setTimeout(() => {
                      commentInputRef.current?.measureInWindow((x, y) => {
                        // The KeyboardAwareScrollView will handle the scrolling automatically
                      });
                    }, 100);
                  }}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === 'Enter') {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={[styles.postCommentButton, {
                    backgroundColor: newComment.trim() ? COLORS.primary : (dark ? COLORS.grayscale700 : COLORS.grayscale200),
                  }]}
                  onPress={handlePostComment}
                  disabled={!newComment.trim() || isPostingComment}
                >
                  {isPostingComment ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons 
                      name="send" 
                      size={16} 
                      color={newComment.trim() ? COLORS.white : (dark ? COLORS.grayscale400 : COLORS.grayscale700)} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments List */}
            {commentsLoading ? (
              <View style={styles.commentsLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={[styles.commentsLoadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Loading comments...
                </Text>
              </View>
            ) : nestedProjectComments.length === 0 ? (
              <View style={styles.emptyCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.grayscale400} />
                <Text style={[styles.emptyCommentsText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  No comments yet
                </Text>
                <Text style={[styles.emptyCommentsSubtext, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  Start the conversation with your team
                </Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {nestedProjectComments.map((comment) => (
                  <ProjectCommentCard
                    key={comment.id}
                    comment={comment}
                    currentUserId={user?.id}
                    onEdit={handleCommentEdit}
                    onDelete={handleCommentDelete}
                    onReply={handleCommentReply}
                    onLike={handleCommentLike}
                    onRefresh={loadProjectComments}
                  />
                ))}
              </View>
            )}

            {/* Extra padding for comment section */}
            <View style={styles.commentsBottomPadding} />
          </View>
          </AnimatedKeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* EDC Date Modal */}
      <CalendarBottomSheetModal
        visible={showEdcDateModal}
        onClose={closeEdcDateModal}
        title="Estimated Completion Date"
        iconColor={COLORS.primary}
        selectedDate={selectedDate}
        onSelectDate={handleEdcDateSave}
        minDate={new Date().toISOString().split('T')[0]}
        maxDate="2099-12-31"
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: COLORS.primary,
          },
        }}
        theme={{
          backgroundColor: dark ? COLORS.dark2 : "#F8FAFC",
          calendarBackground: dark ? COLORS.dark2 : "#F8FAFC",
          textSectionTitleColor: dark ? COLORS.white : "#000",
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: "#fff",
          todayTextColor: COLORS.primary,
          dayTextColor: dark ? COLORS.grayscale200 : "#222",
          arrowColor: COLORS.primary,
          monthTextColor: dark ? COLORS.white : "#000",
        }}
      />
      {/* FUD Date Modal */}
      <CalendarBottomSheetModal
        visible={showFudDateModal}
        onClose={closeFudDateModal}
        title="Follow Up Date"
        iconColor={COLORS.primary}
        selectedDate={selectedDate}
        onSelectDate={handleFudDateSave}
        minDate={new Date().toISOString().split('T')[0]}
        maxDate="2099-12-31"
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: COLORS.primary,
          },
        }}
        theme={{
          backgroundColor: dark ? COLORS.dark2 : "#F8FAFC",
          calendarBackground: dark ? COLORS.dark2 : "#F8FAFC",
          textSectionTitleColor: dark ? COLORS.white : "#000",
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: "#fff",
          todayTextColor: COLORS.primary,
          dayTextColor: dark ? COLORS.grayscale200 : "#222",
          arrowColor: COLORS.primary,
          monthTextColor: dark ? COLORS.white : "#000",
        }}
      />
      
      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="none"
        onRequestClose={hideDropdownMenu}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: dropdownAnimation,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={hideDropdownMenu}
          >
            <Animated.View
              style={[
                styles.dropdownContainer,
                {
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                  opacity: dropdownAnimation,
                  transform: [
                    {
                      translateY: dropdownAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                    {
                      scale: dropdownAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {dropdownOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.dropdownOption,
                    {
                      backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                      borderBottomWidth: index < dropdownOptions.length - 1 ? 1 : 0,
                      borderBottomColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                      borderTopLeftRadius: index === 0 ? 16 : 0,
                      borderTopRightRadius: index === 0 ? 16 : 0,
                      borderBottomLeftRadius: index === dropdownOptions.length - 1 ? 16 : 0,
                      borderBottomRightRadius: index === dropdownOptions.length - 1 ? 16 : 0,
                    },
                  ]}
                  onPress={option.onPress}
                >
                  <Image
                    source={option.icon as ImageSourcePropType}
                    style={[
                      styles.dropdownIcon,
                      { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.dropdownText,
                      { color: dark ? COLORS.white : COLORS.greyscale900 },
                    ]}
                  >
                    {option.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
      
      {/* Custom Animated Team Management Modal */}
      <Modal
        visible={showTeamModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeTeamModal}
      >
        <Animated.View
          style={[
            styles.teamModalOverlay,
            {
              opacity: teamOverlayOpacity,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.teamModalTouchableOverlay}
            activeOpacity={1}
            onPress={closeTeamModal}
          >
            <Animated.View
              style={[
                styles.teamModalContainer,
                {
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                  transform: [
                    {
                      translateY: teamModalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [500, 0],
                      }),
                    },
                  ],
                  opacity: teamModalAnimation,
                },
              ]}
            >
              <PanGestureHandler
                onGestureEvent={createDragToCloseHandler(closeTeamModal)}
              >
                <View style={{ flex: 1 }}>
                  {/* Draggable Handle */}
                  <View style={styles.teamModalHandle}>
                    <View style={[styles.teamModalDragIndicator, {
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                    }]} />
                  </View>

                  {/* Close Button */}
                  <TouchableOpacity
                    style={[styles.modalCloseButton, {
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    }]}
                    onPress={closeTeamModal}
                  >
                    <Ionicons name="close" size={20} color={dark ? COLORS.white : COLORS.greyscale900} />
                  </TouchableOpacity>

                  <Text style={[styles.bottomSheetTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    marginTop: 16,
                    marginBottom: 16,
                  }]}>
                    👥 Manage Team Members
                  </Text>
            
                  {/* Search Input */}
                  <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={(e) => e.stopPropagation()}
                    style={{ marginBottom: 16 }}
                  >
                    <View style={[styles.searchContainer, {
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    }]}>
                      <Ionicons name="search" size={20} color={COLORS.grayscale400} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.searchInput, {
                          color: dark ? COLORS.white : COLORS.greyscale900,
                        }]}
                        placeholder="Search users to add..."
                        placeholderTextColor={COLORS.grayscale400}
                        value={searchQuery}
                        onChangeText={(text) => {
                          setSearchQuery(text);
                          searchTeamMembers(text);
                        }}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Current Team Members */}
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                        <Ionicons name="people" size={16} color={COLORS.primary} />
                      </View>
                      <Text style={[styles.sectionTitle, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}>
                        Current Team Members ({teamMembers.length})
                      </Text>
                    </View>
                  </View>
                  
                  <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                    {teamMembers.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Ionicons name="people-outline" size={48} color={COLORS.grayscale400} />
                        <Text style={[styles.emptyStateText, {
                          color: dark ? COLORS.white : COLORS.greyscale900,
                        }]}>
                          No team members yet
                        </Text>
                        <Text style={[styles.emptyStateSubtext, {
                          color: COLORS.grayscale400,
                        }]}>
                          Add team members to start collaborating
                        </Text>
                      </View>
                    ) : (
                      teamMembers.map((member) => (
                        <View key={member.id} style={[styles.teamMemberCard, {
                          backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                          borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                        }]}>
                          <View style={styles.memberInfo}>
                            <View style={styles.memberAvatarContainer}>
                              <UserAvatar size={40} userId={member.user_id} />
                              {member.role === 'lead' && (
                                <View style={[styles.leadBadge, { backgroundColor: COLORS.primary }]}>
                                  <Ionicons name="star" size={10} color={COLORS.white} />
                                </View>
                              )}
                            </View>
                            <View style={styles.memberDetails}>
                              <Text style={[styles.memberName, {
                                color: dark ? COLORS.white : COLORS.greyscale900,
                              }]}>
                                {member.user_name}
                              </Text>
                              <View style={styles.memberMeta}>
                                <View style={[styles.roleBadge, { 
                                  backgroundColor: getRoleColor(member.role) + '20',
                                  borderColor: getRoleColor(member.role) + '40'
                                }]}>
                                  <Ionicons name={getRoleIcon(member.role)} size={12} color={getRoleColor(member.role)} />
                                  <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                  </Text>
                                </View>
                                <Text style={[styles.memberStatus, {
                                  color: COLORS.success,
                                }]}>
                                  • Active
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          <View style={styles.memberActions}>
                            {/* Role Change Button */}
                            <TouchableOpacity
                              style={[styles.actionButton, {
                                backgroundColor: COLORS.primary + '20',
                                borderColor: COLORS.primary + '40'
                              }]}
                              onPress={() => {
                                // Show role change modal or dropdown
                                Alert.alert(
                                  'Change Role',
                                  `Change ${member.user_name}'s role?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Change', onPress: () => {
                                      // This would open a role selector
                                      console.log('Change role for:', member.user_id);
                                    }}
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="settings-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                            
                            {/* Remove Member Button */}
                            <TouchableOpacity
                              style={[styles.actionButton, {
                                backgroundColor: COLORS.error + '20',
                                borderColor: COLORS.error + '40'
                              }]}
                              onPress={() => {
                                Alert.alert(
                                  'Remove Team Member',
                                  `Are you sure you want to remove ${member.user_name} from the team?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                      text: 'Remove', 
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          const success = await TeamService.removeTeamMember(projectId, member.user_id);
                                          if (success) {
                                            // Refresh team members
                                            const updatedMembers = teamMembers.filter(m => m.user_id !== member.user_id);
                                            setTeamMembers(updatedMembers);
                                            Alert.alert('Success', `${member.user_name} has been removed from the team.`);
                                          } else {
                                            Alert.alert('Error', 'Failed to remove team member. Please try again.');
                                          }
                                        } catch (error) {
                                          console.error('Error removing team member:', error);
                                          Alert.alert('Error', 'Failed to remove team member. Please try again.');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="person-remove-outline" size={16} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>

                  {/* Pending Invitations */}
                  {pendingInvitations.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                          <View style={[styles.sectionIcon, { backgroundColor: COLORS.warning + '20' }]}>
                            <Ionicons name="time" size={16} color={COLORS.warning} />
                          </View>
                          <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                          }]}>
                            Pending Invitations ({pendingInvitations.length})
                          </Text>
                        </View>
                      </View>
                      
                      <ScrollView style={{ maxHeight: 220, marginBottom: 16 }}>
                        {pendingInvitations.map((invitation) => (
                          <View key={invitation.id} style={[styles.teamMemberCard, {
                            backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                            borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                            opacity: 0.8,
                            marginBottom: 16, // Add more space between cards
                          }]}>
                            <View style={styles.memberInfo}>
                              <View style={styles.memberAvatarContainer}>
                                <UserAvatar size={40} userId={invitation.invitee_id} />
                                <View style={[styles.pendingBadge, { backgroundColor: COLORS.warning }]}>
                                  <Ionicons name="time" size={10} color={COLORS.white} />
                                </View>
                              </View>
                              <View style={styles.memberDetails}>
                                <Text style={[styles.memberName, {
                                  color: dark ? COLORS.white : COLORS.greyscale900,
                                }]}>
                                  {invitation.invitee?.full_name || invitation.invitee?.username || 'Fetching name...'}
                                </Text>
                                <View style={styles.memberMeta}>
                                  <View style={[styles.roleBadge, { 
                                    backgroundColor: getRoleColor(invitation.role) + '20',
                                    borderColor: getRoleColor(invitation.role) + '40'
                                  }]}>
                                    <Ionicons name={getRoleIcon(invitation.role)} size={12} color={getRoleColor(invitation.role)} />
                                    <Text style={[styles.roleText, { color: getRoleColor(invitation.role) }]}>
                                      {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                                    </Text>
                                  </View>
                                  <Text style={[styles.memberStatus, {
                                    color: COLORS.warning,
                                  }]}>
                                    • Pending
                                  </Text>
                                </View>
                              </View>
                            </View>
                            
                            <View style={styles.memberActions}>
                              <TouchableOpacity
                                style={[styles.actionButton, {
                                  backgroundColor: COLORS.grayscale400 + '20',
                                  borderColor: COLORS.grayscale400 + '40'
                                }]}
                                onPress={() => Alert.alert(
                                  'Pending Invitation',
                                  `${invitation.invitee?.full_name || invitation.invitee?.username || 'This user'} has not yet accepted your invitation to join as ${invitation.role}.`
                                )}
                              >
                                <Ionicons name="information-circle-outline" size={16} color={COLORS.grayscale400} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {/* Search Results */}
                  {searchQuery.length >= 2 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                          <View style={[styles.sectionIcon, { backgroundColor: COLORS.success + '20' }]}>
                            <Ionicons name="add-circle" size={16} color={COLORS.success} />
                          </View>
                          <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                          }]}>
                            Add New Members ({searchUsers.length})
                          </Text>
                        </View>
                      </View>
                      
                      <ScrollView style={{ maxHeight: 250 }}>
                        {searchUsers.length === 0 ? (
                          <View style={styles.emptyStateContainer}>
                            <Ionicons name="search-outline" size={32} color={COLORS.grayscale400} />
                            <Text style={[styles.emptyStateText, {
                              color: dark ? COLORS.white : COLORS.greyscale900,
                            }]}>
                              No users found
                            </Text>
                            <Text style={[styles.emptyStateSubtext, {
                              color: COLORS.grayscale400,
                            }]}>
                              Try searching with a different name or email
                            </Text>
                          </View>
                        ) : (
                          searchUsers.map((user) => (
                            <View
                              key={user.id}
                              style={[styles.teamMemberCard, {
                                flexDirection: 'row', // Ensure horizontal layout
                                alignItems: 'center',
                                backgroundColor: selectedTeamMembers.includes(user.id) 
                                  ? `${COLORS.primary}10` 
                                  : (dark ? COLORS.dark3 : COLORS.white),
                                borderColor: selectedTeamMembers.includes(user.id)
                                  ? COLORS.primary + '40'
                                  : (dark ? COLORS.grayscale700 : COLORS.grayscale200),
                              }]}
                            >
                              <TouchableOpacity 
                                style={[styles.memberInfo, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}
                                onPress={() => handleTeamMemberSelect(user.id)}
                              >
                                <View style={styles.memberAvatarContainer}>
                                  <UserAvatar size={40} userId={user.id} />
                                  {selectedTeamMembers.includes(user.id) && (
                                    <View style={[styles.selectedBadge, { backgroundColor: COLORS.primary }]}> 
                                      <Ionicons name="checkmark" size={10} color={COLORS.white} />
                                    </View>
                                  )}
                                </View>
                                <View style={[styles.memberDetails, { marginLeft: 12 }]}> 
                                  <Text style={[styles.memberName, {
                                    color: dark ? COLORS.white : COLORS.greyscale900,
                                  }]} numberOfLines={1} ellipsizeMode="tail">
                                    {user.full_name || user.username}
                                  </Text>
                                  {user.username && user.full_name && (
                                    <Text style={[styles.memberUsername, {
                                      color: COLORS.grayscale400,
                                    }]} numberOfLines={1} ellipsizeMode="tail">
                                      @{user.username}
                                    </Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                              {/* Role Selection for new members */}
                              {selectedTeamMembers.includes(user.id) && (
                                <View style={[styles.roleSelector, { marginLeft: 12 }]}> 
                                  <RoleSelector
                                    selectedRole={memberRoles[user.id] || 'fyi'}
                                    onRoleSelect={(role) => handleRoleChange(user.id, role)}
                                    compact={true}
                                  />
                                </View>
                              )}
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </>
                  )}

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[styles.saveTeamButton, {
                      backgroundColor: COLORS.primary,
                      marginTop: 16,
                      marginBottom: 16,
                    }]}
                    onPress={handleSaveTeamMembers}
                  >
                    <Ionicons name="save-outline" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.saveTeamButtonText}>
                      Save Team Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </PanGestureHandler>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Custom Animated Edit Project Modal */}
      <Modal
        visible={showEditProjectModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeEditProjectModal}
      >
        <Animated.View
          style={[
            styles.teamModalOverlay,
            {
              opacity: editProjectOverlayOpacity,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.teamModalTouchableOverlay}
            activeOpacity={1}
            onPress={closeEditProjectModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <Animated.View
                style={[
                  styles.editProjectModalContainer,
                  {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    transform: [
                      {
                        translateY: editProjectModalAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                      },
                    ],
                    opacity: editProjectModalAnimation,
                  },
                ]}
              >
                <PanGestureHandler
                  onGestureEvent={createDragToCloseHandler(closeEditProjectModal)}
                >
                  <View style={{ flex: 1 }}>
                    {/* Draggable Handle */}
                    <View style={styles.teamModalHandle}>
                      <View style={[styles.teamModalDragIndicator, {
                        backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                      }]} />
                    </View>

                    <Text style={[styles.bottomSheetTitle, {
                      color: dark ? COLORS.white : COLORS.greyscale900,
                      marginTop: 16,
                      marginBottom: 16,
                    }]}>
                      Edit Project Title and Description
                    </Text>
                    
                    <TextInput
                      style={[styles.editInput, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}
                      placeholder="Enter new title"
                      placeholderTextColor={COLORS.grayscale400}
                      value={editTitle}
                      onChangeText={(text) => setEditTitle(text)}
                    />
                    <TextInput
                      style={[styles.editInput, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}
                      placeholder="Enter new description"
                      placeholderTextColor={COLORS.grayscale400}
                      value={editDescription}
                      onChangeText={(text) => setEditDescription(text)}
                    />

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={[styles.cancelButton, {
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                        }]}
                        onPress={closeEditProjectModal}
                      >
                        <Text style={[styles.cancelButtonText, {
                          color: dark ? COLORS.white : COLORS.greyscale900,
                        }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveButton, {
                          backgroundColor: COLORS.primary,
                        }]}
                        onPress={handleSaveProject}
                      >
                        <Text style={[styles.saveButtonText, {
                          color: COLORS.white,
                        }]}>
                          Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </PanGestureHandler>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Custom Animated Category Management Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeCategoryModal}
      >
        <Animated.View
          style={[
            styles.teamModalOverlay,
            {
              opacity: Animated.multiply(
                categoryOverlayOpacity,
                categoryTranslateY.interpolate({
                  inputRange: [0, 200],
                  outputRange: [1, 0.3],
                  extrapolate: 'clamp',
                })
              )
            }
          ]}
        >
          <TouchableOpacity
            style={styles.teamModalTouchableOverlay}
            activeOpacity={1}
            onPress={closeCategoryModal}
          />
          <PanGestureHandler
            onGestureEvent={onCategoryGestureEvent}
            onHandlerStateChange={onCategoryHandlerStateChange}
            activeOffsetY={[-10, 10]}
            failOffsetY={[-100, 100]}
            shouldCancelWhenOutside={false}
          >
            <Animated.View
              style={[
                styles.categoryModalContainer,
                {
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                  transform: [
                    {
                      translateY: Animated.add(
                        categoryModalAnimation.interpolate({ inputRange: [0, 1], outputRange: [800, 0] }),
                        categoryTranslateY
                      ),
                    },
                  ],
                  // Maintain 100% opacity during gesture - no fading
                  opacity: 1,
                  // Dynamic shadow during gesture
                  shadowOpacity: categoryTranslateY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0.25, 0.1],
                    extrapolate: 'clamp',
                  }),
                  shadowRadius: categoryTranslateY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [8, 4],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.teamModalHandle}>
                <Animated.View 
                  style={[
                    styles.teamModalDragIndicator, 
                    { 
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                      transform: [
                        {
                          scale: categoryTranslateY.interpolate({
                            inputRange: [0, 100],
                            outputRange: [1, 1.2],
                            extrapolate: 'clamp',
                          })
                        },
                        {
                          rotate: categoryTranslateY.interpolate({
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

                            {/* Header - Matching AddProjectModal style, now more compact */}
              <View style={[styles.header, { paddingBottom: 8, paddingHorizontal: 16 }]}> 
                <View style={styles.headerLeft}>
                  <View style={[styles.headerIcon, { width: 32, height: 32, borderRadius: 16, marginRight: 8 }]}> 
                    <Ionicons name="pricetag" size={18} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={{
                      color: dark ? COLORS.white : COLORS.greyscale900,
                      fontSize: 17,
                      fontFamily: 'bold',
                      lineHeight: 22,
                      marginBottom: 0,
                      marginRight: 0,
                      maxWidth: 180,
                    }}>
                      Manage Categories
                    </Text>
                    <Text style={{
                      color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                      fontSize: 12,
                      fontFamily: 'regular',
                      marginTop: 0,
                      lineHeight: 16,
                      maxWidth: 180,
                    }}>
                      Organize your project with categories
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={closeCategoryModal} style={styles.modalCloseButton}>
                  <Ionicons 
                    name="close-circle" 
                    size={28} 
                    color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                  />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={{ flex: 1, padding: 16 }}>
                {/* Add New Category */}
                <View style={[styles.searchContainer, {
                  backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                  marginBottom: 16,
                }]}>
                  <Ionicons name="add" size={20} color={COLORS.grayscale400} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, {
                      color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}
                    placeholder="Add new category..."
                    placeholderTextColor={COLORS.grayscale400}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    onSubmitEditing={handleAddCategory}
                  />
                  <TouchableOpacity onPress={handleAddCategory} style={{ padding: 4 }}>
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Current Categories */}
                <Text style={[styles.sectionTitle, {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                  marginBottom: 12,
                }]}>
                  Current Categories ({projectCategories.length})
                </Text>
                
                <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                  {projectCategories.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={[styles.memberRole, {
                        color: COLORS.grayscale400,
                        textAlign: 'center',
                      }]}>
                        No categories added yet. Add your first category above.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {projectCategories.map((category: string, index: number) => (
                        <View key={index} style={[styles.categoryPill, {
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }]}>
                          <Text style={[styles.categoryText, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                            fontSize: 12,
                          }]}>
                            {category}
                          </Text>
                          <TouchableOpacity 
                            onPress={() => handleRemoveCategory(category)}
                            style={{ marginLeft: 6 }}
                          >
                            <Ionicons name="close" size={14} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveTeamButton, {
                    backgroundColor: COLORS.primary,
                    marginBottom: 16,
                  }]}
                  onPress={handleSaveCategories}
                >
                  <Text style={styles.saveTeamButtonText}>
                    Save Categories
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </Modal>
      
      {/* Custom Navigation Bar - Using reusable component */}
      <CustomNavigationBar activeTab="projects" />

      {/* Files Modal */}
      <FilesModal
        visible={showFilesModal}
        onClose={closeFilesModal}
        projectId={projectId}
        projectName={project?.name || 'Project'}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={closeAddTaskModal}
        projectId={projectId}
        onTaskCreated={handleTaskCreated}
      />

      {/* Project AI Chat Modal */}
      {showAIChat && isAuthenticated && (
        <Modal visible={showAIChat} transparent animationType="fade" onRequestClose={closeAIModal}>
          <PanGestureHandler onGestureEvent={onAIModalGestureEvent}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '85%',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 10,
                transform: [
                  {
                    translateY: Animated.add(
                      aiModalAnimation.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
                      Animated.add(aiModalPanY, aiModalTranslateY)
                    ),
                  },
                ],
              }}
            >
              {/* Header: pill drag, title, subtitle, close button */}
              <View style={{ backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 0, paddingHorizontal: 0, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, zIndex: 2 }}>
                {/* Pill drag indicator */}
                <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: COLORS.grayscale200, marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 0 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: dark ? COLORS.white : COLORS.greyscale900 }}>Continue Project</Text>
                    <Text style={{ fontSize: 14, color: dark ? COLORS.grayscale400 : COLORS.grayscale700, marginTop: 2 }}>Continue or edit your project</Text>
                  </View>
                  <TouchableOpacity onPress={closeAIModal} style={{ marginLeft: 12 }}>
                    <Ionicons name="close-circle" size={28} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                  </TouchableOpacity>
                </View>
                {/* Tab Switcher (pill style) */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderRadius: 24, marginTop: 18, marginBottom: 8, alignSelf: 'center', padding: 4 }}>
                  {AI_MODAL_TABS.map(tab => (
                    <TouchableOpacity
                      key={tab.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 8,
                        paddingHorizontal: 22,
                        borderRadius: 20,
                        backgroundColor: showAIModalTab === tab.key ? COLORS.primary : 'transparent',
                        marginHorizontal: 2,
                      }}
                      onPress={() => setShowAIModalTab(tab.key as 'ai' | 'manual')}
                    >
                      <Ionicons name={tab.icon as any} size={18} color={showAIModalTab === tab.key ? COLORS.white : COLORS.grayscale400} />
                      <Text style={{ fontSize: 15, fontWeight: 600, marginLeft: 6, color: showAIModalTab === tab.key ? COLORS.white : COLORS.grayscale400 }}>{tab.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Content: Show ProjectAIChat or Manual form based on tab */}
              <View style={{ flex: 1, padding: 0 }}>
                {showAIModalTab === 'ai' ? (
                  <ProjectAIChat
                    projectId={projectId}
                    projectName={project?.name || 'Project'}
                    onClose={closeAIModal}
                  />
                ) : (
                  // Manual form with prefilled, editable fields
                  <ScrollView style={{ flex: 1, padding: 24 }} contentContainerStyle={{ paddingBottom: 48 }}>
                    {/* Project Name */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Project Name</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.name || ''}
                        onChangeText={text => setProject(prev => prev ? { ...prev, name: text } : prev)}
                        placeholder="Enter project name"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* Description */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Description</Text>
                      <TextInput
                        style={{
                          minHeight: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                          textAlignVertical: 'top',
                        }}
                        value={project?.description || ''}
                        onChangeText={text => setProject(prev => prev ? { ...prev, description: text } : prev)}
                        placeholder="Enter project description"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                    {/* Category (from metadata) */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Category</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.metadata?.category || ''}
                        onChangeText={text => setProject(prev => prev && prev.metadata ? { ...prev, metadata: { ...prev.metadata, category: text } } : prev)}
                        placeholder="Enter category"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* Priority (dropdown for allowed values) */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Priority</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.priority || ''}
                        onChangeText={text => {
                          const allowed: any = ['low', 'medium', 'high', 'urgent'];
                          if (allowed.includes(text)) setProject(prev => prev ? { ...prev, priority: text as any } : prev);
                        }}
                        placeholder="Enter priority (low, medium, high, urgent)"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* Status (dropdown for allowed values) */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Status</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.status || ''}
                        onChangeText={text => {
                          const allowed: any = ['active', 'completed', 'archived', 'draft'];
                          if (allowed.includes(text)) setProject(prev => prev ? { ...prev, status: text as any } : prev);
                        }}
                        placeholder="Enter status (active, completed, archived, draft)"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* EDC Date */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>EDC Date</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.metadata?.edc_date || ''}
                        onChangeText={text => setProject(prev => prev && prev.metadata ? { ...prev, metadata: { ...prev.metadata, edc_date: text } } : prev)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* FUD Date */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>FUD Date</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.metadata?.fud_date || ''}
                        onChangeText={text => setProject(prev => prev && prev.metadata ? { ...prev, metadata: { ...prev.metadata, fud_date: text } } : prev)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* Owner */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Project Owner</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.metadata?.project_owner || ''}
                        onChangeText={text => setProject(prev => prev && prev.metadata ? { ...prev, metadata: { ...prev.metadata, project_owner: text } } : prev)}
                        placeholder="Enter owner"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* Lead */}
                    <View style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 6 }}>Project Lead</Text>
                      <TextInput
                        style={{
                          height: 48,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: COLORS.grayscale200,
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          paddingHorizontal: 14,
                          fontSize: 16,
                        }}
                        value={project?.metadata?.project_lead || ''}
                        onChangeText={text => setProject(prev => prev && prev.metadata ? { ...prev, metadata: { ...prev.metadata, project_lead: text } } : prev)}
                        placeholder="Enter lead"
                        placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                      />
                    </View>
                    {/* Add more fields as needed */}
                  </ScrollView>
                )}
              </View>
            </Animated.View>
          </PanGestureHandler>
        </Modal>
      )}

      {/* Task Details Modal */}
      {showTaskDetailsModal && (
        <TaskDetailsModal
          visible={showTaskDetailsModal}
          onClose={closeTaskDetailsModal}
          project={project}
          tasks={tasks}
          currentTaskIndex={currentTaskIndex}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          teamMembers={teamMembers}
        />
      )}

      {/* Project Media Modal */}
      <ProjectMediaModal
        visible={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        projectId={projectId}
        projectTitle={project?.name || ''}
        projectDescription={project?.description || ''}
        projectCategory={project?.metadata?.category || ''}
        currentCoverImage={project?.cover_image}
        onImageSelected={handleImageSelected}
      />

      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Render the confirmation modal after the main modal */}
      {showInviteConfirmationModal && (
        <Modal
          visible={showInviteConfirmationModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowInviteConfirmationModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>Invitations Sent</Text>
              {recentlyInvitedMembers.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.grayscale400 }}>No new invitations sent.</Text>
              ) : (
                recentlyInvitedMembers.map((member) => (
                  <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 16 }}>{member.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: getRoleColor(member.role) + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 }}>
                        <Text style={{ color: getRoleColor(member.role), fontSize: 13 }}>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</Text>
                      </View>
                      <Text style={{ color: COLORS.warning, fontSize: 13 }}>Pending</Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={{ marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                onPress={() => setShowInviteConfirmationModal(false)}
              >
                <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  backButtonContainer: {
    padding: 12,
    // Removed marginTop and marginLeft to align with index.tsx bell icon positioning
  },
  editButtonContainer: {
    padding: 12,
    // Removed marginTop to align with index.tsx bell icon positioning
  },
  menuButtonContainer: {
    padding: 12,
    marginRight: 8, // Match index.tsx bell icon marginRight: 8
    // Removed marginTop to align with index.tsx bell icon positioning
  },
  arrowBackIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.white
  },
  searchIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.white,
    marginRight: 8,
  },
  menuIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.white
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    // Match index.tsx viewRight alignment
  },
  title: {
    fontSize: 28,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginTop: 20,
    marginBottom: 12,
  },
  container: {
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.greyscale900,
    fontFamily: 'regular',
  },
  taskDetailsContainer: {
    marginTop: 24,
    backgroundColor: "#E9F0FF",
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "bold",
    color: "#333",
    flex: 1,
  },
  dueDate: {
    fontSize: 14,
    color: "#777",
    marginVertical: 5,
    fontFamily: "regular",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#333",
    fontFamily: "regular",
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
  statusContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    gap: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  emptyTasksContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTasksText: {
    fontSize: 16,
    fontFamily: 'regular',
    marginBottom: 16,
  },
  addTaskButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addTaskButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  teamManageButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 16,
  },
  dropdownContainer: {
    borderRadius: 16,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    minWidth: 200,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'medium',
  },
  editableField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: 'bold',
    marginBottom: 8,
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: 'regular',
    backgroundColor: 'transparent',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
  },
  tasksSection: {
    marginTop: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tasksBottomPadding: {
    height: 20, // Reduced padding to prevent navigation bar misalignment
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  tasksList: {
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    textAlign: 'center',
  },
  separateLine: {
    height: 1,
    width: '100%',
  },
  detailsGrid: {
    flexDirection: 'row',
    marginVertical: 16,
    gap: 16,
  },
  detailsColumn: {
    flex: 1,
  },
  emptyTasksSubtext: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  bannerContainer: {
    position: 'relative',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bannerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  bannerTitle: {
    fontSize: 28,
    fontFamily: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  bannerDescription: {
    fontSize: 16,
    color: COLORS.white,
    fontFamily: 'regular',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  progressCard: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressView: {
    width: 78,
    height: 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  projectCardHeader: {
    backgroundColor: COLORS.white,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerImageContainer: {
    position: 'relative',
    flex: 1,
  },
  headerImage: {
    width: '100%',
    resizeMode: 'cover',
  },
  headerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 10, // Ensure controls stay above other elements
  },
  animatedElements: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60, // Space for bottom elements
  },
  statusTrafficLight: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetContainer: {
    position: 'absolute',
    bottom: 10,
    left: 80,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBudgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  budgetText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  headerTeamMembers: {
    position: 'absolute',
    bottom: 30,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.white,
    position: 'absolute',
    backgroundColor: COLORS.white, // Ensure solid white background
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  headerMoreMembers: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerMoreText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'bold',
  },
  projectInfoBelowImage: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  titleDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleDescriptionContainer: {
    flex: 1,
    marginRight: 16,
  },
  projectTitleBelow: {
    fontSize: 24,
    fontFamily: 'bold',
    marginBottom: 4,
  },
  projectDescriptionBelow: {
    fontSize: 14,
    fontFamily: 'regular',
    lineHeight: 20,
  },
  daysLeftBelowContainer: {
    alignItems: 'flex-end',
  },
  daysLeftBelowText: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  progressRowBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tasksCompletedBadgeBelow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  tasksCompletedTextBelow: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: 'bold',
  },
  progressBarBelow: {
    flex: 1,
    borderRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    padding: 8,
  },
  teamMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  saveTeamButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveTeamButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  projectLeadStar: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSelector: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  roleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 10,
    fontFamily: 'semiBold',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginRight: 8,
    maxWidth: 200, // Increased from 180 to accommodate extended header
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreCategoriesPill: {
    backgroundColor: COLORS.primary,
  },
  addCategoryPill: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'semiBold',
    color: COLORS.greyscale900,
  },
  // New styles for scrollable project info section
  projectInfoScrollable: {
    padding: 16,
    marginBottom: 24,
  },
  categorySection: {
    marginTop: 24,
  },
  categorySectionTitle: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  categoryContainerScrollable: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPillScrollable: {
    backgroundColor: COLORS.grayscale100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreCategoriesPillScrollable: {
    backgroundColor: COLORS.primary,
  },
  addCategoryPillScrollable: {
    backgroundColor: COLORS.primary,
  },
  categoryTextScrollable: {
    fontSize: 12,
    fontFamily: 'semiBold',
    color: COLORS.greyscale900,
  },
  sliderSection: {
    marginBottom: 24,
  },
  sliderContent: {
    paddingHorizontal: 16,
  },
  sliderCard: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginRight: 16,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderCardTitle: {
    fontSize: 17, // Increased from 12 to 17 (5 pixels larger)
    fontFamily: 'semiBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStatusContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 8,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  priorityBudgetContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  priorityTextSmall: {
    color: COLORS.white,
    fontSize: 8,
    fontFamily: 'semiBold',
  },
  budgetTextSmall: {
    fontSize: 10,
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  datesContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateItem: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 8,
    fontFamily: 'regular',
    marginTop: 2,
  },
  dateValue: {
    fontSize: 8,
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  sliderTrafficLight: {
    marginBottom: 4,
    alignSelf: 'center',
  },
  prioritySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  budgetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTextContainer: {
    alignItems: 'center',
    marginLeft: 4,
  },
  // Custom Team Modal Styles
  teamModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  teamModalTouchableOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 16,
  },
  teamModalContainer: {
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    minHeight: 500,
    maxHeight: '90%',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  teamModalHandle: {
    alignItems: 'center',
    paddingVertical: 16, // Increased from 12 to 16 for larger touch area
    paddingHorizontal: 20, // Added horizontal padding for wider touch area
  },
  teamModalDragIndicator: {
    width: 60, // Increased from 50 to 60 for better visibility
    height: 6, // Increased from 5 to 6 for better visibility
    borderRadius: 3, // Adjusted radius proportionally
  },
  // Date Picker Modal Styles
  datePickerModalContainer: {
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    height: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Edit Project Modal Styles
  editProjectModalContainer: {
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    height: 300,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  // Category Modal Styles
  categoryModalContainer: {
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    height: 400,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  // New individual card content styles
  priorityContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTextLarge: {
    fontSize: 14,
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  dateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValueLarge: {
    fontSize: 12,
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  // Team Members Apple Watch Style Cluster Card Styles
  teamMembersCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCluster: {
    width: 90,
    height: 80,
    position: 'relative',
    marginBottom: 8,
  },
  clusterAvatar: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  clusterLeadStar: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  clusterMoreIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  clusterMoreText: {
    fontSize: 9,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  teamCountText: {
    fontSize: 8,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  // Today's Task Card Styles (matching home page design)
  todayTaskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  todayTaskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayTaskLeft: {
    flex: 1,
    marginRight: 16,
  },
  todayTaskTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 4,
  },
  todayTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayTaskTime: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  todayTaskIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayTaskBottomIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  todayTaskIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayTaskIconText: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  todayTaskRight: {
    alignItems: 'center',
    gap: 8,
  },
  todayTaskMenuButton: {
    padding: 4,
  },
  todayTaskCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassignButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Files card styles
  filesContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  filesText: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  // Comments section styles
  commentsSection: {
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  newCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  commentInputAvatar: {
    marginTop: 4,
  },
  commentInputSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'regular',
    minHeight: 36,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  postCommentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  commentsLoadingText: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  commentsList: {
    gap: 16,
  },
  commentsBottomPadding: {
    height: 80, // Adequate padding for CustomNavigationBar space
  },
  taskDetailsModalContainer: {
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
    height: 400,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  taskDetailsHandle: {
    alignItems: 'center',
    paddingVertical: 16, // Increased from 12 to 16 for larger touch area
    paddingHorizontal: 20, // Added horizontal padding for wider touch area
  },
  taskDetailsDragIndicator: {
    width: 60, // Increased from 50 to 60 for better visibility
    height: 6, // Increased from 5 to 6 for better visibility
    borderRadius: 3, // Adjusted radius proportionally
  },
  taskDetailsContent: {
    flex: 1,
    padding: 16,
  },
  saveTaskButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveTaskButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 16,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  memberDetails: {
    flex: 1,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 4,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    marginLeft: 2,
  },
  memberStatus: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  leadBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  pendingBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  memberUsername: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  clusterAvatarTouchable: {
    position: 'relative',
  },
  clusterAvatarActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
  },
  clusterActionButton: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Date Picker Modal Styles (consolidated and unique)
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
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  fixedHeaderControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 100,
  },
  // Header styles for category modal (matching AddProjectModal)
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
});

export default ProjectDetails;