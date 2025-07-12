import { supabase } from '../supabase';
import { GPTService } from './gpt4o-mini-service';
import { HTMLParser, ParsedWidget } from './htmlParser';
import { WhisperService } from './whisperService';

export interface AIProjectState {
  id: string;
  user_id: string;
  project_id?: string;
  conversation_id: string | null;
  state_data: {
    gathered_project_info: {
      name?: string;
      description?: string;
      category?: string;
      priority?: string;
      status?: string;
      edc_date?: string;
      fud_date?: string;
    };
    gathered_tasks: Array<{
      title: string;
      description?: string;
      priority: string;
      due_date?: string;
      assignees?: string[];
    }>;
    gathered_team_members: Array<{
      name: string;
      email?: string;
      role: string;
      avatar_url?: string;
    }>;
    current_step: string;
    required_fields: string[];
    optional_fields: string[];
    templates_suggested: string[];
  };
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface AIProjectCreationResponse {
  success: boolean;
  message: string;
  widgets: ParsedWidget[];
  state: AIProjectState;
  next_step?: string;
  missing_info?: string[];
  error?: string;
}

export interface VoiceProcessingResult {
  success: boolean;
  transcription: string;
  processed_message: string;
  error?: string;
}

export class AIProjectCreationService {
  private static readonly REQUIRED_FIELDS = ['project_name', 'project_description'];
  private static readonly OPTIONAL_FIELDS = ['category', 'priority', 'team_members', 'tasks', 'dates'];

  /**
   * Initialize AI project creation session
   */
  static async initializeProjectCreation(
    userId: string,
    conversationId: string
  ): Promise<AIProjectState> {
    try {
      // First, verify the user exists in the database
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !userProfile) {
        console.error('❌ User not found in database:', userId);
        throw new Error('User not found in database. Please ensure you are properly authenticated.');
      }

      console.log('✅ User verified in database:', userId);

      // Create AI project state without requiring a conversation
      const insertData: any = {
        user_id: userId,
        state_data: {
          gathered_project_info: {},
          gathered_tasks: [],
          gathered_team_members: [],
          current_step: 'initializing',
          required_fields: [...this.REQUIRED_FIELDS],
          optional_fields: [...this.OPTIONAL_FIELDS],
          templates_suggested: []
        },
        status: 'in_progress'
      };

      // Only add conversation_id if it's a valid UUID and not the default
      if (conversationId && 
          conversationId !== '00000000-0000-0000-0000-000000000000' &&
          conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        
        // Check if the conversation exists before using it
        try {
          const { data: conversation, error: convError } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('id', conversationId)
            .single();

          if (convError || !conversation) {
            console.log(`Conversation ${conversationId} does not exist, skipping conversation_id`);
          } else {
            console.log(`Using existing conversation: ${conversationId}`);
            insertData.conversation_id = conversationId;
          }
        } catch (checkError) {
          console.log(`Error checking conversation ${conversationId}, skipping:`, checkError);
        }
      } else {
        console.log('Invalid or default conversation_id, skipping');
      }

      console.log('Creating AI project state with data:', {
        user_id: insertData.user_id,
        conversation_id: insertData.conversation_id || 'null',
        has_state_data: !!insertData.state_data
      });

      const { data: state, error } = await supabase
        .from('ai_project_states')
        .insert(insertData)
        .select('*')
        .single();

      if (error) {
        console.error('Failed to create AI project state:', error);
        
        // Handle specific database errors
        if (error.code === '23503') {
          throw new Error('Database constraint error. Please ensure you are properly authenticated.');
        } else if (error.code === '406') {
          throw new Error('Database access denied. Please try again.');
        } else {
          throw error;
        }
      }

      console.log('Successfully created AI project state:', state.id);
      return state;
    } catch (error) {
      console.error('Failed to initialize AI project creation:', error);
      throw error;
    }
  }

  /**
   * Process user message and generate AI response
   */
  static async processUserMessage(
    userId: string,
    conversationId: string,
    userMessage: string,
    isVoiceInput: boolean = false
  ): Promise<AIProjectCreationResponse> {
    try {
      // Get or create AI project state
      let state = await this.getProjectState(conversationId, userId);
      if (!state) {
        console.log('No existing project state found, creating new one...');
        try {
          state = await this.initializeProjectCreation(userId, conversationId);
          console.log('Successfully created new project state');
        } catch (initError) {
          console.error('Failed to initialize project creation:', initError);
          return {
            success: false,
            message: 'Sorry, I encountered an error while setting up the project creation session. Please try again.',
            widgets: [],
            state: {} as AIProjectState,
            error: initError instanceof Error ? initError.message : 'Failed to initialize project creation'
          };
        }
      }

      // Process voice input if applicable
      let processedMessage = userMessage;
      if (isVoiceInput) {
        // For voice input, we assume the message is already transcribed
        // In a real implementation, you'd process the audio here
        processedMessage = userMessage;
      }

      // Generate AI response using GPT-4o-mini
      const gptMessages = GPTService.generateProjectCreationPrompt(processedMessage, state.state_data);
      console.log('🔍 Generated GPT messages:', JSON.stringify(gptMessages, null, 2));
      
      const gptResponse = await GPTService.callGPTAPI(gptMessages);
      
      console.log('🔍 GPT response:', JSON.stringify(gptResponse, null, 2));
      
      if (!gptResponse.success) {
        throw new Error(gptResponse.error || 'Failed to generate AI response');
      }

      const aiResponse = gptResponse.message;

      // Parse AI response for widgets
      const parsedResponse = HTMLParser.parseMessage(aiResponse);

      // Update project state based on AI response
      const updatedState = await this.updateProjectState(
        state.id,
        userId,
        processedMessage,
        parsedResponse.widgets
      );

      // Determine next step and missing information
      const nextStep = this.determineCurrentStep(updatedState.state_data);
      const missingInfo = this.identifyMissingInfo(updatedState);

      return {
        success: true,
        message: aiResponse, // Return the original AI response, not the parsed text
        widgets: parsedResponse.widgets,
        state: updatedState,
        next_step: nextStep,
        missing_info: missingInfo
      };
    } catch (error) {
      console.error('Failed to process user message:', error);
      return {
        success: false,
        message: 'Sorry, I encountered an error. Please try again.',
        widgets: [],
        state: {} as AIProjectState,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process voice input and transcribe
   */
  static async processVoiceInput(
    audioData: ArrayBuffer,
    userId: string,
    conversationId: string
  ): Promise<VoiceProcessingResult> {
    try {
      // Create voice session
      const sessionId = await WhisperService.createVoiceSession(userId, conversationId);

      // Transcribe audio
      const transcriptionResult = await WhisperService.transcribeAudio(audioData);

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Transcription failed');
      }

      // Update voice session
      await WhisperService.updateVoiceSession(sessionId, {
        transcription: transcriptionResult.transcription,
        processing_status: 'completed',
        processing_time_ms: transcriptionResult.processing_time_ms
      });

      return {
        success: true,
        transcription: transcriptionResult.transcription,
        processed_message: transcriptionResult.transcription
      };
    } catch (error) {
      console.error('Failed to process voice input:', error);
      return {
        success: false,
        transcription: '',
        processed_message: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get AI project state
   */
  static async getProjectState(conversationId: string, userId: string): Promise<AIProjectState | null> {
    try {
      // If conversationId is null or invalid, try to find by user_id only
      if (!conversationId || conversationId === '00000000-0000-0000-0000-000000000000') {
        const { data, error } = await supabase
          .from('ai_project_states')
          .select('*')
          .eq('user_id', userId)
          .is('conversation_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // Handle 406 error (no rows found) gracefully
          if (error.code === 'PGRST116' || error.message?.includes('multiple (or no) rows returned')) {
            console.log('No project state found for user without conversation_id');
            return null;
          }
          throw error;
        }
        return data;
      }

      // Try to find by conversation_id and user_id
      const { data, error } = await supabase
        .from('ai_project_states')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (error) {
        // Handle 406 error (no rows found) gracefully
        if (error.code === 'PGRST116' || error.message?.includes('multiple (or no) rows returned')) {
          console.log(`No project state found for conversation_id: ${conversationId}`);
          
          // Fallback: try to find any project state for this user
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('ai_project_states')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (fallbackError) {
            if (fallbackError.code === 'PGRST116' || fallbackError.message?.includes('multiple (or no) rows returned')) {
              console.log('No project state found for user at all');
              return null;
            }
            throw fallbackError;
          }
          
          console.log('Found fallback project state for user');
          return fallbackData;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Failed to get project state:', error);
      return null;
    }
  }

  /**
   * Update project state based on user input and AI response
   */
  private static async updateProjectState(
    stateId: string,
    userId: string,
    userMessage: string,
    widgets: ParsedWidget[]
  ): Promise<AIProjectState> {
    try {
      // Get current state
      const { data: currentState, error: fetchError } = await supabase
        .from('ai_project_states')
        .select('*')
        .eq('id', stateId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const stateData = currentState.state_data;
      let shouldCreateProject = false;

      // Process widgets to update state
      for (const widget of widgets) {
        switch (widget.type) {
          case 'project_name':
          case 'projectname':
            stateData.gathered_project_info.name = widget.data.project_name;
            this.removeFromArray(stateData.required_fields, 'project_name');
            // Check if we should create the project now
            if (widget.data.project_name && !currentState.project_id) {
              shouldCreateProject = true;
            }
            break;

          case 'project_description':
            stateData.gathered_project_info.description = widget.data.project_description;
            this.removeFromArray(stateData.required_fields, 'project_description');
            break;

          case 'task':
            const task = {
              title: widget.data.title || '',
              description: widget.data.description,
              priority: widget.data.priority || 'medium',
              due_date: widget.data.due_date && this.isValidDateString(widget.data.due_date) ? widget.data.due_date : null,
              assignees: widget.data.assignees || []
            };
            stateData.gathered_tasks.push(task);
            break;

          case 'team_member':
            const member = {
              name: widget.data.name || '',
              email: widget.data.email,
              role: widget.data.role || 'viewer',
              avatar_url: widget.data.avatar_url
            };
            stateData.gathered_team_members.push(member);
            break;

          case 'category':
            stateData.gathered_project_info.category = widget.data.category || widget.data.content || '';
            break;

          case 'priority':
            stateData.gathered_project_info.priority = widget.data.priority || widget.data.content || 'medium';
            break;

          case 'status':
            stateData.gathered_project_info.status = widget.data.status || widget.data.content || 'active';
            break;

          case 'edc_date':
            stateData.gathered_project_info.edc_date = widget.data.edc_date || widget.data.content || '';
            break;

          case 'fud_date':
            stateData.gathered_project_info.fud_date = widget.data.fud_date || widget.data.content || '';
            break;
        }
      }

      // Update current step
      stateData.current_step = this.determineCurrentStep(stateData);

      // Create project if we have a name and no project_id yet
      if (shouldCreateProject && stateData.gathered_project_info.name && !currentState.project_id) {
        try {
          console.log('🎯 Creating project from AI state:', stateData.gathered_project_info.name);
          
          // Use category if available, otherwise infer from description
          const category = stateData.gathered_project_info.category || 'general';
          
          // Create the project
          const projectData = {
            name: stateData.gathered_project_info.name || 'Untitled Project',
            description: stateData.gathered_project_info.description || '',
            user_id: userId,
            status: 'active',
            priority: stateData.gathered_project_info.priority || 'medium',
            due_date: (stateData.gathered_project_info.edc_date && this.isValidDateString(stateData.gathered_project_info.edc_date)) || 
                     (stateData.gathered_project_info.fud_date && this.isValidDateString(stateData.gathered_project_info.fud_date)) ? 
                     (this.isValidDateString(stateData.gathered_project_info.edc_date) ? stateData.gathered_project_info.edc_date : stateData.gathered_project_info.fud_date) : null,
            metadata: {
              created_via_ai: true,
              ai_conversation_id: currentState.conversation_id,
              gathered_info: stateData,
              category: category,
              edc_date: this.isValidDateString(stateData.gathered_project_info.edc_date) ? stateData.gathered_project_info.edc_date : null,
              fud_date: this.isValidDateString(stateData.gathered_project_info.fud_date) ? stateData.gathered_project_info.fud_date : null,
              project_owner: userId,
              project_lead: userId,
              team_members: stateData.gathered_team_members,
              total_tasks: stateData.gathered_tasks.length,
              completed_tasks: 0
            },
            ai_created: true,
            ai_conversation_id: currentState.conversation_id,
            ai_creation_data: stateData
          };

          console.log('📋 [AIProjectCreationService] Attempting to create project with data:', {
            name: projectData.name,
            description: projectData.description,
            due_date: projectData.due_date,
            category: projectData.metadata.category
          });

          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert(projectData)
            .select('*')
            .single();

          if (projectError) {
            console.error('❌ [AIProjectCreationService] Failed to create project:', projectError);
          } else {
            console.log('✅ Project created successfully:', project.id);
            console.log('📋 Project details:', {
              name: project.name,
              description: project.description,
              metadata: project.metadata
            });
            
            // Generate project cover image in the background
            if (stateData.gathered_project_info.name && stateData.gathered_project_info.description) {
              console.log('🎯 [AIProjectCreationService] IMAGE GENERATION CONDITION MET:', {
                name: stateData.gathered_project_info.name,
                description: stateData.gathered_project_info.description,
                category: category,
                projectId: project.id
              });
              try {
                console.log('🎨 Starting background image generation for AI-created project:', project.id);
                
                // Import and use PollinationsAIService
                const { PollinationsAIService } = await import('./pollinationsAIService');
                
                // Start image generation in background (don't await)
                PollinationsAIService.generateProjectCoverImage(
                  stateData.gathered_project_info.name,
                  stateData.gathered_project_info.description,
                  category,
                  project.id
                ).catch(error => {
                  console.error('❌ Background image generation failed for AI project:', error);
                  // Don't show error to user as this is background process
                });
                
              } catch (error) {
                console.error('❌ Error starting image generation for AI project:', error);
                // Don't fail the project creation for image generation errors
              }
            }
            
            // Update the state with the project_id
            const { error: updateProjectIdError } = await supabase
              .from('ai_project_states')
              .update({
                project_id: project.id,
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', stateId);

            if (updateProjectIdError) {
              console.error('Failed to update state with project_id:', updateProjectIdError);
            } else {
              console.log('✅ AI project state updated with project_id:', project.id);
            }
          }
        } catch (error) {
          console.error('Error creating project:', error);
        }
      }

      // Update state in database
      const { data: updatedState, error: updateError } = await supabase
        .from('ai_project_states')
        .update({
          state_data: stateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', stateId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      return updatedState;
    } catch (error) {
      console.error('Failed to update project state:', error);
      throw error;
    }
  }

  /**
   * Determine next step in project creation
   */
  private static determineCurrentStep(stateData: any): string {
    const { gathered_project_info, gathered_tasks, gathered_team_members, required_fields } = stateData;

    if (required_fields.length > 0) {
      if (required_fields.includes('project_name')) {
        return 'gathering_project_name';
      } else if (required_fields.includes('project_description')) {
        return 'gathering_project_description';
      }
    }

    // If required fields are complete, suggest optional fields
    if (gathered_project_info.name && gathered_project_info.description) {
      if (gathered_team_members.length === 0) {
        return 'suggesting_team_members';
      } else if (gathered_tasks.length === 0) {
        return 'suggesting_tasks';
      } else {
        return 'confirming_project';
      }
    }

    return 'gathering_info';
  }

  /**
   * Identify missing information
   */
  private static identifyMissingInfo(state: AIProjectState): string[] {
    const { state_data } = state;
    const missing: string[] = [];

    // Check required fields
    if (!state_data.gathered_project_info.name) {
      missing.push('project_name');
    }
    if (!state_data.gathered_project_info.description) {
      missing.push('project_description');
    }

    // Check optional fields
    if (state_data.gathered_team_members.length === 0) {
      missing.push('team_members');
    }
    if (state_data.gathered_tasks.length === 0) {
      missing.push('tasks');
    }

    return missing;
  }

  /**
   * Create project from gathered AI state
   */
  static async createProjectFromAIState(
    stateId: string,
    userId: string
  ): Promise<{ success: boolean; project_id?: string; error?: string }> {
    try {
      // Get the AI project state
      const { data: aiState, error: fetchError } = await supabase
        .from('ai_project_states')
        .select('*')
        .eq('id', stateId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !aiState) {
        throw new Error('AI project state not found');
      }

      const stateData = aiState.state_data;

      // Use category if available, otherwise infer from description
      const category = stateData.gathered_project_info.category || 'general';

      // Create the project
      const projectData = {
        name: stateData.gathered_project_info.name || 'Untitled Project',
        description: stateData.gathered_project_info.description || '',
        user_id: userId,
        status: 'active',
        priority: stateData.gathered_project_info.priority || 'medium',
        due_date: (stateData.gathered_project_info.edc_date && this.isValidDateString(stateData.gathered_project_info.edc_date)) || 
                 (stateData.gathered_project_info.fud_date && this.isValidDateString(stateData.gathered_project_info.fud_date)) ? 
                 (this.isValidDateString(stateData.gathered_project_info.edc_date) ? stateData.gathered_project_info.edc_date : stateData.gathered_project_info.fud_date) : null,
        metadata: {
          created_via_ai: true,
          ai_conversation_id: aiState.conversation_id,
          gathered_info: stateData,
          category: category,
          edc_date: this.isValidDateString(stateData.gathered_project_info.edc_date) ? stateData.gathered_project_info.edc_date : null,
          fud_date: this.isValidDateString(stateData.gathered_project_info.fud_date) ? stateData.gathered_project_info.fud_date : null,
          project_owner: userId,
          project_lead: userId,
          team_members: stateData.gathered_team_members,
          total_tasks: stateData.gathered_tasks.length,
          completed_tasks: 0
        },
        ai_created: true,
        ai_conversation_id: aiState.conversation_id,
        ai_creation_data: stateData
      };

      console.log('📋 [AIProjectCreationService] Attempting to create project from AI state with data:', {
        name: projectData.name,
        description: projectData.description,
        due_date: projectData.due_date,
        category: projectData.metadata.category
      });

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select('*')
        .single();

      if (projectError) {
        console.error('❌ [AIProjectCreationService] Failed to create project from AI state:', projectError);
        throw projectError;
      }

      // Generate project cover image in the background
      if (stateData.gathered_project_info.name && stateData.gathered_project_info.description) {
        console.log('🎯 [AIProjectCreationService] IMAGE GENERATION CONDITION MET (createProjectFromAIState):', {
          name: stateData.gathered_project_info.name,
          description: stateData.gathered_project_info.description,
          category: category,
          projectId: project.id
        });
        try {
          console.log('🟦 [AIProjectCreationService] TRIGGERING PollinationsAIService.generateProjectCoverImage for project:', {
            name: stateData.gathered_project_info.name,
            description: stateData.gathered_project_info.description,
            category: category,
            projectId: project.id
          });
          // Import and use PollinationsAIService
          const { PollinationsAIService } = await import('./pollinationsAIService');
          // Start image generation in background (don't await)
          PollinationsAIService.generateProjectCoverImage(
            stateData.gathered_project_info.name,
            stateData.gathered_project_info.description,
            category,
            project.id
          ).catch(error => {
            console.error('❌ Background image generation failed for AI project:', error);
            // Don't show error to user as this is background process
          });
        } catch (error) {
          console.error('❌ Error starting image generation for AI project:', error);
          // Don't fail the project creation for image generation errors
        }
      }

      // Create tasks
      for (const taskData of stateData.gathered_tasks) {
        const task = {
          title: taskData.title,
          description: taskData.description || '',
          project_id: project.id,
          assigned_to: taskData.assignees || [],
          status: 'todo',
          priority: taskData.priority || 'medium',
          due_date: (taskData.due_date && this.isValidDateString(taskData.due_date)) ? taskData.due_date : null,
          created_by: userId,
        };

        const { error: taskError } = await supabase
          .from('tasks')
          .insert(task);

        if (taskError) {
          console.error('Failed to create task:', taskError);
        }
      }

      // Add team members if any
      for (const memberData of stateData.gathered_team_members) {
        // For now, we'll just log team members
        // In a real implementation, you'd invite them or add them to the project
        console.log('Team member to add:', memberData);
      }

      // Update AI state to completed
      await supabase
        .from('ai_project_states')
        .update({ 
          status: 'completed',
          project_id: project.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', stateId);

      return {
        success: true,
        project_id: project.id
      };

    } catch (error) {
      console.error('Failed to create project from AI state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      };
    }
  }

  /**
   * Get project creation progress
   */
  static async getProjectCreationProgress(conversationId: string, userId: string): Promise<{
    progress: number;
    completed: number;
    total: number;
    current_step: string;
    missing_info: string[];
  }> {
    try {
      const state = await this.getProjectState(conversationId, userId);
      if (!state) {
        return {
          progress: 0,
          completed: 0,
          total: this.REQUIRED_FIELDS.length + this.OPTIONAL_FIELDS.length,
          current_step: 'initializing',
          missing_info: [...this.REQUIRED_FIELDS, ...this.OPTIONAL_FIELDS]
        };
      }

      const { state_data } = state;
      const total = this.REQUIRED_FIELDS.length + this.OPTIONAL_FIELDS.length;
      let completed = 0;

      // Count completed required fields
      if (state_data.gathered_project_info.name) completed++;
      if (state_data.gathered_project_info.description) completed++;

      // Count completed optional fields
      if (state_data.gathered_team_members.length > 0) completed++;
      if (state_data.gathered_tasks.length > 0) completed++;
      if (state_data.gathered_project_info.category) completed++;
      if (state_data.gathered_project_info.priority) completed++;

      const progress = completed / total;
      const missingInfo = this.identifyMissingInfo(state);

      return {
        progress,
        completed,
        total,
        current_step: state_data.current_step,
        missing_info: missingInfo
      };
    } catch (error) {
      console.error('Failed to get project creation progress:', error);
      return {
        progress: 0,
        completed: 0,
        total: 0,
        current_step: 'error',
        missing_info: []
      };
    }
  }

  /**
   * Utility function to validate date string format
   */
  private static isValidDateString(dateString: string): boolean {
    if (!dateString || dateString.trim() === '') return false;
    
    // Check if it's a placeholder like "YYYY-MM-DD"
    if (dateString.includes('YYYY') || dateString.includes('MM') || dateString.includes('DD')) {
      return false;
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    // Check if it's a valid date
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
  }

  /**
   * Utility function to remove item from array
   */
  private static removeFromArray<T>(array: T[], item: T): void {
    const index = array.indexOf(item);
    if (index > -1) {
      array.splice(index, 1);
    }
  }

  /**
   * Update project with new tasks and subtasks
   */
  static async updateProjectWithDetails(projectId: string, userId: string, tasks: any[], subtasks: any[]): Promise<void> {
    try {
      // Update tasks
      for (const task of tasks) {
        // Upsert task by title (or id if available)
        const { data: existingTask, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .eq('title', task.title || '')
          .single();
        if (existingTask) {
          // Optionally update task fields if needed
          // await supabase.from('tasks').update({ ...task }).eq('id', existingTask.id);
        } else {
          await supabase.from('tasks').insert({
            title: task.title,
            description: '',
            project_id: projectId,
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            due_date: task.due_date,
            assigned_to: task.assignees || [],
            created_by: userId,
          });
        }
        // Handle subtasks for this task
        if (task.subtasks && Array.isArray(task.subtasks)) {
          for (const subtask of task.subtasks) {
            // Upsert subtask by title and parent task
            const { data: existingSubtask, error: fetchSubError } = await supabase
              .from('subtasks')
              .select('*')
              .eq('task_id', existingTask ? existingTask.id : null)
              .eq('title', subtask.title || '')
              .single();
            if (!existingSubtask && existingTask) {
              await supabase.from('subtasks').insert({
                title: subtask.title,
                task_id: existingTask.id,
                status: subtask.status || 'todo',
                priority: subtask.priority || 'medium',
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update project with details:', error);
    }
  }
} 