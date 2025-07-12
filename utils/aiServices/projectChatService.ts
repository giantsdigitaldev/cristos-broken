import { ChatService } from '@/utils/chatService';
import { supabase } from '@/utils/supabase';
import { generateUUID } from '@/utils/uuidGenerator';
import { GPTService } from './gpt4o-mini-service';

export interface ProjectChatMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface ProjectChatSession {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed';
  metadata?: any;
}

export class ProjectChatService {
  private static fallbackConversationId: string | null = null;

  /**
   * Ensure authentication is ready before making database calls
   */
  private static async ensureAuthenticated(): Promise<boolean> {
    try {
      // Wait a bit for session to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[ProjectChatService] Session error:', sessionError);
        return false;
      }
      
      if (!session) {
        console.warn('[ProjectChatService] No session found');
        return false;
      }
      
      // Then get the user from the session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[ProjectChatService] User error:', userError);
        return false;
      }
      
      if (!user?.id) {
        console.warn('[ProjectChatService] No authenticated user found');
        return false;
      }
      
  
      return true;
    } catch (error) {
      console.error('[ProjectChatService] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Get or create a chat session for a project
   */
  static async getOrCreateChatSession(projectId: string, userId: string): Promise<ProjectChatSession | null> {
    try {
      // Ensure authentication is ready
      const isAuthenticated = await this.ensureAuthenticated();
      if (!isAuthenticated) {
        console.warn('[ProjectChatService] Not authenticated, using fallback');
        return this.createFallbackSession(projectId, userId);
      }

      // Log userId and current Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      console.log('[ProjectChatService.getOrCreateChatSession] Params:', { projectId, userId });
  
      
      // Check if there's an existing active session with better error handling
      console.log('[ProjectChatService.getOrCreateChatSession] Checking for existing session...');
      const { data: existingSession, error: fetchError } = await supabase
        .from('project_chat_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

      if (existingSession) {
        console.log('[ProjectChatService.getOrCreateChatSession] Found existing session:', existingSession.id);
        return existingSession;
      }

      if (fetchError) {
        console.error('Error fetching existing session:', fetchError);
        // If table doesn't exist, use fallback chat system
        if (fetchError.code === '42P01') {
          console.warn('Project chat sessions table not found. Using fallback chat system.');
          return this.createFallbackSession(projectId, userId);
        }
        // For 406 errors or other issues, try to create a new session
        if (fetchError.code === '406' || fetchError.code === '42501') {
          console.warn('Session fetch failed, creating new session:', fetchError.message);
          // Continue to create new session instead of throwing
        } else {
          throw fetchError;
        }
      }

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('project_chat_sessions')
        .insert({
          project_id: projectId,
          user_id: userId,
          status: 'active',
          metadata: {
            created_via_project_page: true,
            project_context: true
          }
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating chat session:', createError);
        // If table doesn't exist, use fallback chat system
        if (createError.code === '42P01') {
          console.warn('Project chat tables not found. Using fallback chat system.');
          return this.createFallbackSession(projectId, userId);
        }
        throw createError;
      }
      return newSession;
    } catch (error) {
      console.error('Error getting/creating chat session:', error);
      // Return fallback session instead of throwing
      return this.createFallbackSession(projectId, userId);
    }
  }

  /**
   * Create a fallback session using the existing chat system
   */
  private static async createFallbackSession(projectId: string, userId: string): Promise<ProjectChatSession | null> {
    try {
      // Use the existing chat system to create a conversation
      const conversationId = await ChatService.createConversation(projectId);
      this.fallbackConversationId = conversationId;
      
      return {
        id: conversationId,
        project_id: projectId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        metadata: {
          fallback_mode: true,
          conversation_id: conversationId
        }
      };
    } catch (error) {
      console.error('Error creating fallback session:', error);
      return null;
    }
  }

  /**
   * Get chat history for a project
   */
  static async getChatHistory(projectId: string, userId: string, limit: number = 50): Promise<ProjectChatMessage[]> {
    try {
      // Ensure authentication is ready
      const isAuthenticated = await this.ensureAuthenticated();
      if (!isAuthenticated) {
        console.warn('[ProjectChatService] Not authenticated, using fallback');
        return this.getFallbackChatHistory(projectId, userId);
      }

      // Log userId and current Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      console.log('[ProjectChatService.getChatHistory] Params:', { projectId, userId, limit });
  
      console.log('[ProjectChatService.getChatHistory] Querying messages for project:', projectId, 'user:', userId);
      const { data: messages, error } = await supabase
        .from('project_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error getting chat history:', error);
        // If table doesn't exist, use fallback chat system
        if (error.code === '42P01') {
          console.warn('Project chat messages table not found. Using fallback chat system.');
          return this.getFallbackChatHistory(projectId, userId);
        }
        throw error;
      }
      
      console.log('[ProjectChatService.getChatHistory] Retrieved', messages?.length || 0, 'messages');
      if (messages && messages.length > 0) {
        console.log('[ProjectChatService.getChatHistory] Sample message:', {
          id: messages[0].id,
          role: messages[0].role,
          contentLength: messages[0].content.length,
          timestamp: messages[0].timestamp
        });
      }
      
      return messages || [];
    } catch (error) {
      console.error('Error getting chat history:', error);
      return this.getFallbackChatHistory(projectId, userId);
    }
  }

  /**
   * Get chat history from fallback system
   */
  private static async getFallbackChatHistory(projectId: string, userId: string): Promise<ProjectChatMessage[]> {
    try {
      if (!this.fallbackConversationId) {
        // Create a new conversation if we don't have one
        const conversationId = await ChatService.createConversation(projectId);
        this.fallbackConversationId = conversationId;
      }

      // Get conversation details from the existing chat system
      const conversationDetails = await ChatService.getConversationDetails(this.fallbackConversationId);
      
      if (!conversationDetails) {
        return [];
      }

      // Convert to ProjectChatMessage format
      return conversationDetails.messages.map(msg => ({
        id: msg.id,
        project_id: projectId,
        user_id: userId,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata
      }));
    } catch (error) {
      console.error('Error getting fallback chat history:', error);
      return [];
    }
  }

  /**
   * Add a message to the project chat
   */
  static async addMessage(
    projectId: string, 
    userId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    metadata?: any
  ): Promise<ProjectChatMessage | null> {
    try {
      // Ensure authentication is ready
      const isAuthenticated = await this.ensureAuthenticated();
      if (!isAuthenticated) {
        console.warn('[ProjectChatService] Not authenticated, using fallback');
        return this.addFallbackMessage(projectId, userId, role, content, metadata);
      }

      // Log userId and current Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      console.log('[ProjectChatService.addMessage] Params:', { projectId, userId, role, content, metadata });
  
      console.log('[ProjectChatService.addMessage] Inserting message:', { role, contentLength: content.length });
      const { data: message, error } = await supabase
        .from('project_chat_messages')
        .insert({
          project_id: projectId,
          user_id: userId,
          role,
          content,
          timestamp: new Date().toISOString(),
          metadata
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error adding message:', error);
        // If table doesn't exist, use fallback chat system
        if (error.code === '42P01') {
          console.warn('Project chat messages table not found. Using fallback chat system.');
          return this.addFallbackMessage(projectId, userId, role, content, metadata);
        }
        throw error;
      }
      
      console.log('[ProjectChatService.addMessage] Message saved successfully:', message.id);

      // Update session timestamp if possible
      try {
        await supabase
          .from('project_chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .eq('status', 'active');
      } catch (sessionError) {
        console.warn('Could not update session timestamp:', sessionError);
      }

      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      return this.addFallbackMessage(projectId, userId, role, content, metadata);
    }
  }

  /**
   * Add message to fallback system
   */
  private static async addFallbackMessage(
    projectId: string, 
    userId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    metadata?: any
  ): Promise<ProjectChatMessage | null> {
    try {
      if (!this.fallbackConversationId) {
        // Create a new conversation if we don't have one
        const conversationId = await ChatService.createConversation(projectId);
        this.fallbackConversationId = conversationId;
      }

      // Use the existing chat system to send the message
      const result = await ChatService.sendMessage(this.fallbackConversationId, content);
      
      // Convert to ProjectChatMessage format
      const message = role === 'user' ? result.userMessage : result.assistantMessage;
      
      return {
        id: message.id,
        project_id: projectId,
        user_id: userId,
        role: message.role as 'user' | 'assistant',
        content: message.content,
        timestamp: message.created_at,
        metadata: message.metadata
      };
    } catch (error) {
      console.error('Error adding fallback message:', error);
      return null;
    }
  }

  /**
   * Get project context for AI
   */
  static async getProjectContext(projectId: string): Promise<any> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      return {
        project_id: project.id,
        project_name: project.name,
        project_description: project.description,
        project_status: project.status,
        project_metadata: project.metadata,
        created_via_ai: project.metadata?.created_via_ai || false,
        ai_creation_data: project.metadata?.gathered_info || null
      };
    } catch (error) {
      console.error('Error getting project context:', error);
      return null;
    }
  }

  /**
   * Generate AI response for project chat
   */
  static async generateAIResponse(
    projectId: string, 
    userId: string, 
    userMessage: string,
    chatHistory: ProjectChatMessage[]
  ): Promise<string> {
    try {
      console.log('[ProjectChatService.generateAIResponse] Starting with:', {
        projectId,
        userId,
        userMessageLength: userMessage.length,
        chatHistoryLength: chatHistory.length
      });
      
      // Get project context
      const projectContext = await this.getProjectContext(projectId);
      
      if (!projectContext) {
        console.warn('[ProjectChatService.generateAIResponse] No project context found');
        return 'I apologize, but I could not retrieve the project context. Please try again.';
      }

      console.log('[ProjectChatService.generateAIResponse] Project context:', {
        name: projectContext.project_name,
        description: projectContext.project_description,
        status: projectContext.project_status
      });

      // Prepare conversation context
      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI assistant helping with project management. You have access to the following project context:

Project: ${projectContext.project_name}
Description: ${projectContext.project_description}
Status: ${projectContext.project_status}
Metadata: ${JSON.stringify(projectContext.project_metadata, null, 2)}

This is a continuation of an existing project conversation. Help the user with:
- Task management and updates
- Project progress tracking
- Team collaboration
- Project details and modifications
- Any project-related questions

Be helpful, concise, and focus on the specific project context.`
        },
        ...chatHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: userMessage
        }
      ];

      console.log('[ProjectChatService.generateAIResponse] Prepared', messages.length, 'messages for AI:', {
        systemMessage: true,
        historyMessages: chatHistory.length,
        userMessage: true
      });

      console.log('[ProjectChatService.generateAIResponse] Calling GPT API with', messages.length, 'messages');
      const gptResponse = await GPTService.callGPTAPI(messages);

      if (!gptResponse.success) {
        console.error('[ProjectChatService.generateAIResponse] GPT API failed:', gptResponse.error);
        throw new Error(gptResponse.error || 'Failed to generate AI response');
      }

      console.log('[ProjectChatService.generateAIResponse] GPT response received, length:', gptResponse.message.length);
      return gptResponse.message;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  /**
   * Complete a chat session
   */
  static async completeChatSession(projectId: string, userId: string): Promise<void> {
    try {
      // Ensure authentication is ready
      const isAuthenticated = await this.ensureAuthenticated();
      if (!isAuthenticated) {
        console.warn('[ProjectChatService] Not authenticated, skipping completion');
        return;
      }

      // Log userId and current Supabase user
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      console.log('[ProjectChatService.completeChatSession] Params:', { projectId, userId });
  
      await supabase
        .from('project_chat_sessions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('status', 'active');
    } catch (error) {
      console.error('Error completing chat session:', error);
    }
  }

  /**
   * Check if project chat tables exist and are accessible
   */
  static async checkTablesExist(): Promise<boolean> {
    // Retry mechanism for session loading
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Wait a bit for session to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        
        // First check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[ProjectChatService.checkTablesExist] Session error:', sessionError);
          retryCount++;
          continue;
        }
        
        if (!session) {
          console.warn('[ProjectChatService.checkTablesExist] No session found, user not authenticated (attempt', retryCount + 1, ')');
          retryCount++;
          continue;
        }
        
        // Get current user for RLS compliance
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('[ProjectChatService.checkTablesExist] User error:', userError);
          retryCount++;
          continue;
        }
        
        console.log('[ProjectChatService.checkTablesExist] Current user:', user?.id);
        
        if (!user?.id) {
          console.warn('[ProjectChatService.checkTablesExist] No authenticated user found for table check (attempt', retryCount + 1, ')');
          retryCount++;
          continue;
        }

        // Try to query with user context to satisfy RLS
        const { data, error } = await supabase
          .from('project_chat_sessions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.log('[ProjectChatService.checkTablesExist] Error:', error);
          
          // Handle different error types
          if (error.code === '42P01') {
            console.warn('Project chat tables do not exist - run the setup script');
            return false;
          }
          
          if (error.code === '42501') {
            console.warn('Project chat tables exist but have permission issues - RLS policies need to be fixed');
            console.warn('Please run the manual setup script in your Supabase SQL Editor');
            return false;
          }
          
          if (error.code === 'PGRST116') {
            console.warn('Project chat tables exist but RLS is blocking access - policies need configuration');
            return false;
          }
          
          // For other errors, assume tables exist but we just don't have data
          console.warn('Error checking project chat tables:', error);
          return true; // Assume tables exist if we get a different error
        }
        
        console.log('[ProjectChatService.checkTablesExist] Tables exist and are accessible, found data:', data);
        return true;
      } catch (error) {
        console.warn('Error checking project chat tables (attempt', retryCount + 1, '):', error);
        retryCount++;
      }
    }
    
    console.warn('[ProjectChatService.checkTablesExist] Failed after', maxRetries, 'attempts');
    return false;
  }

  /**
   * Migrate AI project creation conversation to project chat
   */
  static async migrateAIProjectConversation(projectId: string, userId: string): Promise<boolean> {
    try {
      console.log('[ProjectChatService.migrateAIProjectConversation] Starting migration for project:', projectId);
      
      // Get project details to find AI creation data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (projectError || !project) {
        console.error('[ProjectChatService.migrateAIProjectConversation] Project not found:', projectError);
        return false;
      }

      console.log('[ProjectChatService.migrateAIProjectConversation] Found project:', {
        name: project.name,
        ai_created: project.ai_created,
        ai_conversation_id: project.ai_conversation_id,
        has_ai_creation_data: !!project.ai_creation_data
      });

      // Check if this project was created via AI
      if (!project.ai_created || !project.ai_creation_data) {
        console.log('[ProjectChatService.migrateAIProjectConversation] Project was not created via AI or has no creation data');
        return false;
      }

      // Get or create project chat session
      const session = await this.getOrCreateChatSession(projectId, userId);
      if (!session) {
        console.error('[ProjectChatService.migrateAIProjectConversation] Failed to create chat session');
        return false;
      }

      console.log('[ProjectChatService.migrateAIProjectConversation] Using session:', session.id);

      // Check if we already have messages in the project chat
      const existingMessages = await this.getChatHistory(projectId, userId, 10);
      if (existingMessages && existingMessages.length > 0) {
        console.log('[ProjectChatService.migrateAIProjectConversation] Chat history already exists, skipping migration');
        return true;
      }

      // Create conversation messages from AI creation data
      const aiCreationData = project.ai_creation_data;
      const messages: ProjectChatMessage[] = [];

      // Add initial project creation message
      if (aiCreationData.gathered_project_info?.name) {
        messages.push({
          id: generateUUID(),
          project_id: projectId,
          user_id: userId,
          role: 'user',
          content: `I want to create a project called "${aiCreationData.gathered_project_info.name}"`,
          timestamp: new Date(project.created_at).toISOString(),
          metadata: {
            migrated_from_ai_creation: true,
            original_timestamp: project.created_at
          }
        });
      }

      // Add AI response with project details
      const projectDetails = this.formatProjectDetailsForChat(aiCreationData);
      messages.push({
        id: generateUUID(),
        project_id: projectId,
        user_id: userId,
        role: 'assistant',
        content: `I've created your project "${aiCreationData.gathered_project_info?.name || 'Untitled Project'}". Here's what I've set up for you:

${projectDetails}

Your project is now ready! You can start working on your tasks and track your progress.`,
        timestamp: new Date(project.created_at).toISOString(),
        metadata: {
          migrated_from_ai_creation: true,
          original_timestamp: project.created_at,
          project_details: aiCreationData
        }
      });

      // Add team members if any
      if (aiCreationData.gathered_team_members && aiCreationData.gathered_team_members.length > 0) {
        const teamMembersText = aiCreationData.gathered_team_members
          .map((member: any, index: number) => `${index + 1}. ${member.name} (${member.role})`)
          .join('\n');

        messages.push({
          id: generateUUID(),
          project_id: projectId,
          user_id: userId,
          role: 'assistant',
          content: `I've also added your team members to the project:

${teamMembersText}

You can invite them to collaborate on the project.`,
          timestamp: new Date(project.created_at).toISOString(),
          metadata: {
            migrated_from_ai_creation: true,
            original_timestamp: project.created_at,
            team_members: aiCreationData.gathered_team_members
          }
        });
      }

      // Add tasks if any
      if (aiCreationData.gathered_tasks && aiCreationData.gathered_tasks.length > 0) {
        const tasksText = aiCreationData.gathered_tasks
          .map((task: any, index: number) => `${index + 1}. ${task.title}`)
          .join('\n');

        messages.push({
          id: generateUUID(),
          project_id: projectId,
          user_id: userId,
          role: 'assistant',
          content: `I've created the following tasks for your project:

${tasksText}

You can now start working on these tasks and track your progress.`,
          timestamp: new Date(project.created_at).toISOString(),
          metadata: {
            migrated_from_ai_creation: true,
            original_timestamp: project.created_at,
            tasks: aiCreationData.gathered_tasks
          }
        });
      }

      // Save all messages to the project chat
      console.log('[ProjectChatService.migrateAIProjectConversation] Saving', messages.length, 'messages to project chat');
      
      for (const message of messages) {
        const { error: saveError } = await supabase
          .from('project_chat_messages')
          .insert(message);

        if (saveError) {
          console.error('[ProjectChatService.migrateAIProjectConversation] Failed to save message:', saveError);
          return false;
        }
      }

      console.log('[ProjectChatService.migrateAIProjectConversation] Successfully migrated AI creation conversation');
      return true;

    } catch (error) {
      console.error('[ProjectChatService.migrateAIProjectConversation] Migration failed:', error);
      return false;
    }
  }

  /**
   * Format project details for chat display
   */
  private static formatProjectDetailsForChat(aiCreationData: any): string {
    const details: string[] = [];

    if (aiCreationData.gathered_project_info?.description) {
      details.push(`**Description:** ${aiCreationData.gathered_project_info.description}`);
    }

    if (aiCreationData.gathered_project_info?.category) {
      details.push(`**Category:** ${aiCreationData.gathered_project_info.category}`);
    }

    if (aiCreationData.gathered_project_info?.priority) {
      details.push(`**Priority:** ${aiCreationData.gathered_project_info.priority}`);
    }

    if (aiCreationData.gathered_project_info?.edc_date) {
      details.push(`**Target Completion:** ${aiCreationData.gathered_project_info.edc_date}`);
    }

    if (aiCreationData.gathered_project_info?.fud_date) {
      details.push(`**Follow-up Date:** ${aiCreationData.gathered_project_info.fud_date}`);
    }

    return details.length > 0 ? details.join('\n') : 'Project details have been configured.';
  }
} 