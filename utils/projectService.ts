import { PendingTaskAssignment, Project, ProjectComment, Task, TaskComment, TaskSubtask } from './projectTypes';
import { supabase } from './supabase';

export class ProjectService {
  /**
   * Get all projects for a user
   */
  static async getProjects(userId: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return this.getMockProjects();
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      return this.getMockProjects();
    }
  }

  /**
   * Helper method to handle PGRST116 errors (no rows returned)
   */
  private static handlePGRST116Error(error: any, context: string, id: string): null {
    if (error.code === 'PGRST116') {
      console.log(`🔍 ${context} with ID ${id} not found or access denied (PGRST116)`);
      console.log('💡 This could be due to:');
      console.log('   • The item does not exist');
      console.log('   • RLS policies preventing access');
      console.log('   • User does not have permission');
      return null;
    }
    console.error(`Error in ${context}:`, error);
    return null;
  }

  /**
   * Get a single project by ID
   */
  static async getProject(projectId: string): Promise<Project | null> {
    // Guard: Return null if projectId is undefined, null, or not a valid UUID
    if (!projectId || typeof projectId !== 'string' || !projectId.match(/^[0-9a-fA-F-]{36}$/)) {
      console.warn(`getProject called with invalid projectId: ${projectId}`);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId);

      if (error) {
        return this.handlePGRST116Error(error, 'fetching project', projectId);
      }

      // Check if we got any results
      if (!data || data.length === 0) {
        console.log(`Project with ID ${projectId} not found`);
        return null;
      }

      // Return the first (and should be only) result
      return data[0];
    } catch (error) {
      console.error('Error in getProject:', error);
      return null;
    }
  }

  /**
   * Create a new project
   */
  static async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...project,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Ensure creator is added to project_team_members as 'owner' and 'active'
      if (data && data.id && data.user_id) {
        const { error: teamError } = await supabase
          .from('project_team_members')
          .insert([
            {
              project_id: data.id,
              user_id: data.user_id,
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString(),
              permissions: 'all'
            }
          ]);
        if (teamError) {
          console.error('Error adding creator to project_team_members:', teamError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  }

  /**
   * Delete a project and all related data
   */
  static async deleteProject(projectId: string): Promise<boolean | 'not_owner'> {
    try {
      console.log('🗑️ Starting comprehensive project deletion for:', projectId);
      
      // Step 1: Get current user to verify ownership
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User authentication error:', userError);
        return false;
      }

      // Step 2: Verify project exists and user owns it
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('❌ Project not found:', projectError);
        return false;
      }

      if (project.user_id !== user.id) {
        console.error('❌ User does not own this project');
        return 'not_owner';
      }

      console.log('✅ Project ownership verified, proceeding with deletion');

      // Step 3: Delete related data in the correct order (due to foreign key constraints)
      
      // 3a. Delete project comments first
      console.log('🗑️ Deleting project comments...');
      const { error: commentsError } = await supabase
        .from('project_comments')
        .delete()
        .eq('project_id', projectId);
      
      if (commentsError) {
        console.warn('⚠️ Error deleting project comments:', commentsError.message);
      } else {
        console.log('✅ Project comments deleted');
      }

      // 3b. Delete task comments
      console.log('🗑️ Deleting task comments...');
      // First get task IDs for this project
      const { data: taskIds, error: taskIdsError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId);
      
      if (taskIdsError) {
        console.warn('⚠️ Error getting task IDs:', taskIdsError.message);
      } else if (taskIds && taskIds.length > 0) {
        const taskIdArray = taskIds.map(task => task.id);
        const { error: taskCommentsError } = await supabase
          .from('task_comments')
          .delete()
          .in('task_id', taskIdArray);
        
        if (taskCommentsError) {
          console.warn('⚠️ Error deleting task comments:', taskCommentsError.message);
        } else {
          console.log('✅ Task comments deleted');
        }
      } else {
        console.log('ℹ️ No tasks found for this project');
      }

      // 3c. Delete task subtasks
      console.log('🗑️ Deleting task subtasks...');
      if (taskIds && taskIds.length > 0) {
        const taskIdArray = taskIds.map(task => task.id);
        const { error: subtasksError } = await supabase
          .from('task_subtasks')
          .delete()
          .in('task_id', taskIdArray);
        
        if (subtasksError) {
          console.warn('⚠️ Error deleting task subtasks:', subtasksError.message);
        } else {
          console.log('✅ Task subtasks deleted');
        }
      } else {
        console.log('ℹ️ No subtasks to delete');
      }

      // 3d. Delete project files
      console.log('🗑️ Deleting project files...');
      const { error: filesError } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId);
      
      if (filesError) {
        console.warn('⚠️ Error deleting project files:', filesError.message);
      } else {
        console.log('✅ Project files deleted');
      }

      // 3e. Delete team invitations
      console.log('🗑️ Deleting team invitations...');
      const { error: invitationsError } = await supabase
        .from('team_invitations')
        .delete()
        .eq('project_id', projectId);
      
      if (invitationsError) {
        console.warn('⚠️ Error deleting team invitations:', invitationsError.message);
      } else {
        console.log('✅ Team invitations deleted');
      }

      // 3f. Delete project team members
      console.log('🗑️ Deleting project team members...');
      const { error: teamMembersError } = await supabase
        .from('project_team_members')
        .delete()
        .eq('project_id', projectId);
      
      if (teamMembersError) {
        console.warn('⚠️ Error deleting project team members:', teamMembersError.message);
      } else {
        console.log('✅ Project team members deleted');
      }

      // 3g. Delete pending task assignments
      console.log('🗑️ Deleting pending task assignments...');
      const { error: pendingAssignmentsError } = await supabase
        .from('pending_task_assignments')
        .delete()
        .eq('project_id', projectId);
      
      if (pendingAssignmentsError) {
        console.warn('⚠️ Error deleting pending task assignments:', pendingAssignmentsError.message);
      } else {
        console.log('✅ Pending task assignments deleted');
      }

      // 3h. Delete tasks (this should cascade to any remaining related data)
      console.log('🗑️ Deleting project tasks...');
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);
      
      if (tasksError) {
        console.warn('⚠️ Error deleting tasks:', tasksError.message);
      } else {
        console.log('✅ Project tasks deleted');
      }

      // Step 4: Finally delete the project itself
      console.log('🗑️ Deleting project...');
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        console.error('❌ Error deleting project:', deleteError);
        return false;
      }

      console.log('✅ Project deleted successfully:', projectId);

      // Step 5: Clear all related caches to ensure deleted project is not visible
      console.log('🗑️ Clearing all related caches...');
      try {
        // Import cache services
        const { cacheService } = await import('./cacheService');
        const { OptimizedProjectService } = await import('./optimizedProjectService');
        const { CachedProjectService } = await import('./cachedProjectService');

        // Clear specific project caches
        await cacheService.invalidate(`project_details:${projectId}`);
        await cacheService.invalidate(`project_full:${projectId}`);
        await cacheService.invalidate(`project_tasks:${projectId}`);
        await cacheService.invalidate(`project_comments:${projectId}`);
        await cacheService.invalidate(`project_files:${projectId}`);

        // Clear user-specific caches that might contain the deleted project
        if (user.id) {
          await cacheService.invalidate(`user_projects:${user.id}`);
          await cacheService.invalidate(`user_projects_instant:${user.id}`);
          await cacheService.invalidate(`dashboard_stats:${user.id}`);
          await cacheService.invalidate(`recent_data:${user.id}`);
        }

        // Clear optimized project service caches
        await OptimizedProjectService.clearProjectCache(projectId);

        // Clear any predictive caches
        await cacheService.invalidate('project_activity:');
        await cacheService.invalidate('user_tasks:');

        console.log('✅ All caches cleared successfully');
      } catch (cacheError) {
        console.warn('⚠️ Error clearing caches:', cacheError);
        // Don't fail the deletion if cache clearing fails
      }

      return true;
    } catch (error) {
      console.error('❌ Error in deleteProject:', error);
      return false;
    }
  }

  /**
   * Get tasks for a project
   */
  static async getProjectTasks(projectId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectTasks:', error);
      return [];
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTask(taskId: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId);

      if (error) {
        return this.handlePGRST116Error(error, 'fetching task', taskId);
      }

      // Check if we got any results
      if (!data || data.length === 0) {
        console.log(`Task with ID ${taskId} not found`);
        return null;
      }

      // Return the first (and should be only) result
      return data[0];
    } catch (error) {
      console.error('Error in getTask:', error);
      return null;
    }
  }

  /**
   * Create a new task
   */
  static async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>, createdByUserId?: string): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...task,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Send push notifications for task creation
      try {
        const { PushNotificationService } = await import('./pushNotificationService');
        
        // Get project name for notification
        const project = await this.getProject(task.project_id);
        const projectName = project?.name || 'Unknown Project';
        
        // Use the provided user ID or fall back to project owner
        const creatorUserId = createdByUserId || project?.user_id || 'unknown';
        
        // Send notifications to team members and assignees
        await PushNotificationService.sendTaskCreationNotification(
          data.id,
          data.title,
          task.project_id,
          projectName,
          creatorUserId,
          task.assigned_to || []
        );
        
        console.log('✅ Push notifications sent for task creation');
      } catch (notificationError) {
        console.error('❌ Error sending push notifications for task creation:', notificationError);
        // Don't fail the task creation if notifications fail
      }

      // Patch: Update project progress after task creation
      await this.updateProjectProgress(task.project_id);

      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  static async updateTask(taskId: string, updates: Partial<Task>, updatedByUserId?: string): Promise<Task | null> {
    try {
      // Get the current task to check for assignment changes
      const currentTask = await this.getTask(taskId);
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          ...(updates.status === 'completed' && !updates.completed_at ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Check if this is a task reassignment
      if (currentTask && updates.assigned_to && 
          JSON.stringify(currentTask.assigned_to) !== JSON.stringify(updates.assigned_to)) {
        
        try {
          const { PushNotificationService } = await import('./pushNotificationService');
          
          // Get project name for notification
          const project = await this.getProject(data.project_id);
          const projectName = project?.name || 'Unknown Project';
          
          // Send reassignment notifications
          await PushNotificationService.sendTaskAssignmentNotification(
            data.id,
            data.title,
            data.project_id,
            projectName,
            updates.assigned_to,
            updatedByUserId || 'unknown'
          );
          
          console.log('✅ Push notifications sent for task reassignment');
        } catch (notificationError) {
          console.error('❌ Error sending push notifications for task reassignment:', notificationError);
          // Don't fail the task update if notifications fail
        }
      }

      // Patch: Update project progress after task update
      if (data?.project_id) {
        await this.updateProjectProgress(data.project_id);
      }

      return data;
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  /**
   * Search projects
   */
  static async searchProjects(query: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error searching projects:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchProjects:', error);
      return [];
    }
  }

  /**
   * Get mock projects for fallback
   */
  static getMockProjects(): Project[] {
    return [
      {
        id: 'mock-1',
        name: 'Sample Project',
        description: 'A sample project for demonstration',
        user_id: 'mock-user',
        status: 'active',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress: 0,
        total_tasks: 0,
        completed_tasks: 0
      }
    ];
  }

  /**
   * Get mock tasks for fallback
   */
  static getMockTasks(): Task[] {
    return [
      {
        id: 'mock-task-1',
        title: 'Sample Task',
        description: 'A sample task for demonstration',
        project_id: 'mock-1',
        assigned_to: [],
        status: 'todo',
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  /**
   * Get pending task assignments for a user
   */
  static async getPendingTaskAssignments(userId: string): Promise<PendingTaskAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('pending_task_assignments')
        .select('*')
        .eq('assigned_to', userId)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending task assignments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingTaskAssignments:', error);
      return [];
    }
  }

  /**
   * Get task details with subtasks and comments
   */
  static async getTaskDetails(taskId: string): Promise<{
    task: Task | null;
    subtasks: any[];
    comments: any[];
  } | null> {
    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId);

      if (taskError) {
        const result = this.handlePGRST116Error(taskError, 'fetching task', taskId);
        if (result === null) {
          return {
            task: null,
            subtasks: [],
            comments: []
          };
        }
        return null;
      }

      // Check if we got any results
      if (!task || task.length === 0) {
        console.log(`Task with ID ${taskId} not found`);
        return {
          task: null,
          subtasks: [],
          comments: []
        };
      }

      const taskData = task[0]; // Get the first (and should be only) result

      // Get subtasks
      const { data: subtasks } = await supabase
        .from('task_subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      // Get comments
      const { data: comments } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      // Get user profiles for comments if there are any
      let commentsWithUsers = comments || [];
      if (comments && comments.length > 0) {
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);
        commentsWithUsers = comments.map(comment => ({
          ...comment,
          user: profileMap.get(comment.user_id) || { 
            id: comment.user_id, 
            full_name: 'Unknown User', 
            avatar_url: null 
          }
        }));
      }

      return {
        task: taskData,
        subtasks: subtasks || [],
        comments: commentsWithUsers
      };
    } catch (error) {
      console.error('Error in getTaskDetails:', error);
      return null;
    }
  }

  /**
   * Get projects with team access
   */
  static async getProjectsWithTeamAccess(userId: string): Promise<{ allProjects: Project[] }> {
    try {
      // First get projects owned by the user
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

      if (ownedError) {
        console.error('Error fetching owned projects:', ownedError);
        return { allProjects: [] };
      }

      // Then get projects where user is a team member with ACTIVE status only
      const { data: teamProjects, error: teamError } = await supabase
        .from('project_team_members')
        .select(`
          project_id,
          projects (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active'); // Only include active team members, not pending invitations

      if (teamError) {
        console.error('Error fetching team projects:', teamError);
        return { allProjects: ownedProjects || [] };
      }

      // Combine and deduplicate projects
      const allProjects = [
        ...(ownedProjects || []),
        ...(teamProjects?.map(tp => tp.projects).filter(Boolean) || [])
      ];

      // Remove duplicates based on project ID
      const uniqueProjects = allProjects.filter((project, index, self) => 
        index === self.findIndex(p => p.id === project.id)
      );

      return { allProjects: uniqueProjects };
    } catch (error) {
      console.error('Error in getProjectsWithTeamAccess:', error);
      return { allProjects: [] };
    }
  }

  /**
   * Get all tasks for a user
   */
  static async getAllTasksForUser(userId: string): Promise<Task[]> {
    try {
      // Get all tasks assigned to the user with project information
      const { data: assignedTasks, error: assignedError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(
            id,
            name,
            user_id
          )
        `)
        .contains('assigned_to', [userId]);

      if (assignedError) {
        console.error('Error fetching assigned tasks:', assignedError);
        return [];
      }

      if (!assignedTasks || assignedTasks.length === 0) {
        console.log(`📅 No tasks assigned to user ${userId}`);
        return [];
      }

      // Get projects owned by the user
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId);

      if (ownedError) {
        console.error('Error fetching owned projects:', ownedError);
        return [];
      }

      const ownedProjectIds = new Set(ownedProjects?.map(p => p.id) || []);

      // Try to get team memberships, but don't fail if RLS blocks it
      let teamProjectIds = new Set<string>();
      try {
        const { data: activeTeamMemberships, error: teamError } = await supabase
          .from('project_team_members')
          .select('project_id')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (!teamError && activeTeamMemberships) {
          teamProjectIds = new Set(activeTeamMemberships.map(m => m.project_id));
        } else {
          console.log('⚠️ Could not fetch team memberships (RLS may be blocking):', teamError?.message);
        }
      } catch (error) {
        console.log('⚠️ Team membership check failed, proceeding with owned projects only');
      }

      // Create a set of accessible project IDs
      const accessibleProjectIds = new Set([
        ...ownedProjectIds,
        ...teamProjectIds
      ]);

      // Filter tasks to only include those from accessible projects
      const filteredTasks = assignedTasks.filter(task => {
        const projectId = task.project_id || task.projects?.id;
        const hasAccess = projectId && accessibleProjectIds.has(projectId);
        
        if (!hasAccess) {
          console.log(`⚠️ Task ${task.id} from project ${projectId} not accessible to user ${userId}`);
        }
        
        return hasAccess;
      });

      console.log(`📅 Found ${filteredTasks.length} accessible tasks for user ${userId} (filtered from ${assignedTasks.length} total assigned tasks)`);
      console.log(`📊 Accessible projects: ${accessibleProjectIds.size} (${ownedProjectIds.size} owned, ${teamProjectIds.size} team)`);

      return filteredTasks;
    } catch (error) {
      console.error('Error in getAllTasksForUser:', error);
      return [];
    }
  }

  /**
   * Update subtask
   */
  static async updateSubtask(subtaskId: string, updates: Partial<TaskSubtask>): Promise<TaskSubtask | null> {
    try {
      const { data, error } = await supabase
        .from('task_subtasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', subtaskId)
        .select()
        .single();

      if (error) throw error;

      // Patch: Update project progress after subtask update
      if (data?.task_id) {
        // Get the parent task to find the project_id
        const parentTask = await this.getTask(data.task_id);
        if (parentTask?.project_id) {
          await this.updateProjectProgress(parentTask.project_id);
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating subtask:', error);
      return null;
    }
  }

  /**
   * Create subtask
   */
  static async createSubtask(subtask: Omit<TaskSubtask, 'id' | 'created_at' | 'updated_at'>): Promise<TaskSubtask> {
    try {
      const { data, error } = await supabase
        .from('task_subtasks')
        .insert([{
          ...subtask,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating subtask:', error);
      throw error;
    }
  }

  /**
   * Delete subtask
   */
  static async deleteSubtask(subtaskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task_subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting subtask:', error);
      return false;
    }
  }

  /**
   * Get task subtasks
   */
  static async getTaskSubtasks(taskId: string): Promise<TaskSubtask[]> {
    try {
      const { data, error } = await supabase
        .from('task_subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching task subtasks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTaskSubtasks:', error);
      return [];
    }
  }

  /**
   * Create task comment
   */
  static async createTaskComment(comment: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>): Promise<TaskComment> {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([{
          ...comment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating task comment:', error);
      throw error;
    }
  }

  /**
   * Get task comments
   */
  static async getTaskComments(taskId: string): Promise<TaskComment[]> {
    try {
      // First, get the comments
      const { data: comments, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching task comments:', commentsError);
        return [];
      }

      if (!comments || comments.length === 0) {
        return [];
      }

      // Then, get user profiles for all comment authors
      const userIds = [...new Set(comments.map(comment => comment.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        // Return comments without user data
        return comments.map(comment => ({
          ...comment,
          user: { id: comment.user_id, full_name: 'Unknown User', avatar_url: null }
        }));
      }

      // Create a map of user profiles
      const profileMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

      // Combine comments with user data
      return comments.map(comment => ({
        ...comment,
        user: profileMap.get(comment.user_id) || { 
          id: comment.user_id, 
          full_name: 'Unknown User', 
          avatar_url: null 
        }
      }));
    } catch (error) {
      console.error('Error in getTaskComments:', error);
      return [];
    }
  }

  /**
   * Update task comment
   */
  static async updateTaskComment(commentId: string, content: string): Promise<TaskComment | null> {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating task comment:', error);
      return null;
    }
  }

  /**
   * Delete task comment
   */
  static async deleteTaskComment(commentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting task comment:', error);
      return false;
    }
  }

  /**
   * Update project progress
   */
  static async updateProjectProgress(projectId: string): Promise<void> {
    try {
      // Get all tasks for the project
      const tasks = await this.getProjectTasks(projectId);
      const completedTasks = tasks.filter(task => task.status === 'completed');
      const progress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

      // Get current project to preserve existing metadata
      const currentProject = await this.getProject(projectId);
      const currentMetadata = currentProject?.metadata || {};

      // Update project progress with metadata
      await this.updateProject(projectId, { 
        progress: Math.round(progress),
        metadata: {
          ...currentMetadata,
          total_tasks: tasks.length,
          completed_tasks: completedTasks.length
        }
      });
    } catch (error) {
      console.error('Error updating project progress:', error);
    }
  }

  /**
   * Get project with team
   */
  static async getProjectWithTeam(projectId: string): Promise<{ project: Project | null; teamMembers: any[] }> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        return { project: null, teamMembers: [] };
      }

      const { data: teamMembers, error } = await supabase
        .from('project_team_members')
        .select(`
          id,
          role,
          status,
          user_id,
          profiles (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching team members:', error);
        return { project, teamMembers: [] };
      }

      // Process the data to correctly flatten the nested profile information
      const processedTeamMembers = teamMembers?.map(member => {
        // Supabase returns the related record as a single object if it's a one-to-one relation
        const profileData = member.profiles as any; 
        
        return {
          ...member,
          user_name: profileData?.full_name || 'Unknown User',
          user_email: profileData?.email || 'No email provided',
          avatar_url: profileData?.avatar_url,
          profiles: undefined, // Remove the nested object to avoid confusion
        };
      }) || [];

      return { project, teamMembers: processedTeamMembers };
    } catch (error) {
      console.error('Error in getProjectWithTeam:', error);
      return { project: null, teamMembers: [] };
    }
  }

  /**
   * Calculate project progress with subtasks
   */
  static async calculateProjectProgressWithSubtasks(projectId: string): Promise<{ completed: number; total: number; percentage: number }> {
    try {
      const tasks = await this.getProjectTasks(projectId);
      let totalProgress = 0;
      let taskCount = 0;
      let completedTasks = 0;

      for (const task of tasks) {
        const subtasks = await this.getTaskSubtasks(task.id);
        if (subtasks.length > 0) {
          const completedSubtasks = subtasks.filter(subtask => subtask.status === 'completed');
          const taskProgress = (completedSubtasks.length / subtasks.length) * 100;
          totalProgress += taskProgress;
          if (taskProgress === 100) completedTasks++;
        } else {
          if (task.status === 'completed') {
            totalProgress += 100;
            completedTasks++;
          }
        }
        taskCount++;
      }

      const percentage = taskCount > 0 ? Math.round(totalProgress / taskCount) : 0;
      return {
        completed: completedTasks,
        total: taskCount,
        percentage
      };
    } catch (error) {
      console.error('Error calculating project progress:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Get project comments
   */
  static async getProjectComments(projectId: string): Promise<ProjectComment[]> {
    try {
      // First, get the comments
      const { data: comments, error: commentsError } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Error fetching project comments:', commentsError);
        return [];
      }

      if (!comments || comments.length === 0) {
        return [];
      }

      // Then, get user profiles for all comment authors
      const userIds = [...new Set(comments.map(comment => comment.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        // Return comments without user data
        return comments.map(comment => ({
          ...comment,
          user: { id: comment.user_id, full_name: 'Unknown User', avatar_url: null }
        }));
      }

      // Create a map of user profiles
      const profileMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

      // Combine comments with user data
      return comments.map(comment => ({
        ...comment,
        user: profileMap.get(comment.user_id) || { 
          id: comment.user_id, 
          full_name: 'Unknown User', 
          avatar_url: null 
        }
      }));
    } catch (error) {
      console.error('Error in getProjectComments:', error);
      return [];
    }
  }

  /**
   * Create project comment
   */
  static async createProjectComment(comment: Omit<ProjectComment, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectComment> {
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .insert([{
          ...comment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating project comment:', error);
      throw error;
    }
  }

  /**
   * Update project comment
   */
  static async updateProjectComment(commentId: string, content: string): Promise<ProjectComment | null> {
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating project comment:', error);
      return null;
    }
  }

  /**
   * Delete project comment
   */
  static async deleteProjectComment(commentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting project comment:', error);
      return false;
    }
  }

  /**
   * Toggle project comment like
   */
  static async toggleProjectCommentLike(commentId: string): Promise<boolean> {
    try {
      // This is a placeholder implementation
      // You would need to implement the actual like functionality
      console.log('Toggle like for comment:', commentId);
      return true;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      return false;
    }
  }

  /**
   * Calculate days left
   */
  static calculateDaysLeft(dateString: string): number {
    try {
      const targetDate = new Date(dateString);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Error calculating days left:', error);
      return 0;
    }
  }

  /**
   * Cancel pending task assignments
   */
  static async cancelPendingTaskAssignments(userId: string, projectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pending_task_assignments')
        .update({ status: 'cancelled' })
        .eq('assigned_to', userId)
        .eq('project_id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelling pending task assignments:', error);
      return false;
    }
  }

  /**
   * Utility: Convert flat comments array to nested tree
   * @param comments Flat array of comments (must have id, parent_comment_id)
   * @returns Nested array with replies[]
   */
  static buildCommentTree<T extends { id: string; parent_comment_id?: string }>(comments: T[]): (T & { replies: (T & any)[] })[] {
    const map = new Map<string, T & { replies: (T & any)[] }>();
    const roots: (T & { replies: (T & any)[] })[] = [];
    comments.forEach((comment) => {
      map.set(comment.id, { ...comment, replies: [] });
    });
    comments.forEach((comment) => {
      if (comment.parent_comment_id) {
        const parent = map.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(map.get(comment.id)!);
        } else {
          roots.push(map.get(comment.id)!); // Orphaned reply
        }
      } else {
        roots.push(map.get(comment.id)!);
      }
    });
    return roots;
  }

} 