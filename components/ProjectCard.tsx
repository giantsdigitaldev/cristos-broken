import { COLORS, icons, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectService } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Animated, Image, ImageSourcePropType, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Toast from './Toast';
import UserAvatar from './UserAvatar';

type CustomStyles = {
    card?: ViewStyle;
};

type ProjectCardProps = {
    id: string;
    name: string;
    description: string;
    image: string | { uri: string } | any; // Allow both string and object sources
    status: string;
    numberOfTask: number;
    numberOfTaskCompleted: number;
    numberOfDaysLeft: number;
    logo: string;
    members: string[];
    endDate: string;
    customStyles?: CustomStyles;
    onPress?: () => void;
    onEdit?: (field: string, value: any) => void;
    onDelete?: () => void;
    onRefresh?: () => void; // Add refresh callback
    // New props for enhanced functionality
    budget?: number;
    projectMetadata?: any;
    teamMembers?: any[];
    projectLead?: string;
};

const colors = {
    advanced: COLORS.primary,
    intermediate: "#ff566e",
    medium: "#fbd027",
    weak: "#26c2a3",
    completed: COLORS.greeen
}

// TrafficLight component that switches colors based on project status
const TrafficLight: React.FC<{ 
    status: string; 
    onPress: () => void; 
    style?: any; 
}> = ({ status, onPress, style }) => {
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
            <Svg width="40" height="20" viewBox="0 0 100 40">
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
};

// CircularProgress component for small progress display
const CircularProgress: React.FC<{
  size: number;
  strokeWidth: number;
  progress: number;
  completed: number;
  total: number;
  color: string;
}> = ({ size, strokeWidth, progress, completed, total, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Convert progress percentage to decimal for stroke calculation (same as project details)
  const progressDecimal = progress / 100;
  const strokeDashoffset = circumference - (progressDecimal * circumference);

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
      {/* Center text showing completed/total (same as project details) */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 8, fontWeight: 'bold', color: color }}>
          {String(completed)}/{String(total)}
        </Text>
      </View>
    </View>
  );
};

function getDisplayName(user: any) {
  if (user.full_name) {
    return user.full_name;
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.username || user.email || 'Fetching name...';
}

const ProjectCard: React.FC<ProjectCardProps> = ({
    id,
    name,
    description,
    image,
    status,
    numberOfTask,
    numberOfTaskCompleted,
    numberOfDaysLeft,
    logo,
    members,
    endDate,
    customStyles = {},
    onPress,
    onEdit,
    onDelete,
    onRefresh,
    budget,
    projectMetadata,
    teamMembers,
    projectLead
}) => {
    const { dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    
    // Safe progress calculation with proper validation
    const safeNumberOfTask = numberOfTask || 0;
    const safeNumberOfTaskCompleted = numberOfTaskCompleted || 0;
    const progressPercentage = safeNumberOfTask > 0 
        ? Math.round((safeNumberOfTaskCompleted / safeNumberOfTask) * 100)
        : 0;
    
    // Dropdown state
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownAnimation] = useState(new Animated.Value(0));
    
    // Confirmation modal state
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [confirmationAnimation] = useState(new Animated.Value(0));
    
    // Card vanishing animation state
    const [isDeleting, setIsDeleting] = useState(false);
    const [cardAnimation] = useState(new Animated.Value(1));
    
    // Toast state
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

    // Edit modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editField, setEditField] = useState<string>('');
    const [editValue, setEditValue] = useState<string>('');
    const [editModalAnimation] = useState(new Animated.Value(0));

    // Dropdown menu options matching projectdetails page
    const dropdownOptions = [
        {
            id: 'add-task',
            title: 'Add New Task',
            icon: icons.addFile,
            onPress: () => {
                setShowDropdown(false);
                navigation.navigate("addnewtaskform", { projectId: id });
            }
        },
        {
            id: 'add-user',
            title: 'Add New User',
            icon: icons.user,
            onPress: () => {
                setShowDropdown(false);
                navigation.navigate("projectdetailsaddteammenber", { projectId: id });
            }
        },
        {
            id: 'delete-project',
            title: 'Delete Project',
            icon: icons.trash,
            onPress: () => {
                setShowDropdown(false);
                showDeleteConfirmationModal();
            }
        }
    ];

     // Dropdown animation functions
     const showDropdownMenu = () => {
        setShowDropdown(true);
        Animated.timing(dropdownAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const hideDropdownMenu = () => {
        Animated.timing(dropdownAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowDropdown(false);
        });
    };

    // Confirmation modal functions
    const showDeleteConfirmationModal = () => {
        setShowDeleteConfirmation(true);
        Animated.timing(confirmationAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const hideDeleteConfirmationModal = () => {
        Animated.timing(confirmationAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowDeleteConfirmation(false);
        });
    };

    // Card vanishing animation with smooth easing
    const startVanishingAnimation = () => {
        setIsDeleting(true);
        Animated.timing(cardAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false, // Need false for height animation
        }).start();
    };

    // Handle project deletion with database support and vanishing animation
    const handleDeleteProject = async () => {
        try {
            hideDeleteConfirmationModal();
            
            console.log('🗑️ Starting project deletion process for:', id, name);
            
            // Start vanishing animation immediately for smooth UX
            startVanishingAnimation();
            
            // Show loading toast
            setToastMessage('Deleting project...');
            setToastType('info');
            setToastVisible(true);

            console.log('💾 Calling ProjectService.deleteProject for:', id);
            const result = await ProjectService.deleteProject(id);
            console.log('🔄 ProjectService.deleteProject result:', result);
            
            if (result === true) {
              console.log('✅ Project deletion successful, updating UI');
              setToastMessage('Project deleted successfully!');
              setToastType('success');
              setToastVisible(true);
              
              // Additional cache clearing for UI components
              try {
                const { cacheService } = await import('@/utils/cacheService');
                const { OptimizedProjectService } = await import('@/utils/optimizedProjectService');
                
                // Clear any remaining UI caches
                await cacheService.invalidate(`project_details:${id}`);
                await cacheService.invalidate(`project_full:${id}`);
                await OptimizedProjectService.clearProjectCache(id);
                
                console.log('🗑️ UI caches cleared after project deletion');
              } catch (cacheError) {
                console.warn('⚠️ Error clearing UI caches:', cacheError);
              }
              
              // Wait for animation to complete before calling callbacks
              setTimeout(() => {
                console.log('🔄 Calling deletion callbacks');
                // Call the onDelete callback if provided
                if (onDelete) {
                  onDelete();
                }
                
                // Call refresh callback to update the parent list
                if (onRefresh) {
                  onRefresh();
                }
              }, 550); // Slightly longer than animation duration
                
            } else if (result === 'not_owner') {
                // User is not the owner, show specific toast
                setIsDeleting(false);
                cardAnimation.setValue(1);
                setToastMessage('Only the project owner can delete this project.');
                setToastType('error');
                setToastVisible(true);
            } else {
                console.error('❌ Project deletion failed, resetting animation');
                // Reset animation on failure
                setIsDeleting(false);
                cardAnimation.setValue(1);
                setToastMessage('Failed to delete project. Please try again.');
                setToastType('error');
                setToastVisible(true);
            }
        } catch (error) {
            console.error('❌ Error in handleDeleteProject:', error);
            
            // Reset animation on error
            setIsDeleting(false);
            cardAnimation.setValue(1);
            
            setToastMessage('An error occurred while deleting the project.');
            setToastType('error');
            setToastVisible(true);
        }
    };

    const handleMorePress = () => {
        showDropdownMenu();
    };

    // Edit modal functions
    const showEditModalForField = (field: string, currentValue: any) => {
        setEditField(field);
        setEditValue(currentValue?.toString() || '');
        setShowEditModal(true);
        Animated.timing(editModalAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const hideEditModal = () => {
        Animated.timing(editModalAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowEditModal(false);
            setEditField('');
            setEditValue('');
        });
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim()) {
            hideEditModal();
            return;
        }

        try {
            let processedValue: any = editValue.trim();
            
            // Process value based on field type
            if (editField === 'budget') {
                processedValue = parseFloat(editValue) || 0;
            }

            console.log(`🔄 Updating project ${id} field ${editField} to:`, processedValue);
            
            const success = await ProjectService.updateProject(id, {
                [editField]: processedValue
            });

            if (success) {
                setToastMessage(`${editField.charAt(0).toUpperCase() + editField.slice(1)} updated successfully!`);
                setToastType('success');
                setToastVisible(true);
                
                // Call onRefresh to update the parent list
                if (onRefresh) {
                    onRefresh();
                }
            } else {
                setToastMessage(`Failed to update ${editField}`);
                setToastType('error');
                setToastVisible(true);
            }
        } catch (error) {
            console.error(`Error updating ${editField}:`, error);
            setToastMessage(`Error updating ${editField}`);
            setToastType('error');
            setToastVisible(true);
        }

        hideEditModal();
    };

    const handleStatusEdit = () => {
        Alert.alert(
            'Change Status',
            'Select project status:',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Active', onPress: () => handleQuickStatusUpdate('active') },
                { text: 'On Hold', onPress: () => handleQuickStatusUpdate('on_hold') },
                { text: 'Completed', onPress: () => handleQuickStatusUpdate('completed') },
                { text: 'Archived', onPress: () => handleQuickStatusUpdate('archived') }
            ]
        );
    };

    const handleQuickStatusUpdate = async (newStatus: string) => {
        try {
            console.log(`🔄 Updating project ${id} status to:`, newStatus);
            
            const success = await ProjectService.updateProject(id, { 
                status: newStatus as "completed" | "active" | "on_hold" | "archived" | "deleted" 
            });

            if (success) {
                setToastMessage(`Status updated to ${newStatus.replace('_', ' ')}!`);
                setToastType('success');
                setToastVisible(true);
                
                if (onRefresh) {
                    onRefresh();
                }
            } else {
                setToastMessage('Failed to update status');
                setToastType('error');
                setToastVisible(true);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setToastMessage('Error updating status');
            setToastType('error');
            setToastVisible(true);
        }
    };

    return (
        <>
            <Animated.View
                style={[
                    {
                        opacity: cardAnimation,
                        transform: [
                            {
                                scale: cardAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1],
                                }),
                            },
                            {
                                translateY: cardAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0],
                                }),
                            },
                        ],
                        height: cardAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 280], // Approximate card height
                        }),
                        marginVertical: cardAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 8],
                        }),
                    },
                ]}
            >
                <TouchableOpacity 
                    onPress={onPress} 
                    disabled={isDeleting}
                    style={[styles.card, customStyles.card, { 
                        backgroundColor: dark ? COLORS.dark2 : "white",
                        shadowColor: dark ? 'rgba(231, 230, 230, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: dark ? 0.8 : 0.8,
                        shadowRadius: 1,
                        elevation: 1,
                        borderColor: dark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                    }]}>
                <Image 
                  source={typeof image === 'string' && image.startsWith('http') ? { uri: image } : image} 
                  style={styles.banner} 
                />
                {/* Header Overlay with Absolute Positioned Elements */}
                <View style={styles.headerOverlay}>
                    {/* Traffic Light - Bottom Left (matching project details) */}
                    <TrafficLight 
                        status={status}
                        style={styles.cardStatusTrafficLight}
                        onPress={handleStatusEdit}
                    />

                    {/* Budget Display - Next to Traffic Light (matching project details) */}
                    <View style={styles.cardBudgetContainer}>
                        <View style={styles.cardHeaderBudgetContent}>
                            <Image source={icons.wallet} style={{ width: 16, height: 16, tintColor: COLORS.white }} />
                            <Text style={styles.cardBudgetText}>
                                ${String(budget ? Number(budget).toLocaleString() : '0')}
                            </Text>
                        </View>
                    </View>

                    {/* Three-dot menu in top right corner */}
                    <TouchableOpacity 
                        style={styles.headerMenuIcon}
                        onPress={handleMorePress}
                    >
                        <Image
                            source={icons.moreCircle}
                            resizeMode='contain'
                            style={[styles.headerMoreIcon, { 
                                tintColor: COLORS.white,
                            }]}
                        />
                    </TouchableOpacity>

                    {/* Team Members - Bottom Right (matching project details) */}
                    <View style={styles.cardHeaderTeamMembers}>
                        {teamMembers && teamMembers.length > 0 ? (
                            <>
                                {teamMembers.slice(0, 3).map((member, index) => {
                                    const isProjectLead = member.user_name === projectLead;
                                    const rightPosition = (teamMembers.slice(0, 3).length - index) * 24;
                                    
                                    return (
                                        <View
                                            key={member.id || index}
                                            style={[styles.cardHeaderMemberAvatar, { 
                                                right: rightPosition, 
                                                zIndex: teamMembers.slice(0, 3).length - index
                                            }]}
                                        >
                                            <View style={styles.cardAvatarContainer}>
                                                <UserAvatar
                                                    size={28}
                                                    userId={member.user_id}
                                                />
                                            </View>
                                            {/* Star icon for project lead */}
                                            {isProjectLead && (
                                                <View style={styles.cardProjectLeadStar}>
                                                    <Ionicons name="star" size={10} color={COLORS.warning} />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                                {teamMembers.length > 3 && (
                                    <View style={[styles.cardHeaderMoreMembers, { 
                                        right: 4 * 24 // Position after the 3 visible avatars
                                    }]}>
                                        <Text style={styles.cardHeaderMoreText}>+{String(teamMembers.length - 3)}</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            // Fallback to original members display
                            <>
                                {members.slice(0, 3).map((member, index) => {
                                    const rightPosition = (members.slice(0, 3).length - index) * 24;
                                    return (
                                        <View
                                            key={index}
                                            style={[styles.cardHeaderMemberAvatar, { 
                                                right: rightPosition, 
                                                zIndex: members.slice(0, 3).length - index
                                            }]}
                                        >
                                            <Image
                                                source={member as ImageSourcePropType}
                                                style={styles.fallbackMemberImage}
                                            />
                                        </View>
                                    );
                                })}
                                {members.length > 3 && (
                                    <View style={[styles.cardHeaderMoreMembers, { 
                                        right: 4 * 24
                                    }]}>
                                        <Text style={styles.cardHeaderMoreText}>+{String(members.length - 3)}</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>

                {/* Days Left indicator positioned under header image */}
                <View style={styles.daysLeftContainer}>
                    <Text style={[styles.daysLeftText, { 
                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                    }]}>{String(numberOfDaysLeft)} Days Left</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.nameContainer}>
                        {/* Project Title with Circular Progress directly after title */}
                        <View style={styles.titleWithProgress}>
                            <Text style={[styles.name, { color: dark ? COLORS.white : COLORS.greyscale900, marginRight: 12 }]} numberOfLines={2}>
                                {name}
                            </Text>
                            <CircularProgress
                                size={32}
                                strokeWidth={3}
                                progress={progressPercentage}
                                completed={safeNumberOfTaskCompleted}
                                total={safeNumberOfTask}
                                color={COLORS.primary}
                            />
                        </View>
                        
                        {/* Project Description with 2-line truncation */}
                        <Text 
                            style={[styles.description, { 
                                color: dark ? COLORS.grayscale400 : COLORS.grayscale700 
                            }]} 
                            numberOfLines={2} // Changed from 3 to 2 lines
                            ellipsizeMode="tail" // Add ... at the end
                        >
                            {description}
                        </Text>
                    </View>
                    
                    {/* Category Tags - Only show if categories exist */}
                    {(() => {
                        const categories = projectMetadata?.categories 
                            ? (typeof projectMetadata.categories === 'string' 
                                ? projectMetadata.categories.split(',').map((cat: string) => cat.trim()).filter((cat: string) => cat.length > 0)
                                : projectMetadata.categories)
                            : [];
                        
                        // Only render category container if there are actual categories
                        if (categories.length === 0) {
                            return null; // Don't show anything if no categories
                        }
                        
                        const visibleCategories = categories.slice(0, 3);
                        const hasMoreCategories = categories.length > 3;
                        
                        return (
                            <View style={styles.categoryContainer}>
                                {visibleCategories.map((category: string, index: number) => (
                                    <View key={index} style={styles.categoryPill}>
                                        <Text style={[styles.categoryText, { 
                                            color: dark ? COLORS.white : COLORS.greyscale900 
                                        }]}>{category}</Text>
                                    </View>
                                ))}
                                {hasMoreCategories && (
                                    <View style={[styles.categoryPill, styles.moreCategoriesPill]}>
                                        <Text style={[styles.categoryText, { color: COLORS.white }]}>+{String(categories.length - 3)}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })()}
                </View>
            </TouchableOpacity>
            </Animated.View>

            {/* Dropdown Modal */}
            <Modal
                visible={showDropdown}
                transparent={true}
                animationType="none"
                onRequestClose={hideDropdownMenu}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
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
                                        { 
                                            tintColor: option.id === 'delete-project' 
                                                ? '#FF6B6B' 
                                                : (dark ? COLORS.white : COLORS.greyscale900) 
                                        },
                                    ]}
                                />
                                <Text
                                    style={[
                                        styles.dropdownText,
                                        { 
                                            color: option.id === 'delete-project' 
                                                ? '#FF6B6B' 
                                                : (dark ? COLORS.white : COLORS.greyscale900) 
                                        },
                                    ]}
                                >
                                    {option.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                </TouchableOpacity>
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
                                opacity: confirmationAnimation,
                                transform: [
                                    {
                                        scale: confirmationAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
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
                                Delete Project
                            </Text>
                            <Text style={[styles.confirmationMessage, { 
                                color: dark ? COLORS.grayscale200 : COLORS.grayscale700 
                            }]}>
                                Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone and will remove all associated data.
                            </Text>
                            <View style={styles.confirmationButtons}>
                                <TouchableOpacity
                                    style={[styles.confirmationButton, styles.cancelButton, {
                                        backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                                    }]}
                                    onPress={hideDeleteConfirmationModal}
                                >
                                    <Text style={[styles.cancelButtonText, { 
                                        color: dark ? COLORS.white : COLORS.greyscale900 
                                    }]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmationButton, styles.deleteButton]}
                                    onPress={handleDeleteProject}
                                >
                                    <Text style={styles.deleteButtonText}>
                                        Delete
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Field Modal */}
            <Modal
                visible={showEditModal}
                transparent={true}
                animationType="none"
                onRequestClose={hideEditModal}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={hideEditModal}
                >
                    <Animated.View
                        style={[
                            styles.confirmationContainer,
                            {
                                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                                opacity: editModalAnimation,
                                transform: [
                                    {
                                        scale: editModalAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.confirmationContent}>
                            <Text style={[styles.confirmationTitle, { 
                                color: dark ? COLORS.white : COLORS.greyscale900 
                            }]}>
                                Edit {editField.charAt(0).toUpperCase() + editField.slice(1)}
                            </Text>
                            <TextInput
                                style={[styles.editInput, {
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                                    color: dark ? COLORS.white : COLORS.greyscale900,
                                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                                }]}
                                value={editValue}
                                onChangeText={setEditValue}
                                placeholder={`Enter ${editField}`}
                                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                                keyboardType={editField === 'budget' ? 'numeric' : 'default'}
                                autoFocus
                            />
                            <View style={styles.confirmationButtons}>
                                <TouchableOpacity
                                    style={[styles.confirmationButton, styles.cancelButton, {
                                        backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                                    }]}
                                    onPress={hideEditModal}
                                >
                                    <Text style={[styles.cancelButtonText, { 
                                        color: dark ? COLORS.white : COLORS.greyscale900 
                                    }]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmationButton, {
                                        backgroundColor: COLORS.primary,
                                        marginLeft: 8,
                                    }]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={styles.deleteButtonText}>
                                        Save
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Toast Notification */}
            <Toast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: SIZES.radius,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        // Optimized for horizontal slider - consistent sizing
        width: SIZES.width - 20, // Fixed width: screen width minus margins
        height: 285, // Fixed height for all cards regardless of content
        marginVertical: 2,
        marginLeft: 2,
        alignSelf: 'center', // Center the card horizontally
    },
    banner: {
        width: '100%',
        height: 120,
    },
    content: {
        padding: 12,
        paddingBottom: 0,
        flex: 1,
        justifyContent: 'flex-start',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 8,
    },
    cardStatusTrafficLight: {
        position: 'absolute',
        bottom: 10,
        left: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBudgetContainer: {
        position: 'absolute',
        bottom: 7,
        left: 80,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    cardHeaderBudgetContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardBudgetText: {
        color: COLORS.white,
        fontSize: 12,
        fontFamily: 'semiBold',
    },
    cardHeaderTeamMembers: {
        position: 'absolute',
        bottom: 30,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderMemberAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.white,
        position: 'absolute',
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardAvatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
    },
    cardProjectLeadStar: {
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
    nameContainer: {
        marginTop: 6,
        marginBottom: 8,
    },
    titleWithProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        // Position pie chart directly after title text (not spread apart)
        justifyContent: 'flex-start', // Align to start instead of space-between
    },
    name: {
        fontSize: 18,
        fontFamily: 'bold',
        lineHeight: 22,
        // Remove flex: 1 to allow natural text width, pie chart follows directly
        flexShrink: 1, // Allow text to shrink if needed but don't force full width
    },
    description: {
        fontSize: 14,
        fontFamily: 'regular',
        marginBottom: 6,
        marginTop: 2,
        lineHeight: 18,
    },

    // Dropdown styles matching projectdetails page
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownContainer: {
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
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    dropdownIcon: {
        width: 24,
        height: 24,
        marginRight: 16,
    },
    dropdownText: {
        fontSize: 16,
        fontWeight: '500',
    },
    // Confirmation modal styles
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
    cancelButton: {
        marginRight: 8,
    },
    deleteButton: {
        backgroundColor: '#FF6B6B',
        marginLeft: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },

    editInput: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        borderRadius: 8,
        marginBottom: 16,
    },
    cardHeaderMoreMembers: {
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
    cardHeaderMoreText: {
        color: COLORS.white,
        fontSize: 10,
        fontFamily: 'bold',
    },
    fallbackMemberImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    daysLeftContainer: {
        position: 'absolute',
        top: 130, // Just below the 120px banner
        right: 10,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    daysLeftText: {
        fontSize: 12,
        color: COLORS.grayscale700,
        fontFamily: 'regular',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    categoryPill: {
        backgroundColor: COLORS.grayscale200,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.grayscale700,
    },
    moreCategoriesPill: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    noCategoriesPill: {
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        borderColor: COLORS.grayscale700,
    },
    headerMenuIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerMoreIcon: {
        height: 24,
        width: 24,
    },
});

export default ProjectCard;
export { CircularProgress };
