import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS } from '../constants';

export interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: number;
    name?: string;
    avatar?: string;
  };
}

interface CustomChatProps {
  messages: ChatMessage[];
  onSend: (message: ChatMessage) => void;
  user: { _id: number };
  placeholder?: string;
  renderMessage?: (message: ChatMessage, index: number) => React.ReactElement;
  renderInputToolbar?: () => React.ReactElement | null;
  minInputToolbarHeight?: number;
}

const CustomChat: React.FC<CustomChatProps> = ({
  messages,
  onSend,
  user,
  placeholder = "Type a message...",
  renderMessage,
  renderInputToolbar,
  minInputToolbarHeight = 0,
}) => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage: ChatMessage = {
        _id: Math.random().toString(36).substring(7),
        text: inputText.trim(),
        createdAt: new Date(),
        user: { _id: user._id },
      };
      onSend(newMessage);
      setInputText('');
    }
  };

  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    if (renderMessage) {
      return renderMessage(item, index);
    }

    const isOwnMessage = item.user._id === user._id;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderInputToolbarComponent = () => {
    if (renderInputToolbar) {
      return renderInputToolbar();
    }

    return (
      <View style={[styles.inputToolbar, { minHeight: minInputToolbarHeight }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.gray}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={20} color={inputText.trim() ? COLORS.white : COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {renderInputToolbarComponent()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: COLORS.secondary,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...FONTS.body4,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.white,
  },
  messageTime: {
    ...FONTS.body4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: COLORS.white,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: COLORS.white,
    opacity: 0.8,
  },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale100,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.grayscale100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    ...FONTS.body4,
    color: COLORS.greyscale900,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.grayscale200,
  },
});

export default CustomChat; 