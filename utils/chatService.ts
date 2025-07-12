import { Platform } from 'react-native';
import { GPTMessage } from './aiServices/gpt4o-mini-service';
import { Database, supabase } from './supabase';

type ChatConversation = Database['public']['Tables']['chat_conversations']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type InsertChatConversation = Database['public']['Tables']['chat_conversations']['Insert'];
type InsertChatMessage = Database['public']['Tables']['chat_messages']['Insert'];

export interface ChatSession {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  preview: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageWithId {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface GPTAPIResponse {
  success: boolean;
  message: string;
  conversationId?: string;
  usage?: any;
  error?: string;
  details?: string;
}

interface GPTDirectResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: any;
}

interface MessageImportance {
  score: number;
  keywords: string[];
  isKeyDecision: boolean;
  isRequirement: boolean;
  isActionItem: boolean;
}

export class ChatService {
  
  /**
   * Detect if running on web platform
   */
  private static isWeb(): boolean {
    return Platform.OS === 'web';
  }

  /**
   * Call GPT-4o-mini API via proxy - for all platforms
   */
  private static async callGPTAPIDirect(
    messages: GPTMessage[]
  ): Promise<string> {
    const isWeb = Platform.OS === 'web';
    // @ts-ignore
    const isLocalhost = isWeb && (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    let endpoint: string;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Always use OpenAI API directly - no local server needed
    endpoint = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4000,
        messages: messages
      }),
    });

    const data = await response.json();
    let assistantMessage: string;
    if (endpoint.includes('openai.com')) {
      assistantMessage = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    } else {
      assistantMessage = data.message || 'Sorry, I could not generate a response.';
    }
    return assistantMessage;
  }

  /**
   * Check if local proxy server is available
   */
  private static async isProxyServerAvailable(): Promise<boolean> {
    // Always return false since we're not using local server
    return false;
  }

  /**
   * Call GPT-4o-mini API for web platforms - optimized for speed
   */
  private static async callGPTAPIForWeb(
    messages: GPTMessage[]
  ): Promise<string> {
    console.log('🤖 Attempting GPT-4o-mini API call for web...');

    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file');
    }

    // Strategy 1: Use direct OpenAI API (fastest and most reliable)
    try {
      console.log('🚀 Using direct OpenAI API...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          messages: messages,
          model: 'gpt-4o-mini',
          max_tokens: 4000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
        console.log('✅ Received response from GPT-4o-mini (OpenAI API)');
        return assistantMessage;
      }
    } catch (error) {
      console.log('❌ OpenAI API request failed...');
    }

    // Strategy 2: Try Supabase Edge Function (if deployed)
    try {
      console.log('Trying Supabase Edge Function...');
      const { data, error } = await supabase.functions.invoke('gpt-chat', {
        body: {
          messages: messages,
          model: 'gpt-4o-mini',
          max_tokens: 4000
        }
      });

      if (!error && data?.success) {
        console.log('✅ Received response from GPT-4o-mini (Edge Function)');
        return data.message;
      }
    } catch (error) {
      console.log('Edge Function not available...');
    }

    // Strategy 3: Provide helpful fallback with setup instructions
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuestion = lastUserMessage?.content || '';
    
    return `I'd love to help you with "${userQuestion.substring(0, 50)}${userQuestion.length > 50 ? '...' : ''}"

🚨 **AI Proxy Server Not Running**

To enable full AI responses on web, please start the proxy server:

\`\`\`bash
cd /path/to/your/project
node server.js
\`\`\`

Then refresh this page and try again! 🚀`;
  }

  /**
   * Call GPT-4o-mini API using smart routing
   */
  private static async callGPTAPI(
    messages: GPTMessage[],
    conversationId?: string
  ): Promise<string> {
    // For web platforms, use optimized web call
    if (this.isWeb()) {
      return await this.callGPTAPIForWeb(messages);
    }
    
    // For mobile platforms, use direct proxy call
    return await this.callGPTAPIDirect(messages);
  }

  /**
   * Create a new conversation
   */
  static async createConversation(projectId?: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          title: 'New Chat',
          metadata: {}
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase error creating conversation:', error);
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      return data.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Estimate token count for a message
   * Rough estimation: 1 token ≈ 4 characters for English text
   */
  private static estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate message importance score
   */
  private static calculateMessageImportance(message: { content: string }): MessageImportance {
    const content = message.content.toLowerCase();
    const keywords = [
      // Decision-related keywords
      'decision', 'decide', 'choose', 'select', 'option', 'alternative',
      // Requirement-related keywords
      'require', 'must', 'should', 'need', 'necessary', 'essential',
      // Action-related keywords
      'task', 'todo', 'action', 'next step', 'deadline', 'due date',
      // Priority-related keywords
      'important', 'critical', 'urgent', 'priority', 'high priority',
      // Implementation-related keywords
      'implement', 'develop', 'build', 'create', 'design', 'architecture',
      // Problem-related keywords
      'issue', 'problem', 'bug', 'error', 'fix', 'solution',
      // Feature-related keywords
      'feature', 'functionality', 'capability', 'component', 'module',
      // Technical keywords
      'api', 'database', 'server', 'client', 'frontend', 'backend',
      // Business keywords
      'business', 'requirement', 'stakeholder', 'user', 'customer',
      // Project management keywords
      'milestone', 'sprint', 'iteration', 'phase', 'stage', 'timeline'
    ];

    let score = 0;
    const foundKeywords: string[] = [];
    
    // Check for key decision indicators
    const isKeyDecision = content.includes('decision') || 
                         content.includes('decide') || 
                         content.includes('choose') ||
                         content.includes('select') ||
                         content.includes('option');

    // Check for requirement indicators
    const isRequirement = content.includes('require') || 
                         content.includes('must') || 
                         content.includes('should') ||
                         content.includes('need') ||
                         content.includes('necessary');

    // Check for action item indicators
    const isActionItem = content.includes('task') || 
                        content.includes('todo') || 
                        content.includes('action') ||
                        content.includes('next step') ||
                        content.includes('deadline');

    // Check for priority indicators
    const isHighPriority = content.includes('important') || 
                          content.includes('critical') || 
                          content.includes('urgent') ||
                          content.includes('priority');

    // Check for technical decision indicators
    const isTechnicalDecision = content.includes('implement') || 
                               content.includes('architecture') || 
                               content.includes('design') ||
                               content.includes('api') ||
                               content.includes('database');

    // Score based on keywords
    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        score += 2;
        foundKeywords.push(keyword);
      }
    });

    // Boost scores for important message types
    if (isKeyDecision) score += 5;
    if (isRequirement) score += 4;
    if (isActionItem) score += 3;
    if (isHighPriority) score += 4;
    if (isTechnicalDecision) score += 3;

    // Additional scoring based on message length (longer messages might contain more context)
    const messageLength = content.length;
    if (messageLength > 500) score += 2;
    if (messageLength > 1000) score += 3;

    // Boost score for messages with multiple important indicators
    const importantIndicators = [isKeyDecision, isRequirement, isActionItem, isHighPriority, isTechnicalDecision]
      .filter(Boolean).length;
    if (importantIndicators >= 2) score += importantIndicators;

    return {
      score,
      keywords: foundKeywords,
      isKeyDecision,
      isRequirement,
      isActionItem
    };
  }

  /**
   * Get smart context for conversation
   */
  private static async getSmartContext(
    conversationId: string,
    currentMessage: string,
    maxTokens: number = 150000
  ): Promise<GPTMessage[]> {
    try {
      // Get all messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!messages) return [];

      // Get conversation summary
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();

      const summary = conversation?.metadata?.summary;
      let totalTokens = summary ? this.estimateTokenCount(summary) : 0;
      const relevantMessages: GPTMessage[] = [];

      // Calculate importance scores for all messages
      const messagesWithScores = messages.map(msg => ({
        ...msg,
        importance: this.calculateMessageImportance(msg)
      }));

      // Always include the most recent messages (last 100)
      const recentMessages = messagesWithScores.slice(-100);
      for (const msg of recentMessages) {
        const messageTokens = this.estimateTokenCount(msg.content);
        if (totalTokens + messageTokens <= maxTokens) {
          relevantMessages.push({ role: msg.role, content: msg.content });
          totalTokens += messageTokens;
        } else {
          // If we can't fit all 100 messages, break and use scoring for remaining space
          break;
        }
      }

      // If we have space left, add important messages from the rest of the conversation
      if (totalTokens < maxTokens) {
        const remainingMessages = messagesWithScores
          .slice(0, -100)
          .sort((a, b) => b.importance.score - a.importance.score);

        for (const msg of remainingMessages) {
          const messageTokens = this.estimateTokenCount(msg.content);
          if (totalTokens + messageTokens <= maxTokens) {
            relevantMessages.push({ role: msg.role, content: msg.content });
            totalTokens += messageTokens;
          } else {
            break;
          }
        }
      }

      // Add summary as system message if available
      if (summary) {
        relevantMessages.unshift({
          role: 'system',
          content: `Previous conversation summary: ${summary}`
        });
      }

      return relevantMessages;
    } catch (error) {
      console.error('Error getting smart context:', error);
      return [];
    }
  }

  /**
   * Generate and store conversation summary
   */
  private static async summarizeConversation(conversationId: string): Promise<void> {
    try {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!messages || messages.length === 0) return;

      // Create summary prompt
      const summaryPrompt = `Please provide a concise summary (3-4 sentences) of this conversation, focusing on key decisions, requirements, and action items:

${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Summary:`;

      // Get summary from GPT-4o-mini
      const summary = await this.callGPTAPI(
        [
          { role: 'user', content: summaryPrompt }
        ]
      );

      // Store summary in conversation metadata
      await supabase
        .from('chat_conversations')
        .update({ 
          metadata: { 
            summary,
            last_summarized_at: new Date().toISOString()
          }
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error summarizing conversation:', error);
    }
  }

  /**
   * Send a message and get AI response
   */
  static async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{
    userMessage: ChatMessageWithId;
    assistantMessage: ChatMessageWithId;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get smart context for the conversation
      const conversationHistory = await this.getSmartContext(conversationId, content);

      // Add the new user message
      conversationHistory.push({ role: 'user', content });

      // Call GPT-4o-mini API using smart routing
      const assistantResponse = await this.callGPTAPI(conversationHistory, conversationId);

      // Save user message to database
      const { data: userMessageData, error: userError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'user',
          content: content,
          metadata: {}
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to save user message: ${userError.message}`);
      }

      // Save assistant message to database
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantResponse,
          metadata: {}
        })
        .select()
        .single();

      if (assistantError) {
        throw new Error(`Failed to save assistant message: ${assistantError.message}`);
      }

      // Periodically update summary (every 20 messages)
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversationId);

      if (count && count % 20 === 0) {
        await this.summarizeConversation(conversationId);
      }

      return {
        userMessage: userMessageData,
        assistantMessage: assistantMessageData
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Generate a conversation title using AI
   */
  private static async generateConversationTitle(
    assistantResponse: string, 
    userMessage: string
  ): Promise<string> {
    try {
      const titlePrompt = `Based on this conversation, create a short, descriptive title (max 6 words):

User: ${userMessage}
Assistant: ${assistantResponse.substring(0, 200)}...

Title:`;

      const titleResponse = await this.callGPTAPI([
        { role: 'user', content: titlePrompt }
      ]);

      const title = titleResponse
        .replace(/^(Title:|AI Chat|Conversation):?\s*/i, '')
        .trim()
        .substring(0, 50);

      return title || 'New Conversation';
    } catch (error) {
      console.log('Failed to generate title, using default');
      // Fallback to simple title based on user message
      return `Chat: ${userMessage.substring(0, 30)}${userMessage.length > 30 ? '...' : ''}`;
    }
  }

  /**
   * Generate a 10-word preview from user message
   */
  private static generatePreview(content: string): string {
    const words = content.trim().split(/\s+/);
    const preview = words.slice(0, 10).join(' ');
    return preview.length < content.length ? preview + '...' : preview;
  }

  /**
   * Get all chat sessions for the current user - OPTIMIZED
   */
  static async getChatSessions(): Promise<ChatSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the optimized function that includes message counts
      const { data, error } = await supabase.rpc('get_user_conversations_with_counts', { 
        p_user_id: user.id 
      });

      if (error) {
        throw new Error(`Failed to fetch chat sessions: ${error.message}`);
      }

      // Transform to ChatSession format
      const sessions: ChatSession[] = (data || []).map((conversation: any) => ({
        id: conversation.id,
        user_id: user.id,
        project_id: conversation.project_id,
        title: conversation.title || 'Untitled Conversation',
        preview: 'Recent conversation', // Could be enhanced with actual preview
        message_count: Number(conversation.message_count) || 0,
        last_message_at: conversation.last_message_at || conversation.created_at,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at
      }));

      return sessions;
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
  }

  /**
   * Get conversation details with messages
   */
  static async getConversationDetails(conversationId: string): Promise<{
    conversation: any;
    messages: ChatMessageWithId[];
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get conversation
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convError) {
        throw new Error(`Failed to fetch conversation: ${convError.message}`);
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }

      return {
        conversation,
        messages: messages || []
      };
    } catch (error: any) {
      console.error('Error fetching conversation details:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete messages first
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`);
      }

      // Delete conversation
      const { error: conversationError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (conversationError) {
        throw new Error(`Failed to delete conversation: ${conversationError.message}`);
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
} 