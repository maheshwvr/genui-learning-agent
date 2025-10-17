'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnimatedButton } from '@/components/ui/animated-button'
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

// Animated Topic Row Component
interface AnimatedTopicRowProps {
  topic: Topic;
  isSelected: boolean;
  onToggle: () => void;
}

function AnimatedTopicRow({ topic, isSelected, onToggle }: AnimatedTopicRowProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [showHoverRipple, setShowHoverRipple] = useState(false);
  const [hoverRipplePosition, setHoverRipplePosition] = useState({ x: 0, y: 0 });
  const rowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rowRef.current) return;
    
    const rect = rowRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rowRef.current) return;
    
    const rect = rowRef.current.getBoundingClientRect();
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
    if (!rowRef.current) return;
    
    const rect = rowRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setClickPosition({ x, y });
    setIsClicked(true);
    
    setTimeout(() => {
      setIsClicked(false);
    }, 1000);
    
    onToggle();
  };

  return (
    <div
      ref={rowRef}
      className={`relative flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent hover:border-accent overflow-hidden ${
        isSelected ? 'bg-accent border-accent' : 'border-border'
      }`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Hover glow effect - matching sidebar navigation subtlety */}
      {isHovered && (
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-8 h-8 rounded-full opacity-5 blur-lg bg-gray-400" />
          <div className="absolute inset-1 w-6 h-6 rounded-full opacity-8 blur-md bg-gray-400" />
          <div className="absolute inset-2 w-4 h-4 rounded-full opacity-12 blur-sm bg-gray-400" />
          <div className="absolute inset-3 w-2 h-2 rounded-full opacity-15 blur-xs bg-gray-400" />
          <div className="absolute inset-3.5 w-1 h-1 rounded-full opacity-20 bg-gray-300" />
        </div>
      )}

      {/* Hover entry ripple effect - matching sidebar navigation */}
      {showHoverRipple && (
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: hoverRipplePosition.x,
            top: hoverRipplePosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-0 h-0 rounded-full opacity-25 blur-sm animate-hover-ripple bg-gray-300" />
        </div>
      )}

      {/* Click ripple effect - matching sidebar navigation */}
      {isClicked && (
        <div
          className="absolute pointer-events-none z-0"
          style={{
            left: clickPosition.x,
            top: clickPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-0 h-0 rounded-full opacity-40 blur-sm animate-ripple bg-gray-200" />
        </div>
      )}

      {/* Content with proper z-index */}
      <input 
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="pointer-events-none h-4 w-4 relative z-10"
      />
      <div className="flex-1 min-w-0 relative z-10">
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
        <Check className="h-4 w-4 text-primary flex-shrink-0 relative z-10" />
      )}
    </div>
  );
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
          <p className="text-med font-medium">
            Loading Topics...
          </p>
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
          <p className="text-med font-medium">
            Error Loading Topics
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <AnimatedButton 
            variant="outline" 
            size="sm" 
            onClick={fetchTopics}
            className="mt-2"
          >
            Try Again
          </AnimatedButton>
        </CardContent>
      </Card>
    )
  }

  if (topics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <p className="text-med font-medium">
            No Topics Available
          </p>
          <CardDescription>
            This course doesn't have any materials with topic tags yet. All materials will be included in the lesson.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/* Select All/None Controls */}
        <div className="flex flex-wrap gap-2 mb-2">
          <AnimatedButton
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="h-8"
          >
            {selectedTopics.length === topics.length ? 'Deselect All' : 'Select All'}
          </AnimatedButton>
          {selectedTopics.length > 0 && (
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
              className="h-8"
            >
              Clear Selection
            </AnimatedButton>
          )}
          <div className="text-xs text-muted-foreground self-center ml-auto">
            {selectedTopics.length} of {topics.length} topics selected
          </div>
        </div>

        {/* Topic List */}
        <div className="space-y-1">
          {topics.map((topic) => {
            const isSelected = selectedTopics.includes(topic.name)
            
            return (
              <AnimatedTopicRow
                key={topic.name}
                topic={topic}
                isSelected={isSelected}
                onToggle={() => handleTopicToggle(topic.name)}
              />
            )
          })}
        </div>

        {/* Selection Summary */}
        {selectedTopics.length > 0 && (
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium">Selected Topics:</h4>
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