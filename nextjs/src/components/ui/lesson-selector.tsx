'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lesson } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LessonSelectorProps {
  currentLessonId?: string
  onLessonSelect?: (lessonId: string) => void
}

export default function LessonSelector({ currentLessonId, onLessonSelect }: LessonSelectorProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  // Fetch user's lessons
  const fetchLessons = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/lessons')
      if (response.ok) {
        const data = await response.json()
        setLessons(data.lessons || [])
      } else {
        console.error('Failed to fetch lessons')
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setIsLoading(false)
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
        
        // Refresh lessons list
        await fetchLessons()
        
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
              <div className="grid gap-2">
                {lessons.map((lesson) => (
                  <div
                    key={`lesson_${lesson.id}_${lesson.updated_at}`}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-colors
                      ${currentLessonId === lesson.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => handleLessonSelect(lesson.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{lesson.title}</h4>
                        <div className="text-xs text-gray-500 mt-1">
                          {lesson.messages.length} messages
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        Created: {new Date(lesson.created_at).toLocaleDateString()} at {new Date(lesson.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  )
}