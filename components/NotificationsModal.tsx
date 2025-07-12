import DeclineExplanationModal from '@/components/DeclineExplanationModal';
import { COLORS, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { cacheService } from '@/utils/cacheService';
import { NotificationData, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomBottomSheet from './CustomBottomSheet';

interface NotificationsModalProps {
    visible: boolean;
    onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, onClose }) => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const { user } = useAuth();
    
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
    const [declineModalVisible, setDeclineModalVisible] = useState(false);
    const [declineTarget, setDeclineTarget] = useState<NotificationData | null>(null);
    const [declineLoading, setDeclineLoading] = useState(false);

    // Show alert message
    const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
        Alert.alert(
            type === 'success' ? 'Success' : 'Error',
            message,
            [{ text: 'OK' }]
        );
    };

    // Load notifications
    const loadNotifications = useCallback(async () => {
        try {
            const [notificationsData, pendingInvitations] = await Promise.all([
                TeamService.getUserNotifications(),
                TeamService.getUserPendingInvitations()
            ]);

            // Build a set of all pending invitation IDs
            const pendingInvitationIds = new Set(pendingInvitations.map(inv => inv.id));

            // Convert pending invitations to notification format
            const invitationNotifications = pendingInvitations.map(invitation => ({
                id: `invitation_${invitation.id}`,
                type: 'team_invitation',
                title: 'Team Invitation',
                message: `You've been invited to join "${invitation.project?.name || 'a project'}" as ${invitation.role}`,
                read: false,
                created_at: invitation.created_at,
                data: {
                    invitationId: invitation.id,
                    projectId: invitation.project_id,
                    projectName: invitation.project?.name,
                    inviterName: invitation.inviter?.full_name || invitation.inviter?.username,
                    role: invitation.role
                }
            }));

            // Filter out duplicate team invitation notifications from notificationsData
            const filteredNotifications = notificationsData.filter(n => {
                if (n.type === 'team_invitation' && n.data?.invitationId) {
                    return !pendingInvitationIds.has(n.data.invitationId);
                }
                return true;
            });

            // Combine filtered notifications with invitation notifications
            const allNotifications = [...invitationNotifications, ...filteredNotifications];
            
            // Sort by creation date (newest first)
            allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setNotifications(allNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
            showAlert('Failed to load notifications', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh notifications
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    }, [loadNotifications]);

    // Load notifications when modal becomes visible
    React.useEffect(() => {
        if (visible) {
            loadNotifications();
        }
    }, [visible, loadNotifications]);

    // Handle team invitation acceptance
    const handleAcceptInvitation = async (notification: NotificationData) => {
        const invitationId = notification.data?.invitationId;
        if (!invitationId) return;

        setProcessing(prev => ({ ...prev, [notification.id]: true }));

        try {
            const result = await TeamService.acceptInvitation(invitationId);
            if (result.success) {
                // Remove the notification from the list immediately
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                showAlert('Invitation accepted successfully!', 'success');
                
                // Close the modal and navigate to the project details page
                onClose();
                navigation.navigate('projectdetails', {
                    projectId: notification.data?.projectId
                });

                // Invalidate user projects cache to ensure home screen shows the new project
                if (user?.id) {
                    await cacheService.invalidate(`user_projects:${user.id}`);
                    await cacheService.invalidate(`user_projects_instant:${user.id}`);
                }
            } else {
                showAlert(result.error || 'Failed to accept invitation', 'error');
            }
        } catch (error) {
            console.error('Accept invitation error:', error);
            showAlert('Failed to accept invitation', 'error');
        } finally {
            setProcessing(prev => ({ ...prev, [notification.id]: false }));
        }
    };

    // Handle team invitation decline (open modal)
    const openDeclineModal = (notification: NotificationData) => {
        setDeclineTarget(notification);
        setDeclineModalVisible(true);
    };

    const handleDeclineConfirm = async (explanation: string) => {
        if (!declineTarget) return;
        setDeclineLoading(true);
        try {
            const invitationId = declineTarget.data?.invitationId;
            if (!invitationId) return;
            const result = await TeamService.declineInvitation(invitationId, explanation);
            if (result.success) {
                // Remove the notification from the list immediately
                setNotifications(prev => prev.filter(n => n.id !== declineTarget.id));
                setDeclineModalVisible(false);
                setDeclineTarget(null);
                showAlert('Invitation declined successfully', 'success');
            } else {
                showAlert(result.error || 'Failed to decline invitation', 'error');
            }
        } catch (error) {
            showAlert('Failed to decline invitation', 'error');
        } finally {
            setDeclineLoading(false);
        }
    };

    // Handle delete notification
    const handleDeleteNotification = async (notification: NotificationData) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification? This action cannot be undone.',
            [
                { 
                    text: 'Cancel', 
                    style: 'cancel',
                    onPress: () => console.log('Delete cancelled')
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(prev => ({ ...prev, [notification.id]: true }));
                        try {
                            const success = await TeamService.deleteNotification(notification.id);
                            if (success) {
                                // Remove the notification from the list immediately
                                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                                showAlert('Notification deleted successfully', 'success');
                            } else {
                                showAlert('Failed to delete notification', 'error');
                            }
                        } catch (error) {
                            showAlert('Failed to delete notification', 'error');
                        } finally {
                            setProcessing(prev => ({ ...prev, [notification.id]: false }));
                        }
                    }
                }
            ],
            { cancelable: true }
        );
    };

    // Mark notification as read
    const markAsRead = async (notificationId: string) => {
        try {
            await TeamService.markNotificationAsRead(notificationId);
            // Update the notification in the list to mark it as read
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, read: true } : n
            ));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Get notification icon
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'team_invitation':
                return 'people-outline';
            case 'team_accepted':
                return 'checkmark-circle-outline';
            case 'team_removed':
                return 'person-remove-outline';
            case 'role_changed':
                return 'shield-outline';
            default:
                return 'notifications-outline';
        }
    };

    // Get notification color
    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'team_invitation':
                return COLORS.primary;
            case 'team_accepted':
                return COLORS.success;
            case 'team_removed':
                return COLORS.error;
            case 'role_changed':
                return COLORS.warning;
            default:
                return COLORS.grayscale400;
        }
    };

    // Render notification item with TaskCard-like styling
    const renderNotification = ({ item: notification }: { item: NotificationData }) => {
        const isUnread = !notification.read;
        const isProcessing = processing[notification.id];
        const isTeamInvitation = notification.type === 'team_invitation';

        return (
            <View style={[styles.container, { opacity: isProcessing ? 0.7 : 1 }]}>
                <View style={[styles.card, { 
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    borderColor: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                }]}>
                    {/* Type indicator (like priority indicator in TaskCard) */}
                    <View style={[styles.typeIndicator, { backgroundColor: getNotificationColor(notification.type) }]} />
                    
                    <View style={styles.content}>
                        <TouchableOpacity 
                            style={styles.textContainer}
                            onPress={() => !isUnread && markAsRead(notification.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.headerRow}>
                                <View style={[styles.iconContainer, {
                                    backgroundColor: getNotificationColor(notification.type) + '15'
                                }]}>
                                    <Ionicons 
                                        name={getNotificationIcon(notification.type) as any} 
                                        size={16} 
                                        color={getNotificationColor(notification.type)} 
                                    />
                                </View>
                                <Text style={[styles.title, { 
                                    color: dark ? COLORS.white : COLORS.greyscale900,
                                    fontWeight: isUnread ? 'bold' : '600'
                                }]}>
                                    {notification.title}
                                </Text>
                                {isUnread && (
                                    <View style={[styles.unreadDot, {
                                        backgroundColor: COLORS.primary
                                    }]} />
                                )}
                            </View>
                            
                            <Text style={[styles.message, { 
                                color: dark ? COLORS.gray : COLORS.greyScale800
                            }]} numberOfLines={2}>
                                {notification.message}
                            </Text>
                            
                            <Text style={[styles.dateTime, { 
                                color: dark ? COLORS.white : COLORS.greyScale800,
                            }]}>
                                {new Date(notification.created_at).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </TouchableOpacity>
                        
                        <View style={styles.rightSection}>
                            {/* Delete Button */}
                            <TouchableOpacity 
                                onPress={() => handleDeleteNotification(notification)}
                                style={[styles.deleteButton, {
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                                    borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                                }]}
                                disabled={isProcessing}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                            </TouchableOpacity>

                            {/* Team invitation actions */}
                            {isTeamInvitation && isUnread && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.declineButton, {
                                            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                                            borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                                        }]}
                                        onPress={() => openDeclineModal(notification)}
                                        disabled={isProcessing}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.actionButtonText, {
                                            color: dark ? COLORS.white : COLORS.greyscale900
                                        }]}>Decline</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.acceptButton, {
                                            backgroundColor: COLORS.primary
                                        }]}
                                        onPress={() => handleAcceptInvitation(notification)}
                                        disabled={isProcessing}
                                        activeOpacity={0.8}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <Text style={styles.acceptButtonText}>Accept</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Empty state with improved styling
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, {
                backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100
            }]}>
                <Ionicons 
                    name="notifications-outline" 
                    size={48} 
                    color={dark ? COLORS.grayscale400 : COLORS.grayscale200} 
                />
            </View>
            <Text style={[styles.emptyTitle, {
                color: dark ? COLORS.white : COLORS.greyscale900
            }]}>
                No Notifications
            </Text>
            <Text style={[styles.emptyMessage, {
                color: dark ? COLORS.grayscale400 : COLORS.grayscale700
            }]}>
                You&apos;re all caught up! New notifications will appear here.
            </Text>
        </View>
    );

    return (
        <CustomBottomSheet
            visible={visible}
            onClose={onClose}
            height="80%"
            backgroundColor={dark ? COLORS.dark1 : COLORS.white}
            closeOnSwipe={true}
        >
            <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerIcon, { backgroundColor: COLORS.primary + '20' }]}>
                        <Ionicons name="notifications" size={24} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={[styles.modalTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900,
                        }]}>
                            Notifications
                        </Text>
                        <Text style={[styles.modalSubtitle, {
                            color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                        }]}>
                            Stay updated with your latest activities
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons 
                        name="close-circle" 
                        size={28} 
                        color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
                    />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={renderEmptyState}
                />
            )}
            
            {/* Decline Explanation Modal */}
            <DeclineExplanationModal
                visible={declineModalVisible}
                onClose={() => setDeclineModalVisible(false)}
                onConfirm={handleDeclineConfirm}
                loading={declineLoading}
            />
        </CustomBottomSheet>
    );
};

const styles = StyleSheet.create({
    modalHeader: {
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
    modalTitle: {
        fontSize: 20,
        fontFamily: 'bold',
    },
    modalSubtitle: {
        fontSize: 12,
        fontFamily: 'regular',
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        flexGrow: 1,
        paddingHorizontal: SIZES.padding3,
    },
    // TaskCard-like styling
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
        minHeight: 120,
        marginVertical: 4,
        alignSelf: 'center',
    },
    typeIndicator: {
        width: 4,
        height: '100%',
        borderRadius: 2,
        marginRight: 12,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    textContainer: {
        flex: 1,
        marginRight: SIZES.padding2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: SIZES.padding,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
        flex: 1,
    },
    message: {
        fontSize: 14,
        color: COLORS.greyScale800,
        fontFamily: "regular",
        marginBottom: 8,
        lineHeight: 20,
    },
    dateTime: {
        fontSize: 14,
        color: COLORS.greyScale800,
        fontFamily: "regular",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    rightSection: {
        alignItems: 'flex-end',
        gap: SIZES.padding,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: SIZES.padding,
    },
    actionButton: {
        paddingHorizontal: SIZES.padding2,
        paddingVertical: SIZES.padding,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 60,
    },
    declineButton: {
        // Additional styles for decline button
    },
    acceptButton: {
        // Additional styles for accept button
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    acceptButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SIZES.padding3,
    },
    emptyTitle: {
        fontSize: SIZES.h2,
        fontWeight: 'bold',
        marginBottom: SIZES.padding,
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: SIZES.body4,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: SIZES.padding3,
    },
});

export default NotificationsModal; 