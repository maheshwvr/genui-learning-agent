'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, BookOpen, Filter, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobal } from '@/lib/context/GlobalContext';
import { SavedFlashcard, getUserFlashcards, deleteFlashcard } from '@/lib/supabase/flashcards';
import { getUserCourses } from '@/lib/supabase/courses';
import { CourseFlashcardGroup } from '@/components/ui/course-flashcard-group';
import { FlashcardStudyMode } from '@/components/ui/flashcard-study-mode';
import type { Database } from '@/lib/types';

type Course = Database['public']['Tables']['courses']['Row'];

interface GroupedFlashcards {
  [courseId: string]: {
    courseName: string;
    flashcards: SavedFlashcard[];
  };
}

interface FlashcardLibraryProps {
  className?: string;
}

export function FlashcardLibrary({ className = '' }: FlashcardLibraryProps) {
  const { loading: authLoading, user } = useGlobal();
  const [flashcards, setFlashcards] = useState<SavedFlashcard[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groupedFlashcards, setGroupedFlashcards] = useState<GroupedFlashcards>({});
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  
  // Study mode state
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [studyFlashcards, setStudyFlashcards] = useState<SavedFlashcard[]>([]);

  // Fetch data - only when user is authenticated
  const fetchData = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch flashcards and courses in parallel
      const [flashcardsData, coursesData] = await Promise.all([
        getUserFlashcards(),
        getUserCourses()
      ]);

      setFlashcards(flashcardsData);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error fetching flashcard library data:', err);
      
      // Handle authentication errors specifically
      if (err instanceof Error && err.message.includes('not authenticated')) {
        setError('Please sign in again to access your flashcard library.');
      } else {
        setError('Failed to load flashcard library. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Group flashcards by course
  const groupFlashcardsByCourse = useCallback((flashcardsToGroup: SavedFlashcard[], coursesToGroup: Course[]) => {
    const grouped: GroupedFlashcards = {};

    // Create a map of course IDs to course names for quick lookup
    const courseMap = new Map<string, string>();
    coursesToGroup.forEach(course => {
      courseMap.set(course.id, course.name);
    });

    // Group flashcards by course
    flashcardsToGroup.forEach(flashcard => {
      const courseId = flashcard.course_id || 'no-course';
      const courseName = flashcard.course_id ? 
        (courseMap.get(flashcard.course_id) || 'Unknown Course') : 
        'General Flashcards';

      if (!grouped[courseId]) {
        grouped[courseId] = {
          courseName,
          flashcards: []
        };
      }

      grouped[courseId].flashcards.push(flashcard);
    });

    return grouped;
  }, []);

  // Apply course filter
  const getFilteredFlashcards = useCallback((allFlashcards: SavedFlashcard[]) => {
    if (selectedCourseFilter === 'all') {
      return allFlashcards;
    }
    if (selectedCourseFilter === 'no-course') {
      return allFlashcards.filter(fc => !fc.course_id);
    }
    return allFlashcards.filter(fc => fc.course_id === selectedCourseFilter);
  }, [selectedCourseFilter]);

  // Update grouped flashcards when data changes
  useEffect(() => {
    const filteredFlashcards = getFilteredFlashcards(flashcards);
    const grouped = groupFlashcardsByCourse(filteredFlashcards, courses);
    setGroupedFlashcards(grouped);
  }, [flashcards, courses, selectedCourseFilter, groupFlashcardsByCourse, getFilteredFlashcards]);

  // Fetch data on mount - only after auth loading is complete
  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  // Delete flashcard handler
  const handleFlashcardDelete = useCallback(async (flashcardId: string) => {
    try {
      setDeleting(prev => new Set(prev).add(flashcardId));
      
      await deleteFlashcard(flashcardId);
      
      // Update local state
      setFlashcards(prev => prev.filter(fc => fc.id !== flashcardId));
      
      // Update study mode flashcards if currently studying
      setStudyFlashcards(prev => prev.filter(fc => fc.id !== flashcardId));
    } catch (err) {
      console.error('Error deleting flashcard:', err);
      setError('Failed to delete flashcard. Please try again.');
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(flashcardId);
        return newSet;
      });
    }
  }, []);

  // Study mode handlers
  const handleStudyMode = useCallback((flashcardsToStudy: SavedFlashcard[]) => {
    setStudyFlashcards(flashcardsToStudy);
    setStudyModeOpen(true);
  }, []);

  const handleStudyModeClose = useCallback(() => {
    setStudyModeOpen(false);
    setStudyFlashcards([]);
  }, []);

  // Get course options for filter
  const courseOptions = [
    { value: 'all', label: 'All Courses' },
    { value: 'no-course', label: 'General Flashcards' },
    ...courses.map(course => ({ value: course.id, label: course.name }))
  ];

  const totalFlashcards = flashcards.length;
  const filteredTotal = Object.values(groupedFlashcards).reduce((sum, group) => sum + group.flashcards.length, 0);

  // Show loading while authentication is being checked or data is being fetched
  if (authLoading || loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show message if user is not authenticated
  if (!user) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Please sign in to view your flashcard library.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Flashcard Library</CardTitle>
                <CardDescription>
                  Review and study flashcards saved from your lessons
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filter and Stats */}
          {totalFlashcards > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedCourseFilter}
                    onChange={(e) => setSelectedCourseFilter(e.target.value)}
                    className="border border-input bg-background px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                  >
                    {courseOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing {filteredTotal} of {totalFlashcards} flashcards
                </div>
              </div>

              {filteredTotal > 0 && (
                <Button
                  onClick={() => {
                    const allFiltered = Object.values(groupedFlashcards).flatMap(group => group.flashcards);
                    handleStudyMode(allFiltered);
                  }}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Study All ({filteredTotal})
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {totalFlashcards === 0 && !loading && (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
              <p className="text-muted-foreground mb-4">
                Start saving flashcards from your chat lessons to build your personal study collection.
              </p>
              <Button asChild>
                <a href="/app/learn">Start Learning</a>
              </Button>
            </div>
          )}

          {/* Filtered Empty State */}
          {totalFlashcards > 0 && filteredTotal === 0 && (
            <div className="text-center py-8">
              <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No flashcards found for the selected filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCourseFilter('all')}
                className="mt-2"
              >
                Show All Flashcards
              </Button>
            </div>
          )}

          {/* Course Groups */}
          {Object.entries(groupedFlashcards).map(([courseId, group]) => (
            <CourseFlashcardGroup
              key={courseId}
              courseId={courseId === 'no-course' ? null : courseId}
              courseName={group.courseName}
              flashcards={group.flashcards}
              onFlashcardDelete={handleFlashcardDelete}
              onStudyMode={handleStudyMode}
              deleting={deleting}
            />
          ))}
        </CardContent>
      </Card>

      {/* Study Mode Modal */}
      <FlashcardStudyMode
        flashcards={studyFlashcards}
        isOpen={studyModeOpen}
        onClose={handleStudyModeClose}
        onFlashcardDelete={handleFlashcardDelete}
        deleting={deleting}
      />
    </>
  );
}