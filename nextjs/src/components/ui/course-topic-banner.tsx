'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tag, Plus, ChevronDown, ChevronRight, AlertCircle, Edit2, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Topic {
  id?: string
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
  
  // Edit state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingTopicName, setEditingTopicName] = useState('')
  
  // Delete state
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null)

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

  const handleEditKeyDown = (e: React.KeyboardEvent, topicId: string) => {
    if (e.key === 'Enter') {
      handleEditTopic(topicId)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const handleEditTopic = async (topicId: string) => {
    if (!editingTopicName.trim()) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/courses/${courseId}/topics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, name: editingTopicName.trim() })
      })

      if (response.ok) {
        setEditingTopicId(null)
        setEditingTopicName('')
        onTopicsChange() // Refresh the topics list
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to update topic'
        setError(errorMessage)
        console.error('Error updating topic:', errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error while updating topic'
      setError(errorMessage)
      console.error('Error updating topic:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/courses/${courseId}/topics?topicId=${encodeURIComponent(topicId)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onTopicsChange() // Refresh the topics list
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to delete topic'
        setError(errorMessage)
        console.error('Error deleting topic:', errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error while deleting topic'
      setError(errorMessage)
      console.error('Error deleting topic:', error)
    } finally {
      setLoading(false)
      setDeletingTopicId(null)
    }
  }

  const startEditing = (topic: Topic) => {
    setEditingTopicId(topic.id || `legacy-${topic.name.replace(/\s+/g, '-').toLowerCase()}`)
    setEditingTopicName(topic.name)
    setError(null)
  }

  const cancelEditing = () => {
    setEditingTopicId(null)
    setEditingTopicName('')
    setError(null)
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
            <div className="grid grid-cols-1 gap-2">
              {topics.map((topic) => {
                const topicId = topic.id || `legacy-${topic.name.replace(/\s+/g, '-').toLowerCase()}`
                const isEditing = editingTopicId === topicId
                
                return (
                  <div
                    key={topicId}
                    className="flex items-center justify-between p-3 bg-background rounded border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {isEditing ? (
                        <Input
                          value={editingTopicName}
                          onChange={(e) => setEditingTopicName(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, topicId)}
                          className="h-8 max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="text-sm font-medium">{topic.name}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {topic.materialCount} material{topic.materialCount !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTopic(topicId)}
                            disabled={!editingTopicName.trim() || loading}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(topic)}
                            className="h-8 w-8 p-0"
                            title="Edit topic"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="Delete topic"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the topic "{topic.name}"? 
                                  {topic.materialCount > 0 && (
                                    <span className="block mt-1 text-destructive">
                                      This will remove the topic from {topic.materialCount} material{topic.materialCount !== 1 ? 's' : ''}.
                                    </span>
                                  )}
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTopic(topicId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Topic
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Global error display */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded border border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setError(null)}
                  className="h-6 w-6 p-0 ml-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

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