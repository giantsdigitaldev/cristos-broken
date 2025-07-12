import { supabase } from '../supabase';
import { GPTMessage, GPTService } from './gpt4o-mini-service';

export interface ConversationMemory {
  conversation_id: string;
  user_id: string;
  messages: GPTMessage[];
  summary?: string;
  context?: any;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_data: any;
  created_at: string;
}

export interface LangChainConfig {
  max_memory_tokens: number;
  summary_threshold: number;
  context_window: number;
  temperature: number;
}

export class LangChainService {
  private static readonly DEFAULT_CONFIG: LangChainConfig = {
    max_memory_tokens: 8000,
    summary_threshold: 10, // Summarize after 10 messages
    context_window: 4000,
    temperature: 0.7
  };

  /**
   * Get conversation memory with intelligent summarization
   */
  static async getConversationMemory(
    conversationId: string,
    config: Partial<LangChainConfig> = {}
  ): Promise<ConversationMemory> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // Get conversation messages
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Convert to GPTMessage format
      const gptMessages: GPTMessage[] = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // Check if we need to summarize
      if (gptMessages.length > finalConfig.summary_threshold) {
        const summary = await this.summarizeConversation(gptMessages, finalConfig);
        
        // Keep recent messages and add summary
        const recentMessages = gptMessages.slice(-5); // Keep last 5 messages
        const summarizedMessages: GPTMessage[] = [
          { role: 'system', content: `Previous conversation summary: ${summary}` },
          ...recentMessages
        ];

        return {
          conversation_id: conversationId,
          user_id: messages[0]?.user_id || '',
          messages: summarizedMessages,
          summary,
          context: { summarized: true, original_count: gptMessages.length },
          created_at: messages[0]?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return {
        conversation_id: conversationId,
        user_id: messages[0]?.user_id || '',
        messages: gptMessages,
        context: { summarized: false, message_count: gptMessages.length },
        created_at: messages[0]?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get conversation memory:', error);
      throw error;
    }
  }

  /**
   * Summarize conversation to stay within token limits
   */
  private static async summarizeConversation(
    messages: GPTMessage[],
    config: LangChainConfig
  ): Promise<string> {
    try {
      const summaryPrompt = `Please provide a concise summary of this project creation conversation, focusing on:

1. Project information gathered (name, description, category)
2. Team members mentioned and their roles
3. Tasks identified and their details
4. Current status and next steps needed

Keep the summary under 200 words and focus on actionable information for continuing the project creation process.

Conversation:
${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;

      const response = await GPTService.callGPTAPI([
        { role: 'user', content: summaryPrompt }
      ], {
        max_tokens: 300,
        temperature: 0.3
      });

      return response.success ? response.message : 'Conversation summary unavailable';
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      return 'Conversation summary unavailable';
    }
  }

  /**
   * Get relevant project templates based on user input
   */
  static async getRelevantTemplates(
    userInput: string,
    limit: number = 3
  ): Promise<ProjectTemplate[]> {
    try {
      // For now, return mock templates - in production, this would use vector search
      const mockTemplates: ProjectTemplate[] = [
        {
          id: '1',
          name: 'Web Development Project',
          description: 'Standard web development project template with common tasks and team structure',
          category: 'web_development',
          template_data: {
            tasks: [
              { title: 'Design UI/UX', priority: 'high', due_date: '+7d' },
              { title: 'Set up development environment', priority: 'high', due_date: '+1d' },
              { title: 'Create database schema', priority: 'medium', due_date: '+3d' },
              { title: 'Implement authentication', priority: 'high', due_date: '+5d' },
              { title: 'Write API documentation', priority: 'medium', due_date: '+10d' }
            ],
            team_roles: [
              { role: 'lead', description: 'Project lead with full control' },
              { role: 'admin', description: 'Administrator with management control' },
              { role: 'editor', description: 'Can edit and contribute content' },
              { role: 'viewer', description: 'Can view and participate in discussions' }
            ],
            categories: ['frontend', 'backend', 'database', 'deployment']
          },
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Mobile App Development',
          description: 'Mobile app development project with platform-specific considerations',
          category: 'mobile_development',
          template_data: {
            tasks: [
              { title: 'Design app wireframes', priority: 'high', due_date: '+5d' },
              { title: 'Set up React Native environment', priority: 'high', due_date: '+1d' },
              { title: 'Implement core features', priority: 'high', due_date: '+14d' },
              { title: 'Set up CI/CD pipeline', priority: 'medium', due_date: '+7d' },
              { title: 'App store submission prep', priority: 'medium', due_date: '+21d' }
            ],
            team_roles: [
              { role: 'lead', description: 'Project lead with full control' },
              { role: 'admin', description: 'Administrator with management control' },
              { role: 'editor', description: 'Can edit and contribute content' },
              { role: 'viewer', description: 'Can view and participate in discussions' }
            ],
            categories: ['ios', 'android', 'cross_platform', 'testing']
          },
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Marketing Campaign',
          description: 'Marketing campaign project with content creation and distribution tasks',
          category: 'marketing',
          template_data: {
            tasks: [
              { title: 'Define target audience', priority: 'high', due_date: '+2d' },
              { title: 'Create content calendar', priority: 'high', due_date: '+3d' },
              { title: 'Design marketing materials', priority: 'medium', due_date: '+5d' },
              { title: 'Set up analytics tracking', priority: 'medium', due_date: '+4d' },
              { title: 'Launch campaign', priority: 'high', due_date: '+7d' }
            ],
            team_roles: [
              { role: 'lead', description: 'Project lead with full control' },
              { role: 'admin', description: 'Administrator with management control' },
              { role: 'editor', description: 'Can edit and contribute content' },
              { role: 'viewer', description: 'Can view and participate in discussions' }
            ],
            categories: ['content_creation', 'social_media', 'analytics', 'design']
          },
          created_at: new Date().toISOString()
        }
      ];

      // Simple keyword matching for now
      const keywords = userInput.toLowerCase().split(' ');
      const relevantTemplates = mockTemplates.filter(template => {
        const templateText = `${template.name} ${template.description} ${template.category}`.toLowerCase();
        return keywords.some(keyword => templateText.includes(keyword));
      });

      return relevantTemplates.slice(0, limit);
    } catch (error) {
      console.error('Failed to get relevant templates:', error);
      return [];
    }
  }

  /**
   * Generate contextual response using LangChain patterns
   */
  static async generateContextualResponse(
    userMessage: string,
    conversationId: string,
    config: Partial<LangChainConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // Get conversation memory
      const memory = await this.getConversationMemory(conversationId, finalConfig);

      // Get relevant templates
      const templates = await this.getRelevantTemplates(userMessage);

      // Build context-aware prompt
      const contextPrompt = this.buildContextPrompt(userMessage, memory, templates);

      // Generate response using GPT-4o-mini
      const response = await GPTService.callGPTAPI([
        ...memory.messages,
        { role: 'user', content: contextPrompt }
      ], {
        max_tokens: finalConfig.context_window,
        temperature: finalConfig.temperature
      });

      return response.success ? response.message : 'Sorry, I encountered an error. Please try again.';
    } catch (error) {
      console.error('Failed to generate contextual response:', error);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Build context-aware prompt for AI response
   */
  private static buildContextPrompt(
    userMessage: string,
    memory: ConversationMemory,
    templates: ProjectTemplate[]
  ): string {
    let prompt = `You are a friendly AI assistant helping users create projects in the cristOS app. 

Current user message: "${userMessage}"

Previous conversation context: ${memory.summary ? `Summary: ${memory.summary}` : 'No previous context'}

Recent messages: ${memory.messages.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;

    // Add relevant templates if available
    if (templates.length > 0) {
      prompt += `\n\nRelevant project templates that might help:
${templates.map(template => `- ${template.name}: ${template.description}`).join('\n')}

You can suggest using one of these templates or adapt elements from them.`;
    }

    prompt += `

IMPORTANT RULES:
1. Be CONCISE and friendly - ask only 1-2 questions at a time
2. When user provides project information, display it in HTML widgets immediately
3. Guide the user step-by-step through project creation
4. Be conversational but keep responses short and focused

CONVERSATION FLOW:
- If user says "I want to start a project" → Ask "Great! What do you want to call your project?"
- If user mentions tasks without a project name → Ask "What would you like to call this project?" FIRST
- When user provides project name → ALWAYS respond with "<projectname>Project Name</projectname>" and ask "Now that we have the title, what do you want your first tasks to be?"
- When user lists tasks → Display each task as <task1>Task 1</task1>, <task2>Task 2</task2>, etc. and ask "Who will be working on this project with you?"
- Keep asking 1-2 focused questions until project is complete

CRITICAL: When the user provides a project name, you MUST respond with the <projectname> tag containing their project name. This is essential for the app to create the project.

HTML WIDGET FORMATS (ALWAYS USE THESE EXACT FORMATS):
- <projectname>Project Name</projectname> for project names (REQUIRED when user provides project name)
- <task1>Task title</task1> for individual tasks
- <team_member1 name="Name" role="role" /> for team members
- <project_description>Description</project_description> for project descriptions

CRITICAL: When the user provides a project name, you MUST respond with the <projectname> tag containing their project name. This is essential for the app to create the project.

FLOW ENFORCEMENT:
- If user mentions tasks but no project name → Ask "What would you like to call this project?" FIRST
- If user provides project name → ALWAYS respond with "<projectname>Project Name</projectname>"
- Only show tasks after project name is established

Remember: Be friendly, concise, and ask only 1-2 questions per response.`;

    return prompt;
  }

  /**
   * Save conversation memory to database
   */
  static async saveConversationMemory(
    conversationId: string,
    memory: ConversationMemory
  ): Promise<void> {
    try {
      // Update conversation with summary
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          title: memory.summary ? `Project Creation - ${memory.summary.substring(0, 50)}...` : 'Project Creation',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save conversation memory:', error);
      throw error;
    }
  }

  /**
   * Get conversation context for decision making
   */
  static async getConversationContext(conversationId: string): Promise<any> {
    try {
      const memory = await this.getConversationMemory(conversationId);
      
      // Extract key information from conversation
      const context = {
        project_info: this.extractProjectInfo(memory.messages),
        team_members: this.extractTeamMembers(memory.messages),
        tasks: this.extractTasks(memory.messages),
        current_step: this.determineCurrentStep(memory.messages),
        missing_info: this.identifyMissingInfo(memory.messages)
      };

      return context;
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return {};
    }
  }

  /**
   * Extract project information from conversation
   */
  private static extractProjectInfo(messages: GPTMessage[]): any {
    const projectInfo: any = {};

    for (const message of messages) {
      if (message.role === 'user') {
        // Look for project name patterns
        const nameMatch = message.content.match(/project.*?name.*?["']([^"']+)["']/i);
        if (nameMatch) projectInfo.name = nameMatch[1];

        // Look for project description patterns
        const descMatch = message.content.match(/description.*?["']([^"']+)["']/i);
        if (descMatch) projectInfo.description = descMatch[1];

        // Look for category patterns
        const categoryMatch = message.content.match(/category.*?["']([^"']+)["']/i);
        if (categoryMatch) projectInfo.category = categoryMatch[1];
      }
    }

    return projectInfo;
  }

  /**
   * Extract team members from conversation
   */
  private static extractTeamMembers(messages: GPTMessage[]): any[] {
    const teamMembers: any[] = [];

    for (const message of messages) {
      if (message.role === 'assistant') {
        // Look for team member widgets
        const memberMatches = message.content.match(/<team_member[^>]*name=["']([^"']+)["'][^>]*>/gi);
        if (memberMatches) {
          memberMatches.forEach(match => {
            const nameMatch = match.match(/name=["']([^"']+)["']/);
            const roleMatch = match.match(/role=["']([^"']+)["']/);
            const emailMatch = match.match(/email=["']([^"']+)["']/);

            if (nameMatch) {
              teamMembers.push({
                name: nameMatch[1],
                role: roleMatch ? roleMatch[1] : 'viewer',
                email: emailMatch ? emailMatch[1] : undefined
              });
            }
          });
        }
      }
    }

    return teamMembers;
  }

  /**
   * Extract tasks from conversation
   */
  private static extractTasks(messages: GPTMessage[]): any[] {
    const tasks: any[] = [];

    for (const message of messages) {
      if (message.role === 'assistant') {
        // Look for task widgets
        const taskMatches = message.content.match(/<task[^>]*>(.*?)<\/task>/gi);
        if (taskMatches) {
          taskMatches.forEach(match => {
            const contentMatch = match.match(/<task[^>]*>(.*?)<\/task>/i);
            const priorityMatch = match.match(/priority=["']([^"']+)["']/);
            const dueDateMatch = match.match(/due_date=["']([^"']+)["']/);

            if (contentMatch) {
              tasks.push({
                title: contentMatch[1].trim(),
                priority: priorityMatch ? priorityMatch[1] : 'medium',
                due_date: dueDateMatch ? dueDateMatch[1] : undefined
              });
            }
          });
        }
      }
    }

    return tasks;
  }

  /**
   * Determine current step in project creation
   */
  private static determineCurrentStep(messages: GPTMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return 'initializing';

    const content = lastMessage.content.toLowerCase();

    if (content.includes('project name') || content.includes('what would you like to name')) {
      return 'gathering_project_name';
    } else if (content.includes('description') || content.includes('describe')) {
      return 'gathering_project_description';
    } else if (content.includes('team member') || content.includes('who will be working')) {
      return 'gathering_team_members';
    } else if (content.includes('task') || content.includes('what tasks')) {
      return 'gathering_tasks';
    } else if (content.includes('confirm') || content.includes('ready to create')) {
      return 'confirming_project';
    } else {
      return 'gathering_info';
    }
  }

  /**
   * Identify missing information for project creation
   */
  private static identifyMissingInfo(messages: GPTMessage[]): string[] {
    const context = this.extractProjectInfo(messages);
    const missing: string[] = [];

    if (!context.name) missing.push('project_name');
    if (!context.description) missing.push('project_description');
    if (!context.category) missing.push('project_category');

    return missing;
  }
} 