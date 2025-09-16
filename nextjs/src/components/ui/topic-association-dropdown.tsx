'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tag, Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Topic {
  id: string
  name: string
  materialCount: number
}

interface TopicAssociationDropdownProps {
  materialId: string
  courseId: string
  currentTopics: string[]
  onTopicsChange: () => void
  className?: string
}

export function TopicAssociationDropdown({
  materialId,
  courseId,
  currentTopics,
  onTopicsChange,
  className
}: TopicAssociationDropdownProps) {
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([])
  const [selectedTopics, setSelectedTopics] = useState<string[]>(currentTopics)
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
    
    setSelectedTopics(newSelectedTopics)
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
        setSelectedTopics(prev => [...prev, newTopic.name])
        setNewTopicName('')
        setIsAddingTopic(false)
      } else {
        const errorData = await response.json()
        console.error('Error creating topic:', errorData.error || 'Failed to create topic')
        // You could show this error to the user via a toast or alert
      }
    } catch (error) {
      console.error('Error creating topic:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/materials/${materialId}/topics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: selectedTopics })
      })

      if (response.ok) {
        onTopicsChange()
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Error updating material topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedTopics(currentTopics)
    setIsAddingTopic(false)
    setNewTopicName('')
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-xs",
            currentTopics.length > 0 && "text-primary",
            className
          )}
        >
          <Tag className="h-3 w-3 mr-1" />
          {currentTopics.length > 0 ? `${currentTopics.length} topics` : 'Add topics'}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Associate with topics</div>
          
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

          <DropdownMenuSeparator />

          {/* Actions */}
          <div className="flex space-x-1 mt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-7"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-7"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}