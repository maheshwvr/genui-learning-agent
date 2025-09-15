'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Tag, BookOpen } from 'lucide-react'

interface Topic {
  name: string
  materialCount: number
}

interface TopicSelectorProps {
  courseId: string
  courseName?: string
  selectedTopics: string[]
  onTopicsChange: (topics: string[]) => void
  className?: string
}

export function TopicSelector({
  courseId,
  courseName,
  selectedTopics,
  onTopicsChange,
  className = ''
}: TopicSelectorProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTopics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/courses/${courseId}/materials`)
      if (response.ok) {
        const data = await response.json()
        setTopics(data.topics || [])
      } else {
        setError('Failed to fetch topics')
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
      setError('Error loading topics')
    } finally {
      setLoading(false)
    }
  }

  const handleTopicToggle = (topicName: string) => {
    const newTopics = selectedTopics.includes(topicName)
      ? selectedTopics.filter(t => t !== topicName)
      : [...selectedTopics, topicName]
    
    onTopicsChange(newTopics)
  }

  const handleSelectAll = () => {
    if (selectedTopics.length === topics.length) {
      // Deselect all
      onTopicsChange([])
    } else {
      // Select all
      onTopicsChange(topics.map(t => t.name))
    }
  }

  const handleSelectNone = () => {
    onTopicsChange([])
  }

  useEffect(() => {
    if (courseId) {
      fetchTopics()
    }
  }, [courseId])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Loading Topics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Tag className="h-5 w-5 mr-2" />
            Error Loading Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTopics}
            className="mt-2"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (topics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            No Topics Available
          </CardTitle>
          <CardDescription>
            This course doesn't have any materials with topic tags yet. All materials will be included in the lesson.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          Select Topics
          {courseName && <span className="text-sm font-normal text-muted-foreground ml-2">from {courseName}</span>}
        </CardTitle>
        <CardDescription>
          Choose which topics to focus on for this lesson. Selected topics will provide context for AI responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Select All/None Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="h-8"
          >
            {selectedTopics.length === topics.length ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedTopics.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
              className="h-8"
            >
              Clear Selection
            </Button>
          )}
          <div className="text-xs text-muted-foreground self-center ml-auto">
            {selectedTopics.length} of {topics.length} topics selected
          </div>
        </div>

        {/* Topic List */}
        <div className="space-y-3">
          {topics.map((topic) => {
            const isSelected = selectedTopics.includes(topic.name)
            
            return (
              <div
                key={topic.name}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent ${
                  isSelected ? 'bg-accent border-primary' : 'border-border'
                }`}
                onClick={() => handleTopicToggle(topic.name)}
              >
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleTopicToggle(topic.name)}
                  className="pointer-events-none h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {topic.name}
                    </span>
                    <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {topic.materialCount} material{topic.materialCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Selection Summary */}
        {selectedTopics.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Selected Topics:</h4>
            <div className="flex flex-wrap gap-1">
              {selectedTopics.map((topic) => (
                <span key={topic} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded border">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}