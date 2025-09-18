'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGlobal } from '@/lib/context/GlobalContext'

interface CreateCourseButtonProps {
  onCourseCreated?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function CreateCourseButton({
  onCourseCreated,
  variant = 'outline',
  size = 'sm',
  className = ''
}: CreateCourseButtonProps) {
  const { user } = useGlobal()
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDescription, setNewCourseDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

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
        
        // Reset form
        setNewCourseName('')
        setNewCourseDescription('')
        setShowCreateDialog(false)
        
        // Call the callback to refresh courses
        onCourseCreated?.()
      } else {
        const errorData = await courseResponse.text()
        console.error('Failed to create course:', {
          status: courseResponse.status,
          statusText: courseResponse.statusText,
          body: errorData
        })
        
        if (courseResponse.status === 401) {
          setError('Authentication required. Please log in.')
        } else if (courseResponse.status === 400) {
          setError('Invalid course data. Please check your input.')
        } else {
          setError(`Failed to create course: ${courseResponse.statusText}`)
        }
      }
    } catch (error) {
      console.error('Error creating course:', error)
      setError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={showCreateDialog} onOpenChange={(open) => {
      setShowCreateDialog(open)
      if (!open) {
        setError(null) // Clear error when dialog closes
        setNewCourseName('')
        setNewCourseDescription('')
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={className}
          title="Create a new course"
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
  )
}