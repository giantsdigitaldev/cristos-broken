import { supabase } from './supabase';

export interface PushNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
  type: 'task_assigned' | 'task_created' | 'project_invitation' | 'comment_added';
}

export class PushNotificationService {
  /**
   * Send a notification to a specific user
   */
  static async sendNotification(
    userId: string,
    title: string,
    body: string,
    type: PushNotification['type'],
    data?: any
  ): Promise<void> {
    try {
      console.log('📱 Sending push notification:', {
        userId,
        title,
        body,
        type,
        data
      });

      // Insert notification into database
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title,
          body,
          type,
          data: data ? JSON.stringify(data) : null,
          read: false
        });

      if (error) {
        console.error('❌ Error sending notification:', error);
        throw error;
      }

      console.log('✅ Push notification sent successfully to user:', userId);
    } catch (error) {
      console.error('❌ Error in sendNotification:', error);
      throw error;
    }
  }

  /**
   * Send task assignment notification
   */
  static async sendTaskAssignmentNotification(
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
    assignedToUserIds: string[],
    assignedByUserId: string
  ): Promise<void> {
    try {
      console.log('📱 Sending task assignment notifications:', {
        taskId,
        taskTitle,
        projectId,
        projectName,
        assignedToUserIds,
        assignedByUserId
      });

      // Get assigner's name
      const { data: assignerProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', assignedByUserId)
        .single();

      const assignerName = assignerProfile?.full_name || assignerProfile?.email?.split('@')[0] || 'Someone';

      // Send notification to each assigned user
      const notificationPromises = assignedToUserIds.map(async (userId) => {
        if (userId === assignedByUserId) return; // Don't notify the assigner

        await this.sendNotification(
          userId,
          'New Task Assigned',
          `${assignerName} assigned you a task: "${taskTitle}" in project "${projectName}"`,
          'task_assigned',
          {
            taskId,
            taskTitle,
            projectId,
            projectName,
            assignedByUserId,
            assignedByUserName: assignerName
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log('✅ Task assignment notifications sent successfully');
    } catch (error) {
      console.error('❌ Error sending task assignment notifications:', error);
      throw error;
    }
  }

  /**
   * Send task creation notification to project team members
   */
  static async sendTaskCreationNotification(
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
    createdByUserId: string,
    assignedToUserIds: string[]
  ): Promise<void> {
    try {
      console.log('📱 Sending task creation notifications:', {
        taskId,
        taskTitle,
        projectId,
        projectName,
        createdByUserId,
        assignedToUserIds
      });

      // Get creator's name
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', createdByUserId)
        .single();

      const creatorName = creatorProfile?.full_name || creatorProfile?.email?.split('@')[0] || 'Someone';

      // Get all project team members (excluding the creator)
      const { data: teamMembers } = await supabase
        .from('project_team_members')
        .select('user_id')
        .eq('project_id', projectId)
        .neq('user_id', createdByUserId);

      if (!teamMembers) return;

      const teamMemberIds = teamMembers.map(member => member.user_id);
      const allRecipients = [...new Set([...teamMemberIds, ...assignedToUserIds])];

      // Send notification to team members and assignees
      const notificationPromises = allRecipients.map(async (userId) => {
        if (userId === createdByUserId) return; // Don't notify the creator

        const isAssigned = assignedToUserIds.includes(userId);
        const title = isAssigned ? 'New Task Assigned' : 'New Task Created';
        const body = isAssigned 
          ? `${creatorName} assigned you a task: "${taskTitle}" in project "${projectName}"`
          : `${creatorName} created a new task: "${taskTitle}" in project "${projectName}"`;

        await this.sendNotification(
          userId,
          title,
          body,
          isAssigned ? 'task_assigned' : 'task_created',
          {
            taskId,
            taskTitle,
            projectId,
            projectName,
            createdByUserId,
            createdByUserName: creatorName,
            isAssigned
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log('✅ Task creation notifications sent successfully');
    } catch (error) {
      console.error('❌ Error sending task creation notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  static async getUnreadNotifications(userId: string): Promise<PushNotification[]> {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching unread notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getUnreadNotifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error in markNotificationAsRead:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('❌ Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error in markAllNotificationsAsRead:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('❌ Error cleaning up old notifications:', error);
        throw error;
      }

      console.log('✅ Old notifications cleaned up successfully');
    } catch (error) {
      console.error('❌ Error in cleanupOldNotifications:', error);
      throw error;
    }
  }

  /**
   * Clear all test notifications for a specific user
   */
  static async clearTestNotifications(userId: string): Promise<void> {
    try {
      console.log('🧹 Clearing test notifications for user:', userId);
      
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error clearing test notifications:', error);
        throw error;
      }

      console.log('✅ Test notifications cleared successfully for user:', userId);
    } catch (error) {
      console.error('❌ Error in clearTestNotifications:', error);
      throw error;
    }
  }
} 