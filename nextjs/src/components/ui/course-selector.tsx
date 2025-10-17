'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, BookOpen, FileText, Trash2, AlertTriangle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useGlobal } from '@/lib/context/GlobalContext'

// Animated Course Card Component
interface AnimatedCourseCardProps {
  course: Course;
  isSelected: boolean;
  onSelect: () => void;
  showDeleteButton?: boolean;
  onDelete?: (courseId: string) => void;
  showMaterialCount?: boolean;
  deleting?: boolean;
}

function AnimatedCourseCard({ 
  course, 
  isSelected, 
  onSelect, 
  showDeleteButton = false, 
  onDelete,
  showMaterialCount = true,
  deleting = false
}: AnimatedCourseCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [showHoverRipple, setShowHoverRipple] = useState(false);
  const [hoverRipplePosition, setHoverRipplePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

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

  return (
    <Card
      ref={cardRef}
      className={`relative cursor-pointer transition-all hover:shadow-md overflow-hidden ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
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
          <div className="w-8 h-8 rounded-full opacity-5 blur-lg bg-primary-400" />
          <div className="absolute inset-1 w-6 h-6 rounded-full opacity-8 blur-md bg-primary-400" />
          <div className="absolute inset-2 w-4 h-4 rounded-full opacity-12 blur-sm bg-primary-400" />
          <div className="absolute inset-3 w-2 h-2 rounded-full opacity-15 blur-xs bg-primary-400" />
          <div className="absolute inset-3.5 w-1 h-1 rounded-full opacity-20 bg-primary-300" />
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
          <div className="w-0 h-0 rounded-full opacity-25 blur-sm animate-hover-ripple bg-primary-300" />
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
          <div className="w-0 h-0 rounded-full opacity-40 blur-sm animate-ripple bg-primary-200" />
        </div>
      )}

      {/* Content with proper z-index */}
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2">
              {course.name}
            </CardTitle>
            {course.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {course.description}
              </CardDescription>
            )}
          </div>
          {showDeleteButton && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 ml-2"
                  onClick={(e) => e.stopPropagation()}
                  disabled={deleting}
                >
                  {deleting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Course</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{course.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(course.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      {showMaterialCount && (
        <CardContent className="pt-0 relative z-10">
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mr-1" />
            {course.materialCount} {course.materialCount === 1 ? 'material' : 'materials'}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface Course {
  id: string
  name: string
  description?: string | null
  materialCount: number
  created_at: string
  updated_at: string
}

interface CourseSelectorProps {
  onCourseSelect?: (course: Course) => void
  onLoadingChange?: (loading: boolean) => void
  courses?: Course[] // Accept courses as prop
  selectedCourseId?: string | null
  showCreateButton?: boolean
  showMaterialCount?: boolean
  showDeleteButton?: boolean
  className?: string
  hideCreateButton?: boolean // New prop to hide the create button when it's rendered elsewhere
}

export function CourseSelector({
  onCourseSelect,
  onLoadingChange,
  courses: externalCourses,
  selectedCourseId,
  showCreateButton = true,
  showMaterialCount = true,
  showDeleteButton = false,
  className = '',
  hideCreateButton = false
}: CourseSelectorProps) {
  const { user, loading: userLoading } = useGlobal()
  const [courses, setCourses] = useState<Course[]>(externalCourses || [])
  const [loading, setLoading] = useState(!externalCourses) // Only show loading if we need to fetch
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDescription, setNewCourseDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = async () => {
    try {
      console.log('CourseSelector: Starting to fetch courses')
      setLoading(true)
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        console.log('CourseSelector: Courses fetched successfully', data.courses?.length || 0)
        setCourses(data.courses || [])
      } else {
        console.error('Failed to fetch courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      console.log('CourseSelector: Setting loading to false')
      setLoading(false)
    }
  }

  const createCourse = async () => {
    if (!newCourseName.trim()) return

    // Check authentication before attempting to create
    if (!user) {
      setError('Please log in to create courses.')
      return
    }

    try {
      setCreating(true)
      setError(null) // Clear any previous errors
      
      console.log('Creating course with name:', newCourseName.trim())
      
      const courseResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCourseName.trim(),
          description: newCourseDescription.trim() || null,
        }),
      })

      console.log('Course creation response:', {
        status: courseResponse.status,
        statusText: courseResponse.statusText,
        headers: Object.fromEntries(courseResponse.headers.entries())
      })

      if (courseResponse.ok) {
        const data = await courseResponse.json()
        console.log('Course created successfully:', data)
        setCourses(prev => [{ ...data.course, materialCount: 0 }, ...prev])
        setNewCourseName('')
        setNewCourseDescription('')
        setShowCreateDialog(false)
        
        // Note: Removed auto-selection to allow users to manually select the course
      } else {
        const errorData = await courseResponse.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || `Failed to create course (${courseResponse.status})`
        console.log('Course creation failed:', errorData)
        setError(errorMessage)
        console.error('Failed to create course:', {
          status: courseResponse.status,
          statusText: courseResponse.statusText,
          error: errorData.error || 'Unknown error'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      setError(errorMessage)
      console.error('Error creating course:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteCourse = async (courseId: string) => {
    try {
      setDeleting(courseId)
      const response = await fetch(`/api/courses?id=${courseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCourses(prev => prev.filter(course => course.id !== courseId))
        
        // If the deleted course was selected, clear selection
        if (selectedCourseId === courseId && onCourseSelect) {
          onCourseSelect(null as any)
        }
      } else {
        console.error('Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    // Only fetch if no external courses provided
    if (!externalCourses) {
      console.log('CourseSelector: Fetching courses on mount')
      fetchCourses()
    }
  }, [externalCourses])

  // Update courses when external courses change
  useEffect(() => {
    if (externalCourses) {
      console.log('CourseSelector: Using external courses', externalCourses.length)
      setCourses(externalCourses)
      setLoading(false)
    }
  }, [externalCourses])

  useEffect(() => {
    console.log('CourseSelector: Loading state changed to', loading)
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Create Course Button - only show if not hidden */}
      {showCreateButton && !hideCreateButton && (
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setError(null) // Clear error when dialog closes
          }
        }}>
          <DialogTrigger asChild>
            <AnimatedButton 
              variant="outline" 
              className="w-full md:w-auto"
              disabled={!user}
              title={!user ? "Please log in to create courses" : "Create a new course"}
              icon={Plus}
            >
              Create Course
            </AnimatedButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Create a new course to organize your learning materials.
              </DialogDescription>
            </DialogHeader>
            
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="course-name" className="text-sm font-medium">Course Name</label>
                <Input
                  id="course-name"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g., Introduction to Data Science"
                  maxLength={255}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="course-description" className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  id="course-description"
                  value={newCourseDescription}
                  onChange={(e) => setNewCourseDescription(e.target.value)}
                  placeholder="Brief description of the course content..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={createCourse}
                disabled={!newCourseName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create Course'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner 
            text="Loading your courses..." 
            size="md"
          />
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
          <p className="text-muted-foreground mb-4">
            {user 
              ? "Create your first course to organize learning materials."
              : "Please log in to create and manage courses."
            }
          </p>
          {showCreateButton && user && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <AnimatedCourseCard
              key={course.id}
              course={course}
              isSelected={selectedCourseId === course.id}
              onSelect={() => onCourseSelect?.(course)}
              showDeleteButton={showDeleteButton}
              onDelete={deleteCourse}
              showMaterialCount={showMaterialCount}
              deleting={deleting === course.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}