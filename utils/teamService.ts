import { ProjectService } from './projectServiceWrapper';
import { supabase } from './supabase';

export interface SearchUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string; // Keep for backward compatibility
  email?: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  last_seen?: string;
  verified?: boolean;
}

export interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'sponsor' | 'lead' | 'team' | 'fyi';
  status: 'active' | 'pending' | 'inactive';
  joined_at?: string;
  invitation_sent_at?: string;
  permissions?: {
    read: boolean;
    write: boolean;
    delete: boolean;
    invite: boolean;
    manage_members: boolean;
    access_chat: boolean;
    manage_roles: boolean;
    view_analytics: boolean;
  };
}

export interface TeamInvitation {
  id: string;
  project_id: string;
  project_name: string;
  inviter_name: string;
  role: string;
  message?: string;
  invitation_code: string;
  expires_at: string;
  created_at: string;
}

export interface InviteMemberRequest {
  projectId: string;
  userId?: string; // For registered users
  email?: string;
  phone?: string;
  role: 'sponsor' | 'lead' | 'team' | 'fyi';
  message?: string;
  sendNotification?: boolean;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export interface SearchResult {
  users: SearchUser[];
  error: string | null;
}

export interface TeamRole {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    invite: boolean;
    manage_members: boolean;
    access_chat: boolean;
    manage_roles: boolean;
    view_analytics: boolean;
  };
}

export class TeamService {
  // Get all available team roles from database
  static async getTeamRoles(): Promise<TeamRole[]> {
    try {
      const { data: roles, error } = await supabase
        .from('team_roles')
        .select('*')
        .order('role_key');

      if (error) {
        console.error('Error fetching team roles:', error);
        // Fallback to default roles if database is not available
        return this.getDefaultRoles();
      }

      return roles.map(role => ({
        key: role.role_key,
        name: role.role_name,
        description: role.description,
        color: role.color,
        icon: role.icon,
        permissions: role.permissions,
      }));
    } catch (error) {
      console.error('Error getting team roles:', error);
      return this.getDefaultRoles();
    }
  }

  // Get default roles as fallback
  private static getDefaultRoles(): TeamRole[] {
    return [
      {
        key: 'sponsor',
        name: 'Sponsor',
        description: 'Project sponsor with read-only access',
        color: '#EC4899',
        icon: 'heart',
        permissions: {
          read: true,
          write: false,
          delete: false,
          invite: false,
          manage_members: false,
          access_chat: false,
          manage_roles: false,
          view_analytics: true,
        },
      },
      {
        key: 'lead',
        name: 'Lead',
        description: 'Project leader with full control',
        color: '#3B82F6',
        icon: 'star',
        permissions: {
          read: true,
          write: true,
          delete: true,
          invite: true,
          manage_members: true,
          access_chat: true,
          manage_roles: true,
          view_analytics: true,
        },
      },
      {
        key: 'team',
        name: 'Team',
        description: 'Team member with edit and contribute access',
        color: '#10B981',
        icon: 'people',
        permissions: {
          read: true,
          write: true,
          delete: false,
          invite: false,
          manage_members: false,
          access_chat: true,
          manage_roles: false,
          view_analytics: false,
        },
      },
      {
        key: 'fyi',
        name: 'FYI',
        description: 'For your information - minimal access',
        color: '#9CA3AF',
        icon: 'information-circle',
        permissions: {
          read: true,
          write: false,
          delete: false,
          invite: false,
          manage_members: false,
          access_chat: false,
          manage_roles: false,
          view_analytics: false,
        },
      },
    ];
  }

  // Get all team members for a project (using existing project metadata)
  static async getProjectTeamMembers(projectId: string): Promise<TeamMember[]> {
    try {
      console.log('👥 Getting project team members for:', projectId);

      // Import ProjectService to get project data
      const project = await ProjectService.getProject(projectId);
      
      if (!project) {
        console.log('✅ No project found');
        return [];
      }

      // Get team members from project_team_members table (primary source)
      const { data: dbTeamMembers, error: dbError } = await supabase
        .from('project_team_members')
        .select(`
          id,
          user_id,
          role,
          status,
          permissions,
          joined_at,
          created_at,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (dbError) {
        console.error('❌ Error fetching from project_team_members:', dbError);
        // Fall back to metadata if database query fails
      }

      // Transform database team members with enhanced user data fetching
      const dbMembers: TeamMember[] = [];
      for (const member of (dbTeamMembers || [])) {
        // Fix: Ensure member.profiles is always an object, not an array
        let profileObj = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        let userName = profileObj?.full_name || profileObj?.username;
        let userEmail = '';
        // If we don't have user data from the join, fetch it separately
        if (!userName) {
          try {
            const userData = await this.getUserById(member.user_id);
            if (userData) {
              userName = userData.full_name || userData.username || (userData.email ? userData.email.split('@')[0] : '');
              userEmail = userData.email || '';
            }
          } catch (error) {
            console.error('❌ Error fetching user data for member:', member.user_id, error);
          }
        }
        // Final fallback: never allow user_name to be empty
        if (!userName) {
          userName = member.user_id;
          console.warn('⚠️ TeamService: Could not resolve name for user_id:', member.user_id);
        }
        dbMembers.push({
          id: member.id,
          user_id: member.user_id,
          user_name: userName,
          user_email: userEmail, // Will be filled from profiles if needed
          role: member.role,
          status: member.status,
          joined_at: member.joined_at || member.created_at,
          permissions: member.permissions || this.getRolePermissions(member.role)
        });
      }

      // Also get team members from project metadata (for backward compatibility)
      const metadataMembers = project.metadata?.team_members || project.metadata?.members || [];
      const metadataTeamMembers: TeamMember[] = metadataMembers
        .filter((member: any) => {
          // Only include members with valid UUIDs
          const userId = member.user_id || member.id;
          return userId && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        })
        .map((member: any) => ({
          id: member.id || `member-${Date.now()}-${Math.random()}`,
          user_id: member.user_id || member.id,
          user_name: member.user_name || member.full_name || member.name || 'User',
          user_email: member.user_email || member.email || '',
          role: member.role || 'fyi',
          status: member.status || 'active',
          joined_at: member.joined_at || project.created_at,
          permissions: member.permissions || this.getRolePermissions(member.role || 'fyi')
        }));

      // Get project owner/creator as a team member
      let ownerMember: TeamMember | null = null;
      if (project.user_id) {
        try {
          // Get owner's profile information
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, email')
            .eq('id', project.user_id)
            .single();

          let ownerName = ownerProfile?.full_name || ownerProfile?.username;
          let ownerEmail = ownerProfile?.email || '';

          // If both full_name and username are missing, call getUserById for fallback
          if (!ownerName) {
            try {
              const fallbackProfile = await this.getUserById(project.user_id);
              if (fallbackProfile) {
                ownerName = fallbackProfile.full_name || fallbackProfile.username || (fallbackProfile.email ? fallbackProfile.email.split('@')[0] : 'Project Owner');
                ownerEmail = fallbackProfile.email || '';
              }
            } catch (fallbackError) {
              console.error('❌ Fallback getUserById for owner failed:', fallbackError);
            }
          }

          // Final fallback: never allow ownerName to be empty or a UUID
          if (!ownerName || ownerName === project.user_id) {
            ownerName = 'Project Owner';
          }

          ownerMember = {
            id: `owner-${project.user_id}`,
            user_id: project.user_id,
            user_name: ownerName,
            user_email: ownerEmail,
            role: 'sponsor' as const, // Use 'sponsor' role for project owner
            status: 'active' as const,
            joined_at: project.created_at,
            permissions: this.getRolePermissions('sponsor')
          };

          console.log('👑 Project owner found:', ownerMember.user_name);
        } catch (profileError) {
          console.error('❌ Error fetching owner profile:', profileError);
          // Fallback: try getUserById
          try {
            const fallbackProfile = await this.getUserById(project.user_id);
            let ownerName = fallbackProfile?.full_name || fallbackProfile?.username || (fallbackProfile?.email ? fallbackProfile.email.split('@')[0] : 'Project Owner');
            let ownerEmail = fallbackProfile?.email || '';
            if (!ownerName || ownerName === project.user_id) {
              ownerName = 'Project Owner';
            }
            ownerMember = {
              id: `owner-${project.user_id}`,
              user_id: project.user_id,
              user_name: ownerName,
              user_email: ownerEmail,
              role: 'sponsor' as const,
              status: 'active' as const,
              joined_at: project.created_at,
              permissions: this.getRolePermissions('sponsor')
            };
          } catch (fallbackError) {
            console.error('❌ Fallback getUserById for owner failed:', fallbackError);
            ownerMember = {
              id: `owner-${project.user_id}`,
              user_id: project.user_id,
              user_name: 'Project Owner',
              user_email: '',
              role: 'sponsor' as const,
              status: 'active' as const,
              joined_at: project.created_at,
              permissions: this.getRolePermissions('sponsor')
            };
          }
        }
      }

      // Merge all sources, prioritizing database entries, then owner, then metadata
      const mergedMembers = new Map<string, TeamMember>();
      
      // Add database members first
      dbMembers.forEach(member => {
        mergedMembers.set(member.user_id, member);
      });

      // Add owner if not already in database members
      if (ownerMember && !mergedMembers.has(ownerMember.user_id)) {
        mergedMembers.set(ownerMember.user_id, ownerMember);
      }

      // Add metadata members only if they don't exist in database or as owner
      metadataTeamMembers.forEach(member => {
        if (!mergedMembers.has(member.user_id)) {
          mergedMembers.set(member.user_id, member);
        }
      });

      const finalMembers = Array.from(mergedMembers.values());
      console.log('✅ Team members retrieved (including owner):', finalMembers.length);
      return finalMembers;
    } catch (error) {
      console.error('❌ Get team members failed:', error);
      return [];
    }
  }

  // Enhanced user search with better filtering and pagination
  static async searchUsers(query: string, limit: number = 100): Promise<SearchResult> {
    try {
      if (!query.trim()) {
        return { users: [], error: null };
      }

      console.log('🔍 TeamService.searchUsers called with:', { query, limit });

      // Get current user to exclude from results
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.log('❌ No authenticated user found');
        return { users: [], error: 'User not authenticated' };
      }

      console.log('✅ Current user:', currentUser.id);

      // Always search for first_name, last_name, username, and full_name
      const searchQuery = supabase
        .from('profiles')
        .select('id, username, first_name, last_name, full_name, avatar_url, created_at, updated_at')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', currentUser.id)
        .order('first_name', { ascending: true });

      console.log('🔍 Executing prioritized search query...');
      const { data: profiles, error } = await searchQuery;

      if (error) {
        console.error('❌ Search query failed:', error);
        
        // Check if it's an RLS permission error
        if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
          return { 
            users: [], 
            error: 'Permission denied. Make sure you are signed in and RLS policies allow profile access.' 
          };
        }
        
        return { users: [], error: error.message };
      }

      console.log(`✅ Search successful. Found ${profiles?.length || 0} profiles total`);

      if (!profiles || profiles.length === 0) {
        return { users: [], error: null };
      }

      // Prioritize results: first_name/last_name matches first, then username/full_name
      const searchLower = query.toLowerCase();
      const prioritized = [
        // First: first_name or last_name matches
        ...profiles.filter(p =>
          (p.first_name && p.first_name.toLowerCase().includes(searchLower)) ||
          (p.last_name && p.last_name.toLowerCase().includes(searchLower))
        ),
        // Then: username/full_name matches not already included
        ...profiles.filter(p =>
          !((p.first_name && p.first_name.toLowerCase().includes(searchLower)) ||
            (p.last_name && p.last_name.toLowerCase().includes(searchLower))) &&
          ((p.username && p.username.toLowerCase().includes(searchLower)) ||
           (p.full_name && p.full_name.toLowerCase().includes(searchLower)))
        )
      ];

      // Remove duplicates (in case of overlap)
      const seen = new Set();
      const uniqueResults = prioritized.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      // Transform profiles to SearchUser
      const users: SearchUser[] = uniqueResults.slice(0, limit).map(profile => {
        let firstName = profile.first_name || '';
        let lastName = profile.last_name || '';
        let fullName = profile.full_name || '';
        if (fullName && !firstName && !lastName) {
          const nameParts = fullName.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        if (!fullName && (firstName || lastName)) {
          fullName = `${firstName} ${lastName}`.trim();
        }
        if (!fullName && profile.username) {
          fullName = profile.username;
        }
        if (!fullName && !firstName && !lastName && !profile.username) {
          fullName = 'User';
        }
        return {
          id: profile.id,
          username: profile.username || '',
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: undefined,
          avatar_url: profile.avatar_url || undefined,
          status: 'offline' as const,
          last_seen: undefined,
          verified: false,
          created_at: profile.created_at || new Date().toISOString()
        };
      });

      console.log(`✅ Prioritized users: ${users.length} results`);
      return { users, error: null };
    } catch (error) {
      console.error('❌ TeamService.searchUsers error:', error);
      return { 
        users: [], 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // New function to get all users for debugging and verification
  static async getAllUsers(limit: number = 1000): Promise<SearchResult> {
    try {
      console.log('🔍 Getting all users for verification...');

      // Get current user to exclude from results
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.log('❌ No authenticated user found');
        return { users: [], error: 'User not authenticated' };
      }

      // Get all profiles in the database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, full_name, avatar_url, created_at, updated_at')
        .neq('id', currentUser.id) // Exclude current user
        .order('first_name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Get all users failed:', error);
        return { users: [], error: error.message };
      }

      console.log(`✅ Found ${profiles?.length || 0} total users in database`);

      if (!profiles || profiles.length === 0) {
        return { users: [], error: null };
      }

      // Transform profiles to match expected user format
      const users: SearchUser[] = profiles.map(profile => {
        // Construct full name from first_name and last_name if available
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = profile.full_name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
        
        return {
          id: profile.id,
          username: profile.username || '',
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: undefined,
          avatar_url: profile.avatar_url || undefined,
          status: 'offline' as const,
          last_seen: undefined,
          verified: false,
          created_at: profile.created_at || new Date().toISOString()
        };
      });

      // Log users by first letter for debugging
      const usersByLetter: { [key: string]: number } = {};
      users.forEach(user => {
        const firstLetter = (user.first_name || user.full_name || user.username || '').charAt(0).toUpperCase();
        usersByLetter[firstLetter] = (usersByLetter[firstLetter] || 0) + 1;
      });

      console.log('📊 Users by first letter:', usersByLetter);
      console.log('🔍 Users starting with Z:', users.filter(u => 
        (u.first_name || u.full_name || u.username || '').toLowerCase().startsWith('z')
      ).map(u => ({ first_name: u.first_name, last_name: u.last_name, full_name: u.full_name, username: u.username })));

      return { users, error: null };

    } catch (error) {
      console.error('❌ GetAllUsers error:', error);
      return { 
        users: [], 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Get suggested users (recent collaborators, frequent contacts)
  static async getSuggestedUsers(limit: number = 10): Promise<SearchUser[]> {
    // Temporarily disabled due to RLS restrictions on project_team_members table
    console.log('⚠️ Suggested users disabled due to RLS restrictions');
    return [];
  }

  // Updated inviteTeamMember to create invitation records
  static async inviteTeamMember(request: InviteMemberRequest): Promise<{
    success: boolean;
    invitationId?: string;
    error?: string;
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get project details
      const project = await ProjectService.getProject(request.projectId);
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Check if user is already a team member (both in metadata and project_team_members table)
      const existingMembers = project.metadata?.team_members || project.metadata?.members || [];
      const isAlreadyMember = existingMembers.some((member: any) => 
        member.user_id === request.userId || member.id === request.userId
      );

      if (isAlreadyMember) {
        return { success: false, error: 'User is already a team member' };
      }

      // Check if user is already in project_team_members table
      if (request.userId) {
        const { data: existingTeamMember } = await supabase
          .from('project_team_members')
          .select('id')
          .eq('project_id', request.projectId)
          .eq('user_id', request.userId)
          .eq('status', 'active')
          .single();

        if (existingTeamMember) {
          return { success: false, error: 'User is already a team member' };
        }
      }

      // Handle existing pending invitations - update them instead of blocking
      if (request.userId) {
        // Update any existing pending invitations for this user to the new role
        await supabase
          .from('team_invitations')
          .update({
            role: request.role,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .eq('project_id', request.projectId)
          .eq('invitee_id', request.userId)
          .eq('status', 'pending');
      }

      // Handle existing pending invitations by email
      if (request.email) {
        await supabase
          .from('team_invitations')
          .update({
            role: request.role,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .eq('project_id', request.projectId)
          .eq('invitee_email', request.email)
          .eq('status', 'pending');
      }

      // Clean up old declined invitations (older than 30 days) to prevent database bloat
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await supabase
        .from('team_invitations')
        .delete()
        .eq('project_id', request.projectId)
        .eq('status', 'declined')
        .lt('created_at', thirtyDaysAgo.toISOString());

      // REMOVED: Rate limiting checks for duplicate invitations
      // Users can now send unlimited invitations to the same person
      // This allows for re-inviting users who may have missed or declined previous invitations

      // Create invitation record
      let inviteeEmail = request.email;
      
      // If we have a userId but no email, fetch the user's email from their profile
      if (request.userId && !request.email) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', request.userId)
            .single();
          
          if (userProfile?.email) {
            inviteeEmail = userProfile.email;
          } else {
            // If no email found in profile, use a placeholder
            inviteeEmail = `user-${request.userId}@placeholder.com`;
          }
        } catch (profileError) {
          console.error('Error fetching user email:', profileError);
          // Use a placeholder email if we can't fetch the real one
          inviteeEmail = `user-${request.userId}@placeholder.com`;
        }
      }
      
      // If still no email, use a placeholder
      if (!inviteeEmail) {
        inviteeEmail = 'no-email@placeholder.com';
      }

      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .insert({
          project_id: request.projectId,
          inviter_id: currentUser.user.id,
          invitee_id: request.userId || null,
          invitee_email: inviteeEmail,
          role: request.role,
          status: 'pending'
        })
        .select()
        .single();

      if (invitationError) {
        console.error('Error creating invitation:', invitationError);
        
        // Provide specific error messages for RLS issues
        if (invitationError.code === '42501') {
          return { 
            success: false, 
            error: 'Database permission denied. Please contact support to fix RLS policies for team_invitations table.' 
          };
        }
        
        if (invitationError.message?.includes('permission denied')) {
          return { 
            success: false, 
            error: 'Permission denied. The team_invitations table has restrictive RLS policies. Please run the SQL fix commands in Supabase.' 
          };
        }
        
        return { success: false, error: 'Failed to create invitation' };
      }

      // Store pending team member in project_team_members table (for registered users)
      if (request.userId) {
        try {
          // Get user profile for the invited user
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', request.userId)
            .single();

          // Add pending team member to project_team_members table
          const { error: teamMemberError } = await supabase
            .from('project_team_members')
            .insert({
              project_id: request.projectId,
              user_id: request.userId,
              role: request.role,
              status: 'pending',
              permissions: this.getRolePermissions(request.role),
              created_at: new Date().toISOString()
            });

          if (teamMemberError) {
            console.error('Error adding pending team member:', teamMemberError);
            // Don't fail the invitation if this fails, but log it
          } else {
            console.log('✅ Pending team member added to project_team_members table');
          }
        } catch (profileError) {
          console.error('Error getting user profile for pending member:', profileError);
          // Continue with invitation even if profile fetch fails
        }
      }

      // Send in-app notification to the invited user (only if userId is provided)
      if (request.userId) {
        await this.sendInAppNotification(request.userId, {
          type: 'team_invitation',
          title: 'Team Invitation',
          message: `You've been invited to join "${project.name}" as ${request.role}`,
          data: {
            invitationId: invitation.id,
            projectId: request.projectId,
            projectName: project.name,
            inviterName: currentUser.user.user_metadata?.full_name || 'A team member',
            role: request.role,
            message: request.message
          }
        });
      }

      // TODO: Send email notification if email is provided
      if (request.email) {
        // Email notification will be implemented in Step 3
        console.log('Email notification would be sent to:', request.email);
      }

      return {
        success: true,
        invitationId: invitation.id
      };
    } catch (error) {
      console.error('Invitation error:', error);
      return { success: false, error: 'Failed to create invitation' };
    }
  }

  // Send in-app notification
  static async sendInAppNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data: any;
    }
  ): Promise<boolean> {
    try {
      // Map notification types to valid database values
      const validTypes = [
        'team_invitation',
        'project_update', 
        'task_assignment',
        'comment_mention',
        'deadline_reminder',
        'role_change',
        'project_invitation',
        'info',
        'warning',
        'success',
        'error'
      ];

      // Use a valid type or default to 'info'
      const notificationType = validTypes.includes(notification.type) 
        ? notification.type 
        : 'info';

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: notificationType,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: false
        });

      if (error) {
        console.error('Failed to send in-app notification:', error);
        
        // If it's a constraint error, log the specific issue
        if (error.code === '23514') {
          console.error('Notification type constraint violation. Valid types:', validTypes);
        }
        
        return false;
      }

      return true;
    } catch (error) {
      console.error('In-app notification error:', error);
      return false;
    }
  }

  // Get user notifications
  static async getUserNotifications(userId?: string): Promise<NotificationData[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const targetUserId = userId || currentUser.user?.id;
      
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Notifications fetch error:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Mark notification read error:', error);
      return false;
    }
  }

  // Get pending invitations for a project
  static async getProjectInvitations(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        
        // Provide specific error messages for RLS issues
        if (error.code === '42501') {
          console.error('RLS permission denied for team_invitations table');
        }
        
        return [];
      }

      // If we have invitations, fetch the related profile data separately
      if (data && data.length > 0) {
        const inviterIds = [...new Set(data.map(inv => inv.inviter_id).filter(Boolean))];
        const inviteeIds = [...new Set(data.map(inv => inv.invitee_id).filter(Boolean))];
        
        // Fetch inviter profiles
        const { data: inviterProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', inviterIds);

        // Fetch invitee profiles
        const { data: inviteeProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', inviteeIds);

        // Merge the data
        return data.map(invitation => ({
          ...invitation,
          inviter: inviterProfiles?.find(p => p.id === invitation.inviter_id),
          invitee: inviteeProfiles?.find(p => p.id === invitation.invitee_id)
        }));
      }

      return data || [];
    } catch (error) {
      console.error('Error getting project invitations:', error);
      return [];
    }
  }

  // Accept invitation
  static async acceptInvitation(invitationId: string): Promise<{
    success: boolean;
    projectId?: string;
    projectName?: string;
    role?: string;
    error?: string;
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get invitation details
      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invitee_id', currentUser.user.id)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        return { success: false, error: 'Invitation not found or already processed' };
      }

      // Get project details
      const project = await ProjectService.getProject(invitation.project_id);
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Check if user is already a team member
      const { data: existingMember } = await supabase
        .from('project_team_members')
        .select('id, status')
        .eq('project_id', invitation.project_id)
        .eq('user_id', currentUser.user.id)
        .single();

      if (existingMember) {
        if (existingMember.status === 'active') {
          // User is already an active member, just update invitation status
          await supabase
            .from('team_invitations')
            .update({
              status: 'accepted',
              responded_at: new Date().toISOString()
            })
            .eq('id', invitationId);

          return { 
            success: true, 
            projectId: project.id, 
            projectName: project.name, 
            role: invitation.role 
          };
        } else if (existingMember.status === 'pending') {
          // User has a pending invitation, update to active
          const { error: updateError } = await supabase
            .from('project_team_members')
            .update({
              status: 'active',
              joined_at: new Date().toISOString()
            })
            .eq('id', existingMember.id);

          if (updateError) {
            console.error('Error updating pending member to active:', updateError);
            return { success: false, error: 'Failed to activate team member' };
          }

          console.log('✅ Pending team member activated');
        }
      } else {
        // User is not in project_team_members table, add them as active
        const { error: teamMemberError } = await supabase
          .from('project_team_members')
          .insert({
            project_id: invitation.project_id,
            user_id: currentUser.user.id,
            role: invitation.role,
            status: 'active',
            permissions: this.getRolePermissions(invitation.role),
            joined_at: new Date().toISOString()
          });

        if (teamMemberError) {
          console.error('Error adding user to project_team_members:', teamMemberError);
          return { success: false, error: 'Failed to add user to project team' };
        }

        console.log('✅ New team member added to project_team_members table');
      }

      // Get user profile for metadata update
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', currentUser.user.id)
        .single();

      // Add user to project metadata (for backward compatibility)
      const existingMembers = project.metadata?.team_members || project.metadata?.members || [];
      const newMember = {
        id: currentUser.user.id,
        user_id: currentUser.user.id,
                    user_name: userProfile?.full_name || userProfile?.username || 'User',
        user_email: currentUser.user.email || '',
        role: invitation.role,
        status: 'active',
        joined_at: new Date().toISOString(),
        permissions: this.getRolePermissions(invitation.role)
      };

      // Update project metadata
      const updatedMetadata = {
        ...project.metadata,
        team_members: [...existingMembers, newMember]
      };

      const updatedProject = await ProjectService.updateProject(invitation.project_id, {
        metadata: updatedMetadata
      });

      if (!updatedProject) {
        console.error('Failed to update project metadata');
        // Don't fail the whole operation if metadata update fails
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
      }

      // Activate pending task assignments for this user in this project
      // Note: This functionality is handled automatically when the user accepts the invitation
      console.log('✅ User accepted invitation, pending task assignments will be handled automatically');

      // Mark the invitation notification as read
      try {
        // First, get all team invitation notifications for this user
        const { data: notifications } = await supabase
          .from('notifications')
          .select('id, data')
          .eq('user_id', currentUser.user.id)
          .eq('type', 'team_invitation')
          .eq('read', false);

        if (notifications && notifications.length > 0) {
          // Find notifications that match this invitation ID
          const matchingNotifications = notifications.filter(notification => {
            try {
              const data = notification.data;
              return data && data.invitationId === invitationId;
            } catch (error) {
              return false;
            }
          });

          if (matchingNotifications.length > 0) {
            const notificationIds = matchingNotifications.map(n => n.id);
            await supabase
              .from('notifications')
              .update({ read: true })
              .in('id', notificationIds);
          }
        }
      } catch (notificationError) {
        console.error('Error marking notification as read:', notificationError);
        // Don't fail the operation if notification update fails
      }

      // Send notification to project owner (only if project owner is different from current user)
      if (project.user_id !== currentUser.user.id) {
        try {
          await this.sendInAppNotification(project.user_id!, {
            type: 'team_invitation',
            title: 'Team Member Joined',
            message: `${userProfile?.full_name || userProfile?.username || 'A user'} has accepted the invitation to join "${project.name}"`,
            data: {
              projectId: project.id,
              projectName: project.name,
              memberId: currentUser.user.id,
              memberName: userProfile?.full_name || userProfile?.username,
              role: invitation.role
            }
          });
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          // Don't fail the operation if notification fails
        }
      }

      return { 
        success: true, 
        projectId: project.id, 
        projectName: project.name, 
        role: invitation.role 
      };
    } catch (error) {
      console.error('Accept invitation error:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Decline invitation
  static async declineInvitation(invitationId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get invitation details first
      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invitee_id', currentUser.user.id)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        return { success: false, error: 'Invitation not found or already processed' };
      }

      // Update invitation status (without decline_reason to avoid column errors)
      const updateData: any = {
        status: 'declined',
        responded_at: new Date().toISOString()
      };

      // Only add decline_reason if the column exists (optional)
      if (reason) {
        updateData.decline_reason = reason;
      }

      const { error: updateError } = await supabase
        .from('team_invitations')
        .update(updateData)
        .eq('id', invitationId)
        .eq('invitee_id', currentUser.user.id)
        .eq('status', 'pending');

      if (updateError) {
        console.error('Error declining invitation:', updateError);
        return { success: false, error: 'Failed to decline invitation' };
      }

      // Remove pending team member from project_team_members table
      const { error: removeError } = await supabase
        .from('project_team_members')
        .delete()
        .eq('project_id', invitation.project_id)
        .eq('user_id', currentUser.user.id)
        .eq('status', 'pending');

      if (removeError) {
        console.error('Error removing pending team member:', removeError);
        // Don't fail the operation if this fails, but log it
      } else {
        console.log('✅ Pending team member removed from project_team_members table');
      }

      // Cancel pending task assignments for this user in this project
      try {
        const cancellationResult = await ProjectService.cancelPendingTaskAssignments(
          currentUser.user.id, 
          invitation.project_id
        );
        
        if (cancellationResult) {
          console.log('✅ Pending task assignments cancelled successfully');
        } else {
          console.log('⚠️ Failed to cancel some pending task assignments');
        }
      } catch (cancellationError) {
        console.error('Error cancelling pending task assignments:', cancellationError);
        // Don't fail the invitation decline if task cancellation fails
      }

      // Fetch project info and team members
      const { data: project } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', invitation.project_id)
        .single();
      const { data: teamMembers } = await supabase
        .from('project_team_members')
        .select('user_id')
        .eq('project_id', invitation.project_id)
        .eq('status', 'active');
      // Fetch declining user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', currentUser.user.id)
        .single();
      // Send notification to all active team members except declining user
      if (teamMembers && teamMembers.length > 0) {
        for (const member of teamMembers) {
          if (member.user_id !== currentUser.user.id) {
            await this.sendInAppNotification(member.user_id, {
              type: 'invitation_declined',
              title: 'Invitation Declined',
              message: `${userProfile?.full_name || userProfile?.username || 'A user'} declined the invitation to join "${project?.name || 'the project'}"${reason ? `: ${reason}` : ''}`,
              data: {
                projectId: project?.id,
                projectName: project?.name,
                declinedBy: userProfile?.full_name || userProfile?.username,
                reason: reason || ''
              }
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Decline invitation error:', error);
      return { success: false, error: 'Failed to decline invitation' };
    }
  }

  // Get user's pending invitations
  static async getUserPendingInvitations(): Promise<any[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return [];

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('invitee_id', currentUser.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user invitations:', error);
        return [];
      }

      // If we have invitations, fetch the related data separately
      if (data && data.length > 0) {
        const projectIds = [...new Set(data.map(inv => inv.project_id).filter(Boolean))];
        const inviterIds = [...new Set(data.map(inv => inv.inviter_id).filter(Boolean))];
        
        // Fetch project details
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, description')
          .in('id', projectIds);

        // Fetch inviter profiles
        const { data: inviterProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', inviterIds);

        // Merge the data
        return data.map(invitation => ({
          ...invitation,
          project: projects?.find(p => p.id === invitation.project_id),
          inviter: inviterProfiles?.find(p => p.id === invitation.inviter_id)
        }));
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user invitations:', error);
      return [];
    }
  }

  // Check if user has access to project
  static async checkProjectAccess(
    projectId: string, 
    userId?: string,
    requiredPermission?: keyof TeamMember['permissions']
  ): Promise<{
    hasAccess: boolean;
    role?: string;
    permissions?: TeamMember['permissions'];
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const targetUserId = userId || currentUser.user?.id;
      
      if (!targetUserId) return { hasAccess: false };

      // Check if user is project owner
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (project?.user_id === targetUserId) {
        const ownerPermissions = this.getRolePermissions('sponsor');
        return { 
          hasAccess: true, 
          role: 'sponsor', 
          permissions: ownerPermissions 
        };
      }

      // Check team membership
      const { data: member } = await supabase
        .from('project_team_members')
        .select('role, permissions, status')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .maybeSingle();

      if (!member) return { hasAccess: false };

      const hasRequiredPermission = !requiredPermission || 
        member.permissions?.[requiredPermission] === true;

      return {
        hasAccess: hasRequiredPermission,
        role: member.role,
        permissions: member.permissions
      };
    } catch (error) {
      console.error('Check project access error:', error);
      return { hasAccess: false };
    }
  }

  // Get user's accessible projects
  static async getUserAccessibleProjects(userId?: string): Promise<{
    ownedProjects: any[];
    memberProjects: any[];
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const targetUserId = userId || currentUser.user?.id;
      
      if (!targetUserId) return { ownedProjects: [], memberProjects: [] };

      // Get owned projects
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', targetUserId);

      // Get projects where user is a team member
      const { data: memberProjects } = await supabase
        .from('project_team_members')
        .select(`
          role,
          permissions,
          joined_at,
          project:projects(*)
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .not('project', 'is', null);

      return {
        ownedProjects: ownedProjects || [],
        memberProjects: (memberProjects || []).map(m => ({
          ...m.project,
          team_role: m.role,
          team_permissions: m.permissions,
          joined_at: m.joined_at
        }))
      };
    } catch (error) {
      console.error('Get accessible projects error:', error);
      return { ownedProjects: [], memberProjects: [] };
    }
  }

  // Remove team member (metadata approach)
  static async removeTeamMember(projectId: string, memberId: string): Promise<boolean> {
    try {
      const project = await ProjectService.getProject(projectId);
      
      if (!project || !project.metadata) {
        return false;
      }

      const existingMembers = project.metadata.team_members || project.metadata.members || [];
      const updatedMembers = existingMembers.filter((member: any) => 
        member.id !== memberId && member.user_id !== memberId
      );

      const updatedMetadata = {
        ...project.metadata,
        team_members: updatedMembers
      };

      const updatedProject = await ProjectService.updateProject(projectId, {
        metadata: updatedMetadata
      });

      return !!updatedProject;
    } catch (error) {
      console.error('Remove team member error:', error);
      return false;
    }
  }

  // Update team member role (metadata approach)
  static async updateMemberRole(
    projectId: string, 
    memberId: string, 
    newRole: TeamMember['role']
  ): Promise<boolean> {
    try {
      const project = await ProjectService.getProject(projectId);
      
      if (!project || !project.metadata) {
        return false;
      }

      const existingMembers = project.metadata.team_members || project.metadata.members || [];
      const updatedMembers = existingMembers.map((member: any) => {
        if (member.id === memberId || member.user_id === memberId) {
          return {
            ...member,
            role: newRole,
            permissions: this.getRolePermissions(newRole)
          };
        }
        return member;
      });

      const updatedMetadata = {
        ...project.metadata,
        team_members: updatedMembers
      };

      const updatedProject = await ProjectService.updateProject(projectId, {
        metadata: updatedMetadata
      });

      return !!updatedProject;
    } catch (error) {
      console.error('Update member role error:', error);
      return false;
    }
  }

  // Get user's team invitations
  static async getUserInvitations(): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          project:projects(name, description),
          inviter:profiles(full_name, username)
        `)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching invitations:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Invitations fetch error:', error);
      return [];
    }
  }

  // Send invitation via email/SMS
  static async sendInvitationNotification(
    invitationCode: string,
    email?: string,
    phone?: string,
    projectName?: string,
    inviterName?: string,
    role?: string,
    message?: string
  ): Promise<boolean> {
    try {
      if (email) {
        // Import EmailService dynamically to avoid circular dependencies
        const { EmailService } = await import('./emailService');
        
        const success = await EmailService.sendTeamInvitation(
          email,
          invitationCode,
          projectName || 'Project',
          inviterName || 'Team Member',
          role || 'member',
          message
        );
        
        if (success) {
          console.log(`✅ Email invitation sent to ${email}`);
        } else {
          console.log(`❌ Failed to send email invitation to ${email}`);
        }
        
        return success;
      }
      
      if (phone) {
        // TODO: Integrate with SMS service (Twilio, etc.)
        const inviteLink = `https://your-app.com/invite/${invitationCode}`;
        console.log(`📱 SMS invitation to ${phone}: ${inviteLink}`);
        // For now, return true as SMS is not implemented
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Notification send error:', error);
      return false;
    }
  }

  // Debug method to help troubleshoot user discovery issues
  static async debugUserDiscovery(): Promise<{
    currentUser: any;
    allProfiles: any[];
    profilesTableAccess: boolean;
    authUsersAccess: boolean;
    rlsPolicies: string[];
  }> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      // Test profiles table access
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      // Try to check auth.users table (may not work due to RLS)
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email, created_at')
        .limit(5);

      console.log('🔍 User Discovery Debug Report:');
      console.log('Current User:', currentUser.user?.id);
      console.log('Profiles found:', profiles?.length || 0);
      console.log('Profiles error:', profilesError?.message);
      console.log('Auth users error:', authError?.message);
      console.log('Sample profiles:', profiles?.map(p => ({ 
        id: p.id, 
        username: p.username, 
        full_name: p.full_name 
      })));

      return {
        currentUser: currentUser.user,
        allProfiles: profiles || [],
        profilesTableAccess: !profilesError,
        authUsersAccess: !authError,
        rlsPolicies: [] // Could be expanded to check policies
      };
    } catch (error: any) {
      console.error('Debug discovery error:', error);
      return {
        currentUser: null,
        allProfiles: [],
        profilesTableAccess: false,
        authUsersAccess: false,
        rlsPolicies: []
      };
    }
  }

  // Helper method to create a profile for a user (for testing)
  static async createTestProfile(userId: string, userData: { username: string; full_name: string }): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: userData.username,
          full_name: userData.full_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error creating test profile:', error);
        return false;
      }

      console.log('✅ Test profile created:', data);
      return true;
    } catch (error) {
      console.error('Create test profile error:', error);
      return false;
    }
  }

  // Get user by ID for task assignment info
  static async getUserById(userId: string): Promise<SearchUser | null> {
    try {
      console.log('🔍 TeamService.getUserById called for userId:', userId);
      if (!userId || typeof userId !== 'string') {
        console.error('❌ Invalid userId provided:', userId);
        return null;
      }

      // First try to get from profiles table
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, full_name, avatar_url, created_at, updated_at')
        .eq('id', userId)
        .single();

      // If profile is missing, try to create it from auth metadata
      if ((!profile || error?.code === 'PGRST116') && !error?.message?.includes('permission denied')) {
        try {
          // Try to get user from auth
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
          if (!authError && authUser?.user) {
            // Try to create profile
            const { ProfileService } = await import('./profileService');
            await ProfileService.createProfile(userId, authUser.user);
            // Re-fetch profile
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('id, username, first_name, last_name, full_name, avatar_url, created_at, updated_at')
              .eq('id', userId)
              .single();
            profile = newProfile;
          }
        } catch (createProfileError) {
          console.error('❌ Error creating/fetching profile for user:', userId, createProfileError);
        }
      }

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        // If it's an RLS error, try alternative approach
        if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
          console.log('⚠️ RLS permission error, trying alternative approach...');
          // Try to get user from auth.users table as fallback
          try {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
            if (!authError && authUser?.user) {
              const authFullName = authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || authUser.user.email || '';
              const authFirstName = authUser.user.user_metadata?.first_name || authFullName.split(' ')[0] || '';
              const authLastName = authUser.user.user_metadata?.last_name || authFullName.split(' ').slice(1).join(' ') || '';
              
              return {
                id: authUser.user.id,
                username: authUser.user.email?.split('@')[0] || '',
                first_name: authFirstName,
                last_name: authLastName,
                full_name: authFullName,
                email: authUser.user.email,
                avatar_url: authUser.user.user_metadata?.avatar_url || undefined,
                status: 'offline' as const,
                last_seen: undefined,
                verified: !!authUser.user.email_confirmed_at
              };
            }
          } catch (authFallbackError) {
            console.error('❌ Auth fallback also failed:', authFallbackError);
          }
          // If all else fails, return a basic user object
          console.log('⚠️ Returning fallback user object for:', userId);
          return {
            id: userId,
            username: '',
            first_name: '',
            last_name: '',
            full_name: '',
            email: undefined,
            avatar_url: undefined,
            status: 'offline' as const,
            last_seen: undefined,
            verified: false
          };
        }
        return null;
      }

      if (!profile) {
        console.log('⚠️ No profile found for userId:', userId);
        // Return a basic user object instead of null
        return {
          id: userId,
          username: '',
          first_name: '',
          last_name: '',
          full_name: '',
          email: undefined,
          avatar_url: undefined,
          status: 'offline' as const,
          last_seen: undefined,
          verified: false
        };
      }

      // If both first_name/last_name and username are missing, try to get from auth
      if (!profile.first_name && !profile.last_name && !profile.username) {
        try {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
          if (!authError && authUser?.user) {
            const authFullName = authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || authUser.user.email || '';
            const authFirstName = authUser.user.user_metadata?.first_name || authFullName.split(' ')[0] || '';
            const authLastName = authUser.user.user_metadata?.last_name || authFullName.split(' ').slice(1).join(' ') || '';
            
            return {
              id: profile.id,
              username: authUser.user.email?.split('@')[0] || '',
              first_name: authFirstName,
              last_name: authLastName,
              full_name: authFullName,
              email: authUser.user.email,
              avatar_url: profile.avatar_url || authUser.user.user_metadata?.avatar_url || undefined,
              status: 'offline' as const,
              last_seen: undefined,
              verified: !!authUser.user.email_confirmed_at
            };
          }
        } catch (authFallbackError) {
          console.error('❌ Auth fallback also failed:', authFallbackError);
        }
      }

      // If we have a profile with name data, return it
      if (profile.first_name || profile.last_name || profile.full_name || profile.username) {
        // Construct full name from first_name and last_name if available
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = profile.full_name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
        
        return {
          id: profile.id,
          username: profile.username || '',
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email: undefined,
          avatar_url: profile.avatar_url || undefined,
          status: 'offline' as const,
          last_seen: undefined,
          verified: false
        };
      }

      // Final fallback: return empty name, never 'User' or 'Unknown User'
      return {
        id: userId,
        username: '',
        first_name: '',
        last_name: '',
        full_name: '',
        email: undefined,
        avatar_url: undefined,
        status: 'offline' as const,
        last_seen: undefined,
        verified: false
      };
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      // Return a basic user object instead of null to prevent 'Unknown User'
      return {
        id: userId,
        username: '',
        first_name: '',
        last_name: '',
        full_name: '',
        email: undefined,
        avatar_url: undefined,
        status: 'offline' as const,
        last_seen: undefined,
        verified: false
      };
    }
  }

  // Helper to get role permissions
  private static getRolePermissions(role: string): TeamMember['permissions'] {
    switch (role) {
      case 'sponsor':
        return {
          read: true,
          write: false,
          delete: false,
          invite: false,
          manage_members: false,
          access_chat: false,
          manage_roles: false,
          view_analytics: true
        };
      case 'lead':
        return {
          read: true,
          write: true,
          delete: true,
          invite: true,
          manage_members: true,
          access_chat: true,
          manage_roles: true,
          view_analytics: true
        };
      case 'team':
        return {
          read: true,
          write: true,
          delete: true,
          invite: true,
          manage_members: true,
          access_chat: true,
          manage_roles: true,
          view_analytics: true
        };
      case 'fyi':
        return {
          read: true,
          write: false,
          delete: false,
          invite: false,
          manage_members: false,
          access_chat: false,
          manage_roles: false,
          view_analytics: false
        };
      default:
        return {
          read: true,
          write: false,
          delete: false,
          invite: false,
          manage_members: false,
          access_chat: false,
          manage_roles: false,
          view_analytics: false
        };
    }
  }

  // Delete a notification by id
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Clean up old declined invitations (older than 30 days) to prevent database bloat
  static async cleanupOldInvitations(): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('status', 'declined')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error cleaning up old invitations:', error);
        return false;
      }

      console.log('✅ Old declined invitations cleaned up');
      return true;
    } catch (error) {
      console.error('Error in cleanupOldInvitations:', error);
      return false;
    }
  }

  // Remove all pending invitations for a specific user and project
  static async removePendingInvitations(projectId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('project_id', projectId)
        .eq('invitee_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error removing pending invitations:', error);
        return false;
      }

      console.log('✅ Pending invitations removed for user:', userId);
      return true;
    } catch (error) {
      console.error('Error in removePendingInvitations:', error);
      return false;
    }
  }

  // Ensure user profile has proper names for searchability
  static async ensureProfileSearchable(userId: string): Promise<boolean> {
    try {
      console.log('🔍 Ensuring profile is searchable for user:', userId);
      
      // Get current profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, full_name, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return false;
      }

      let needsUpdate = false;
      const updates: any = {};

      // Check if profile has proper names
      if (!profile.full_name || profile.full_name.trim() === '') {
        // Try to construct full name from first/last
        if (profile.first_name || profile.last_name) {
          updates.full_name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        } else if (profile.username) {
          // Use username as fallback
          updates.full_name = profile.username;
        } else {
          // Use email username as last resort
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const emailUsername = user.email.split('@')[0];
            updates.full_name = emailUsername;
          }
        }
        needsUpdate = true;
      }

      // Ensure username exists
      if (!profile.username || profile.username.trim() === '') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          updates.username = user.email.split('@')[0];
          needsUpdate = true;
        }
      }

      // Update profile if needed
      if (needsUpdate) {
        console.log('🔄 Updating profile with missing names:', updates);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Error updating profile:', updateError);
          return false;
        }

        console.log('✅ Profile updated successfully');
      } else {
        console.log('✅ Profile already has proper names');
      }

      return true;
    } catch (error) {
      console.error('❌ Error ensuring profile searchable:', error);
      return false;
    }
  }
}

// Export alias for acceptTeamInvitation to maintain compatibility
export const acceptTeamInvitation = TeamService.acceptInvitation;