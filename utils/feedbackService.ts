import { supabase } from './supabase';

export interface Feedback {
  id: string;
  user_id?: string; // Make optional since we're not requiring auth
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  } | null;
}

export interface CreateFeedbackData {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
}

class FeedbackService {
  /**
   * Create a new feedback entry (no auth required)
   */
  async createFeedback(data: CreateFeedbackData): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    try {
      console.log('🔍 Creating feedback with data:', data);
      
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User must be authenticated to submit feedback.');
      }

      const feedbackData = {
        user_id: user.id,
        title: data.title,
        description: data.description || null,
        category: data.category || 'bug',
        priority: data.priority || 'medium',
        status: 'open'
      };

      console.log('📝 Inserting feedback:', feedbackData);

      const { data: feedback, error } = await supabase
        .from('feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating feedback:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Feedback created successfully:', feedback.id);
      return { success: true, data: feedback };
    } catch (error: any) {
      console.error('❌ Error in createFeedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all feedback (no auth required)
   */
  async getUserFeedback(): Promise<{ success: boolean; data?: Feedback[]; error?: string }> {
    try {
      console.log('🔍 Fetching all feedback...');
      
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('*, profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false });

      console.log('📊 Raw feedback data:', feedback);
      console.log('📊 Raw feedback error:', error);

      if (error) {
        console.error('❌ Error fetching feedback:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Successfully fetched feedback:', feedback?.length || 0, 'entries');
      
      // Log each feedback item to see the structure
      if (feedback && feedback.length > 0) {
        feedback.forEach((item, index) => {
          console.log(`📝 Feedback ${index + 1}:`, {
            id: item.id,
            title: item.title,
            user_id: item.user_id,
            profiles: item.profiles
          });
        });
      }
      
      const sortedFeedback = (feedback || []).sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') {
          return 1;
        }
        if (a.status !== 'completed' && b.status === 'completed') {
          return -1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return { success: true, data: sortedFeedback };
    } catch (error: any) {
      console.error('❌ Error in getUserFeedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get feedback for the current user only (if authenticated)
   */
  async getCurrentUserFeedback(): Promise<{ success: boolean; data?: Feedback[]; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        console.log('⚠️ No authenticated user, returning empty array');
        return { success: true, data: [] };
      }

      console.log('🔍 Fetching feedback for user:', user.user.id);

      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching user feedback:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Successfully fetched user feedback:', feedback?.length || 0, 'entries');
      const sortedFeedback = (feedback || []).sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') {
          return 1;
        }
        if (a.status !== 'completed' && b.status === 'completed') {
          return -1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return { success: true, data: sortedFeedback };
    } catch (error: any) {
      console.error('❌ Error in getCurrentUserFeedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update feedback (any user can edit any feedback)
   */
  async updateFeedback(
    feedbackId: string, 
    updates: Partial<CreateFeedbackData>
  ): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    try {
      console.log('🔍 Updating feedback:', feedbackId, updates);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: feedback, error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) {
        console.error('❌ Error updating feedback:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Feedback updated successfully');
      return { success: true, data: feedback };
    } catch (error: any) {
      console.error('❌ Error in updateFeedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete feedback (any user can delete any feedback)
   */
  async deleteFeedback(feedbackId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Deleting feedback:', feedbackId);
      
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        console.error('❌ Error deleting feedback:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Feedback deleted successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in deleteFeedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark feedback as completed (any user can mark any feedback as completed)
   */
  async markFeedbackAsCompleted(feedbackId: string): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    try {
      console.log('🔍 Marking feedback as completed:', feedbackId);
      
      const updateData = {
        status: 'completed',
        updated_at: new Date().toISOString()
      };

      const { data: feedback, error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) {
        console.error('❌ Error marking feedback as completed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Feedback marked as completed successfully');
      return { success: true, data: feedback };
    } catch (error: any) {
      console.error('❌ Error in markFeedbackAsCompleted:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Re-open a completed feedback item
   */
  async reopenFeedback(feedbackId: string): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    try {
      console.log('🔍 Re-opening feedback:', feedbackId);
      
      const updateData = {
        status: 'pending', // Revert to pending status
        updated_at: new Date().toISOString()
      };

      const { data: feedback, error } = await supabase
        .from('feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error re-opening feedback:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Feedback re-opened successfully');
      return { success: true, data: feedback };
    } catch (error: any) {
      console.error('❌ Error in reopenFeedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔍 Getting feedback statistics...');
      
      // Get total feedback count
      const { count: totalCount, error: countError } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error getting feedback count:', countError);
        return { success: false, error: countError.message };
      }

      // Try to get user-specific count if authenticated
      let userCount = 0;
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const { count: userFeedbackCount, error: userCountError } = await supabase
            .from('feedback')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user.id);

          if (!userCountError) {
            userCount = userFeedbackCount || 0;
          }
        }
      } catch (authError) {
        console.log('⚠️ Auth check failed, user count will be 0');
      }

      const stats = {
        total: totalCount || 0,
        user: userCount
      };

      console.log('✅ Feedback stats:', stats);
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('❌ Error in getFeedbackStats:', error);
      return { success: false, error: error.message };
    }
  }
}

export const feedbackService = new FeedbackService(); 