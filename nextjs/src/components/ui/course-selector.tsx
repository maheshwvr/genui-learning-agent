'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, BookOpen, FileText, Trash2, AlertTriangle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGlobal } from '@/lib/context/GlobalContext'

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
  selectedCourseId?: string | null
  showCreateButton?: boolean
  showMaterialCount?: boolean
  showDeleteButton?: boolean
  className?: string
}

export function CourseSelector({
  onCourseSelect,
  selectedCourseId,
  showCreateButton = true,
  showMaterialCount = true,
  showDeleteButton = false,
  className = ''
}: CourseSelectorProps) {
  const { user, loading: userLoading } = useGlobal()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDescription, setNewCourseDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      } else {
        console.error('Failed to fetch courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
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
    fetchCourses()
  }, [])

  if (loading || userLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Create Course Button */}
      {showCreateButton && (
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setError(null) // Clear error when dialog closes
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full md:w-auto"
              disabled={!user}
              title={!user ? "Please log in to create courses" : "Create a new course"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
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
      {courses.length === 0 ? (
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
            <Card
              key={course.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedCourseId === course.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onCourseSelect?.(course)}
            >
              <CardHeader className="pb-3">
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
                  {showDeleteButton && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                          disabled={deleting === course.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                            Delete Course
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{course.name}"? This will also delete all associated materials and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCourse(course.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Course
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              {showMaterialCount && (
                <CardContent className="pt-0">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mr-1" />
                    {course.materialCount} material{course.materialCount !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}