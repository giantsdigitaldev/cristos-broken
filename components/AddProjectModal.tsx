import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectCoverGeneration } from '@/hooks/useProjectCoverGeneration';
import { useTheme } from '@/theme/ThemeProvider';
import { Category, CategoryService } from '@/utils/categoryService';
import { ProjectService } from '@/utils/projectServiceWrapper';
import { SearchUser, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
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

import { PanGestureHandler } from 'react-native-gesture-handler';
import AIProjectChat from './AIProjectChat';
import CalendarBottomSheetModal from './CalendarBottomSheetModal';
import EnhancedTeamMembersModal from './EnhancedTeamMembersModal';
import { TEAM_ROLES } from './RoleSelector';
import Toast from './Toast';
import UserAvatar from './UserAvatar';

const { height: screenHeight } = Dimensions.get('window');

const TABS = [
  { key: 'ai', label: 'AI Assistant', icon: 'chatbubbles' },
  { key: 'manual', label: 'Manual', icon: 'create' },
];

interface AddProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
}

// Add this above the AddProjectModal component
const HEADER_HEIGHT = 36; // keep compact but not tiny
const HEADER_FONT_SIZE = 15;
const HEADER_ICON_SIZE = 18;

const AddProjectModal: React.FC<AddProjectModalProps> = ({ 
  visible, 
  onClose, 
  onProjectCreated 
}) => {
  const { dark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  // Modal animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalAnimation = useRef(new Animated.Value(0)).current;

  // Pull-to-dismiss gesture handling
  const translateY = useRef(new Animated.Value(0)).current;
  const gestureState = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);
  const [isGestureDismissing, setIsGestureDismissing] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('manual');
  const [EdcCalendarModalVisible, setEdcCalendarModalVisible] = useState(false);
  const [FudCalendarModalVisible, setFudCalendarModalVisible] = useState(false);
  const [TeamSearchModalVisible, setTeamSearchModalVisible] = useState(false);

  // CI Color palette for diverse icons
  const iconColors = [
    COLORS.primary,      // Blue
    COLORS.success,      // Green
    COLORS.warning,      // Orange
    COLORS.info,         // Cyan
    COLORS.secondary,    // Purple
    COLORS.tertiary,     // Pink
  ];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'web development',
    priority: 'medium' as 'low' | 'medium' | 'high',
    edc_date: '',
    fud_date: '',
    status: 'active' as 'active' | 'completed' | 'archived' | 'on_hold',
    budget: '',
    // Team & Resources
    project_owner: '',
    project_lead: '',
    team_members: [] as string[],
    tools_needed: '',
    dependencies: '',
    selected_categories: [] as string[],
  });
  const [formLoading, setFormLoading] = useState(false);

  // Dropdown state
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  // Categories state
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // New category modal state
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    color: COLORS.primary
  });
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState<SearchUser[]>([]);
  
  // Role management state
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [tempMemberRoles, setTempMemberRoles] = useState<Record<string, string>>({});

  // Calendar states
  const [selectedEdcDate, setSelectedEdcDate] = useState('');
  const [selectedFudDate, setSelectedFudDate] = useState('');

  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'error' as 'success' | 'error' | 'warning' | 'info'
  });

  // Dropdown options
  const priorities = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];
  const statuses = [
    { label: 'Active', value: 'active' },
    { label: 'On Hold', value: 'on_hold' },
    { label: 'Completed', value: 'completed' },
    { label: 'Archived', value: 'archived' }
  ];

  // Date picker refs

  // Add state for showing the new modal
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false);

  // Keyboard state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  // Text input refs for keyboard navigation
  const projectNameRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const budgetRef = useRef<TextInput>(null);
  const toolsNeededRef = useRef<TextInput>(null);
  const dependenciesRef = useRef<TextInput>(null);
  const newCategoryNameRef = useRef<TextInput>(null);
  const newCategoryDescriptionRef = useRef<TextInput>(null);

  // Current focused input tracking
  const [currentFocusedInput, setCurrentFocusedInput] = useState<string | null>(null);

  // Enhanced keyboard event listeners for iOS
  useEffect(() => {
    const handleKeyboardFrame = (event: any) => {
      const height = event.endCoordinates.height;
      setKeyboardHeight(height);
      setKeyboardVisible(height > 0);
      Animated.timing(keyboardAnim, {
        toValue: height,
        duration: event.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    };

    let keyboardWillShowListener: any, keyboardWillHideListener: any, keyboardWillChangeFrameListener: any;
    if (Platform.OS === 'ios') {
      keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', handleKeyboardFrame);
      keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', handleKeyboardFrame);
      keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', handleKeyboardFrame);
    } else {
      keyboardWillShowListener = Keyboard.addListener('keyboardDidShow', handleKeyboardFrame);
      keyboardWillHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardFrame);
    }
    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
      keyboardWillChangeFrameListener?.remove && keyboardWillChangeFrameListener.remove();
    };
  }, []);

  // Keyboard navigation function
  const handleNextInput = () => {
    if (!currentFocusedInput) return;

    const inputOrder = [
      'projectName',
      'description', 
      'budget',
      'toolsNeeded',
      'dependencies'
    ];

    const currentIndex = inputOrder.indexOf(currentFocusedInput);
    const nextIndex = currentIndex + 1;

    if (nextIndex < inputOrder.length) {
      const nextInput = inputOrder[nextIndex];
      switch (nextInput) {
        case 'projectName':
          projectNameRef.current?.focus();
          break;
        case 'description':
          descriptionRef.current?.focus();
          break;
        case 'budget':
          budgetRef.current?.focus();
          break;
        case 'toolsNeeded':
          toolsNeededRef.current?.focus();
          break;
        case 'dependencies':
          dependenciesRef.current?.focus();
          break;
      }
    } else {
      // If we're at the last input, dismiss keyboard
      Keyboard.dismiss();
    }
  };

  // Check if there's a next input available
  const hasNextInput = () => {
    if (!currentFocusedInput) return false;
    
    const inputOrder = [
      'projectName',
      'description', 
      'budget',
      'toolsNeeded',
      'dependencies'
    ];

    const currentIndex = inputOrder.indexOf(currentFocusedInput);
    return currentIndex < inputOrder.length - 1;
  };

  // Keyboard navigation header component - DISABLED
  const KeyboardNavigationHeader = () => {
    return null; // Completely disabled keyboard header
  };

  // Project cover image generation
  const {
    isGenerating,
    generationStatus,
    generatedImageUrl,
    error: generationError,
    generateCoverImage,
    resetGeneration
  } = useProjectCoverGeneration();

  // Load data when component mounts
  useEffect(() => {
    if (visible && user?.id) {
      loadUserCategories();
      loadTeamMembers();
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      setSelectedEdcDate(today);
      setSelectedFudDate(today);
      
      // Set project creator as default owner and lead
      if (user?.id) {
        setFormData(prev => ({
          ...prev,
          project_owner: user.id,
          project_lead: user.id
        }));
      }
    }
  }, [visible, user?.id]);

  // Trigger image generation when required fields are complete
  useEffect(() => {
    if (formData.name && formData.description && formData.category && !isGenerating && generationStatus === 'idle') {
      // Reset generation state when fields change
      resetGeneration();
    }
  }, [formData.name, formData.description, formData.category, isGenerating, generationStatus, resetGeneration]);

  // Load user categories
  const loadUserCategories = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingCategories(true);
      const categories = await CategoryService.getUserCategories(user.id);
      
      if (categories.length === 0) {
        // Use default categories if user has none
        const defaultCategories = CategoryService.getDefaultCategories();
        setUserCategories(defaultCategories as Category[]);
      } else {
        setUserCategories(categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to default categories
      const defaultCategories = CategoryService.getDefaultCategories();
      setUserCategories(defaultCategories as Category[]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load team members
  const loadTeamMembers = async () => {
    // Do not add current user as default team member
    setTeamMembers([]); // Start with no team members
  };

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error') => {
    setToast({ visible: true, message, type });
  };

  // Hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Input change handler
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Date selection handler
  const handleDateSelect = (type: 'edc' | 'fud', dateString: string) => {
    if (type === 'edc') {
      setSelectedEdcDate(dateString);
      setFormData(prev => ({ ...prev, edc_date: dateString }));
      setEdcCalendarModalVisible(false);
    } else {
      setSelectedFudDate(dateString);
      setFormData(prev => ({ ...prev, fud_date: dateString }));
              setFudCalendarModalVisible(false);
    }
  };

  // Team member handlers
  const handleUserToggle = (user: SearchUser) => {
    setTempSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        // Remove user and their role
        setTempMemberRoles(prevRoles => {
          const newRoles = { ...prevRoles };
          delete newRoles[user.id];
          return newRoles;
        });
        return prev.filter(u => u.id !== user.id);
      } else {
        // Add user with default role
        setTempMemberRoles(prevRoles => ({
          ...prevRoles,
          [user.id]: 'fyi' // Default role for new members
        }));
        return [...prev, user];
      }
    });
  };

  const handleConfirmUserSelection = () => {
    setSelectedTeamMembers(prev => [...prev, ...tempSelectedUsers]);
    setFormData(prev => ({
      ...prev,
      team_members: [...prev.team_members, ...tempSelectedUsers.map(u => u.id)]
    }));
    // Save roles for selected members
    setMemberRoles(prev => ({
      ...prev,
      ...tempMemberRoles
    }));
    setTempSelectedUsers([]);
    setTempMemberRoles({});
            setTeamSearchModalVisible(false);
  };

  const removeTeamMember = (userId: string) => {
    setSelectedTeamMembers(prev => prev.filter(member => member.id !== userId));
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter(id => id !== userId)
    }));
    // Remove role for this member
    setMemberRoles(prev => {
      const newRoles = { ...prev };
      delete newRoles[userId];
      return newRoles;
    });
  };

  // Role management
  const handleRoleChange = (userId: string, role: string) => {
    setTempMemberRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  const handleExistingRoleChange = (userId: string, role: string) => {
    setMemberRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  // Search handler
  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    
    if (text.length > 2) {
      setSearchLoading(true);
      try {
        const results = await TeamService.searchUsers(text);
        setSearchResults(results.users || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      showToast('Project name is required', 'error');
      return false;
    }
    if (!formData.description.trim()) {
      showToast('Project description is required', 'error');
      return false;
    }
    if (!formData.project_owner) {
      showToast('Project owner is required', 'error');
      return false;
    }
    if (!formData.project_lead) {
      showToast('Project lead is required', 'error');
      return false;
    }
    return true;
  };

  // Helper function to add delay between API calls
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Form submit handler
  const handleFormSubmit = async () => {
    if (!user?.id) {
      showToast('You must be logged in to create a project', 'error');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setFormLoading(true);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        user_id: user.id,
        status: 'active' as const,
        priority: formData.priority,
        due_date: formData.fud_date || undefined,
        // Store additional fields in metadata
        metadata: {
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          edc_date: formData.edc_date || undefined,
          fud_date: formData.fud_date || undefined,
          project_owner: formData.project_owner || undefined,
          project_lead: formData.project_lead || undefined,
          tools_needed: formData.tools_needed || undefined,
          dependencies: formData.dependencies || undefined,
          selected_categories: formData.selected_categories || [],
          category: formData.category || undefined, // Store category in metadata
        }
      };

      const newProject = await ProjectService.createProject(projectData);
      
      // Generate project cover image in the background
      if (formData.name && formData.description && formData.category) {
        try {
          console.log('🎨 [AddProjectModal] Starting background image generation for project:', newProject.id);
          console.log('📋 [AddProjectModal] Project details:', {
            name: formData.name.trim(),
            description: formData.description.trim(),
            category: formData.category,
            projectId: newProject.id
          });
          
          // Start image generation in background (don't await)
          generateCoverImage(
            formData.name.trim(),
            formData.description.trim(),
            formData.category,
            newProject.id
          ).catch(error => {
            console.error('❌ [AddProjectModal] Background image generation failed:', error);
            // Don't show error to user as this is background process
          });
          
        } catch (error) {
          console.error('❌ [AddProjectModal] Error starting image generation:', error);
          // Don't fail the project creation for image generation errors
        }
      } else {
        console.log('⚠️ [AddProjectModal] Skipping image generation - missing required fields:', {
          hasName: !!formData.name,
          hasDescription: !!formData.description,
          hasCategory: !!formData.category
        });
      }
      
      // Automatically add project creator as a team member with 'creator' role
      if (user?.id) {
        try {
          const creatorInvitation = await TeamService.inviteTeamMember({
            projectId: newProject.id,
            userId: user.id,
            role: 'lead' as any,
            message: `You are the creator of "${newProject.name}"`
          });
          
          if (!creatorInvitation.success) {
            console.warn('Failed to add project creator as team member:', creatorInvitation.error);
          }
        } catch (error) {
          console.error('Error adding project creator as team member:', error);
        }
      }
      
      // Send team invitations after project is created with rate limiting
      if (selectedTeamMembers.length > 0) {
        let invitationCount = 0;
        let errorCount = 0;
        
        for (const member of selectedTeamMembers) {
          const assignedRole = memberRoles[member.id] || 'fyi';
          try {
            // Step 1: Check for existing membership
            const existingMembers = await TeamService.getProjectTeamMembers(newProject.id);
            const isAlreadyMember = existingMembers.some((m) => m.user_id === member.id && (m.status === 'active' || m.status === 'pending'));
            if (isAlreadyMember) {
              showToast(`${member.full_name || member.username} is already a member or has a pending membership.`, 'warning');
              continue;
            }
            // Step 2: Check for existing pending invitation
            const invitations = await TeamService.getProjectInvitations(newProject.id);
            const hasPendingInvite = invitations.some((inv) => (inv.invitee_id === member.id || inv.invitee_email === member.email) && inv.status === 'pending');
            if (hasPendingInvite) {
              showToast(`${member.full_name || member.username} has already been invited.`, 'warning');
              continue;
            }
            // Step 3: Create invitation
            const result = await TeamService.inviteTeamMember({
              projectId: newProject.id,
              userId: member.id,
              role: assignedRole as any,
              message: `You've been invited to join "${newProject.name}" as ${assignedRole}`
            });
            
            if (result.success) {
              invitationCount++;
            } else {
              errorCount++;
              // Show user-friendly error for duplicate invitation
              if (result.error && result.error.includes('already a team member')) {
                showToast(`${member.full_name || member.username} is already a team member.`, 'warning');
              } else if (result.error && result.error.includes('already been invited')) {
                showToast(`${member.full_name || member.username} has already been invited.`, 'warning');
              } else {
                showToast(`Failed to invite ${member.full_name || member.username}: ${result.error || 'Unknown error'}`, 'error');
              }
              console.error(`Failed to invite ${member.full_name || member.username}:`, result.error);
            }
            // Add delay between invitations to prevent rate limiting
            if (selectedTeamMembers.length > 1) {
              await delay(500);
            }
          } catch (error) {
            errorCount++;
            showToast(`Error inviting ${member.full_name || member.username}: ${error}`, 'error');
            console.error(`Error inviting ${member.full_name || member.username}:`, error);
            // Add delay even on error to prevent rate limiting
            if (selectedTeamMembers.length > 1) {
              await delay(500);
            }
          }
        }
        // Show invitation results
        if (invitationCount > 0) {
          showToast(`${invitationCount} team member(s) invited successfully!`, 'success');
        }
        if (errorCount > 0) {
          showToast(`${errorCount} invitation(s) failed. Check console for details.`, 'warning');
        }
      }
      
      // Call the callback immediately for real-time updates
      onProjectCreated?.();
      
      showToast('Project created successfully!', 'success');
      
      // Navigate to project details page
      router.push(`/projectdetails?projectId=${newProject.id}`);
      
      closeModal();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'web development',
        priority: 'medium',
        edc_date: '',
        fud_date: '',
        status: 'active',
        budget: '',
        project_owner: '',
        project_lead: '',
        team_members: [],
        tools_needed: '',
        dependencies: '',
        selected_categories: [],
      });
      setSelectedTeamMembers([]);
      setMemberRoles({});
      
    } catch (error) {
      console.error('Error creating project:', error);
      showToast('Failed to create project. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Modal open/close animation
  const openModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
        delay: 50,
      }),
    ]).start();
  };

  const closeModal = () => {
    // Update state immediately for responsive button behavior
    onClose();
    setActiveTab('manual');
    
    // Only animate if not gesture dismissing
    if (!isGestureDismissing) {
      // Animate the modal out of view
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
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
    setActiveTab('manual');
    
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
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
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


  useEffect(() => {
    if (visible && !isGestureDismissing) {
      openModal();
    }
  }, [visible, isGestureDismissing]);

  // Create new category
  const handleCreateNewCategory = async () => {
    if (!user?.id || !newCategoryData.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    setCreatingCategory(true);

    try {
      const newCategory = await CategoryService.createCategory({
        user_id: user.id,
        name: newCategoryData.name.trim(),
        description: newCategoryData.description.trim() || undefined,
        color: newCategoryData.color
      });

      if (newCategory) {
        // Add the new category to the list
        setUserCategories(prev => [...prev, newCategory]);
        
        // Set the new category as selected
        handleInputChange('category', newCategory.name);
        
        // Close modal and reset form
        setShowNewCategoryModal(false);
        setNewCategoryData({ name: '', description: '', color: COLORS.primary });
        
        showToast('Category created successfully!', 'success');
      } else {
        showToast('Failed to create category', 'error');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Failed to create category. Please try again.', 'error');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Enhanced dropdown field renderer for team members with avatars and roles
  const renderTeamMemberDropdownField = (
    label: string,
    value: string,
    teamMembers: SearchUser[],
    memberRoles: Record<string, string>,
    onSelect: (value: string) => void,
    showDropdown: boolean,
    setShowDropdown: (show: boolean) => void,
    required: boolean = false
  ) => {
    const selectedMember = teamMembers.find(member => member.id === value);
    const selectedRole = selectedMember ? memberRoles[selectedMember.id] || 'fyi' : '';
    const roleInfo = TEAM_ROLES.find(role => role.key === selectedRole);
    
    return (
      <View style={styles.inputSection}>
        <View style={styles.labelContainer}>
          <Ionicons name="list" size={16} color={iconColors[2]} />
          <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{label}{required ? ' *' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          {selectedMember ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <UserAvatar
                size={32}
                userId={selectedMember.id}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, fontSize: 16, fontWeight: '500' }}>
                  {selectedMember.full_name || selectedMember.email || selectedMember.username}
                </Text>
                {roleInfo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
                      <Ionicons name={roleInfo.icon as any} size={10} color={COLORS.white} />
                      <Text style={styles.roleBadgeText}>{roleInfo.name}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={{ color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }}>
              Select {label.toLowerCase()}
            </Text>
          )}
          <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
        </TouchableOpacity>
        {showDropdown && (
          <View style={[styles.enhancedDropdownContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
            {teamMembers.map((member) => {
              const memberRole = memberRoles[member.id] || 'fyi';
              const roleInfo = TEAM_ROLES.find(role => role.key === memberRole);
              const isSelected = value === member.id;
              
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.enhancedDropdownItem, { backgroundColor: isSelected ? COLORS.primary + '20' : 'transparent' }]}
                  onPress={() => {
                    onSelect(member.id);
                    setShowDropdown(false);
                  }}
                >
                  <UserAvatar
                    size={40}
                    userId={member.id}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.enhancedDropdownName, { color: isSelected ? COLORS.primary : (dark ? COLORS.white : COLORS.greyscale900) }]}>
                      {member.full_name || member.email || member.username}
                    </Text>
                    {member.email && member.email !== member.full_name && (
                      <Text style={[styles.enhancedDropdownEmail, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                        {member.email}
                      </Text>
                    )}
                    {roleInfo && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
                          <Ionicons name={roleInfo.icon as any} size={10} color={COLORS.white} />
                          <Text style={styles.roleBadgeText}>{roleInfo.name}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Original dropdown field renderer for regular options
  const renderDropdownField = (
    label: string,
    value: string,
    options: { label: string; value: string }[] | string[],
    onSelect: (value: string) => void,
    showDropdown: boolean,
    setShowDropdown: (show: boolean) => void,
    required: boolean = false,
    allowCreateNew: boolean = false
  ) => {
    // Defensive: support both string[] and object[]
    const displayOptions = Array.isArray(options) && typeof options[0] === 'string'
      ? (options as string[]).map(opt => ({ label: opt, value: opt }))
      : (options as { label: string; value: string }[]);
    const selectedOption = displayOptions.find(opt => opt.value === value);
    
    return (
      <View style={styles.inputSection}>
        <View style={styles.labelContainer}>
          <Ionicons name="list" size={16} color={iconColors[2]} />
          <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{label}{required ? ' *' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={{ color: selectedOption ? (dark ? COLORS.white : COLORS.greyscale900) : (dark ? COLORS.grayscale400 : COLORS.grayscale700) }}>
            {selectedOption ? selectedOption.label : `Select ${label.toLowerCase()}`}
          </Text>
          <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
        </TouchableOpacity>
        {showDropdown && (
          <View style={{ backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }}>
            {displayOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value || index}
                style={{ padding: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: value === option.value ? COLORS.primary + '20' : 'transparent' }}
                onPress={() => {
                  onSelect(option.value);
                  setShowDropdown(false);
                }}
              >
                <Text style={{ color: value === option.value ? COLORS.primary : (dark ? COLORS.white : COLORS.greyscale900), flex: 1 }}>{option.label}</Text>
                {value === option.value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
            
            {/* Create New Category Option */}
            {allowCreateNew && (
              <TouchableOpacity
                style={{ padding: 12, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }}
                onPress={() => {
                  setShowDropdown(false);
                  setShowNewCategoryModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.primary, flex: 1 }}>Create New Category</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDatePickerField = (
    label: string,
    value: string,
    onPress: () => void,
    required: boolean = false
  ) => (
    <View style={styles.inputSection}>
      <View style={styles.labelContainer}>
        <Ionicons name="calendar" size={16} color={iconColors[3]} />
        <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{label}{required ? ' *' : ''}</Text>
      </View>
      <TouchableOpacity
        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
        onPress={onPress}
      >
        <Text style={{ color: value ? (dark ? COLORS.white : COLORS.greyscale900) : (dark ? COLORS.grayscale400 : COLORS.grayscale700) }}>
          {value ? value : `Select ${label.toLowerCase()}`}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={iconColors[3]} />
      </TouchableOpacity>
    </View>
  );

  // Place this inside the AddProjectModal component, after all hooks and before renderTeamMembersSection
  const TeamMemberAvatar = ({ member }: { member: any }) => {
    return (
      <TouchableOpacity
        style={styles.avatarHoverContainer}
        activeOpacity={0.9}
        onPress={() => setShowTeamMembersModal(true)}
      >
        <UserAvatar
          size={48}
          userId={member.id}
          style={styles.avatarOnly}
        />
      </TouchableOpacity>
    );
  };

  // Update renderTeamMembersSection to use TeamMemberAvatar
  const renderTeamMembersSection = () => {
    // DESIGN/ERROR RESEARCH COMPLETED:
    /*
    ✅ Checked for FlatList/SectionList inside ScrollView: Only ScrollView is used for form, no nested VirtualizedList.
    ✅ Checked allMembers array for duplicate keys: member.id is used, but duplicate IDs can occur if selectedTeamMembers contains the current user.
    ✅ Checked AddTeamMembersModal: FlatList uses item.id as key, which is unique per user.
    ✅ Checked TeamService.inviteTeamMember: Handles duplicate invitations and returns user-friendly error if already a member.
    ✅ DECISION: Filter allMembers to ensure unique IDs for key prop. Add user-friendly error for duplicate invitation in handleFormSubmit.
    */

    // Create project creator user object
    const projectCreator: SearchUser = {
      id: user?.id || '',
      username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'you',
      full_name: `${user?.user_metadata?.first_name || 'You'} ${user?.user_metadata?.last_name || ''}`.trim(),
      email: user?.email || '',
      avatar_url: user?.user_metadata?.avatar_url || '',
      status: 'online' as const,
      last_seen: new Date().toISOString(),
      verified: false
    };

    // Combine project creator with selected team members, ensuring no duplicates
    const allMembersMap = new Map<string, SearchUser>();
    allMembersMap.set(projectCreator.id, projectCreator);
    selectedTeamMembers.forEach(member => {
      if (!allMembersMap.has(member.id)) {
        allMembersMap.set(member.id, member);
      }
    });
    const allMembers = Array.from(allMembersMap.values());

    return (
      <View style={styles.inputSection}>
        <View style={styles.labelContainer}>
          <Ionicons name="people" size={16} color={iconColors[5]} />
          <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Team Members</Text>
        </View>
        {allMembers.length > 0 && (
          <View style={{ flexDirection: 'row', marginBottom: 12, marginTop: 4, minHeight: 48 }}>
            {allMembers.map((member, idx) => (
              <View
                key={member.id}
                style={{
                  marginLeft: idx === 0 ? 0 : -16, // overlap
                  zIndex: allMembers.length - idx,
                }}
              >
                <UserAvatar
                  size={48}
                  userId={member.id}
                  style={{ 
                    borderWidth: 3, 
                    borderColor: COLORS.white, 
                    backgroundColor: COLORS.grayscale200,
                    // Add special styling for project creator
                    ...(member.id === user?.id && {
                      borderColor: COLORS.primary,
                      borderWidth: 4
                    })
                  }}
                />
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.addTeamMemberButton, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
          onPress={() => setShowTeamMembersModal(true)}
        >
          <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
          <Text style={[styles.addTeamMemberText, { color: COLORS.primary }]}>Add Team Members</Text>
        </TouchableOpacity>
        {allMembers.length > 0 && (
          <Text style={[styles.teamMemberCount, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}> 
            {allMembers.length} member{allMembers.length > 1 ? 's' : ''} (You + {selectedTeamMembers.length} team member{selectedTeamMembers.length !== 1 ? 's' : ''})
          </Text>
        )}
      </View>
    );
  };

  // Team search modal renderer
  const renderTeamSearchModal = () => (
    null 
  );

  // Helper to get current user as default team member
  const getDefaultCurrentMembers = () => {
    if (!user) return [];
    return [{
      user: {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.first_name || user.email || 'You',
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'you',
        avatar_url: user.user_metadata?.avatar_url || '',
        status: 'online' as const,
        email: user.email || '',
        last_seen: new Date().toISOString(),
        verified: false
      },
              role: 'lead',
      status: 'active',
    }];
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <Animated.View style={[
        styles.overlay, 
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
      </Animated.View>
      
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
              // Add bottom padding when keyboard is visible for AI tab
              paddingBottom: activeTab === 'ai' && keyboardVisible ? keyboardHeight : 0,
              // Add subtle background color change during gesture
              opacity: translateY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0.95],
                extrapolate: 'clamp',
              }),
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
                  Add New Project
                </Text>
                <Text style={[styles.subtitle, {
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                }]}>
                  Create a new project for your workspace
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

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key as 'ai' | 'manual')}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={18} 
                  color={activeTab === tab.key ? COLORS.primary : COLORS.grayscale400} 
                />
                <Text style={[styles.tabLabel, { 
                  color: activeTab === tab.key ? COLORS.primary : COLORS.grayscale400 
                }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <View style={{ 
            flex: 1, 
            padding: 16,
            paddingBottom: activeTab === 'ai' && keyboardVisible ? 0 : 16, // Remove bottom padding for AI tab when keyboard is visible
          }}>
            {activeTab === 'ai' ? (
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
              >
                <AIProjectChat user={user} onClose={onClose} />
              </KeyboardAvoidingView>
            ) : (
                              <ScrollView 
                  style={{ flex: 1, padding: 16 }} 
                  contentContainerStyle={{
                    paddingBottom: keyboardVisible ? keyboardHeight + 120 : 120
                  }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                >
                {/* Project Name */}
                <View style={styles.inputSection}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="document-text" size={16} color={iconColors[1]} />
                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Project Name *</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                    placeholder="Enter project name..."
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={formData.name}
                    onChangeText={text => handleInputChange('name', text)}
                    ref={projectNameRef}
                    onFocus={() => setCurrentFocusedInput('projectName')}
                    onBlur={() => setCurrentFocusedInput(null)}
                  />
                </View>

                {/* Project Description */}
                <View style={styles.inputSection}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="chatbubble-ellipses" size={16} color={iconColors[2]} />
                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Description *</Text>
                  </View>
                  <TextInput
                    style={[styles.textArea, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                    placeholder="Describe your project..."
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={formData.description}
                    onChangeText={text => handleInputChange('description', text)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    ref={descriptionRef}
                    onFocus={() => setCurrentFocusedInput('description')}
                    onBlur={() => setCurrentFocusedInput(null)}
                  />
                </View>

                {/* Category Dropdown */}
                {renderDropdownField(
                  'Category',
                  formData.category,
                  userCategories.map(category => ({ label: category.name, value: category.name })),
                  (value) => handleInputChange('category', value),
                  showCategoryDropdown,
                  setShowCategoryDropdown,
                  true,
                  true // Allow creating new categories
                )}

                {/* Image Generation Status */}
                {formData.name && formData.description && formData.category && (
                  <View style={styles.inputSection}>
                    <View style={styles.labelContainer}>
                      <Ionicons 
                        name={isGenerating ? "sync" : generationStatus === 'completed' ? "checkmark-circle" : "image"} 
                        size={16} 
                        color={isGenerating ? COLORS.warning : generationStatus === 'completed' ? COLORS.success : COLORS.info} 
                      />
                      <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        Cover Image {isGenerating ? '(Generating...)' : generationStatus === 'completed' ? '(Generated)' : '(Will be generated)'}
                      </Text>
                    </View>
                    {isGenerating && (
                      <View style={[styles.generationStatus, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}>
                        <ActivityIndicator size="small" color={COLORS.warning} />
                        <Text style={[styles.generationText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                          Creating AI-generated cover image...
                        </Text>
                      </View>
                    )}
                    {generationStatus === 'completed' && generatedImageUrl && (
                      <View style={[styles.generationStatus, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={[styles.generationText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                          Cover image generated successfully
                        </Text>
                      </View>
                    )}
                    {generationError && (
                      <View style={[styles.generationStatus, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                        <Text style={[styles.generationText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                          Image generation failed
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Priority Dropdown */}
                {renderDropdownField(
                  'Priority',
                  formData.priority,
                  priorities as { label: string; value: string }[],
                  (value) => handleInputChange('priority', value as 'low' | 'medium' | 'high'),
                  showPriorityDropdown,
                  setShowPriorityDropdown,
                  true
                )}

                {/* Status Dropdown */}
                {renderDropdownField(
                  'Status',
                  formData.status,
                  statuses as { label: string; value: string }[],
                  (value) => handleInputChange('status', value as 'active' | 'completed' | 'archived' | 'on_hold'),
                  showStatusDropdown,
                  setShowStatusDropdown,
                  true
                )}

                {/* EDC Date Picker */}
                {renderDatePickerField(
                  'Estimated Completion Date',
                  formData.edc_date,
                  () => setEdcCalendarModalVisible(true),
                  true
                )}

                {/* FUD Date Picker */}
                {renderDatePickerField(
                  'Follow Up Date',
                  formData.fud_date,
                  () => setFudCalendarModalVisible(true),
                  false
                )}

                {/* Budget */}
                <View style={styles.inputSection}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="cash" size={16} color={iconColors[4]} />
                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Budget</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                    placeholder="Enter budget amount..."
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={formData.budget}
                    onChangeText={text => handleInputChange('budget', text)}
                    keyboardType="numeric"
                    ref={budgetRef}
                    onFocus={() => setCurrentFocusedInput('budget')}
                    onBlur={() => setCurrentFocusedInput(null)}
                  />
                </View>

                {/* Team & Resources Section */}
                <View style={styles.sectionDivider}>
                  <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>TEAM & RESOURCES</Text>
                </View>

                {/* Team Members Section */}
                {renderTeamMembersSection()}

                {/* Project Owner Dropdown */}
                {renderTeamMemberDropdownField(
                  'Project Owner',
                  formData.project_owner,
                  [
                    // Include current user (project creator) as first option
                    {
                      id: user?.id || '',
                      username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'you',
                      full_name: `${user?.user_metadata?.first_name || 'You'} ${user?.user_metadata?.last_name || ''}`.trim(),
                      email: user?.email || '',
                      avatar_url: user?.user_metadata?.avatar_url || '',
                      status: 'online' as const,
                      last_seen: new Date().toISOString(),
                      verified: false
                    },
                    // Include selected team members
                    ...selectedTeamMembers
                  ],
                  {
                    // Set current user role as 'lead'
                    [user?.id || '']: 'lead',
                    // Include existing member roles
                    ...memberRoles
                  },
                  (value) => handleInputChange('project_owner', value),
                  showOwnerDropdown,
                  setShowOwnerDropdown,
                  true
                )}

                {/* Project Lead Dropdown */}
                {renderTeamMemberDropdownField(
                  'Project Lead',
                  formData.project_lead,
                  [
                    // Include current user (project creator) as first option
                    {
                      id: user?.id || '',
                      username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'you',
                      full_name: `${user?.user_metadata?.first_name || 'You'} ${user?.user_metadata?.last_name || ''}`.trim(),
                      email: user?.email || '',
                      avatar_url: user?.user_metadata?.avatar_url || '',
                      status: 'online' as const,
                      last_seen: new Date().toISOString(),
                      verified: false
                    },
                    // Include selected team members
                    ...selectedTeamMembers
                  ],
                  {
                    // Set current user role as 'lead'
                    [user?.id || '']: 'lead',
                    // Include existing member roles
                    ...memberRoles
                  },
                  (value) => handleInputChange('project_lead', value),
                  showLeadDropdown,
                  setShowLeadDropdown,
                  true
                )}

                {/* Tools Needed */}
                <View style={styles.inputSection}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="construct" size={16} color={iconColors[1]} />
                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Tools Needed</Text>
                  </View>
                  <TextInput
                    style={[styles.textArea, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                    placeholder="List tools and technologies needed..."
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={formData.tools_needed}
                    onChangeText={text => handleInputChange('tools_needed', text)}
                    multiline
                    numberOfLines={3}
                    ref={toolsNeededRef}
                    onFocus={() => setCurrentFocusedInput('toolsNeeded')}
                    onBlur={() => setCurrentFocusedInput(null)}
                  />
                </View>

                {/* Dependencies */}
                <View style={styles.inputSection}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="link" size={16} color={iconColors[4]} />
                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Dependencies</Text>
                  </View>
                  <TextInput
                    style={[styles.textArea, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                    placeholder="List project dependencies..."
                    placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                    value={formData.dependencies}
                    onChangeText={text => handleInputChange('dependencies', text)}
                    multiline
                    numberOfLines={3}
                    ref={dependenciesRef}
                    onFocus={() => setCurrentFocusedInput('dependencies')}
                    onBlur={() => setCurrentFocusedInput(null)}
                  />
                </View>
              </ScrollView>
            )}
          </View>

          {/* Footer: Create Project Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.createTaskButton,
                { backgroundColor: formLoading ? COLORS.grayscale400 : COLORS.primary }
              ]}
              onPress={handleFormSubmit}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.createTaskButtonText}>Create Project</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>

      {/* Calendar Bottom Sheets */}
      <CalendarBottomSheetModal
        visible={EdcCalendarModalVisible}
        onClose={() => setEdcCalendarModalVisible(false)}
        title="Estimated Completion Date"
        iconColor={iconColors[3]}
        selectedDate={selectedEdcDate}
        onSelectDate={(dateString) => {
          setSelectedEdcDate(dateString);
          setFormData(prev => ({ ...prev, edc_date: dateString }));
          setEdcCalendarModalVisible(false);
        }}
        minDate={new Date().toISOString().split('T')[0]}
        maxDate="2099-12-31"
        markedDates={{
          [selectedEdcDate]: {
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
      <CalendarBottomSheetModal
        visible={FudCalendarModalVisible}
        onClose={() => setFudCalendarModalVisible(false)}
        title="Follow Up Date"
        iconColor={iconColors[3]}
        selectedDate={selectedFudDate}
        onSelectDate={(dateString) => {
          setSelectedFudDate(dateString);
          setFormData(prev => ({ ...prev, fud_date: dateString }));
          setFudCalendarModalVisible(false);
        }}
        minDate={new Date().toISOString().split('T')[0]}
        maxDate="2099-12-31"
        markedDates={{
          [selectedFudDate]: {
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

      {/* Team Search Modal */}
      {renderTeamSearchModal()}

      {/* New Category Modal */}
      <Modal
        visible={showNewCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            onPress={() => setShowNewCategoryModal(false)}
            activeOpacity={1}
          />
          <View style={[styles.newCategoryModal, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Create New Category
              </Text>
              <TouchableOpacity onPress={() => setShowNewCategoryModal(false)}>
                <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.greyscale900} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Category Name */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="pricetag" size={16} color={COLORS.primary} />
                  <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Category Name *</Text>
                </View>
                <TextInput
                  style={[styles.input, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                  placeholder="Enter category name..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  value={newCategoryData.name}
                  onChangeText={text => setNewCategoryData(prev => ({ ...prev, name: text }))}
                  ref={newCategoryNameRef}
                  onFocus={() => setCurrentFocusedInput('newCategoryName')}
                  onBlur={() => setCurrentFocusedInput(null)}
                />
              </View>

              {/* Category Description */}
              <View style={styles.inputSection}>
                <View style={styles.labelContainer}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={iconColors[2]} />
                  <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Description</Text>
                </View>
                <TextInput
                  style={[styles.textArea, { color: dark ? COLORS.white : COLORS.greyscale900, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}
                  placeholder="Describe this category..."
                  placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                  value={newCategoryData.description}
                  onChangeText={text => setNewCategoryData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  ref={newCategoryDescriptionRef}
                  onFocus={() => setCurrentFocusedInput('newCategoryDescription')}
                  onBlur={() => setCurrentFocusedInput(null)}
                />
              </View>
            </View>

            <View style={[styles.modalFooter, { alignItems: 'center', paddingHorizontal: 16 }]}> 
              <TouchableOpacity
                style={[styles.cancelButton, {
                  backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  flex: 1,
                  minWidth: 0,
                  marginRight: 12,
                }]}
                onPress={() => setShowNewCategoryModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: creatingCategory ? COLORS.grayscale400 : COLORS.primary, flex: 1, minWidth: 0 }]}
                onPress={handleCreateNewCategory}
                disabled={creatingCategory || !newCategoryData.name.trim()}
              >
                {creatingCategory ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Create Category</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Add Team Members Modal */}
      <EnhancedTeamMembersModal
        visible={showTeamMembersModal}
        onClose={() => setShowTeamMembersModal(false)}
        onAdd={async (members: { user: SearchUser; role: string }[]) => {
          // Store selected members in local state for display - APPEND to existing members
          setSelectedTeamMembers(prev => [...prev, ...members.map((m: { user: SearchUser; role: string }) => m.user)]);
          
          // Update form data with team member IDs
          setFormData(prev => ({
            ...prev,
            team_members: [...prev.team_members, ...members.map((m: { user: SearchUser; role: string }) => m.user.id)]
          }));
          
          // Store roles for selected members
          const newRoles: Record<string, string> = {};
          members.forEach((member: { user: SearchUser; role: string }) => {
            newRoles[member.user.id] = member.role;
          });
          setMemberRoles(prev => ({
            ...prev,
            ...newRoles
          }));
          
          setShowTeamMembersModal(false);
        }}
        selectedMembers={selectedTeamMembers}
        existingMembers={selectedTeamMembers.map((m: SearchUser) => m.id)}
        currentMembers={getDefaultCurrentMembers()}
        pendingInvitations={[]}
        isNewProject={true}
        memberRoles={memberRoles}
      />

      {/* Keyboard Navigation Header */}
      <KeyboardNavigationHeader />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
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
  tabSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
    marginBottom: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: 'semiBold',
    marginLeft: 6,
  },
  inputSection: {
    marginBottom: 16,
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
    height: 52,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
  },
  textArea: {
    minHeight: 52,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
    textAlignVertical: 'top',
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  selectedMembersContainer: {
    marginBottom: 16,
  },
  avatarHoverContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 56,
  },
  avatarOnly: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.grayscale200,
  },

  addTeamMemberButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
    alignItems: 'center',
  },
  addTeamMemberText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginLeft: 8,
  },
  teamMemberCount: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.grayscale400,
  },
  calendarContainer: {
    padding: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
  },
  userSearchItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userSearchItem: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  searchUserInfo: {
    flex: 1,
  },
  searchUserName: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  searchUserHandle: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  alreadySelectedText: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.grayscale400,
  },
  selectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  selectionCount: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  confirmButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  teamSearchContainer: {
    padding: 16,
  },
  teamSearchTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 16,
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  newCategoryModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.grayscale400,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  roleSelectionContainer: {
    marginTop: 16,
  },
  roleSelectionTitle: {
    fontSize: 16,
    fontFamily: 'bold',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    gap: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  enhancedDropdownContainer: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 8,
    marginTop: 4,
  },
  enhancedDropdownItem: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  enhancedDropdownName: {
    fontSize: 16,
    fontFamily: 'semiBold',
    flex: 1,
  },
  enhancedDropdownEmail: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  createTaskButton: {
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
  },
  createTaskButtonText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  generationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  generationText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  keyboardHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
  },
  keyboardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  keyboardHeaderText: {
    fontFamily: 'semiBold',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '10',
    minWidth: 40,
    justifyContent: 'center',
    height: HEADER_HEIGHT - 8,
  },
  nextButtonText: {
    fontFamily: 'semiBold',
    color: COLORS.primary,
    marginRight: 4,
  },
  keyboardHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyboardCloseButton: {
    padding: 0,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
    height: HEADER_HEIGHT - 8,
  },
});

export default AddProjectModal; 