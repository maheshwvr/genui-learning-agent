'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from 'ai/react';
import { Chat } from '@/components/ui/chat';
import LessonSelector from '@/components/ui/lesson-selector';
import { Lesson, ChatMessage } from '@/lib/types';

// Type definitions for AI messages with tool invocations
interface ToolInvocation {
  toolName: string;
  result?: {
    type: string;
    data: unknown;
  };
}

interface MessageWithTools {
  content: string;
  toolInvocations?: ToolInvocation[];
  experimental_toolCalls?: ToolInvocation[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.lessonId as string;
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(false);

  // Initialize chat with lesson messages
  const { messages, input, handleInputChange, handleSubmit, isLoading: isChatLoading, stop, append, setMessages } = useChat({
    api: '/api/chat',
    body: { lessonId },
    onFinish: (message) => {
      console.log('=== onFinish called ===');
      console.log('Finished message:', {
        role: message.role,
        contentLength: message.content.length,
        hasMCQ: message.content.includes('MCQ_DATA_START'),
        hasTF: message.content.includes('TF_DATA_START'),
        mcqComplete: /MCQ_DATA_START[\s\S]*?MCQ_DATA_END/.test(message.content),
        tfComplete: /TF_DATA_START[\s\S]*?TF_DATA_END/.test(message.content),
        hasToolInvocations: 'toolInvocations' in message && Array.isArray((message as MessageWithTools).toolInvocations)
      });
      
      // CRITICAL: Check if markers are in the message passed to onFinish
      if (message.content.includes('MCQ_DATA_START') || message.content.includes('TF_DATA_START')) {
        console.log('✅ MARKERS FOUND in onFinish callback!');
      } else {
        console.log('❌ NO MARKERS in onFinish callback - checking tool invocations...');
        if ('toolInvocations' in message && Array.isArray((message as MessageWithTools).toolInvocations)) {
          console.log('Tool invocations found:', (message as MessageWithTools).toolInvocations?.length);
        }
      }
      
      // Save the current message immediately to ensure we capture the latest state
      // Use a longer delay to ensure the message has been added to the messages array
      setTimeout(() => {
        console.log('=== About to save after onFinish ===');
        console.log('Total messages in state:', messages.length);
        console.log('Latest message in state:', messages[messages.length - 1]?.content.substring(0, 200));
        
        saveMessagesToLesson();
      }, 1000);
    }
  });

  // Save current messages to lesson
  const saveMessagesToLesson = useCallback(async () => {
    if (!lessonId || messages.length === 0) return;
    
    try {
      console.log('Saving', messages.length, 'messages to lesson');
      
      // Check for markers in messages being saved
      const messagesWithMarkers = messages.filter(msg => 
        msg.content.includes('MCQ_DATA_START') || msg.content.includes('TF_DATA_START')
      );
      if (messagesWithMarkers.length > 0) {
        console.log('Found', messagesWithMarkers.length, 'messages with assessment markers');
      }
      
      // Deduplicate messages before saving
      const uniqueMessages = messages.filter((msg, index, array) => {
        return array.findIndex(m => 
          m.content === msg.content && 
          m.role === msg.role
        ) === index;
      });

      // Convert AI SDK messages back to enhanced ChatMessage format for storage
      const chatMessages = uniqueMessages.map((msg, index) => {
        const baseMessage = {
          id: msg.id || `stored_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          role: msg.role,
          content: msg.content,
          createdAt: new Date().toISOString()
        };
        
        // Preserve assessment metadata if it exists
        if ('assessment' in msg && msg.assessment) {
          return {
            ...baseMessage,
            assessment: msg.assessment
          };
        }
        
        // Check for tool invocations and convert to assessment metadata
        if ('toolInvocations' in msg && Array.isArray((msg as MessageWithTools).toolInvocations)) {
          const toolInvocations = (msg as MessageWithTools).toolInvocations;
          if (toolInvocations) {
            for (const invocation of toolInvocations) {
            if (invocation && 'result' in invocation && invocation.result) {
              // Check for MCQ tool calls
              if (invocation.toolName === 'generateMCQ' && invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'mcq') {
                return {
                  ...baseMessage,
                  assessment: {
                    type: 'mcq',
                    data: invocation.result.data,
                    results: {
                      completed: false
                    }
                  }
                };
              }
              
              // Check for TF tool calls  
              if (invocation.toolName === 'generateTF' && invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'tf') {
                return {
                  ...baseMessage,
                  assessment: {
                    type: 'tf',
                    data: invocation.result.data,
                    results: {
                      completed: false
                    }
                  }
                };
              }
              }
            }
          }
        }
        
        // Check for experimental_toolCalls and convert to assessment metadata
        if ('experimental_toolCalls' in msg && Array.isArray((msg as MessageWithTools).experimental_toolCalls)) {
          const toolCalls = (msg as MessageWithTools).experimental_toolCalls;
          if (toolCalls) {
            for (const toolCall of toolCalls) {
            if (toolCall && 'result' in toolCall && toolCall.result) {
              // Check for MCQ tool calls
              if (toolCall.toolName === 'generateMCQ' && toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'mcq') {
                return {
                  ...baseMessage,
                  assessment: {
                    type: 'mcq',
                    data: toolCall.result.data,
                    results: {
                      completed: false
                    }
                  }
                };
              }
              
              // Check for TF tool calls  
              if (toolCall.toolName === 'generateTF' && toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'tf') {
                return {
                  ...baseMessage,
                  assessment: {
                    type: 'tf',
                    data: toolCall.result.data,
                    results: {
                      completed: false
                    }
                  }
                };
              }
              }
            }
          }
        }
        
        return baseMessage;
      });

      await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatMessages
        })
      });
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }, [lessonId, messages]);

  // Fetch lesson data
  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    
    setIsLoading(true);
    setIsLoadingFromDB(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson);
        
        // Load existing messages into chat
        if (data.lesson.messages && data.lesson.messages.length > 0) {
          console.log('Loading', data.lesson.messages.length, 'messages from database');
          
          // Check for existing markers
          const messagesWithMarkers = data.lesson.messages.filter((msg: ChatMessage) => 
            msg.content.includes('MCQ_DATA_START') || msg.content.includes('TF_DATA_START')
          );
          if (messagesWithMarkers.length > 0) {
            console.log('Found', messagesWithMarkers.length, 'messages with assessment markers in database');
          }
          
          // Deduplicate messages by content and role to handle any existing duplicates
          const uniqueMessages = data.lesson.messages.filter((msg: ChatMessage, index: number, array: ChatMessage[]) => {
            return array.findIndex((m: ChatMessage) => 
              m.content === msg.content && 
              m.role === msg.role
            ) === index;
          });

          // Convert ChatMessage format to AI SDK Message format with guaranteed unique IDs
          const aiMessages = uniqueMessages.map((msg: ChatMessage, index: number) => {
            const baseMessage = {
              id: `lesson_${lessonId}_msg_${index}_${msg.id}`,
              role: msg.role,
              content: msg.content
            };
            
            // Preserve assessment metadata if it exists
            if (msg.assessment) {
              return {
                ...baseMessage,
                assessment: msg.assessment
              };
            }
            
            return baseMessage;
          });
          
          console.log('Setting', aiMessages.length, 'messages to chat state');
          setMessages(aiMessages);
        }
      } else if (response.status === 404) {
        setError('Lesson not found');
      } else {
        setError('Failed to load lesson');
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
      setError('Failed to load lesson');
    } finally {
      setIsLoading(false);
      setIsLoadingFromDB(false);
    }
  }, [lessonId, setMessages]);

  // Handle lesson selection (navigate to different lesson)
  const handleLessonSelect = (newLessonId: string) => {
    if (newLessonId !== lessonId) {
      router.push(`/app/learn/${newLessonId}`);
    }
  };

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  // Save messages when they change (with debouncing to avoid too many API calls)
  useEffect(() => {
    // Only save if we have messages, they're different from what was loaded, and we're not currently loading from DB
    if (messages.length > 0 && lesson && !isLoadingFromDB) {
      // Debounce the save to avoid saving too frequently
      const timeoutId = setTimeout(() => {
        console.log('Auto-saving messages due to change. Message count:', messages.length);
        saveMessagesToLesson();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, lesson, isLoadingFromDB, saveMessagesToLesson]); // Only trigger on message count change

  // Save on component unmount to ensure we don't lose data
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        console.log('Component unmounting, saving messages');
        saveMessagesToLesson();
      }
    };
  }, [messages, saveMessagesToLesson]);

  // Save when user navigates away (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 0) {
        console.log('Page unloading, saving messages');
        // Note: This is a synchronous save, might not complete in time
        saveMessagesToLesson();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, saveMessagesToLesson]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div>Loading lesson...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/app/learn')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="h-full flex items-center justify-center">
        <div>Lesson not found</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4">
        <LessonSelector 
          currentLessonId={lessonId}
          onLessonSelect={handleLessonSelect}
        />
      </div>
      
      <div className="flex-1 flex flex-col px-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-sm text-gray-500">
            Created: {new Date(lesson.created_at).toLocaleDateString()} • 
            Last updated: {new Date(lesson.updated_at).toLocaleDateString()}
          </p>
        </div>
        
        <Chat
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={isChatLoading}
          stop={stop}
          append={append}
          updateMessage={(messageId, updates) => {
            setMessages(currentMessages => 
              currentMessages.map(msg => 
                msg.id === messageId 
                  ? { ...msg, ...updates }
                  : msg
              )
            );
            // Trigger save after a brief delay to allow state to update
            setTimeout(() => saveMessagesToLesson(), 100);
          }}
        />
      </div>
    </div>
  );
}