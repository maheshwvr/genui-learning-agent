'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LessonSelector from '@/components/ui/lesson-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
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
        <div className="mb-4">
          <PageHeader
            title="Lesson History"
            description="View and continue your previous learning sessions, or start a new one."
          >
            <Button
              onClick={handleCreateNew}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Lesson</span>
            </Button>
          </PageHeader>
        </div>
      </div>
      
      <div className="flex-1 px-4 pb-4">
        <Card className="h-full">
          <CardContent className="p-6 h-full">
            <div className="space-y-6 h-full flex flex-col">
              <div>
                <h2 className="text-xl font-semibold">Your Lessons</h2>
                <p className="text-muted-foreground">
                  Click on any lesson to continue where you left off.
                </p>
              </div>
              <div className="flex-1">
                <LessonSelector 
                  onLessonSelect={handleLessonSelect}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}