import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { PendingTaskAssignment, Project, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface PendingTaskAssignmentsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PendingAssignmentWithDetails extends PendingTaskAssignment {
  task?: Task | null;
  project?: Project | null;
  assignedByUser?: {
    id: string;
    name: string;
  };
}

function getDisplayName(user: any) {
  if (user.full_name) {
    return user.full_name;
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.username || user.email || 'Fetching name...';
}

const PendingTaskAssignmentsModal: React.FC<PendingTaskAssignmentsModalProps> = ({
  visible,
  onClose
}) => {
  const { colors, dark } = useTheme();
  const { user } = useAuth();
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      loadPendingAssignments();
    }
  }, [visible, user?.id]);

  const loadPendingAssignments = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const assignments = await ProjectService.getPendingTaskAssignments(user.id);
      
      // Get additional details for each assignment
      const assignmentsWithDetails: PendingAssignmentWithDetails[] = [];
      
      for (const assignment of assignments) {
        try {
          // Get task details
          const taskDetails = await ProjectService.getTaskDetails(assignment.task_id);
          const task = taskDetails?.task;
          
          // Get project details
          const project = await ProjectService.getProject(assignment.project_id);
          
          // Get assigned by user details
          const { data: assignedByProfile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', assignment.assigned_by)
            .single();
          
          assignmentsWithDetails.push({
            ...assignment,
            task,
            project,
            assignedByUser: {
              id: assignment.assigned_by,
              name: getDisplayName(assignedByProfile)
            }
          });
        } catch (error) {
          console.error('Error loading assignment details:', error);
          // Still include the assignment without details
          assignmentsWithDetails.push(assignment);
        }
      }
      
      setPendingAssignments(assignmentsWithDetails);
    } catch (error) {
      console.error('Error loading pending assignments:', error);
      Alert.alert('Error', 'Failed to load pending task assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = (projectId: string) => {
    Alert.alert(
      'Accept Project Invitation',
      'To see these pending task assignments, you need to accept the project invitation first. Would you like to view the invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Invitation', 
          onPress: () => {
            // Navigate to invitations or show invitation modal
            onClose();
            // You can add navigation logic here
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { 
          backgroundColor: dark ? COLORS.dark2 : COLORS.white 
        }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons 
                name="time-outline" 
                size={24} 
                color={dark ? COLORS.white : COLORS.greyscale900} 
              />
              <Text style={[styles.headerTitle, {
                color: dark ? COLORS.white : COLORS.greyscale900,
              }]}>
                Pending Task Assignments
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={dark ? COLORS.white : COLORS.greyscale900} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Loading pending assignments...
                </Text>
              </View>
            ) : pendingAssignments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={64} 
                  color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                />
                <Text style={[styles.emptyTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  No Pending Assignments
                </Text>
                <Text style={[styles.emptyText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  You don&apos;t have any pending task assignments. All your assigned tasks are ready to work on!
                </Text>
              </View>
            ) : (
              <View style={styles.assignmentsList}>
                <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  {pendingAssignments.length} Pending Assignment{pendingAssignments.length !== 1 ? 's' : ''}
                </Text>
                
                {pendingAssignments.map((assignment, index) => (
                  <View key={assignment.id} style={[styles.assignmentCard, {
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}>
                    {/* Task Info */}
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        {assignment.task?.title || 'Unknown Task'}
                      </Text>
                      
                      {assignment.project && (
                        <View style={styles.projectTag}>
                          <Text style={[styles.projectTagText, { color: COLORS.primary }]}>
                            {assignment.project.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Assignment Details */}
                    <View style={styles.assignmentDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={16} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                        <Text style={[styles.detailText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                          Assigned by: {assignment.assignedByUser?.name || 'Fetching name...'}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={dark ? COLORS.grayscale400 : COLORS.grayscale700} />
                        <Text style={[styles.detailText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                          Assigned: {formatDate(assignment.assigned_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity 
                      style={[styles.acceptButton, { backgroundColor: COLORS.primary }]}
                      onPress={() => handleAcceptInvitation(assignment.project_id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />
                      <Text style={[styles.acceptButtonText, { color: COLORS.white }]}>
                        Accept Project Invitation
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { 
            borderTopColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 
          }]}>
            <Text style={[styles.footerText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
              Accept the project invitation to start working on these tasks
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  assignmentsList: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'bold',
    marginBottom: 16,
  },
  assignmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  taskInfo: {
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'bold',
    marginBottom: 8,
  },
  projectTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 6,
  },
  projectTagText: {
    fontSize: 12,
    fontFamily: 'medium',
  },
  assignmentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'medium',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'regular',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PendingTaskAssignmentsModal; 