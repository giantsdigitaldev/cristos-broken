import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AIProjectChat from '../components/AIProjectChat';
import { COLORS, icons } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { ChatMessageWithId, ChatService } from '../utils/chatService';

const { height: screenHeight } = Dimensions.get('window');

interface AIAssistantRouteParams {
  conversationId?: string;
  projectId?: string;
}

interface ChatBubbleProps {
  message: ChatMessageWithId;
  isUser: boolean;
  dark: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, dark }) => (
  <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        {
          backgroundColor: isUser 
            ? COLORS.primary
            : dark ? COLORS.dark2 : COLORS.grayscale200,
        },
      ]}
    >
      <Text
        style={[
          styles.messageText,
          {
            color: isUser 
              ? COLORS.white
              : dark ? COLORS.white : COLORS.greyscale900,
          },
        ]}
      >
        {message.content}
      </Text>
      <Text
        style={[
          styles.messageTime,
          {
            color: isUser 
              ? `${COLORS.white}80`
              : dark ? COLORS.grayscale400 : COLORS.grayscale700,
          },
        ]}
      >
        {new Date(message.created_at).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  </View>
);

const AIAssistant = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: AIAssistantRouteParams }, 'params'>>();
  const { colors, dark } = useTheme();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    route.params?.conversationId || null
  );
  const [conversationTitle, setConversationTitle] = useState('AI Assistant');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(route.params?.projectId || null);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Enhanced keyboard event listeners with 8px offset for iOS
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        // Add 8px offset for iOS to position input field 8px above keyboard
        const adjustedHeight = Platform.OS === 'ios' ? keyboardHeight + 8 : keyboardHeight;
        setKeyboardHeight(adjustedHeight);
        setIsKeyboardVisible(true);
        
        // Scroll to bottom when keyboard appears with delay for animation
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, Platform.OS === 'ios' ? 50 : 150);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Load conversation messages
  const loadConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      const conversationDetails = await ChatService.getConversationDetails(conversationId);
      if (conversationDetails) {
        setMessages(conversationDetails.messages as ChatMessageWithId[]);
        setConversationTitle(conversationDetails.conversation.title || 'AI Assistant');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation. Please try again.');
    }
  }, [conversationId]);

  // Initialize conversation
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    } else {
      // Create new conversation
      createNewConversation();
    }
  }, [conversationId, loadConversation]);

  // Create new conversation
  const createNewConversation = async () => {
    try {
      const newConversationId = await ChatService.createConversation(route.params?.projectId);
      setConversationId(newConversationId);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to create conversation. Please try again.');
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isLoading) return;

    const userMessage = inputMessage.trim();
    // Clear input immediately when sending
    setInputMessage('');
    setIsLoading(true);

    // Dismiss keyboard on send
    Keyboard.dismiss();

    try {
      const { userMessage: savedUserMessage, assistantMessage } = await ChatService.sendMessage(
        conversationId,
        userMessage
      );

      // Add messages to local state
      setMessages(prev => [...prev, savedUserMessage, assistantMessage]);

      // Scroll to bottom after messages are added
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Update conversation title if it was generated
      if (conversationTitle === 'AI Assistant') {
        setTimeout(async () => {
          try {
            const updatedDetails = await ChatService.getConversationDetails(conversationId);
            if (updatedDetails?.conversation.title) {
              setConversationTitle(updatedDetails.conversation.title);
            }
          } catch (error) {
            console.error('Error updating title:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input submission
  const handleSubmit = () => {
    sendMessage();
  };

  // Handle key press for send - ensure text is cleared
  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
      // Prevent default to avoid double submission
      nativeEvent.preventDefault();
      handleSubmit();
    }
  };

  // Render message item
  const renderMessage = ({ item }: { item: ChatMessageWithId }) => (
    <ChatBubble
      message={item}
      isUser={item.role === 'user'}
      dark={dark}
    />
  );

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.typingContainer}>
        <View
          style={[
            styles.typingBubble,
            { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 },
          ]}
        >
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { backgroundColor: COLORS.primary }]} />
            <View style={[styles.typingDot, { backgroundColor: COLORS.primary }]} />
            <View style={[styles.typingDot, { backgroundColor: COLORS.primary }]} />
          </View>
        </View>
      </View>
    );
  };

  // Callback for when project is created in AI chat
  const handleProjectCreated = (newProjectId: string) => {
    setProjectId(newProjectId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar hidden={true} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={icons.arrowLeft}
              resizeMode="contain"
              style={[
                styles.headerIcon,
                { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
              ]}
            />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text
              style={[
                styles.headerTitle,
                { color: dark ? COLORS.white : COLORS.greyscale900 },
              ]}
              numberOfLines={1}
            >
              {conversationTitle}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 },
              ]}
            >
              Powered by GPT-4o-mini
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ai-project-creation-test' as any)}
            style={styles.headerButton}
          >
            <Ionicons
              name="flask"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('chatsessions')}
            style={styles.headerButton}
          >
            <Ionicons
              name="list-outline"
              size={24}
              color={dark ? COLORS.white : COLORS.greyscale900}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content with Keyboard Avoidance */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* AI Project Chat - pass callback for project creation */}
        <AIProjectChat
          user={user}
          onProjectCreated={handleProjectCreated}
          conversationId={conversationId}
        />
        {/* Messages Container */}
        <View style={[
          styles.messagesContainer,
          {
            marginBottom: Platform.OS === 'android' && isKeyboardVisible ? keyboardHeight : 0,
          }
        ]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messagesList,
              {
                paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 28 : 20) : 80, // Extra space when keyboard is visible, 8px more for iOS
              }
            ]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            onLayout={() => {
              // Scroll to bottom when layout changes
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }}
            ListFooterComponent={renderTypingIndicator}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />
        </View>

        {/* Input Container - Fixed at bottom */}
        <View
          style={[
            styles.inputContainer,
            { 
              backgroundColor: dark ? COLORS.dark1 : COLORS.white,
              paddingBottom: Platform.OS === 'ios' ? 8 : 16, // Add 8px padding for iOS
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100 },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                { color: dark ? COLORS.white : COLORS.greyscale900 },
              ]}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Type your message..."
              placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
              returnKeyType="send"
              onKeyPress={handleKeyPress}
              onFocus={() => {
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, Platform.OS === 'ios' ? 300 : 500);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputMessage.trim() && !isLoading 
                    ? COLORS.primary 
                    : dark ? COLORS.dark3 : COLORS.grayscale400,
                },
              ]}
              onPress={handleSubmit}
              disabled={!inputMessage.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Button */}
        <View style={{ padding: 16, backgroundColor: dark ? COLORS.dark1 : COLORS.white }}>
          {projectId ? (
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 24,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={() => navigation.navigate('projectdetails', { projectId })}
            >
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: 'bold' }}>Go to Project</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 24,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              onPress={() => {/* Manual mode: trigger project creation logic here */}}
            >
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: 'bold' }}>Create Project</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
      {/* TODO: In the navigation tab, update the + button to show 'Continue Project with AI' when on a project details page with an AI project. */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    height: 24,
    width: 24,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'semiBold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'medium',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    minWidth: 60,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'regular',
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'medium',
    marginTop: 4,
    opacity: 0.7,
  },
  typingContainer: {
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
    minHeight: 72,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
    maxHeight: 100,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default AIAssistant; 