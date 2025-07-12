import { PushNotificationService } from '@/utils/pushNotificationService';
import { supabase } from '@/utils/supabase';
import { NotificationData, TeamService } from '@/utils/teamService';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
  isSubscribed: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subscriptionRef = useRef<any>(null);

  // Clear any test notifications from user_notifications table
  const clearTestNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🧹 Clearing test notifications from user_notifications table...');
      await PushNotificationService.clearTestNotifications(user.id);
      console.log('✅ Test notifications cleared from user_notifications table');
    } catch (error) {
      console.error('❌ Error in clearTestNotifications:', error);
    }
  }, [user?.id]);

  // Load notifications from the correct table (notifications)
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      // Clear any test notifications from user_notifications table
      await clearTestNotifications();
      
      // Get notifications from the correct table using TeamService
      const notificationsData = await TeamService.getUserNotifications(user.id);
      console.log('🔔 Loaded notifications from database:', notificationsData.length);
      
      // Get pending invitations and convert them to notification format
      const pendingInvitations = await TeamService.getUserPendingInvitations();
      console.log('🔔 Loaded pending invitations:', pendingInvitations.length);
      
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
      
      // Filter to only show unread notifications
      const unreadNotifications = allNotifications.filter(n => !n.read);
      console.log('🔔 Final unread notifications count:', unreadNotifications.length);
      
      setNotifications(unreadNotifications);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, clearTestNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Handle invitation notifications differently
      if (notificationId.startsWith('invitation_')) {
        // For invitation notifications, we don't mark them as read in the database
        // They will be removed when the invitation is accepted/declined
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        // For regular notifications, mark as read in the database
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) {
          console.error('❌ Error marking notification as read:', error);
        } else {
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Mark all regular notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
      } else {
        // Clear all notifications from state
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  }, [user?.id]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Real-time subscription for notifications from the correct table
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔗 Setting up real-time notification subscription for user:', user.id);

    let isActive = true; // Track if component is still mounted
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2; // Reduced from 3 to 2
    let reconnectTimeout: any;
    let subscriptionActive = false; // Track if subscription is currently active
    let lastErrorTime = 0; // Track last error time to prevent rapid retries

    const setupSubscription = () => {
      if (!isActive || subscriptionActive) return;

      // Prevent rapid retries
      const now = Date.now();
      if (now - lastErrorTime < 5000) { // 5 second minimum between retries
        console.log('⏳ Skipping notification subscription setup - too soon after last error');
        return;
      }

      // Clean up existing subscription first
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
        } catch (error) {
          console.warn('Error removing existing notification subscription:', error);
        }
        subscriptionRef.current = null;
      }

      // Add longer delay before creating new subscription to avoid conflicts
      setTimeout(() => {
        if (!isActive) return;
        
        try {
          subscriptionRef.current = supabase
            .channel(`notifications-${user.id}-${Date.now()}`) // Add timestamp to avoid conflicts
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications', // Use the correct table
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                if (!isActive) return;
                
                console.log('📱 New notification received:', payload);
                
                if (payload.new) {
                  const newNotification = payload.new as NotificationData;
                  // Only add if it's unread
                  if (!newNotification.read) {
                    setNotifications(prev => [newNotification, ...prev]);
                  }
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications', // Use the correct table
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                if (!isActive) return;
                
                console.log('📱 Notification updated:', payload);
                
                if (payload.new) {
                  const updatedNotification = payload.new as NotificationData;
                  
                  if (updatedNotification.read) {
                    // Remove from list if marked as read
                    setNotifications(prev => prev.filter(n => n.id !== updatedNotification.id));
                  } else {
                    // Update in list
                    setNotifications(prev => 
                      prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
                    );
                  }
                }
              }
            )
            .subscribe((status) => {
              if (!isActive) return;
              
              console.log('📱 Notification subscription status:', status);
              setIsSubscribed(status === 'SUBSCRIBED');
              subscriptionActive = status === 'SUBSCRIBED';
              
              if (status === 'SUBSCRIBED') {
                console.log('✅ Notification subscription active for user:', user.id);
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                lastErrorTime = 0; // Reset error time
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.error('❌ Notification subscription error for user:', user.id, 'status:', status);
                subscriptionActive = false;
                lastErrorTime = Date.now();
                
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000); // Increased delays
                  
                  console.log(`🔄 Attempting to reconnect notification subscription in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                  
                  reconnectTimeout = setTimeout(() => {
                    if (isActive) {
                      setupSubscription();
                    }
                  }, delay);
                } else {
                  console.error('❌ Max reconnection attempts reached for notification subscription');
                }
              }
            });
        } catch (error) {
          console.error('❌ Error setting up notification subscription:', error);
          subscriptionActive = false;
          lastErrorTime = Date.now();
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000); // Increased delays
            
            console.log(`🔄 Attempting to reconnect notification subscription after error in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            reconnectTimeout = setTimeout(() => {
              if (isActive) {
                setupSubscription();
              }
            }, delay);
          } else {
            console.error('❌ Max reconnection attempts reached for notification subscription');
          }
        }
      }, 2000); // Increased delay to 2 seconds to avoid subscription conflicts
    };

    setupSubscription();

    return () => {
      console.log('🔌 Cleaning up notification subscription for user:', user.id);
      isActive = false;
      subscriptionActive = false;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
        } catch (error) {
          console.warn('Error removing notification subscription during cleanup:', error);
        }
        subscriptionRef.current = null;
        setIsSubscribed(false);
      }
    };
  }, [user?.id]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Calculate unread count
  const unreadCount = notifications.length;
  
  // Debug logging
  console.log('🔔 NotificationContext - unreadCount:', unreadCount, 'notifications:', notifications.length);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isLoading,
    isSubscribed
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 