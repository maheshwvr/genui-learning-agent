'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from 'ai/react';
import { Chat } from '@/components/ui/chat';
import LessonSelector from '@/components/ui/lesson-selector';

export default function LearnPage() {
  const [selectedLessonId] = useState<string | null>(null);
  const router = useRouter();

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, append } = useChat({
    api: '/api/chat',
    body: selectedLessonId ? { lessonId: selectedLessonId } : undefined
  });

  // Handle lesson selection
  const handleLessonSelect = (lessonId: string) => {
    // Navigate to the specific lesson page
    router.push(`/app/learn/${lessonId}`);
  };

  // Auto-create a new lesson if no lesson is selected
  const createNewLesson = async () => {
    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Lesson ${new Date().toLocaleDateString()}`,
          lesson_type: 'general'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newLesson = data.lesson;
        router.push(`/app/learn/${newLesson.id}`);
      } else {
        console.error('Failed to create lesson');
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4">
        <LessonSelector 
          currentLessonId={selectedLessonId || undefined}
          onLessonSelect={handleLessonSelect}
        />
      </div>
      
      <div className="flex-1 flex flex-col px-4">
        {selectedLessonId ? (
          <Chat
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isGenerating={isLoading}
            stop={stop}
            append={append}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Welcome to Learn</h2>
              <p className="text-gray-600 mb-6">
                Create a new lesson or select an existing one to continue learning.
              </p>
              <button
                onClick={createNewLesson}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Lesson
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
