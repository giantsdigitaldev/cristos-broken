import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { HTMLParser, ParsedWidget } from '@/utils/aiServices/htmlParser';
import { ProjectChatService } from '@/utils/aiServices/projectChatService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import VoiceOrb from './VoiceOrb';
import WidgetRenderer from './WidgetRenderer';

interface ProjectAIChatProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  widgets?: ParsedWidget[];
}

const ProjectAIChat: React.FC<ProjectAIChatProps> = ({ projectId, projectName, onClose }) => {
  const { user } = useAuth();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    if (!user?.id) {
      console.warn('[ProjectAIChat] No user ID available');
      setMessages([{
        id: 'auth-error',
        role: 'assistant',
        content: `⚠️ **Authentication Required**\n\nPlease log in to use the AI chat feature.`,
        timestamp: new Date().toISOString()
      }]);
      setIsLoadingHistory(false);
      return;
    }

    try {
      setIsLoadingHistory(true);
      
      // First check if tables exist with retry mechanism
      let tablesExist = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !tablesExist) {
        try {
          tablesExist = await ProjectChatService.checkTablesExist();
          if (tablesExist) break;
        } catch (error) {
          console.warn('[ProjectAIChat] Table check attempt', retryCount + 1, 'failed:', error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      setTablesExist(tablesExist);
      
      if (!tablesExist) {
        console.warn('Project chat tables do not exist or have permission issues. Starting fresh conversation with fallback.');
        // Start with a welcome message and show warning
        setMessages([
          {
            id: 'system-warning',
            role: 'assistant',
            content: `⚠️ **Project Chat System Setup Required**\n\nTo enable persistent chat history for this project, please run the database setup script in your Supabase dashboard.\n\n**Quick Fix:** Copy and paste the SQL script from \`scripts/manual-setup-project-chat.sql\` into your Supabase SQL Editor and run it.\n\nFor now, I'll help you with project tasks and management, but chat history won't be saved between sessions.`,
            timestamp: new Date().toISOString()
          },
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I'm your AI assistant for the project "${projectName}". I can help you with tasks, team management, and project updates. What would you like to work on?`,
            timestamp: new Date().toISOString()
          }
        ]);
        return;
      }
      
      // Get or create chat session
      const session = await ProjectChatService.getOrCreateChatSession(projectId, user.id);
      
      if (!session) {
        console.warn('Could not create chat session. Starting fresh conversation.');
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI assistant for the project "${projectName}". I can help you with tasks, team management, and project updates. What would you like to work on?`,
          timestamp: new Date().toISOString()
        }]);
        return;
      }
      
      // Load chat history with comprehensive debugging
      console.log('[ProjectAIChat] Loading chat history for project:', projectId, 'user:', user.id);
      let history = await ProjectChatService.getChatHistory(projectId, user.id);
      console.log('[ProjectAIChat] Chat history loaded:', {
        historyLength: history.length,
        history: history.map(msg => ({
          id: msg.id,
          role: msg.role,
          contentLength: msg.content.length,
          timestamp: msg.timestamp,
          hasWidgets: !!msg.metadata?.widgets
        }))
      });
      
      if (history.length === 0) {
        console.log('[ProjectAIChat] No chat history found, attempting to migrate AI creation conversation');
        
        // Try to migrate AI project creation conversation
        const migrationSuccess = await ProjectChatService.migrateAIProjectConversation(projectId, user.id);
        
        if (migrationSuccess) {
          console.log('[ProjectAIChat] Successfully migrated AI creation conversation, reloading history');
          history = await ProjectChatService.getChatHistory(projectId, user.id);
          console.log('[ProjectAIChat] Reloaded history after migration:', {
            historyLength: history.length
          });
        }
        
        if (history.length === 0) {
          console.log('[ProjectAIChat] Still no chat history found, starting fresh conversation');
          // No history, start with welcome message
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I'm your AI assistant for the project "${projectName}". I can help you with tasks, team management, and project updates. What would you like to work on?`,
            timestamp: new Date().toISOString()
          }]);
        } else {
          console.log('[ProjectAIChat] Found migrated chat history, converting to chat format');
          // Convert to chat messages format
          const chatMessages: ChatMessage[] = history.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            widgets: msg.metadata?.widgets || []
          }));

          console.log('[ProjectAIChat] Setting', chatMessages.length, 'messages in UI');
          setMessages(chatMessages);
        }
      } else {
        console.log('[ProjectAIChat] Converting', history.length, 'messages to chat format');
        // Convert to chat messages format
        const chatMessages: ChatMessage[] = history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          widgets: msg.metadata?.widgets || []
        }));

        console.log('[ProjectAIChat] Setting', chatMessages.length, 'messages in UI');
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Start with welcome message even if there's an error
      setMessages([
        {
          id: 'error-warning',
          role: 'assistant',
          content: `⚠️ **Chat History Loading Error**\n\nI encountered an issue loading your previous chat history. Starting a fresh conversation.`,
          timestamp: new Date().toISOString()
        },
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your AI assistant for the project "${projectName}". I can help you with tasks, team management, and project updates. What would you like to work on?`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user?.id || !content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Save user message if tables exist
      if (tablesExist) {
        await ProjectChatService.addMessage(projectId, user.id, 'user', content.trim());
      }

      // Get current chat history for AI context with debugging
      console.log('[ProjectAIChat] Getting chat history for AI context, tablesExist:', tablesExist);
      const currentHistory = tablesExist 
        ? await ProjectChatService.getChatHistory(projectId, user.id)
        : [];
      
      console.log('[ProjectAIChat] AI context history:', {
        historyLength: currentHistory.length,
        history: currentHistory.map(msg => ({
          id: msg.id,
          role: msg.role,
          contentLength: msg.content.length,
          timestamp: msg.timestamp
        }))
      });

      // Generate AI response
      console.log('[ProjectAIChat] Generating AI response with', currentHistory.length, 'context messages');
      const aiResponse = await ProjectChatService.generateAIResponse(
        projectId,
        user.id,
        content.trim(),
        currentHistory
      );

      // Parse AI response for widgets
      const parsedResponse = HTMLParser.parseMessage(aiResponse);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsedResponse.text,
        timestamp: new Date().toISOString(),
        widgets: parsedResponse.widgets
      };

      // Save AI message if tables exist
      if (tablesExist) {
        await ProjectChatService.addMessage(
          projectId, 
          user.id, 
          'assistant', 
          aiResponse,
          { widgets: parsedResponse.widgets }
        );
      } else {
        // Show warning about chat history not being saved
        console.warn('Chat history not being saved - tables do not exist');
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    setInputText(transcript);
    sendMessage(transcript);
  };

  const handleWidgetPress = async (widget: any) => {
    console.log('Project widget pressed:', widget);
    
    // Handle project-specific widgets
    if (widget.type === 'task' || widget.type === 'task_creation') {
      // Navigate to task creation or task details
      router.push(`/addnewtaskform?projectId=${projectId}`);
    } else if (widget.type === 'team_member' || widget.type === 'add_team') {
      // Navigate to team management
      router.push(`/projectdetailsteammenber?projectId=${projectId}`);
    } else if (widget.type === 'project_update' || widget.type === 'status_change') {
      // Handle project updates
      Alert.alert('Project Update', 'This would update the project status or details');
    }
  };

  const renderMessage = (message: ChatMessage) => {
    // Check if this is a system warning message
    const isSystemWarning = message.id === 'system-warning' || message.id === 'error-warning';
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        message.role === 'user' ? styles.userMessage : styles.assistantMessage
      ]}>
        <View style={[
          styles.messageBubble,
          message.role === 'user' ? styles.userBubble : styles.assistantBubble,
          isSystemWarning && styles.warningBubble
        ]}>
          <Text style={[
            styles.messageText,
            message.role === 'user' ? styles.userText : styles.assistantText,
            isSystemWarning && styles.warningText
          ]}>
            {message.content}
          </Text>
          
          {message.widgets && message.widgets.length > 0 && (
            <View style={styles.widgetsContainer}>
              <WidgetRenderer
                widgets={message.widgets}
                projectId={projectId}
                onWidgetPress={handleWidgetPress}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoadingHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chat history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.projectName}>{projectName}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.grayscale400} />
            <Text style={styles.emptyStateTitle}>Start a conversation</Text>
            <Text style={styles.emptyStateText}>
              Ask me anything about your project &quot;{projectName}&quot;. I can help with tasks, team management, and project updates.
            </Text>
            {tablesExist === false && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  Chat history will not be saved until database setup is complete.
                </Text>
              </View>
            )}
          </View>
        ) : (
          messages.map(renderMessage)
        )}
        
        {isLoading && (
          <View style={styles.loadingMessage}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your project..."
          placeholderTextColor={COLORS.grayscale400}
          multiline
          maxLength={1000}
        />
        
        <View style={styles.inputActions}>
          <VoiceOrb
            onVoiceStart={() => setIsListening(true)}
            onVoiceStop={() => setIsListening(false)}
            isListening={isListening}
            isProcessing={false}
            hasError={false}
            disabled={isLoading}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() ? COLORS.white : COLORS.grayscale400} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  projectName: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.white,
    opacity: 0.8,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'regular',
    color: COLORS.grayscale700,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'regular',
    color: COLORS.grayscale700,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.warning,
    marginLeft: 8,
    flex: 1,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.grayscale100,
    borderBottomLeftRadius: 4,
  },
  warningBubble: {
    backgroundColor: COLORS.warning + '20',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'regular',
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
  },
  assistantText: {
    color: COLORS.greyscale900,
  },
  widgetsContainer: {
    marginTop: 8,
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.grayscale100,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
    color: COLORS.greyscale900,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.grayscale100,
    borderRadius: 20,
    marginRight: 12,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.grayscale200,
  },
});

export default ProjectAIChat; 