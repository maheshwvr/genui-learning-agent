'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lesson } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { Edit2 } from 'lucide-react'

interface LessonSelectorProps {
  currentLessonId?: string
  onLessonSelect?: (lessonId: string) => void
}

interface LessonsResponse {
  lessons: Lesson[]
  totalCount: number
  hasMore: boolean
  page: number
  limit: number
}

// Animated Lesson Card Component
interface AnimatedLessonCardProps {
  lesson: Lesson;
  isSelected: boolean;
  onSelect: () => void;
  onTitleUpdate?: (lessonId: string, newTitle: string) => void;
}

function AnimatedLessonCard({ lesson, isSelected, onSelect, onTitleUpdate }: AnimatedLessonCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [showHoverRipple, setShowHoverRipple] = useState(false);
  const [hoverRipplePosition, setHoverRipplePosition] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(lesson.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setHoverRipplePosition({ x, y });
    setIsHovered(true);
    setShowHoverRipple(true);
    
    setTimeout(() => {
      setShowHoverRipple(false);
    }, 800);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return; // Don't navigate while editing
    
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setClickPosition({ x, y });
    setIsClicked(true);
    
    setTimeout(() => {
      setIsClicked(false);
    }, 1000);
    
    onSelect();
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditingTitle(lesson.title);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingTitle(lesson.title);
  };

  const saveTitle = async () => {
    if (!editingTitle.trim() || editingTitle === lesson.title) {
      cancelEditing();
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingTitle.trim()
        })
      });

      if (response.ok) {
        setIsEditing(false);
        // Notify parent to update the lesson list
        if (onTitleUpdate) {
          onTitleUpdate(lesson.id, editingTitle.trim());
        }
      } else {
        console.error('Failed to update lesson title');
        cancelEditing();
      }
    } catch (error) {
      console.error('Error updating lesson title:', error);
      cancelEditing();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startEditing();
  };

  const colors = isSelected ? 'bg-blue-400' : 'bg-gray-400';
  const colorCenter = isSelected ? 'bg-blue-300' : 'bg-gray-300';
  const clickColor = isSelected ? 'bg-blue-200' : 'bg-gray-200';

  return (
    <div
      ref={cardRef}
      className={`
        group relative p-3 rounded-lg border cursor-pointer transition-colors overflow-hidden
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
        ${isEditing ? 'cursor-default' : 'cursor-pointer'}
      `}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Hover glow effect */}
      {isHovered && (
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={`w-8 h-8 rounded-full opacity-5 blur-lg ${colors}`} />
          <div className={`absolute inset-1 w-6 h-6 rounded-full opacity-8 blur-md ${colors}`} />
          <div className={`absolute inset-2 w-4 h-4 rounded-full opacity-12 blur-sm ${colors}`} />
          <div className={`absolute inset-3 w-2 h-2 rounded-full opacity-15 blur-xs ${colors}`} />
          <div className={`absolute inset-3.5 w-1 h-1 rounded-full opacity-20 ${colorCenter}`} />
        </div>
      )}

      {/* Hover entry ripple effect */}
      {showHoverRipple && (
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: hoverRipplePosition.x,
            top: hoverRipplePosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={`w-0 h-0 rounded-full opacity-25 blur-sm animate-hover-ripple ${colorCenter}`} />
        </div>
      )}

      {/* Click ripple effect */}
      {isClicked && (
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: clickPosition.x,
            top: clickPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={`w-0 h-0 rounded-full opacity-40 blur-sm animate-ripple ${clickColor}`} />
        </div>
      )}

      {/* Content with proper z-index */}
      <div className="flex justify-between items-start relative z-10">
        <div className="flex-1 mr-2">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveTitle}
              className="border-0 p-0 h-auto font-medium text-sm bg-transparent focus:ring-0 focus:border-0"
              disabled={isUpdating}
            />
          ) : (
            <h4 className="font-medium text-sm">{lesson.title}</h4>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {lesson.messages.length} messages
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit button - shows on hover */}
          {isHovered && !isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEditClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-gray-100"
              disabled={isUpdating}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          <div className="text-xs text-gray-400 text-right">
            Created: {new Date(lesson.created_at).toLocaleDateString()} at {new Date(lesson.created_at).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LessonSelector({ currentLessonId, onLessonSelect }: LessonSelectorProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const router = useRouter()

  const LESSONS_PER_PAGE = 10

  // Fetch user's lessons with pagination
  const fetchLessons = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    
    try {
      const response = await fetch(`/api/lessons?page=${page}&limit=${LESSONS_PER_PAGE}`)
      if (response.ok) {
        const data: LessonsResponse = await response.json()
        
        if (append) {
          setLessons(prevLessons => [...prevLessons, ...data.lessons])
        } else {
          setLessons(data.lessons || [])
        }
        
        setHasMore(data.hasMore)
        setTotalCount(data.totalCount)
        setCurrentPage(page)
      } else {
        console.error('Failed to fetch lessons')
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Load more lessons
  const loadMoreLessons = () => {
    if (hasMore && !isLoadingMore) {
      fetchLessons(currentPage + 1, true)
    }
  }

  // Create a new lesson
  const createNewLesson = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Lesson ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          lesson_type: 'general'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newLesson = data.lesson
        
        // Refresh lessons list from the beginning
        await fetchLessons(1, false)
        
        // Navigate to the new lesson
        if (onLessonSelect) {
          onLessonSelect(newLesson.id)
        } else {
          router.push(`/app/learn/${newLesson.id}`)
        }
      } else {
        console.error('Failed to create lesson')
      }
    } catch (error) {
      console.error('Error creating lesson:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle lesson title update
  const handleLessonTitleUpdate = (lessonId: string, newTitle: string) => {
    setLessons(prevLessons => 
      prevLessons.map(lesson => 
        lesson.id === lessonId 
          ? { ...lesson, title: newTitle }
          : lesson
      )
    );
  };

  // Handle lesson selection
  const handleLessonSelect = (lessonId: string) => {
    if (onLessonSelect) {
      onLessonSelect(lessonId)
    } else {
      router.push(`/app/learn/${lessonId}`)
    }
  }

  useEffect(() => {
    fetchLessons()
  }, [])

  return (
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <LoadingSpinner 
              text="Loading lessons..." 
              size="md"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.length === 0 ? (
              <div className="text-sm text-gray-500">
                No lessons yet. Create your first lesson to get started!
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  {lessons.map((lesson) => (
                    <AnimatedLessonCard
                      key={`lesson_${lesson.id}_${lesson.updated_at}`}
                      lesson={lesson}
                      isSelected={currentLessonId === lesson.id}
                      onSelect={() => handleLessonSelect(lesson.id)}
                      onTitleUpdate={handleLessonTitleUpdate}
                    />
                  ))}
                </div>
                
                {/* See More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-4">
                    {isLoadingMore ? (
                      <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm text-gray-600">Loading more...</span>
                      </div>
                    ) : (
                      <AnimatedButton
                        variant="outline"
                        onClick={loadMoreLessons}
                        className="w-full"
                      >
                        See More ({totalCount - lessons.length} remaining)
                      </AnimatedButton>
                    )}
                  </div>
                )}
                
                {/* Summary */}
                <div className="text-xs text-gray-500 text-center mt-2">
                  Showing {lessons.length} of {totalCount} lessons
                </div>
              </>
            )}
          </div>
        )}
      </div>
  )
}