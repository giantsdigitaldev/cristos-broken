// TEMPORARY CORS PROXY SOLUTION - FOR TESTING ONLY
// Replace this with the Edge Function solution for production

import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface ChatMessageWithId {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

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

export class ChatService {
  /**
   * Call Claude API via CORS proxy (TEMPORARY SOLUTION)
   */
  private static async callClaudeAPI(
    messages: Array<{role: 'user' | 'assistant', content: string}>
  ): Promise<string> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
      if (!apiKey) {
        throw new Error('Claude API key not configured');
      }

      const isWeb = Platform.OS === 'web';
      // @ts-ignore
      const isLocalhost = isWeb && (typeof window !== 'undefined') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let endpoint: string;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (isWeb && isLocalhost) {
        // Use CORS proxy for local web development
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        endpoint = proxyUrl + 'https://api.anthropic.com/v1/messages';
        headers['X-Requested-With'] = 'XMLHttpRequest';
      } else {
        // Use direct API for iOS/Android/production web
        endpoint = 'https://api.anthropic.com/v1/messages';
      }

      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: messages,
          system: "You are a helpful AI assistant for project management and productivity. Provide clear, actionable advice and help users organize their work effectively."
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || 'Sorry, I could not generate a response.';
    } catch (error: any) {
      console.error('Claude API call failed:', error);
      throw new Error('Failed to get response from AI assistant. Please try again.');
    }
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

      // Get conversation history for context
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10);

      const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = 
        messages || [];

      conversationHistory.push({ role: 'user', content });

      // Call Claude API
      const assistantResponse = await this.callClaudeAPI(conversationHistory);

      // Save user message
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

      // Save assistant message
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

      // Update conversation title if first exchange
      if (conversationHistory.length <= 2) {
        const title = this.generateSimpleTitle(content);
        const preview = this.generatePreview(content);
        
        await supabase
          .from('chat_conversations')
          .update({ 
            title,
            metadata: { preview }
          })
          .eq('id', conversationId);
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
   * Generate simple title from user message
   */
  private static generateSimpleTitle(content: string): string {
    const words = content.trim().split(/\s+/);
    const title = words.slice(0, 6).join(' ');
    return title.length < content.length ? title + '...' : title || 'New Conversation';
  }

  /**
   * Generate preview from user message
   */
  private static generatePreview(content: string): string {
    const words = content.trim().split(/\s+/);
    const preview = words.slice(0, 10).join(' ');
    return preview.length < content.length ? preview + '...' : preview;
  }

  // ... [Include all other methods from the main ChatService]
  
  static async getChatSessions(): Promise<ChatSession[]> {
    // Same implementation as main service
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          id,
          user_id,
          project_id,
          title,
          metadata,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch chat sessions: ${error.message}`);
      }

      const sessions: ChatSession[] = await Promise.all(
        (data || []).map(async (conversation) => {
          const { data: messageData } = await supabase
            .from('chat_messages')
            .select('created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const messageCount = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', conversation.id);

          return {
            id: conversation.id,
            user_id: conversation.user_id,
            project_id: conversation.project_id,
            title: conversation.title,
            preview: conversation.metadata?.preview || 'No messages yet',
            message_count: messageCount.count || 0,
            last_message_at: messageData?.[0]?.created_at || conversation.created_at,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at
          };
        })
      );

      return sessions;
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`);
      }

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

  static async getConversationDetails(conversationId: string): Promise<{
    conversation: any;
    messages: ChatMessageWithId[];
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convError) {
        throw new Error(`Failed to fetch conversation: ${convError.message}`);
      }

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
} 