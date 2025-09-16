'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tag, Plus, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Topic {
  name: string
  materialCount: number
}

interface CourseTopicBannerProps {
  courseId: string
  courseName: string
  topics: Topic[]
  onTopicsChange: () => void
  className?: string
}

export function CourseTopicBanner({
  courseId,
  courseName,
  topics,
  onTopicsChange,
  className
}: CourseTopicBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return

    try {
      setLoading(true)
      setError(null) // Clear any previous errors
      
      const response = await fetch(`/api/courses/${courseId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName.trim() })
      })

      if (response.ok) {
        setNewTopicName('')
        setIsAddingTopic(false)
        onTopicsChange() // Refresh the topics list
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create topic'
        setError(errorMessage)
        console.error('Error creating topic:', errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error while creating topic'
      setError(errorMessage)
      console.error('Error creating topic:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTopic()
    } else if (e.key === 'Escape') {
      setIsAddingTopic(false)
      setNewTopicName('')
      setError(null) // Clear error when canceling
    }
  }

  if (topics.length === 0 && !isAddingTopic) {
    return (
      <div className={cn("p-4 border rounded-lg bg-muted/30", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              No topics yet for {courseName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingTopic(true)}
            className="h-8 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add topic
          </Button>
        </div>
        
        {isAddingTopic && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Enter topic name"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8"
              autoFocus
            />
            {error && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex space-x-1">
              <Button
                size="sm"
                onClick={handleAddTopic}
                disabled={!newTopicName.trim() || loading}
                className="h-7 px-2"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingTopic(false)
                  setNewTopicName('')
                  setError(null) // Clear error when canceling
                }}
                className="h-7 px-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("border rounded-lg bg-muted/30", className)}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 hover:text-primary transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Tag className="h-4 w-4" />
            <span className="text-sm font-medium">
              Topics in {courseName}
            </span>
            <span className="text-xs text-muted-foreground">
              ({topics.length})
            </span>
          </button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingTopic(true)}
            className="h-8 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add topic
          </Button>
        </div>

        {/* Condensed view - show first few topics */}
        {!isExpanded && topics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {topics.slice(0, 3).map((topic) => (
              <span
                key={topic.name}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded border"
              >
                {topic.name} ({topic.materialCount})
              </span>
            ))}
            {topics.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{topics.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {/* All topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {topics.map((topic) => (
                <div
                  key={topic.name}
                  className="flex items-center justify-between p-2 bg-background rounded border"
                >
                  <span className="text-sm font-medium">{topic.name}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {topic.materialCount} material{topic.materialCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Add new topic form */}
            {isAddingTopic && (
              <div className="mt-3 p-3 bg-background rounded border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add new topic</label>
                  <Input
                    placeholder="Enter topic name"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8"
                    autoFocus
                  />
                  {error && (
                    <div className="flex items-center space-x-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      onClick={handleAddTopic}
                      disabled={!newTopicName.trim() || loading}
                      className="h-7 px-2"
                    >
                      Add Topic
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingTopic(false)
                        setNewTopicName('')
                        setError(null) // Clear error when canceling
                      }}
                      className="h-7 px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}