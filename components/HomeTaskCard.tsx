import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Project, Task } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type HomeTaskCardProps = {
  task: Task & { project: Project | null };
  onEdit?: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  onRefresh?: () => void;
  onPress?: () => void;
};

const HomeTaskCard: React.FC<HomeTaskCardProps> = ({ task, onEdit, onDelete, onRefresh, onPress }) => {
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
                    if (text && text.trim() && onEdit) {
                      onEdit(task.id, { title: text.trim() });
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
                { text: 'To Do', onPress: () => onEdit && onEdit(task.id, { status: 'todo' }) },
                { text: 'In Progress', onPress: () => onEdit && onEdit(task.id, { status: 'in_progress' }) },
                { text: 'Completed', onPress: () => onEdit && onEdit(task.id, { status: 'completed' }) }
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
                { text: 'Low', onPress: () => onEdit && onEdit(task.id, { priority: 'low' }) },
                { text: 'Medium', onPress: () => onEdit && onEdit(task.id, { priority: 'medium' }) },
                { text: 'High', onPress: () => onEdit && onEdit(task.id, { priority: 'high' }) }
              ]
            );
          }
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Task',
              'Are you sure you want to delete this task?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Delete', 
                  style: 'destructive',
                  onPress: () => {
                    if (onDelete) {
                      onDelete(task.id);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleStatusToggle = () => {
    if (onEdit) {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      onEdit(task.id, { status: newStatus });
    }
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
            
            {/* Project Tag */}
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
            
            <View style={styles.todayTaskMeta}>
              <Text style={[styles.todayTaskTime, {
                color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
              }]}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { 
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
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                  marginLeft: 4
                }]}>
                  {task.metadata?.comments || 0}
                </Text>
              </View>
              
              {/* File icon - Bottom Right */}
              <View style={styles.todayTaskIconGroup}>
                <Ionicons name="attach-outline" size={16} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                <Text style={[styles.todayTaskIconText, { 
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                  marginLeft: 4
                }]}>
                  {task.metadata?.attachments || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Content - Checkbox, Menu, and Reassign Button */}
          <View style={styles.todayTaskRight}>
            <TouchableOpacity onPress={handleMorePress} style={[styles.todayTaskMenuButton, { marginBottom: 8 }]}>
              <Ionicons name="ellipsis-horizontal" size={18} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.todayTaskCheckbox,
                {
                  backgroundColor: task.status === 'completed' ? COLORS.primary : 'transparent',
                  borderColor:
                    task.status === 'completed'
                      ? COLORS.primary
                      : dark
                      ? COLORS.grayscale400
                      : COLORS.grayscale700,
                },
              ]}
              onPress={handleStatusToggle}
            >
              {task.status === 'completed' && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  // Today's Task Card Styles (matching project details design)
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
  projectTagContainer: {
    marginBottom: 4,
  },
  projectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  projectTagText: {
    fontSize: 12,
    fontFamily: 'medium',
    color: COLORS.primary,
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
  todayTaskBottomIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  todayTaskIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayTaskIconText: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  todayTaskRight: {
    alignItems: 'center',
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
});

export default HomeTaskCard; 