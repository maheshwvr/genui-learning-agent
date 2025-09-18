'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tag, Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Topic {
  id: string
  name: string
  materialCount: number
}

interface TopicUploadSelectorProps {
  courseId: string
  selectedTopics: string[]
  onTopicsChange: (topics: string[]) => void
  className?: string
}

export function TopicUploadSelector({
  courseId,
  selectedTopics,
  onTopicsChange,
  className
}: TopicUploadSelectorProps) {
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch available topics for the course
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/materials`)
        if (response.ok) {
          const data = await response.json()
          setAvailableTopics(data.topics || [])
        }
      } catch (error) {
        console.error('Error fetching topics:', error)
      }
    }

    if (courseId && isOpen) {
      fetchTopics()
    }
  }, [courseId, isOpen])

  const handleTopicToggle = (topicName: string) => {
    const newSelectedTopics = selectedTopics.includes(topicName)
      ? selectedTopics.filter(t => t !== topicName)
      : [...selectedTopics, topicName]
    
    onTopicsChange(newSelectedTopics)
  }

  const handleAddNewTopic = async () => {
    if (!newTopicName.trim()) return

    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${courseId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName.trim() })
      })

      if (response.ok) {
        const newTopic = await response.json()
        setAvailableTopics(prev => [...prev, { ...newTopic, materialCount: 0 }])
        onTopicsChange([...selectedTopics, newTopic.name])
        setNewTopicName('')
        setIsAddingTopic(false)
      } else {
        const errorData = await response.json()
        console.error('Error creating topic:', errorData.error || 'Failed to create topic')
      }
    } catch (error) {
      console.error('Error creating topic:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTopic = (topicName: string) => {
    onTopicsChange(selectedTopics.filter(t => t !== topicName))
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Topic Tags (Optional)</label>
        
        {/* Selected Topics Display */}
        {selectedTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
            {selectedTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded border"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(topic)}
                  className="hover:bg-primary/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Topic Selector Dropdown */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <Tag className="h-4 w-4 mr-2" />
              {selectedTopics.length > 0 
                ? `${selectedTopics.length} topic(s) selected` 
                : 'Select topics or create new ones'
              }
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-64">
            <div className="p-2">
              <div className="text-sm font-medium mb-2">Select topics</div>
              
              {/* Available topics */}
              <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                {availableTopics.map((topic, index) => {
                  const isSelected = selectedTopics.includes(topic.name)
                  return (
                    <div
                      key={topic.id || topic.name || index}
                      className={cn(
                        "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted",
                        isSelected && "bg-primary/10"
                      )}
                      onClick={() => handleTopicToggle(topic.name)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm">{topic.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {topic.materialCount}
                      </span>
                    </div>
                  )
                })}
              </div>

              {availableTopics.length === 0 && !isAddingTopic && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No topics available
                </div>
              )}

              <DropdownMenuSeparator />

              {/* Add new topic */}
              {isAddingTopic ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter topic name"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddNewTopic()
                      } else if (e.key === 'Escape') {
                        setIsAddingTopic(false)
                        setNewTopicName('')
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      onClick={handleAddNewTopic}
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
                      }}
                      className="h-7 px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingTopic(true)}
                  className="w-full justify-start h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add new topic
                </Button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-xs text-muted-foreground">
          Select existing topics or create new ones for this material.
        </p>
      </div>
    </div>
  )
}