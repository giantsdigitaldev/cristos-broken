import { COLORS } from '@/constants';
import { AIProjectCreationService } from '@/utils/aiServices/aiProjectCreationService';
import { HTMLParser, ParsedMessage, ParsedWidget } from '@/utils/aiServices/htmlParser';
import { generateUUID } from '@/utils/uuidGenerator';
// VOICE FEATURES DISABLED - Commenting out voice service imports
// import { IOSVoiceService } from '@/utils/aiServices/iosVoiceService';
// import { RealtimeSTTConfig, RealtimeSTTService } from '@/utils/aiServices/realtimeSTTService';
// import { StreamingTTSService } from '@/utils/aiServices/streamingTTSService';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// VOICE FEATURES DISABLED - Commenting out VoiceOrb import
// import VoiceOrb from './VoiceOrb';
import WidgetRenderer from './WidgetRenderer';

interface AIProjectChatProps {
  user: any;
  onProjectCreated?: (projectId: string) => void;
  conversationId?: string | null;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  widgets?: ParsedMessage['widgets'];
  projectId?: string; // Optional project ID for "Go to Project" button
}

interface ProjectState {
  id?: string;
  name?: string;
  description?: string;
  tasks: any[];
  subtasks: any[];
  teamMembers: any[];
  status: 'draft' | 'creating' | 'ready';
}

// VOICE FEATURES DISABLED - Commenting out all voice-related variables
// Web Speech API helpers
// let webRecognition: any = null;
// let webVoices: SpeechSynthesisVoice[] = [];
// let webTTSVoice: SpeechSynthesisVoice | null = null;

// if (Platform.OS === 'web' && typeof window !== 'undefined') {
//   // Load voices
//   const loadVoices = () => {
//     webVoices = window.speechSynthesis.getVoices();
//     // Try to find a natural, expressive female voice by name
//     const preferredNames = [
//       'Google UK English Female',
//       'Microsoft Aria Online (Natural)',
//       'Google US English',
//       'Samantha',
//       'en-GB',
//       'en-US',
//     ];
//     webTTSVoice = webVoices.find(v => preferredNames.includes(v.name))
//       || webVoices.find(v => v.name.toLowerCase().includes('female'))
//       || webVoices.find(v => v.name.toLowerCase().includes('aria'))
//       || webVoices.find(v => v.name.toLowerCase().includes('samantha'))
//       || webVoices.find(v => v.lang.startsWith('en'))
//       || webVoices[0] || null;
//   };
//   if (window.speechSynthesis.onvoiceschanged !== undefined) {
//     window.speechSynthesis.onvoiceschanged = loadVoices;
//   }
//   loadVoices();
// }

// Voice will be loaded only when needed on native platforms
// let Voice: any = null;

const AIProjectChat: React.FC<AIProjectChatProps> = ({ user, onProjectCreated, conversationId: propConversationId, onClose }) => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectState, setProjectState] = useState<ProjectState>({
    tasks: [],
    subtasks: [],
    teamMembers: [],
    status: 'draft'
  });
  const [conversationId, setConversationId] = useState<string | null>(propConversationId || null);
  const hasCalledProjectCreated = useRef(false);
  
  // VOICE FEATURES DISABLED - Commenting out all voice state
  // Voice state
  // const [isVoiceListening, setIsVoiceListening] = useState(false);
  // const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  // const [hasVoiceError, setHasVoiceError] = useState(false);
  // const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Add new state for AI speaking
  // const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  // Add new state for voice detection
  // const [isUserVoiceDetected, setIsUserVoiceDetected] = useState(false);
  
  // Add keyboard mode state
  // const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  
  // const [voiceFeedback, setVoiceFeedback] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user && messages.length === 0) {
      // If no conversationId, generate one
      if (!conversationId) {
        const newId = generateUUID();
        setConversationId(newId);
      }
      
      // Add delay to prevent subscription conflicts when modal opens
      const timer = setTimeout(() => {
        initializeConversation();
      }, 1500); // 1.5 second delay
      
      return () => clearTimeout(timer);
    }
    
    // VOICE FEATURES DISABLED - Commenting out voice service initialization
    // Initialize voice services based on platform
    // if (Platform.OS === 'ios') {
    //   initializeIOSVoice();
    // } else if (Platform.OS !== 'web') {
    //   initializeAndroidVoice();
    // }
  }, []);

  // VOICE FEATURES DISABLED - Commenting out all voice initialization functions
  // Initialize iOS voice services (ChatGPT-style)
  // const initializeIOSVoice = async () => {
  //   try {
  //     await IOSVoiceService.initialize();
  //     console.log('✅ iOS Voice Service initialized successfully');
      
  //     // Check environment and show appropriate feedback
  //     if (IOSVoiceService.isDevelopmentBuildEnvironment()) {
  //       setVoiceFeedback('🚀 Full native voice features enabled!');
  //       setTimeout(() => setVoiceFeedback(''), 3000);
  //     } else if (IOSVoiceService.isExpoGoEnvironment()) {
  //       setVoiceFeedback('📱 Development build required for full voice features');
  //       setTimeout(() => setVoiceFeedback(''), 5000);
  //     }
  //   } catch (error) {
  //     console.warn('❌ iOS Voice Service initialization failed:', error);
  //     setHasVoiceError(true);
  //     setVoiceFeedback('❌ Voice service initialization failed');
  //     setTimeout(() => setVoiceFeedback(''), 3000);
  //   }
  // };

  // Initialize Android voice services
  // const initializeAndroidVoice = async () => {
  //   try {
  //     // Load Voice only when needed using dynamic import
  //     if (!Voice) {
  //       const VoiceModule = await import('@react-native-voice/voice');
  //       Voice = VoiceModule.default;
  //     }
      
  //     Voice.onSpeechStart = (_e: any) => setIsVoiceListening(true);
  //     Voice.onSpeechEnd = (_e: any) => setIsVoiceListening(false);
  //     Voice.onSpeechResults = (e: { value?: string[] }) => {
  //       if (e.value && e.value[0]) {
  //         setVoiceTranscript(e.value[0]);
  //         setIsVoiceProcessing(false);
  //         sendMessage(e.value[0]);
  //       }
  //     };
  //     Voice.onSpeechError = (_e: any) => {
  //       setHasVoiceError(true);
  //       setIsVoiceListening(false);
  //       setIsVoiceProcessing(false);
  //     };
  //   } catch (error) {
  //     console.warn('Voice not available:', error);
  //     setHasVoiceError(true);
  //   }
  // };

  // Initialize STT with standard voice activity detection
  // useEffect(() => {
  //   if (!user) return;

  //   const config: RealtimeSTTConfig = {
  //     language: 'en-US',
  //     onInterimResult: (text: string) => {
  //       // Update input text in real-time for live display
  //       setInputText(text);
  //       setIsUserVoiceDetected(true);
  //       setVoiceFeedback('🎤 Listening: ' + text.substring(0, 50) + (text.length > 50 ? '...' : ''));
  //     },
  //     onFinalResult: (text: string) => {
  //       // Final transcript - automatically send the message
  //       if (text.trim()) {
  //         console.log('✅ Final transcript received:', text);
  //         setInputText(text);
  //         setIsUserVoiceDetected(false);
  //         setVoiceFeedback('');
          
  //         // Automatically send the message without requiring send button
  //         sendMessage(text);
  //       }
  //     },
  //     onError: (error: string) => {
  //       console.error('❌ STT error:', error);
  //       setIsUserVoiceDetected(false);
  //       setVoiceFeedback('❌ Voice recognition error');
          
  //       // Don't show error for aborted (normal during interruptions)
  //       if (error !== 'aborted') {
  //         setTimeout(() => setVoiceFeedback(''), 3000);
  //       }
  //     }
  //   };

  //   // Initialize real-time STT
  //   RealtimeSTTService.initializeRealtimeSTT(config);
  // }, [user]);

  const initializeConversation = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Use the passed conversationId if available and non-empty, otherwise generate a new one
      const newConversationId = typeof conversationId === 'string' && conversationId.length > 0 ? conversationId : generateUUID();
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm your AI project creation assistant. What would you like to name your project?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addAssistantMessage = async (rawContent: string, preParsedWidgets?: ParsedWidget[]) => {
    try {
      const parsed = HTMLParser.parseMessage(rawContent);
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: parsed.text,
        timestamp: new Date().toISOString(),
        widgets: parsed.widgets,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response if voice is enabled
      // if (!isVoiceListening && !isAISpeaking) {
      //   speak(parsed.text);
      // }
    } catch (error) {
      console.error('Error adding assistant message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    if (!textToSend || isLoading) return;

    // Clear input immediately when sending
    setInputText('');
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      setIsLoading(true);
      
      // Process message through AI service
      const response = await AIProjectCreationService.processUserMessage(
        user?.id ?? '',
        conversationId ?? '',
        textToSend,
        false // isVoiceInput
      );

      if (response.success) {
        // Add AI response
        await addAssistantMessage(response.message, response.widgets);
        
        // Update project state from widgets
        if (response.widgets && response.widgets.length > 0) {
          updateProjectStateFromWidgets(response.widgets);
        }
      } else {
        // Add error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.error || 'Sorry, something went wrong.',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update speak to properly manage AI speaking state
  const speak = async (text: string) => {
    try {
      // setIsAISpeaking(true);
      // RealtimeSTTService.setAISpeaking(true);
      
      // Stop any current speech immediately
      // StreamingTTSService.stop();
      // if (Platform.OS === 'web' && typeof window !== 'undefined') {
      //   window.speechSynthesis.cancel();
      // }
      
      // if (Platform.OS === 'ios') {
      //   // Use iOS voice service for ChatGPT-grade experience
      //   await IOSVoiceService.speak(text, {
      //     language: 'en-US',
      //     speed: 1.0,
      //     pitch: 1.1,
      //     volume: 1.0,
      //     onTTSStart: () => {
      //       console.log('🎤 iOS TTS started with OpenAI Nova voice');
      //     },
      //     onTTSEnd: () => {
      //       console.log('✅ iOS TTS completed');
      //       setIsAISpeaking(false);
      //       RealtimeSTTService.setAISpeaking(false);
      //     }
      //   });
      // } else {
      //   // Use OpenAI TTS for highest quality if available, otherwise use streaming TTS
      //   const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      //   if (openaiApiKey) {
      //     await StreamingTTSService.streamWithOpenAI(text, 'nova');
      //   } else {
      //     await StreamingTTSService.streamText(text, {
      //       speed: 1.0,
      //       pitch: 1.1,
      //       volume: 1.0,
      //       language: 'en-US',
      //       chunkSize: 8,
      //       overlapSize: 2
      //     });
      //   }
        
      //   setIsAISpeaking(false);
      //   RealtimeSTTService.setAISpeaking(false);
      // }
    } catch (error) {
      console.error('❌ Error in speak function:', error);
      // setIsAISpeaking(false);
      // RealtimeSTTService.setAISpeaking(false);
    }
  };

  // Add stopAI method for manual interruption
  const stopAI = () => {
    // setIsAISpeaking(false);
    // RealtimeSTTService.setAISpeaking(false);
    // StreamingTTSService.stop();
    // if (Platform.OS === 'ios') {
    //   IOSVoiceService.stopSpeaking();
    // }
    // if (Platform.OS === 'web' && typeof window !== 'undefined') {
    //   window.speechSynthesis.cancel();
    // }
    
    // Don't automatically restart STT after manual interruption
    // Let the user manually start voice input when ready
    console.log('🛑 Manual stop pressed, AI stopped');
  };

  // Cleanup voice services on unmount
  useEffect(() => {
    return () => {
      // VOICE FEATURES DISABLED - Commenting out all voice cleanup
      // if (Platform.OS === 'ios') {
      //   IOSVoiceService.stopListening();
      //   IOSVoiceService.stopSpeaking();
      // } else if (Platform.OS !== 'web' && Voice) {
      //   Voice.destroy().then(Voice.removeAllListeners);
      // }
    };
  }, []);

  const updateProjectStateFromWidgets = (widgets: ParsedMessage['widgets']) => {
    console.log('🔄 updateProjectStateFromWidgets called with widgets:', widgets);
    setProjectState(prev => {
      const newState = { ...prev };
      let projectNameSet = false;
      let shouldTriggerProjectCreation = false;
      let dedupedTasks = [...(newState.tasks || [])];
      let dedupedSubtasks = [...(newState.subtasks || [])];
      
      widgets.forEach(widget => {
        switch (widget.type) {
          case 'task':
          case 'task1':
          case 'task2':
          case 'task3':
          case 'task4':
          case 'task5':
          case 'task6':
          case 'task7':
          case 'task8':
          case 'task9':
          case 'task10':
            const task = {
              id: widget.id || `temp-task-${Date.now()}`,
              title: widget.data.title || widget.data.content,
              description: '', // No description for now
              status: widget.data.status || 'todo',
              priority: widget.data.priority || 'medium',
              due_date: widget.data.due_date,
              assignees: widget.data.assignees || [],
              taskIndex: widget.data.taskIndex,
              subtasks: [],
            };
            if (!dedupedTasks.some(t => t.title === task.title)) {
              dedupedTasks.push(task);
            }
            break;
          case 'subtask':
          case 'subtask1':
          case 'subtask2':
          case 'subtask3':
          case 'subtask4':
          case 'subtask5':
          case 'subtask6':
          case 'subtask7':
          case 'subtask8':
          case 'subtask9':
          case 'subtask10':
            const subtask = {
              id: widget.id || `temp-subtask-${Date.now()}`,
              title: widget.data.title || widget.data.content,
              status: widget.data.status || 'todo',
              priority: widget.data.priority || 'medium',
              subtaskIndex: widget.data.subtaskIndex,
              parentTaskIndex: widget.data.parentTaskIndex,
            };
            if (!dedupedSubtasks.some(s => s.title === subtask.title)) {
              dedupedSubtasks.push(subtask);
            }
            break;
          case 'team_member':
            const member = {
              id: widget.id || `temp-member-${Date.now()}`,
              name: widget.data.name,
              email: widget.data.email,
                              role: widget.data.role || 'fyi',
              avatar_url: widget.data.avatar_url,
            };
            newState.teamMembers.push(member);
            break;
          case 'project_name':
          case 'projectname':
            if (!newState.name || newState.name !== widget.data.project_name) {
              newState.name = widget.data.project_name;
              projectNameSet = true;
              shouldTriggerProjectCreation = true;
            }
            break;
          case 'project_description':
            newState.description = widget.data.project_description;
            break;
        }
      });
      // Attach subtasks to their parent tasks by index
      dedupedSubtasks.forEach(subtask => {
        if (typeof subtask.parentTaskIndex === 'number') {
          const parentTask = dedupedTasks.find(t => t.taskIndex === subtask.parentTaskIndex);
          if (parentTask) {
            parentTask.subtasks = parentTask.subtasks || [];
            if (!parentTask.subtasks.some((st: any) => st.title === subtask.title)) {
              parentTask.subtasks.push(subtask);
            }
          }
        }
      });
      newState.tasks = dedupedTasks;
      newState.subtasks = dedupedSubtasks;
      // If project name is set and project is not yet created, trigger background creation
      console.log('🔄 Project creation check:', {
        shouldTriggerProjectCreation,
        hasProjectId: !!newState.id,
        hasConversationId: !!conversationId,
        hasUserId: !!user?.id,
        projectName: newState.name
      });
      if (shouldTriggerProjectCreation && !newState.id && conversationId && user?.id) {
        console.log('🎯 Triggering project creation for:', newState.name);
        (async () => {
          try {
            setIsLoading(true);
            const state = await AIProjectCreationService.getProjectState(conversationId ?? '', user?.id ?? '');
            console.log('📊 Retrieved AI state for project creation:', state);
            if (state && !state.project_id) {
              console.log('🏗️ Creating project from AI state...');
              const result = await AIProjectCreationService.createProjectFromAIState(state?.id ?? '', user?.id ?? '');
              console.log('✅ Project creation result:', result);
              if (result.success) {
                setProjectState(prev2 => ({ ...prev2, id: result.project_id, status: 'ready' }));
                console.log('🎉 Project created successfully with ID:', result.project_id);
              }
            }
          } catch (error) {
            console.error('Failed to auto-create project:', error);
          } finally {
            setIsLoading(false);
          }
        })();
      } else if (newState.id && user?.id) {
        // If project exists, update it in the DB with new tasks/subtasks
        (async () => {
          try {
            // Ensure all task titles are strings
            const safeTasks = (newState.tasks || []).map(t => ({ ...t, title: t.title || '' }));
            await AIProjectCreationService.updateProjectWithDetails(newState?.id ?? '', user?.id ?? '', safeTasks, newState.subtasks);
          } catch (error) {
            console.error('Failed to update project with new details:', error);
          }
        })();
      }
      return newState;
    });
  };

  const handleWidgetUpdate = async (widgetId: string, updates: any) => {
    try {
      // Update the widget in the project state
      setProjectState(prev => {
        const newState = { ...prev };
        
        // Find and update the widget in the appropriate array
        const taskIndex = newState.tasks.findIndex(t => t.id === widgetId);
        if (taskIndex !== -1) {
          newState.tasks[taskIndex] = { ...newState.tasks[taskIndex], ...updates };
        }
        
        const subtaskIndex = newState.subtasks.findIndex(s => s.id === widgetId);
        if (subtaskIndex !== -1) {
          newState.subtasks[subtaskIndex] = { ...newState.subtasks[subtaskIndex], ...updates };
        }
        
        const memberIndex = newState.teamMembers.findIndex(m => m.id === widgetId);
        if (memberIndex !== -1) {
          newState.teamMembers[memberIndex] = { ...newState.teamMembers[memberIndex], ...updates };
        }
        
        return newState;
      });
      
      // Update the AI project state in the database
      if (conversationId) {
        // For now, just log the update since we don't have a direct update method
        console.log('Widget update logged:', widgetId, updates);
      }
      
      console.log('Widget updated successfully:', widgetId, updates);
    } catch (error) {
      console.error('Failed to update widget:', error);
      Alert.alert('Error', 'Failed to update widget');
    }
  };

  const handleWidgetPress = async (widget: any) => {
    console.log('Widget pressed:', widget);
    
    // Handle project widget clicks
    if (widget.type === 'project_name' || widget.type === 'projectname' || widget.type === 'project_description') {
      try {
        console.log('🎯 Project widget clicked, checking for project ID...');
        
        // Get the current project state to find the project ID
        if (conversationId) {
          console.log('🔍 Looking up project state for conversation:', conversationId);
          const state = await AIProjectCreationService.getProjectState(conversationId ?? '', user?.id ?? '');
          
          console.log('📊 Project state found:', {
            hasState: !!state,
            projectId: state?.project_id,
            status: state?.status
          });
          
          if (state && state.project_id) {
            console.log('🎯 Navigating to project details:', state.project_id);
            
            // Navigate to project details page
            router.push({
              pathname: '/projectdetails',
              params: { projectId: state.project_id }
            });
            
            return;
          } else {
            console.log('No project ID found in state, project may not be created yet');
            Alert.alert(
              'Project Not Ready',
              'The project is still being created. Please wait for the AI to complete the project setup.',
              [{ text: 'OK' }]
            );
            return;
          }
        } else {
          console.log('No conversation ID available');
          Alert.alert('Error', 'No active conversation found. Please start a new project creation.');
          return;
        }
      } catch (error) {
        console.error('Error navigating to project details:', error);
        Alert.alert('Error', 'Failed to open project details. Please try again.');
        return;
      }
    }
    
    // Handle other widget types
    Alert.alert(
      'Widget Details',
      `Type: ${widget.type}\nTitle: ${widget.data.title || widget.data.name || 'N/A'}\nID: ${widget.id}`,
      [{ text: 'OK' }]
    );
  };

  const handleCreateProject = async () => {
    if (!projectState.name) {
      Alert.alert('Error', 'Please provide a project name first');
      return;
    }
    
    try {
      setIsLoading(true);
      setProjectState(prev => ({ ...prev, status: 'creating' }));
      
      // Create the project using the AI service
      const state = await AIProjectCreationService.getProjectState(conversationId ?? '', user?.id ?? '');
      
      if (state) {
        const result = await AIProjectCreationService.createProjectFromAIState(
          state?.id ?? '',
          user?.id ?? ''
        );
        
        if (result.success) {
          setProjectState(prev => ({ ...prev, status: 'ready', id: result.project_id }));
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🎉 Project "${projectState.name}" created successfully! You can now view and manage it in your projects.`,
            timestamp: new Date().toISOString(),
            projectId: result.project_id // Add project ID to the message for the button
          }]);
          
          // Show success alert
          Alert.alert(
            'Success!',
            `Project "${projectState.name}" has been created successfully. You can find it in your projects list.`,
            [{ text: 'OK' }]
          );
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('No project state found');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert(
        'Error', 
        'Failed to create project. Please try again or contact support if the problem persists.',
        [{ text: 'OK' }]
      );
      setProjectState(prev => ({ ...prev, status: 'draft' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press to send message
  const handleKeyPress = (event: any) => {
    if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.shiftKey) {
      // Prevent default to avoid double submission
      event.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: Message, idx: number) => {
    // Ensure content is properly sanitized to prevent text node errors
    const sanitizedContent = message.content ? message.content.trim() : '';
    
    // Debug logging for widgets
    console.log('🎨 Rendering message:', {
      id: message.id,
      role: message.role,
      contentLength: message.content?.length || 0,
      widgetsCount: message.widgets?.length || 0,
      hasWidgets: message.widgets && message.widgets.length > 0,
      widgets: message.widgets
    });
    
    if (message.widgets && message.widgets.length > 0) {
      console.log('🎨 Rendering message with widgets:', message.widgets.length, message.widgets);
    } else {
      console.log('🎨 Rendering message without widgets:', message.content?.substring(0, 50) + '...');
    }
    
    // Additional safety check to prevent text node errors
    const safeContent = sanitizedContent || '';
    
    return (
      <View
        key={message.id + idx}
        style={[
          styles.messageContainer,
          message.role === 'user' ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {/* Only render text if there's actual content and it's not just whitespace */}
        {safeContent.length > 0 && safeContent.trim().length > 0 && (
          <Text style={styles.messageText}>{safeContent}</Text>
        )}
        
        {/* Always render timestamp */}
        <Text style={styles.timestamp}>{new Date(message.timestamp).toLocaleTimeString()}</Text>
        
        {/* Render "Go to Project" button if this is a project creation success message */}
        {message.projectId && (
          <TouchableOpacity
            style={styles.goToProjectButton}
            onPress={() => {
              // Close the modal first, then navigate
              onClose?.();
              router.push(`/projectdetails?projectId=${message.projectId}`);
            }}
          >
            <Text style={styles.goToProjectButtonText}>Go to Project</Text>
          </TouchableOpacity>
        )}
        
        {/* Render widgets if present */}
        {message.widgets && message.widgets.length > 0 && (
          <View style={styles.widgetsContainer}>
            <WidgetRenderer
              widgets={message.widgets}
              projectId={projectState.id}
              onWidgetUpdate={handleWidgetUpdate}
              onWidgetPress={handleWidgetPress}
            />
          </View>
        )}
      </View>
    );
  };

  const renderProjectSummary = () => {
    if (projectState.status === 'draft' && (projectState.name || projectState.tasks.length > 0)) {
      return (
        <View style={styles.projectSummary}>
          <Text style={styles.summaryTitle}>Project Summary</Text>
          {projectState.name && (
            <Text style={styles.summaryText}>Name: {projectState.name}</Text>
          )}
          {projectState.description && (
            <Text style={styles.summaryText}>Description: {projectState.description}</Text>
          )}
          {projectState.tasks.length > 0 && (
            <Text style={styles.summaryText}>Tasks: {projectState.tasks.length}</Text>
          )}
          {projectState.teamMembers.length > 0 && (
            <Text style={styles.summaryText}>Team Members: {projectState.teamMembers.length}</Text>
          )}
          <TouchableOpacity
            style={styles.createProjectButton}
            onPress={handleCreateProject}
            disabled={isLoading}
          >
            <Text style={styles.createProjectButtonText}>
              {isLoading ? 'Creating...' : 'Create Project'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  // Call onProjectCreated when projectState.id is set for the first time
  useEffect(() => {
    if (projectState.id && onProjectCreated && !hasCalledProjectCreated.current) {
      onProjectCreated(projectState.id);
      hasCalledProjectCreated.current = true;
    }
  }, [projectState.id, onProjectCreated]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ paddingBottom: 16 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {renderProjectSummary()}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>
      {/* VOICE FEATURES DISABLED - Commenting out voice feedback */}
      {/* {voiceFeedback && (
        <View style={styles.voiceFeedbackContainer}>
          <Text style={styles.voiceFeedbackText}>{voiceFeedback}</Text>
        </View>
      )} */}
      <View style={styles.inputContainer}>
        <View style={styles.textInputContainer}>
          {/* Keyboard mode indicator */}
          {/* {isKeyboardMode && (
            <View style={styles.keyboardModeIndicator}>
              <Text style={styles.keyboardModeText}>⌨️ Keyboard Mode</Text>
            </View>
          )} */}
          
          <TextInput
            style={[
              styles.textInput,
              /* isVoiceListening && styles.textInputListening,
              isUserVoiceDetected && styles.textInputUserVoice,
              isVoiceListening && !isUserVoiceDetected && styles.textInputNonUserVoice,
              isKeyboardMode && styles.textInputKeyboardMode */
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.grayscale400}
            multiline
            maxLength={1000}
            editable={!isLoading /* && !isVoiceListening */}
            onKeyPress={handleKeyPress}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              // Ensure text is cleared when submitted via keyboard
              if (inputText.trim() && !isLoading) {
                sendMessage();
              }
            }}
            onFocus={() => {
              // Auto-switch to keyboard mode when text input is focused
              /* if (!isKeyboardMode) {
                setIsKeyboardMode(true);
              } */
            }}
          />
          {/* isVoiceListening && (
            <View style={styles.listeningIndicator}>
              <View style={[
                styles.listeningDot,
                isUserVoiceDetected && styles.listeningDotUserVoice,
                !isUserVoiceDetected && styles.listeningDotNonUserVoice
              ]} />
              {isUserVoiceDetected && (
                <Text style={styles.voiceDetectedText}>👤</Text>
              )}
            </View>
          )} */}
        </View>
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
        
        {/* Keyboard Toggle Button */}
        {/* <TouchableOpacity
          style={[
            styles.keyboardToggleButton,
            isKeyboardMode && styles.keyboardToggleButtonActive
          ]}
          onPress={() => {
            setIsKeyboardMode(!isKeyboardMode);
            if (isVoiceListening) {
              handleVoiceStop();
            }
            // Focus the text input when switching to keyboard mode
            if (!isKeyboardMode) {
              setTimeout(() => {
                // Focus logic will be handled by the TextInput onFocus
              }, 100);
            }
          }}
          disabled={isLoading}
        >
          <Ionicons
            name={isKeyboardMode ? "mic" : "create"}
            size={24}
            color={isKeyboardMode ? COLORS.white : COLORS.primary}
          />
        </TouchableOpacity>
        
        {/* Voice Orb - only show when not in keyboard mode */}
        {/* {!isKeyboardMode && (
          <VoiceOrb
            onVoiceStart={handleVoiceStart}
            onVoiceStop={handleVoiceStop}
            isListening={isVoiceListening}
            isProcessing={isVoiceProcessing}
            hasError={hasVoiceError}
            disabled={isLoading}
            isAISpeaking={isAISpeaking}
            onStopAI={stopAI}
          />
        )} */}
        
        {/* VOICE FEATURES DISABLED - Commenting out permission button */}
        {/* {Platform.OS === 'ios' && !isKeyboardMode && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              if (IOSVoiceService.isExpoGoEnvironment()) {
                setVoiceFeedback('📱 Voice features require development build. TTS works, STT needs native modules.');
                setTimeout(() => setVoiceFeedback(''), 3000);
              } else {
                Alert.alert(
                  'Microphone Permission Required',
                  'To use voice features, please enable microphone access in Settings.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                  ]
                );
              }
            }}
          >
            <Text style={styles.permissionButtonText}>⚙️</Text>
          </TouchableOpacity>
        )} */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 8,
  },
  messageContainer: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: COLORS.grayscale100,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: COLORS.greyscale900,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.grayscale400,
    marginTop: 4,
    textAlign: 'right',
  },
  projectSummary: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    margin: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.greyscale900,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.grayscale700,
    marginBottom: 4,
  },
  createProjectButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  createProjectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16, // Add horizontal padding
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 8 : 8, // Add bottom padding for iOS
    marginBottom: Platform.OS === 'ios' ? 8 : 0, // Add margin for iOS to ensure proper spacing
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    color: COLORS.greyscale900,
    maxHeight: 100,
    textAlignVertical: 'center', // Ensure proper text alignment
  },
  textInputListening: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10', // Light primary color background
  },
  textInputUserVoice: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10', // Light success color background
  },
  textInputNonUserVoice: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning + '10', // Light warning color background
  },
  textInputKeyboardMode: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05', // Light primary color background
  },
  keyboardModeIndicator: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  keyboardModeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  textInputContainer: {
    flex: 1,
    position: 'relative',
  },
  listeningIndicator: {
    position: 'absolute',
    right: 12,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 4,
  },
  listeningDotUserVoice: {
    backgroundColor: COLORS.success,
  },
  listeningDotNonUserVoice: {
    backgroundColor: COLORS.warning,
  },
  voiceDetectedText: {
    color: COLORS.success,
    fontSize: 16,
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.grayscale700,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.grayscale700,
  },
  permissionButton: {
    backgroundColor: COLORS.grayscale200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    color: COLORS.grayscale700,
  },
  keyboardToggleButton: {
    backgroundColor: COLORS.grayscale200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  keyboardToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  voiceFeedbackContainer: {
    backgroundColor: COLORS.grayscale100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  voiceFeedbackText: {
    fontSize: 14,
    color: COLORS.grayscale700,
    textAlign: 'center',
  },
  widgetsContainer: {
    marginTop: 8,
  },
  goToProjectButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Pill shape
    marginTop: 12,
    alignItems: 'center',
    alignSelf: 'stretch', // Full width
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  goToProjectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AIProjectChat; 