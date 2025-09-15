'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from 'ai/react';
import { Chat } from '@/components/ui/chat';
import LessonSelector from '@/components/ui/lesson-selector';
import { Lesson } from '@/lib/types';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.lessonId as string;
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        actualContent: message.content // Show FULL content to see if markers are present
      });
      
      // CRITICAL: Check if markers are in the message passed to onFinish
      if (message.content.includes('MCQ_DATA_START') || message.content.includes('TF_DATA_START')) {
        console.log('✅ MARKERS FOUND in onFinish callback!');
      } else {
        console.log('❌ NO MARKERS in onFinish callback - they are being stripped before this point!');
      }
      
      // Wait a bit for the UI to update, then save
      setTimeout(() => {
        console.log('=== About to save - checking current messages array ===');
        console.log('Total messages in state:', messages.length);
        
        // Check if markers exist in the messages state array
        const messagesWithMarkers = messages.filter(msg => 
          msg.content.includes('MCQ_DATA_START') || msg.content.includes('TF_DATA_START')
        );
        console.log('Messages with markers in state:', messagesWithMarkers.length);
        
        messages.forEach((msg, idx) => {
          console.log(`Message ${idx} (${msg.role}):`, {
            id: msg.id,
            contentLength: msg.content.length,
            hasMCQ: msg.content.includes('MCQ_DATA_START'),
            hasTF: msg.content.includes('TF_DATA_START'),
            contentPreview: msg.content.substring(0, 200)
          });
        });
        
        console.log('Saving after onFinish with delay');
        saveMessagesToLesson();
      }, 500);
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

      // Convert AI SDK messages back to ChatMessage format for storage
      const chatMessages = uniqueMessages.map((msg, index) => {
        return {
          id: msg.id || `stored_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          role: msg.role,
          content: msg.content,
          createdAt: new Date().toISOString()
        };
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
    try {
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson);
        
        // Load existing messages into chat
        if (data.lesson.messages && data.lesson.messages.length > 0) {
          console.log('Loading', data.lesson.messages.length, 'messages from database');
          
          // Check for existing markers
          const messagesWithMarkers = data.lesson.messages.filter((msg: any) => 
            msg.content.includes('MCQ_DATA_START') || msg.content.includes('TF_DATA_START')
          );
          if (messagesWithMarkers.length > 0) {
            console.log('Found', messagesWithMarkers.length, 'messages with assessment markers in database');
          }
          
          // Deduplicate messages by content and role to handle any existing duplicates
          const uniqueMessages = data.lesson.messages.filter((msg: any, index: number, array: any[]) => {
            return array.findIndex((m: any) => 
              m.content === msg.content && 
              m.role === msg.role
            ) === index;
          });

          // Convert ChatMessage format to AI SDK Message format with guaranteed unique IDs
          const aiMessages = uniqueMessages.map((msg: any, index: number) => ({
            id: `lesson_${lessonId}_msg_${index}_${msg.id}`,
            role: msg.role,
            content: msg.content
          }));
          
          console.log('Setting', aiMessages.length, 'messages to chat state');
          setMessages(aiMessages);
          
          // If we had duplicates, save the cleaned version back to database
          if (uniqueMessages.length !== data.lesson.messages.length) {
            console.log('Found duplicates, saving cleaned version');
            // Save the cleaned messages back
            setTimeout(() => saveMessagesToLesson(), 1000);
          }
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

  // Save messages when they change (for user messages)
  useEffect(() => {
    // Disabled auto-save - now using onFinish callback for better timing with streaming
    // This ensures MCQ/TF markers are complete before saving
  }, [messages, lesson, saveMessagesToLesson]);

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
        />
      </div>
    </div>
  );
}