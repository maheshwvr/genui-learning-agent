'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseSelector } from '@/components/ui/course-selector';
import { TopicSelector } from '@/components/ui/topic-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Play, ArrowLeft, Tag } from 'lucide-react';

interface Course {
  id: string
  name: string
  description?: string | null
  materialCount: number
  created_at: string
  updated_at: string
}

type LessonCreationStep = 'course-selection' | 'topic-selection'

export default function LearnPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<LessonCreationStep>('course-selection');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);

  // Handle course selection
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTopics([]); // Reset topics when course changes
    
    // Always proceed to topic selection step, regardless of material count
    setCurrentStep('topic-selection');
  };

  // Handle topic selection changes
  const handleTopicsChange = (topics: string[]) => {
    setSelectedTopics(topics);
  };

  // Start learning with selected topics
  const startLearningSession = async () => {
    if (!selectedCourse) return;

    try {
      setIsCreatingLesson(true);
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${selectedCourse.name} - ${selectedTopics.length > 0 ? selectedTopics.join(', ') : 'All Topics'} - ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          lesson_type: 'general',
          course_id: selectedCourse.id,
          topic_selection: selectedTopics
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
    } finally {
      setIsCreatingLesson(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep === 'topic-selection') {
      setCurrentStep('course-selection');
      setSelectedCourse(null);
      setSelectedTopics([]);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Learn</h1>
          </div>
          
          {/* Navigation actions */}
          <div className="flex items-center space-x-2">
            {currentStep !== 'course-selection' && (
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <span className={currentStep === 'course-selection' ? 'text-primary font-medium' : ''}>
            1. Select Course
          </span>
          <span>→</span>
          <span className={currentStep === 'topic-selection' ? 'text-primary font-medium' : ''}>
            2. Choose Topics & Start New Session
          </span>
        </div>
      </div>
      
      <div className="flex-1 px-4 pb-4">
        {/* Course Selection Step */}
        {currentStep === 'course-selection' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Select a Course</span>
                </CardTitle>
                <CardDescription>
                  Choose a course to start a new learning session. The AI will use your course materials to provide contextual guidance. Each session creates a fresh conversation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CourseSelector
                  onCourseSelect={handleCourseSelect}
                  selectedCourseId={selectedCourse?.id}
                  showCreateButton={true}
                  showMaterialCount={true}
                  showDeleteButton={false}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Topic Selection Step */}
        {currentStep === 'topic-selection' && selectedCourse && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="h-5 w-5" />
                  <span>Choose Topics</span>
                </CardTitle>
                <CardDescription>
                  Select specific topics from &ldquo;{selectedCourse.name}&rdquo; to focus your new learning session, or select all topics for comprehensive coverage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TopicSelector
                  courseId={selectedCourse.id}
                  courseName={selectedCourse.name}
                  selectedTopics={selectedTopics}
                  onTopicsChange={handleTopicsChange}
                />
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedTopics.length > 0 
                      ? `${selectedTopics.length} topic(s) selected`
                      : 'All topics will be included'
                    }
                  </div>
                  
                  <Button
                    onClick={startLearningSession}
                    disabled={isCreatingLesson}
                    className="flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>{isCreatingLesson ? 'Creating...' : 'Start New Session'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
