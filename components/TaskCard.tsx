import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Project, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import TaskDetailsModal from './TaskDetailsModal';

type TaskCardProps = {
  task: Task & { project: Project | null };
  isCompleted?: boolean;
  onToggle?: (id: string, completed: boolean) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onRefresh?: () => void;
  index: number;
  totalTasks: number;
  onPress?: () => void;
  hideDescription?: boolean;
  style?: any;
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

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isCompleted = false, 
  onToggle, 
  onReorder,
  onRefresh,
  index,
  totalTasks,
  onPress,
  hideDescription = false,
  style
}) => {
  const [completed, setCompleted] = useState(isCompleted);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const { dark } = useTheme();

  // Animation values for drag and drop
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  console.log('TaskCard received task:', task);

  const handleToggle = () => {
    const newStatus = !completed;
    setCompleted(newStatus);
    if (onToggle) onToggle(task.id, newStatus);
  };

  const handlePress = () => {
    if (onPress) {
      // Use parent's onPress handler if provided
      onPress();
    } else {
      // Use own modal if no onPress provided
      setShowTaskDetails(true);
    }
  };

  const handleLongPress = () => {
    // Enable drag mode
    scale.value = withSpring(1.05);
    opacity.value = withSpring(0.8);
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      // Update task in database
      const updatedTask = await ProjectService.updateTask(taskId, updates);
      
      if (updatedTask) {
        // Update local state
        setCompleted(updatedTask.status === 'completed');
        if (onToggle) onToggle(taskId, updatedTask.status === 'completed');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await ProjectService.deleteTask(taskId);
              
              if (success) {
                // Task will be removed from the list by parent component
                console.log('Task deleted successfully');
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

  // Gesture handler for drag and drop
  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === 1) { // BEGIN
      runOnJS(handleLongPress)();
    } else if (state === 2) { // ACTIVE
      translateY.value = translationY;
    } else if (state === 5) { // END
      // Calculate if we should reorder
      const itemHeight = 92; // Height of task card
      const threshold = itemHeight / 2;
      
      if (Math.abs(translationY) > threshold) {
        const direction = translationY > 0 ? 1 : -1;
        const newIndex = Math.max(0, Math.min(totalTasks - 1, index + direction));
        
        if (newIndex !== index && onReorder) {
          runOnJS(onReorder)(index, newIndex);
        }
      }
      
      // Reset animation values
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  // Get priority color
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent':
        return COLORS.error;
      case 'high':
        return COLORS.warning;
      case 'medium':
        return COLORS.info;
      case 'low':
        return COLORS.success;
      default:
        return COLORS.gray;
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return COLORS.success;
      case 'in_progress':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.error;
      case 'todo':
      default:
        return COLORS.gray;
    }
  };

  return (
    <>
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <TouchableOpacity 
            onPress={handlePress}
            onLongPress={handleLongPress}
            style={[styles.card, 
              { 
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              },
              style
            ]}
          >
            {/* Priority indicator */}
            <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor() }]} />
            
            <View style={styles.content}>
              <View style={styles.textContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.title, { 
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    textDecorationLine: completed ? 'line-through' : 'none',
                  }]}
                  >
                    {task.title || '[NO TITLE]'}
                  </Text>
                  {!task.title && <Text style={{color: 'red', fontSize: 18, fontFamily: 'bold'}}> (Missing title!)</Text>}
                </View>
                
                {/* Only render description if not hidden */}
                {!hideDescription && (
                  task.description ? (
                    <Text style={[styles.description, { 
                      color: dark ? COLORS.gray : COLORS.greyScale800,
                      textDecorationLine: completed ? 'line-through' : 'none',
                    }]} numberOfLines={2}>
                      {task.description}
                    </Text>
                  ) : (
                    <Text style={[styles.description, { color: 'red' }]}>[NO DESCRIPTION]</Text>
                  )
                )}
                
                {task.project && (
                  <View style={styles.projectTagContainer}>
                    <View style={[styles.projectTag, { 
                      backgroundColor: dark ? COLORS.primary + '20' : COLORS.primary + '10',
                      borderColor: dark ? COLORS.primary + '40' : COLORS.primary + '30',
                    }]}>
                      <Text style={[styles.projectTagText, { 
                        color: dark ? COLORS.primary : COLORS.primary,
                      }]}>
                        {task.project.name}
                      </Text>
                    </View>
                  </View>
                )}
                
                <Text style={[styles.dateTime, { 
                  color: dark ? COLORS.white : COLORS.greyScale800,
                }]}>
                  {task.due_date ? (
                    new Date(task.due_date).toDateString() === new Date().toDateString() 
                      ? `Today - ${new Date(task.due_date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}`
                      : new Date(task.due_date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                  ) : 'No due date'}
                </Text>
              </View>
              
              <View style={styles.rightSection}>
                {/* Status indicator */}
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
                
                {/* Checkbox */}
                <TouchableOpacity onPress={handleToggle} style={[styles.checkbox, completed && styles.checked]}>
                  {completed && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      {/* Task Details Modal */}
      <TaskDetailsModal
        visible={showTaskDetails}
        onClose={() => setShowTaskDetails(false)}
        project={task.project}
        tasks={[task]}
        currentTaskIndex={0}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.base + 4,
    marginHorizontal: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    width: SIZES.width - 32,
    height: 120,
    marginVertical: 4,
    alignSelf: 'center',
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.greyScale800,
    fontFamily: "regular",
    marginBottom: 2,
  },
  projectTagContainer: {
    marginBottom: 2,
  },
  projectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 4,
  },
  projectTagText: {
    fontSize: 14,
    fontFamily: 'medium',
    color: COLORS.primary,
  },
  dateTime: {
    fontSize: 14,
    color: COLORS.greyScale800,
    fontFamily: "regular",
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2.8,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default TaskCard;