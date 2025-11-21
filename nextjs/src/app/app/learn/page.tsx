'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseSelector } from '@/components/ui/course-selector';
import { TopicSelector } from '@/components/ui/topic-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Play, ArrowLeft, Tag } from 'lucide-react';

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
  const [courseSelectorKey, setCourseSelectorKey] = useState(0); // For refreshing CourseSelector

  // Force refresh of CourseSelector when a new course is created
  const handleCourseCreated = () => {
    setCourseSelectorKey(prev => prev + 1);
  };

  // Handle course selection
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTopics([]); // Reset topics when course changes
    
    // Delay transition to topic selection to allow button animation to play
    setTimeout(() => {
      setCurrentStep('topic-selection');
    }, 1000);
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
        {/* Header */}
        <div className="mb-4">
          <PageHeader
            title="Learn"
            description={
              currentStep === 'course-selection' 
                ? "Select a course and topics to start learning."
                : "Select specific topics from your course."
            }
          >
            {currentStep !== 'course-selection' && (
              <Button
                variant="default"
                size="sm"
                onClick={goBack}
                className="flex items-center space-x-1 bg-black text-white hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            )}
          </PageHeader>
        </div>
      </div>
      
      <div className="flex-1 px-4 pb-4">
        {/* Course Selection Step */}
        {currentStep === 'course-selection' && (
          <Card className="h-full">
            <CardContent className="p-6 h-full">
              <div className="space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-semibold">Choose Course</h2>
                    </div>
                    <p className="text-muted-foreground">
                      {/* Step indicator */}
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                        <span className="text-primary font-medium">
                          1. Pick a Course
                        </span>
                        <span>→</span>
                        <span className="">
                          2. Choose Topics
                        </span>
                      </div>
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <CourseSelector
                    key={courseSelectorKey}
                    onCourseSelect={handleCourseSelect}
                    selectedCourseId={selectedCourse?.id}
                    showCreateButton={false}
                    showMaterialCount={true}
                    showDeleteButton={false}
                    hideCreateButton={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Selection Step */}
        {currentStep === 'topic-selection' && selectedCourse && (
          <Card className="h-full">
            <CardContent className="p-6 h-full">
              <div className="space-y-2 h-full flex flex-col">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-semibold">Choose Topics</h2>
                  </div>
                  <p className="text-muted-foreground">
                    {/* Step indicator */}
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                      <span className="">
                        1. Pick a Course
                      </span>
                      <span>→</span>
                      <span className="text-primary font-medium">
                        2. Pick Your Topics
                      </span>
                    </div>
                  </p>
                </div>
                
                <div className="flex-1">
                  <TopicSelector
                    courseId={selectedCourse.id}
                    courseName={selectedCourse.name}
                    selectedTopics={selectedTopics}
                    onTopicsChange={handleTopicsChange}
                  />
                </div>
                
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
                    <span>{isCreatingLesson ? 'Starting...' : 'Start Session'}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
