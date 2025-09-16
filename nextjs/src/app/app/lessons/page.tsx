'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LessonSelector from '@/components/ui/lesson-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Plus } from 'lucide-react';

export default function LessonsPage() {
  const router = useRouter();

  // Handle lesson selection (navigate to existing lesson)
  const handleLessonSelect = (lessonId: string) => {
    router.push(`/app/learn/${lessonId}`);
  };

  // Navigate to create new lesson
  const handleCreateNew = () => {
    router.push('/app/learn');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Lesson History</h1>
          </div>
          
          <Button
            onClick={handleCreateNew}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Lesson</span>
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-6">
          View and continue your previous learning sessions, or start a new one.
        </p>
      </div>
      
      <div className="flex-1 px-4 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Lessons</CardTitle>
            <CardDescription>
              Click on any lesson to continue where you left off.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LessonSelector 
              onLessonSelect={handleLessonSelect}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}