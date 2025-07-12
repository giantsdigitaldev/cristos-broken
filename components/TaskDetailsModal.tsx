import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Project, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { TeamMember } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CalendarBottomSheetModal from './CalendarBottomSheetModal';
import SubtaskCard from './SubtaskCard';
import Toast from './Toast';
import UserAvatar from './UserAvatar';

interface TaskDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  project: Project | null;
  tasks: Task[];
  currentTaskIndex: number;
  onTaskUpdate: (taskId: string, updates: any) => void;
  onTaskDelete: (taskId: string) => void;
  teamMembers?: TeamMember[];
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  visible,
  onClose,
  project,
  tasks,
  currentTaskIndex,
  onTaskUpdate,
  onTaskDelete,
  teamMembers: propTeamMembers,
}) => {
  const { colors, dark } = useTheme();
  const { user } = useAuth();
  
  // State
  const [currentIndex, setCurrentIndex] = useState(currentTaskIndex);
  const [originalTask, setOriginalTask] = useState<Task | null>(null); // Original task from database
  const [task, setTask] = useState<Task | null>(null); // Current task with local changes
  const [originalSubtasks, setOriginalSubtasks] = useState<any[]>([]); // Original subtasks from database
  const [subtasks, setSubtasks] = useState<any[]>([]); // Current subtasks with local changes
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  // Batch update state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    taskUpdates: any;
    subtaskUpdates: any[];
    subtaskDeletes: string[];
    subtaskAdds: any[];
    assignmentUpdates: string[];
  }>({
    taskUpdates: {},
    subtaskUpdates: [],
    subtaskDeletes: [],
    subtaskAdds: [],
    assignmentUpdates: []
  });
  
  // Reassignment state
  const [showAssigneeSelector, setShowAssigneeSelector] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(propTeamMembers || []);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  
  // Modal state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Subtask state
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  
  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Pull-to-dismiss gesture handling
  const translateY = useRef(new Animated.Value(0)).current;
  const gestureState = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);
  const [isGestureDismissing, setIsGestureDismissing] = useState(false);
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const subtaskInputRef = useRef<TextInput>(null);
  
  // Add refs for smooth scrolling to subtasks section
  const subtasksSectionRef = useRef<View>(null);
  const subtaskInputContainerRef = useRef<View>(null);

  // CI Color palette for diverse icons - using app's UI colors
  const iconColors = [
    COLORS.primary,      // Primary blue
    COLORS.success,      // Success green
    COLORS.warning,      // Warning orange
    COLORS.info,         // Info cyan
    COLORS.secondary,    // Secondary purple
    COLORS.tertiary,     // Tertiary pink
  ];

  // App UI colors for subtasks
  const subtaskColors = [
    COLORS.primary,      // Primary blue
    COLORS.success,      // Success green
    COLORS.warning,      // Warning orange
    COLORS.info,         // Info cyan
    COLORS.secondary,    // Secondary purple
    COLORS.tertiary,     // Tertiary pink
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

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Check if all subtasks are completed
  const allSubtasksCompleted = useMemo(() => {
    return subtasks.length > 0 && subtasks.every(subtask => subtask.completed);
  }, [subtasks]);

  // Check if any subtasks are uncompleted (keeping for potential future use)
  const anySubtasksUncompleted = useMemo(() => {
    return subtasks.some(subtask => !subtask.completed);
  }, [subtasks]);

  // Auto-complete task when all subtasks are completed (but don't auto-uncomplete)
  useEffect(() => {
    if (task && subtasks.length > 0) {
      // Only auto-complete when ALL subtasks are completed
      if (allSubtasksCompleted && task.status !== 'completed') {
        handleAutoCompleteTask(true);
      }
      // Remove the auto-uncomplete logic to prevent tasks from being uncompleted
      // when switching to completed tab
    }
  }, [allSubtasksCompleted, task]);

  // Auto-complete task handler (local state only)
  const handleAutoCompleteTask = (complete: boolean) => {
    if (!task) return;
    
    const newStatus: 'completed' | 'in_progress' = complete ? 'completed' : 'in_progress';
    const updatedTask = { ...task, status: newStatus };
    setTask(updatedTask);
    
    // Track changes locally
    setPendingChanges(prev => ({
      ...prev,
      taskUpdates: { ...prev.taskUpdates, status: newStatus }
    }));
    setHasUnsavedChanges(true);
  };

  // Animation functions
  const openModal = () => {
    setShowDatePicker(false);
    setShowDeleteConfirmation(false);
    setShowAssigneeSelector(false);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    // Update state immediately for responsive button behavior
    onClose();
    
    // Only animate if not gesture dismissing
    if (!isGestureDismissing) {
      // Animate the modal out of view - no fade, just slide
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  // Separate function for gesture-based dismissal to prevent double animation
  const dismissWithGesture = () => {
    // Set flag to prevent natural modal animation
    setIsGestureDismissing(true);
    
    // Set modalAnimation to 0 to prevent bounce
    modalAnimation.setValue(0);
    
    // Update state immediately for responsive button behavior
    onClose();
    
    // Reset gesture values
    setIsDismissing(false);
    translateY.setValue(0);
    
    // Reset flag after a short delay to allow modal to close
    setTimeout(() => {
      setIsGestureDismissing(false);
    }, 100);
  };

  // Gesture handling for pull-to-dismiss
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === 5) { // END state
      const shouldDismiss = translationY > 80 || (translationY > 50 && velocityY > 500);
      
      if (shouldDismiss) {
        // Dismiss if dragged down more than 80px or with high velocity
        setIsDismissing(true);
        Animated.timing(translateY, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          dismissWithGesture();
        });
      } else {
        // Snap back to original position with spring animation
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Reset translateY when modal opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  // Handle modal visibility changes
  useEffect(() => {
    if (visible && !isGestureDismissing) {
      openModal();
    }
  }, [visible, isGestureDismissing]);

  // Load task data when modal opens or task changes
  useEffect(() => {
    if (visible && tasks && tasks.length > 0) {
      const currentTask = tasks[currentIndex];
      if (currentTask) {
        loadTaskData(currentTask.id);
      }
    }
  }, [visible, currentIndex, tasks]);

  // Load task data
  const loadTaskData = async (taskId: string) => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      
      // Load task details
      const taskDetails = await ProjectService.getTask(taskId);
      if (taskDetails) {
        // Set both original and current task state
        setOriginalTask(taskDetails);
        setTask(taskDetails);
        
        // Load subtasks
        const taskSubtasks = await ProjectService.getTaskSubtasks(taskId);
        const subtasksData = taskSubtasks || [];
        setOriginalSubtasks(subtasksData);
        setSubtasks(subtasksData);
        
        // Load comments
        const taskComments = await ProjectService.getTaskComments(taskId);
        setComments(taskComments || []);
        
        // Load assigned users
        if (taskDetails.assigned_to && taskDetails.assigned_to.length > 0) {
          const { TeamService } = await import('@/utils/teamService');
          const users = await Promise.all(
            taskDetails.assigned_to.map((userId: string) => TeamService.getUserById(userId))
          );
          const validUsers = users.filter((u: any) => u !== null);
          setAssignedUsers(validUsers);
        } else {
          setAssignedUsers([]);
        }
        
        // Reset change tracking
        setPendingChanges({
          taskUpdates: {},
          subtaskUpdates: [],
          subtaskDeletes: [],
          subtaskAdds: [],
          assignmentUpdates: []
        });
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error loading task data:', error);
      showToast('Failed to load task data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load team members for reassignment
  const loadTeamMembers = async () => {
    if (propTeamMembers && propTeamMembers.length > 0) {
      setTeamMembers(propTeamMembers);
      return;
    }
    if (!project?.id) return;
    
    try {
      setLoadingTeamMembers(true);
      const { TeamService } = await import('@/utils/teamService');
      const members = await TeamService.getProjectTeamMembers(project.id);
      
      if (members && members.length > 0) {
        // Sort team members by role priority (highest first)
        const sortedMembers = members.sort((a: any, b: any) => {
          const priorityA = rolePriority[a.role as keyof typeof rolePriority] || 0;
          const priorityB = rolePriority[b.role as keyof typeof rolePriority] || 0;
          return priorityB - priorityA;
        });
        
        setTeamMembers(sortedMembers);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  // Navigation functions
  const goToPreviousTask = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNextTask = () => {
    if (tasks && currentIndex < tasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Task update handler (local state only)
  const handleTaskUpdate = (field: string, value: any) => {
    if (!task) return;
    
    // Validation
    if (field === 'due_date' && (!value || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
      showToast('Invalid due date format', 'error');
      return;
    }
    if (field === 'assigned_to' && (!Array.isArray(value) || value.some(v => typeof v !== 'string'))) {
      showToast('Invalid assignee list', 'error');
      return;
    }

    console.log('Updating task locally', task.id, 'field:', field, 'value:', value);
    const updatedTask = { ...task, [field]: value };
    setTask(updatedTask);
    
    // Track changes locally
    setPendingChanges(prev => ({
      ...prev,
      taskUpdates: { ...prev.taskUpdates, [field]: value }
    }));
    setHasUnsavedChanges(true);
  };

  // Subtask handlers (local state only)
  const handleSubtaskToggle = (subtaskId: string, completed: boolean) => {
    const updatedSubtasks = subtasks.map(subtask => 
      subtask.id === subtaskId 
        ? { 
            ...subtask, 
            completed,
            status: completed ? 'completed' : 'todo',
            completed_at: completed ? new Date().toISOString() : undefined
          } 
        : subtask
    );
    setSubtasks(updatedSubtasks);
    
    // Track changes locally
    setPendingChanges(prev => ({
      ...prev,
      subtaskUpdates: [
        ...prev.subtaskUpdates.filter(update => update.id !== subtaskId),
        {
          id: subtaskId,
          status: completed ? 'completed' : 'todo',
          completed_at: completed ? new Date().toISOString() : undefined
        }
      ]
    }));
    setHasUnsavedChanges(true);
  };

  const handleSubtaskReorder = (fromIndex: number, toIndex: number) => {
    const reorderedSubtasks = [...subtasks];
    const [movedSubtask] = reorderedSubtasks.splice(fromIndex, 1);
    reorderedSubtasks.splice(toIndex, 0, movedSubtask);
    
    setSubtasks(reorderedSubtasks);
    
    // Track order changes locally
    const orderUpdates = reorderedSubtasks.map((subtask, index) => ({
      id: subtask.id,
      order_index: index
    }));
    
    setPendingChanges(prev => ({
      ...prev,
      subtaskUpdates: [
        ...prev.subtaskUpdates.filter(update => !orderUpdates.some(order => order.id === update.id)),
        ...orderUpdates
      ]
    }));
    setHasUnsavedChanges(true);
  };

  const handleSubtaskUpdate = (subtaskId: string, updates: any) => {
    const updatedSubtasks = subtasks.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
    );
    setSubtasks(updatedSubtasks);
    
    // Track changes locally
    setPendingChanges(prev => ({
      ...prev,
      subtaskUpdates: [
        ...prev.subtaskUpdates.filter(update => update.id !== subtaskId),
        { id: subtaskId, ...updates }
      ]
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddSubtasks = () => {
    if (!task || !newSubtaskText.trim()) return;
    
    // Parse comma-separated subtasks
    const newSubtasks = newSubtaskText
      .split(',')
      .map(task => task.trim())
      .filter(task => task.length > 0)
      .map((taskTitle, index) => {
        const tempId = `temp-${Date.now()}-${Math.random()}-${index}`;
        return {
          id: tempId,
          task_id: task.id,
          title: taskTitle,
          description: '',
          status: 'todo' as const,
          priority: 'medium' as const,
          order_index: subtasks.length + index,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
    
    setSubtasks(prev => [...prev, ...newSubtasks]);
    setNewSubtaskText('');
    setShowSubtaskInput(false);
    
    // Track new subtasks locally
    setPendingChanges(prev => ({
      ...prev,
      subtaskAdds: [
        ...prev.subtaskAdds,
        ...newSubtasks.map(subtask => ({
          tempId: subtask.id,
          task_id: task.id,
          title: subtask.title,
          description: '',
          status: 'todo',
          priority: 'medium',
          order_index: subtask.order_index,
        }))
      ]
    }));
    setHasUnsavedChanges(true);
  };

  const handleSubtaskDelete = (subtaskId: string) => {
    setSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
    
    // Track deletion locally
    if (subtaskId.startsWith('temp-')) {
      // Remove from pending adds if it's a temporary subtask
      setPendingChanges(prev => ({
        ...prev,
        subtaskAdds: prev.subtaskAdds.filter(add => add.tempId !== subtaskId)
      }));
    } else {
      // Add to pending deletes if it's an existing subtask
      setPendingChanges(prev => ({
        ...prev,
        subtaskDeletes: [...prev.subtaskDeletes, subtaskId]
      }));
    }
    setHasUnsavedChanges(true);
  };

  // Comment handlers
  const handlePostComment = async () => {
    if (!task || !newComment.trim() || isPostingComment) return;
    
    try {
      setIsPostingComment(true);
      const newCommentObj = await ProjectService.createTaskComment({
        task_id: task.id,
        user_id: user?.id || '',
        content: newComment.trim(),
      });
      
      if (newCommentObj) {
        setComments(prev => [...prev, newCommentObj]);
        setNewComment('');
        showToast('Comment posted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      showToast('Failed to post comment', 'error');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Delete confirmation handlers
  const showDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(true);
  };

  const hideDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(false);
    setIsDeleting(false);
  };

  const handleDeleteTask = () => {
    showDeleteConfirmationModal();
  };

  const executeTaskDeletion = async () => {
    if (!task || isDeleting) return;
    
    try {
      setIsDeleting(true);
      await ProjectService.deleteTask(task.id);
      onTaskDelete(task.id);
      hideDeleteConfirmationModal();
      closeModal();
      showToast('Task deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast('Failed to delete task', 'error');
      setIsDeleting(false);
    }
  };

  // Task completion handlers (local state only)
  const handleTaskCompleteToggle = () => {
    if (!task) return;
    
    const newStatus: 'completed' | 'in_progress' = task.status === 'completed' ? 'in_progress' : 'completed';
    handleTaskUpdate('status', newStatus);
  };

  const handleCompleteAllSubtasks = () => {
    if (!task || subtasks.length === 0) return;
    
    const uncompletedSubtasks = subtasks.filter(subtask => !subtask.completed);
    const updatedSubtasks = subtasks.map(subtask => ({ 
      ...subtask, 
      completed: true,
      status: 'completed' as const,
      completed_at: new Date().toISOString()
    }));
    
    setSubtasks(updatedSubtasks);
    
    // Track changes locally
    const bulkUpdates = uncompletedSubtasks.map(subtask => ({
      id: subtask.id,
      status: 'completed',
      completed_at: new Date().toISOString()
    }));
    
    setPendingChanges(prev => ({
      ...prev,
      subtaskUpdates: [
        ...prev.subtaskUpdates.filter(update => !bulkUpdates.some(bulk => bulk.id === update.id)),
        ...bulkUpdates
      ]
    }));
    setHasUnsavedChanges(true);
  };

  // Reassignment handlers (local state only)
  const handleTaskReassign = (newAssignees: string[]) => {
    if (!task) return;
    handleTaskUpdate('assigned_to', newAssignees);
    
    // Update assigned users display immediately
    if (newAssignees.length > 0) {
      const updateAssignedUsers = async () => {
        try {
          const { TeamService } = await import('@/utils/teamService');
          const users = await Promise.all(
            newAssignees.map((userId: string) => TeamService.getUserById(userId))
          );
          const validUsers = users.filter((u: any) => u !== null);
          setAssignedUsers(validUsers);
        } catch (error) {
          console.error('Error updating assigned users display:', error);
        }
      };
      updateAssignedUsers();
    } else {
      setAssignedUsers([]);
    }
  };
  
  const handleAssigneeToggle = (userId: string) => {
    if (!task) return;
    const currentAssignees = task.assigned_to || [];
    const newAssignees = currentAssignees.includes(userId)
      ? currentAssignees.filter(id => id !== userId)
      : [...currentAssignees, userId];
    
    handleTaskReassign(newAssignees);
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

  // KeyboardAwareScrollView handles all keyboard scrolling automatically
  // No need for manual scroll calculations

  // Handle modal visibility changes
  useEffect(() => {
    if (visible && !isGestureDismissing) {
      openModal();
    }
  }, [visible, isGestureDismissing]);

  // Update currentIndex when currentTaskIndex prop changes
  useEffect(() => {
    setCurrentIndex(currentTaskIndex);
  }, [currentTaskIndex]);

  // Keyboard state tracking (no modal movement to avoid interference)
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

  // Batch update function to send all changes to database
  const handleBatchUpdate = async () => {
    if (!task || !hasUnsavedChanges || isUpdatingTask) return;
    
    try {
      setIsUpdatingTask(true);
      
      // Update main task if there are task-level changes
      if (Object.keys(pendingChanges.taskUpdates).length > 0) {
        console.log('Updating task with changes:', pendingChanges.taskUpdates);
        const updatedTask = await ProjectService.updateTask(task.id, pendingChanges.taskUpdates);
        if (updatedTask) {
          setOriginalTask(updatedTask);
          onTaskUpdate(task.id, pendingChanges.taskUpdates);
        }
      }
      
      // Handle subtask updates
      if (pendingChanges.subtaskUpdates.length > 0) {
        console.log('Updating subtasks:', pendingChanges.subtaskUpdates);
        await Promise.all(
          pendingChanges.subtaskUpdates.map(update => {
            const { id, ...updateData } = update;
            return ProjectService.updateSubtask(id, updateData);
          })
        );
      }
      
      // Handle subtask deletions
      if (pendingChanges.subtaskDeletes.length > 0) {
        console.log('Deleting subtasks:', pendingChanges.subtaskDeletes);
        await Promise.all(
          pendingChanges.subtaskDeletes.map(subtaskId => 
            ProjectService.deleteSubtask(subtaskId)
          )
        );
      }
      
      // Handle subtask additions
      if (pendingChanges.subtaskAdds.length > 0) {
        console.log('Adding subtasks:', pendingChanges.subtaskAdds);
        const newSubtasks = await Promise.all(
          pendingChanges.subtaskAdds.map(async (subtaskData) => {
            const { tempId, ...createData } = subtaskData;
            const newSubtask = await ProjectService.createSubtask(createData);
            return { tempId, newSubtask };
          })
        );
        
        // Update local state with real IDs
        setSubtasks(prev => prev.map(subtask => {
          const match = newSubtasks.find(ns => ns.tempId === subtask.id);
          return match ? match.newSubtask : subtask;
        }));
        setOriginalSubtasks(prev => [
          ...prev,
          ...newSubtasks.map(ns => ns.newSubtask)
        ]);
      }
      
      // Clear pending changes
      setPendingChanges({
        taskUpdates: {},
        subtaskUpdates: [],
        subtaskDeletes: [],
        subtaskAdds: [],
        assignmentUpdates: []
      });
      setHasUnsavedChanges(false);
      
      showToast('Task updated successfully!', 'success');
      
      // Close the modal after successful update
      closeModal();
      
    } catch (error) {
      console.error('Error updating task:', error);
      showToast('Failed to update task: ' + ((error as any)?.message || error), 'error');
    } finally {
      setIsUpdatingTask(false);
    }
  };

  // Reset to original state (discard changes)
  const handleDiscardChanges = () => {
    if (!originalTask) return;
    
    setTask({ ...originalTask });
    setSubtasks([...originalSubtasks]);
    setPendingChanges({
      taskUpdates: {},
      subtaskUpdates: [],
      subtaskDeletes: [],
      subtaskAdds: [],
      assignmentUpdates: []
    });
    setHasUnsavedChanges(false);
    showToast('Changes discarded', 'info');
  };

  // Load team members when reassignment modal opens
  useEffect(() => {
    if (showAssigneeSelector && project?.id) {
      if (!propTeamMembers) {
        loadTeamMembers();
      }
      setSelectedAssignees(task?.assigned_to || []);
    }
  }, [showAssigneeSelector, project?.id, task?.assigned_to, propTeamMembers]);

  // Preload team members in parent modal
  useEffect(() => {
    if (visible && project?.id) {
      if (propTeamMembers && propTeamMembers.length > 0) {
        setTeamMembers(propTeamMembers);
      } else {
        loadTeamMembers();
      }
    }
  }, [visible, project?.id, propTeamMembers]);

  // Preload team members when task changes to ensure they're ready for reassignment
  useEffect(() => {
    if (task && project?.id && !teamMembers.length) {
      if (propTeamMembers && propTeamMembers.length > 0) {
        setTeamMembers(propTeamMembers);
      } else {
        loadTeamMembers();
      }
    }
  }, [task?.id, project?.id, propTeamMembers]);

  // Update assigned users display when task changes
  useEffect(() => {
    if (task?.assigned_to && task.assigned_to.length > 0) {
      const updateAssignedUsers = async () => {
        try {
          const { TeamService } = await import('@/utils/teamService');
          const users = await Promise.all(
            task.assigned_to.map((userId: string) => TeamService.getUserById(userId))
          );
          const validUsers = users.filter((u: any) => u !== null);
          setAssignedUsers(validUsers);
        } catch (error) {
          console.error('Error updating assigned users display:', error);
        }
      };
      updateAssignedUsers();
    } else {
      setAssignedUsers([]);
    }
  }, [task?.assigned_to]);

  // Smooth scroll function for subtask input focus
  const handleSubtaskInputFocus = () => {
    if (!subtasksSectionRef.current || !scrollViewRef.current) return;

    // Measure the subtasks section position
    subtasksSectionRef.current.measureInWindow((x, y, width, height) => {
      if (!scrollViewRef.current) return;

      // Calculate target scroll position to show "Subtasks" title 5px under modal header
      const modalHeaderHeight = 120; // Approximate modal header height
      const targetOffset = y - modalHeaderHeight - 5; // 5px under header

      // Use setTimeout to ensure the scroll happens after the keyboard animation starts
      setTimeout(() => {
        if (scrollViewRef.current) {
          // Get the underlying ScrollView's scrollTo method using getScrollResponder
          const scrollResponder = (scrollViewRef.current as any).getScrollResponder();
          if (scrollResponder && scrollResponder.scrollTo) {
            scrollResponder.scrollTo({
              y: Math.max(0, targetOffset),
              animated: true,
            });
          }
        }
      }, Platform.OS === 'ios' ? 100 : 50); // Slight delay to sync with keyboard animation
    });
  };

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
      presentationStyle="overFullScreen"
    >
      <Animated.View style={[styles.container, { opacity: overlayOpacity }]}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.overlayTouchable} />
        </TouchableOpacity>

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
                height: keyboardVisible ? '95%' : '90%',
                transform: [
                  {
                    translateY: Animated.add(
                      modalAnimation.interpolate({ inputRange: [0, 1], outputRange: [800, 0] }),
                      translateY
                    ),
                  },
                ],
                opacity: 1, // Always fully opaque
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
                <TouchableOpacity
                  onPress={handleTaskCompleteToggle}
                  style={[styles.titleIcon, { 
                    backgroundColor: task?.status === 'completed' 
                      ? iconColors[1] + '20' 
                      : iconColors[0] + '20' 
                  }]}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={task?.status === 'completed' ? "checkmark-circle" : "list"} 
                    size={20} 
                    color={task?.status === 'completed' ? iconColors[1] : iconColors[0]} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.titleContainer}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.title, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    textDecorationLine: task?.status === 'completed' ? 'line-through' : 'none',
                    opacity: task?.status === 'completed' ? 0.6 : 1,
                  }]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.editHint, {
                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                  }]}>
                    Long press to edit
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  onPress={handleDeleteTask}
                  style={styles.deleteButton}
                  activeOpacity={0.6}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  accessibilityLabel="Delete Task"
                  accessibilityRole="button"
                  accessibilityHint="Double tap to delete this task"
                >
                  <Ionicons 
                    name="trash-outline" 
                    size={24} 
                    color={COLORS.error} 
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Ionicons 
                    name="close-circle" 
                    size={28} 
                    color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Navigation */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                onPress={goToPreviousTask}
                disabled={currentIndex === 0}
                style={[styles.navButton, {
                  opacity: currentIndex === 0 ? 0.5 : 1,
                }]}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={dark ? COLORS.white : COLORS.greyscale900} 
                />
              </TouchableOpacity>
              
              <Text style={[styles.navigationTitle, {
                color: dark ? COLORS.white : COLORS.greyscale900,
              }]}>
                {currentIndex + 1} of {tasks?.length || 0}
              </Text>
              
              <TouchableOpacity
                onPress={goToNextTask}
                disabled={!tasks || currentIndex === tasks.length - 1}
                style={[styles.navButton, {
                  opacity: !tasks || currentIndex === tasks.length - 1 ? 0.5 : 1,
                }]}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={dark ? COLORS.white : COLORS.greyscale900} 
                />
              </TouchableOpacity>
            </View>

            {/* Form Content with Keyboard Avoidance */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <KeyboardAwareScrollView
                ref={scrollViewRef}
                style={styles.content}
                enableOnAndroid
                extraScrollHeight={8}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                  styles.contentContainer,
                  keyboardVisible && {
                    paddingBottom: keyboardHeight + 100, // Add extra padding when keyboard is visible
                  }
                ]}
                showsVerticalScrollIndicator={true}
                keyboardDismissMode="on-drag"
                nestedScrollEnabled={true}
                bounces={true}
                alwaysBounceVertical={true}
              >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={iconColors[0]} />
                  <Text style={[styles.loadingText, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Loading task details...
                  </Text>
                </View>
              ) : (
                <>
                  {/* Task Description */}
                  <View style={styles.inputSection}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="chatbubble-ellipses" size={16} color={iconColors[2]} />
                      <Text style={[styles.label, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}>
                        Description
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editableField}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.taskDescription, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}>
                        {task.description || 'No description provided'}
                      </Text>
                    </TouchableOpacity>
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
                      <View style={styles.dateButtonContent}>
                        <View style={styles.dateInfo}>
                          <Ionicons name="calendar-outline" size={20} color={iconColors[3]} />
                          <Text style={[styles.dateText, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                          }]}>
                            {task.due_date || 'No due date set'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color={iconColors[3]} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Assigned Users */}
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Assigned To</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.assigneeButton, {
                        backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                        borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                      }]}
                      onPress={() => setShowAssigneeSelector(true)}
                    >
                      <View style={styles.assigneeButtonContent}>
                        {/* Avatars in header */}
                        {assignedUsers.length > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                            {assignedUsers.slice(0, 3).map((user, idx) => (
                              <View
                                key={user.id}
                                style={{
                                  marginLeft: idx === 0 ? 0 : -10,
                                  zIndex: 3 - idx,
                                }}
                              >
                                <UserAvatar
                                  userId={user.id}
                                  size={36}
                                  style={{ borderWidth: 2, borderColor: COLORS.white, backgroundColor: COLORS.grayscale200 }}
                                />
                              </View>
                            ))}
                            {assignedUsers.length > 3 && (
                              <View style={styles.moreAvatars}>
                                <Text style={{ fontSize: 12, fontFamily: 'medium', color: dark ? COLORS.white : COLORS.greyscale900 }}>
                                  +{assignedUsers.length - 3}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                        <Text style={[styles.assigneeText, {
                          color: dark ? COLORS.white : COLORS.greyscale900,
                          marginLeft: assignedUsers.length > 0 ? 12 : 0,
                        }]}
                        >
                          {assignedUsers.length > 0 
                            ? `${assignedUsers.length} team member${assignedUsers.length > 1 ? 's' : ''} assigned`
                            : 'Select team members...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={iconColors[4]} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Subtasks */}
                  <View ref={subtasksSectionRef} style={styles.inputSection}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="checkmark-circle" size={16} color={iconColors[1]} />
                      <Text style={[styles.label, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}>
                        Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                      </Text>
                      {subtasks.length > 0 && (
                        <TouchableOpacity
                          onPress={handleCompleteAllSubtasks}
                          style={styles.completeAllButton}
                        >
                          <Text style={[styles.completeAllText, { color: iconColors[1] }]}>
                            Complete All
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.hint, {
                      color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                    }]}>
                      Add multiple tasks, separated by commas.
                    </Text>
                    
                    <View style={styles.subtasksList}>
                      <FlatList
                        data={subtasks}
                        keyExtractor={(item, index) => item.id ? item.id : `subtask-${index}`}
                        renderItem={({ item: subtask, index }) => (
                          <SubtaskCard
                            subtask={subtask}
                            onToggle={handleSubtaskToggle}
                            onUpdate={handleSubtaskUpdate}
                            onDelete={handleSubtaskDelete}
                            onReorder={handleSubtaskReorder}
                            index={index}
                            totalSubtasks={subtasks.length}
                          />
                        )}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                      />
                    </View>

                    {/* Add Subtask */}
                    {showSubtaskInput ? (
                      <View ref={subtaskInputContainerRef} style={styles.addSubtaskContainer}>
                        <TextInput
                          ref={subtaskInputRef}
                          style={[styles.subtaskInput, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                            borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                          }]}
                          placeholder="e.g., Research, Design, Implement, Test"
                          placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                          value={newSubtaskText}
                          onChangeText={setNewSubtaskText}
                          onSubmitEditing={handleAddSubtasks}
                          returnKeyType="done"
                          autoFocus
                          selectTextOnFocus
                          onFocus={handleSubtaskInputFocus}
                        />
                        <View style={styles.subtaskInputActions}>
                          <TouchableOpacity
                            onPress={() => {
                              setShowSubtaskInput(false);
                              setNewSubtaskText('');
                            }}
                            style={styles.cancelSubtaskButton}
                          >
                            <Text style={[styles.cancelSubtaskText, { color: COLORS.error }]}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleAddSubtasks}
                            disabled={!newSubtaskText.trim()}
                            style={[styles.addSubtaskButton, {
                              backgroundColor: newSubtaskText.trim() ? iconColors[1] : COLORS.grayscale400,
                            }]}
                          >
                            <Text style={styles.addSubtaskButtonText}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          setShowSubtaskInput(true);
                          // Focus the input field after a short delay to ensure it's rendered
                          setTimeout(() => {
                            subtaskInputRef.current?.focus();
                          }, 50);
                        }}
                        style={[styles.addSubtaskTrigger, {
                          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                          borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                        }]}
                      >
                        <Ionicons name="add-circle-outline" size={20} color={iconColors[1]} />
                        <Text style={[styles.addSubtaskTriggerText, {
                          color: dark ? COLORS.white : COLORS.greyscale900,
                        }]}>
                          Add Subtask
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Comments Section */}
                  <View style={styles.inputSection}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="chatbubbles" size={18} color={iconColors[5]} />
                      <Text style={[styles.label, {
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }]}>
                        Comments ({comments.length})
                      </Text>
                    </View>
                    
                    {/* Add Comment */}
                    <View style={styles.commentInputContainer}>
                      <UserAvatar
                        size={32}
                        style={styles.commentInputAvatar}
                      />
                      <View style={styles.commentInputSection}>
                        <TextInput
                          ref={commentInputRef}
                          style={[styles.commentInput, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                            borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                          }]}
                          placeholder="Add a comment..."
                          placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                          value={newComment}
                          onChangeText={setNewComment}
                          multiline
                          numberOfLines={2}
                          onKeyPress={(e) => {
                            if (e.nativeEvent.key === 'Enter') {
                              e.preventDefault();
                              handlePostComment();
                            }
                          }}
                          blurOnSubmit={false}
                          onFocus={() => {
                            // KeyboardAwareScrollView will handle scrolling automatically
                            // No need for manual scroll handling
                          }}
                        />
                        <TouchableOpacity
                          onPress={handlePostComment}
                          disabled={!newComment.trim() || isPostingComment}
                          style={[styles.postCommentButton, {
                            backgroundColor: newComment.trim() ? iconColors[5] : COLORS.grayscale400,
                          }]}
                        >
                          {isPostingComment ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <Ionicons name="send" size={16} color={COLORS.white} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Comments List */}
                    {comments.length > 0 && (
                      <View style={styles.commentsList}>
                        {comments.map((comment, idx) => (
                          <View key={comment.id ? comment.id : `comment-${idx}`} style={styles.commentItem}>
                            <UserAvatar
                              size={32}
                              userId={comment.user_id}
                              style={styles.commentAvatar}
                            />
                            <View style={styles.commentContent}>
                              <Text style={[styles.commentAuthor, {
                                color: dark ? COLORS.white : COLORS.greyscale900,
                              }]}>
                                {comment.user?.full_name || 'Fetching name...'}
                              </Text>
                              <Text style={[styles.commentText, {
                                color: dark ? COLORS.white : COLORS.greyscale900,
                              }]}>
                                {comment.content}
                              </Text>
                              <Text style={[styles.commentDate, {
                                color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                              }]}>
                                {new Date(comment.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
                              )}
              </KeyboardAwareScrollView>
            </KeyboardAvoidingView>

            {/* Footer - absolutely positioned */}
            {hasUnsavedChanges && (
              <SafeAreaView style={[styles.absoluteFooter, Platform.OS === 'ios' && { paddingBottom: 24 }]}> 
                <TouchableOpacity
                  style={[styles.updateButton, {
                    backgroundColor: isUpdatingTask ? COLORS.grayscale400 : COLORS.primary,
                  }]}
                  onPress={handleBatchUpdate}
                  disabled={isUpdatingTask}
                >
                  {isUpdatingTask ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Task</Text>
                  )}
                </TouchableOpacity>
              </SafeAreaView>
            )}
          </Animated.View>
        </PanGestureHandler>

        {/* Child Modals - Nested inside main modal */}
        
        {/* Calendar Modal */}
        <CalendarBottomSheetModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          title="Select Due Date"
          iconColor={iconColors[3]}
          selectedDate={task?.due_date || new Date().toISOString().split('T')[0]}
          onSelectDate={(dateString) => {
            if (task) {
              // Fix timezone issue by ensuring the date is properly formatted
              const selectedDate = new Date(dateString + 'T00:00:00.000Z');
              const formattedDate = selectedDate.toISOString().split('T')[0];
              
              handleTaskUpdate('due_date', formattedDate);
            }
            setShowDatePicker(false);
          }}
          minDate={new Date().toISOString().split('T')[0]}
          maxDate="2099-12-31"
          markedDates={{
            [task?.due_date || '']: {
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
            arrowColor: dark ? COLORS.white : COLORS.greyscale900,
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
                  renderItem={({ item }) => {
                    const isSelected = task?.assigned_to?.includes(item.user_id) || false;
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
                  }}
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

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirmation}
          transparent={true}
          animationType="none"
          onRequestClose={hideDeleteConfirmationModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={hideDeleteConfirmationModal}
          >
            <Animated.View
              style={[
                styles.confirmationContainer,
                {
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                },
              ]}
            >
              <View style={styles.confirmationContent}>
                <Ionicons 
                  name="warning" 
                  size={48} 
                  color="#FF6B6B" 
                  style={styles.warningIcon}
                />
                <Text style={[styles.confirmationTitle, { 
                  color: dark ? COLORS.white : COLORS.greyscale900 
                }]}>
                  Delete Task
                </Text>
                <Text style={[styles.confirmationMessage, { 
                  color: dark ? COLORS.grayscale200 : COLORS.grayscale700 
                }]}>
                  Are you sure you want to delete &quot;{task?.title}&quot;? This action cannot be undone.
                </Text>
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity
                    style={[styles.confirmationButton, styles.confirmationCancelButton, {
                      backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    }]}
                    onPress={hideDeleteConfirmationModal}
                    disabled={isDeleting}
                  >
                    <Text style={[styles.confirmationCancelButtonText, { 
                      color: dark ? COLORS.white : COLORS.greyscale900 
                    }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmationButton, styles.confirmationDeleteButton]}
                    onPress={executeTaskDeletion}
                    disabled={isDeleting}
                  >
                    <Text style={styles.confirmationDeleteButtonText}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
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
    elevation: 1001,
    zIndex: 1001,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  editHint: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 2,
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  navButton: {
    padding: 8,
  },
  navigationTitle: {
    fontSize: 14,
    fontFamily: 'medium',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'regular',
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
  editContainer: {
    marginTop: 8,
  },
  saveEditButton: {
    padding: 8,
  },
  cancelEditButton: {
    padding: 8,
  },
  taskTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    lineHeight: 28,
  },
  taskDescription: {
    fontSize: 16,
    fontFamily: 'regular',
    lineHeight: 24,
    flex: 1,
  },
  dueDate: {
    fontSize: 16,
    fontFamily: 'medium',
  },
  editableField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  subtasksList: {
    gap: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subtaskCheckbox: {
    marginRight: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    ...(Platform.OS === 'web' ? {
      zIndex: 10,
      pointerEvents: 'auto',
      cursor: 'pointer',
      backgroundColor: 'rgba(255,255,255,0.01)',
    } : {}),
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
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  commentInputAvatar: {
    marginRight: 12,
  },
  commentInputSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
  },
  postCommentButton: {
    padding: 8,
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: 'bold',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 16,
    fontFamily: 'regular',
    lineHeight: 24,
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  deleteTaskButton: {
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteTaskText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'regular',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
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
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  datePickerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerButton: {
    fontSize: 16,
    fontFamily: 'medium',
  },
  addSubtaskButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  subtaskInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  addSubtaskActionButton: {
    padding: 8,
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubtaskTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSubtaskTriggerText: {
    fontSize: 16,
    fontFamily: 'medium',
    marginLeft: 8,
  },
  subtaskInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cancelSubtaskButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelSubtaskText: {
    fontSize: 16,
    fontFamily: 'medium',
  },
  addSubtaskButtonText: {
    fontSize: 16,
    fontFamily: 'medium',
    color: COLORS.white,
  },
  completeAllButton: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  completeAllText: {
    fontSize: 14,
    fontFamily: 'medium',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelEditText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: 'regular',
  },
  saveEditText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'regular',
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
  assigneesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 4,
    borderRadius: 16,
    gap: 8,
  },
  assigneeName: {
    fontFamily: 'medium',
    fontSize: 14,
  },
  noAssigneesText: {
    fontFamily: 'regular',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeSelectorContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  assigneeSelectorTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    marginBottom: 20,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  assigneeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  assigneeSelectorName: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  assigneeSelectorRole: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.grayscale400,
    textTransform: 'capitalize',
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
  assigneeModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
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
  assigneeText: {
    fontSize: 16,
    fontFamily: 'regular',
    marginLeft: 8,
  },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'bold',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  deleteModalOverlayTouchable: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  deleteModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 200,
    maxHeight: Platform.OS === 'ios' ? '30%' : '60%',
    width: '100%',
    alignSelf: 'center',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmationContainer: {
    width: '100%',
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 0,
  },
  confirmationContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmationContent: {
    padding: 24,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationCancelButton: {
    marginRight: 8,
  },
  confirmationDeleteButton: {
    backgroundColor: '#FF6B6B',
    marginLeft: 8,
  },
  confirmationCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  addSubtaskContainer: {
    marginTop: 8,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  discardButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  updateButton: {
    alignSelf: 'center',
    width: '90%',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  absoluteFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
    zIndex: 1002,
  },
  moreAvatars: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayscale400,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  moreAvatarsText: {
    fontSize: 12,
    fontFamily: 'medium',
  },
});

export default TaskDetailsModal; 