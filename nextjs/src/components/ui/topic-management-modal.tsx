'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';

export interface TopicManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  topicId?: string;
  initialTopicName?: string;
  mode: 'create' | 'edit';
  onTopicSaved: () => void;
}

export function TopicManagementModal({
  isOpen,
  onClose,
  courseId,
  topicId,
  initialTopicName = '',
  mode,
  onTopicSaved,
}: TopicManagementModalProps) {
  const [topicName, setTopicName] = useState(initialTopicName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTopicName(initialTopicName);
      setError('');
    }
  }, [isOpen, initialTopicName]);

  const handleSave = async () => {
    if (!topicName.trim()) {
      setError('Topic name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const url = mode === 'create' 
        ? `/api/courses/${courseId}/topics`
        : `/api/courses/${courseId}/topics`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';
      
      const body = mode === 'create' 
        ? { name: topicName.trim() }
        : { topicId, name: topicName.trim() };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onTopicSaved();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to ${mode} topic`);
      }
    } catch (err) {
      setError(`Failed to ${mode} topic`);
      console.error(`Error ${mode}ing topic:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!topicId || mode === 'create') return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/courses/${courseId}/topics?topicId=${topicId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        onTopicSaved();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete topic');
      }
    } catch (err) {
      setError('Failed to delete topic');
      console.error('Error deleting topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSave();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Create New Topic' : 'Edit Topic'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? 'Create a new topic to organize your materials.'
                : 'Update the topic name or delete the topic.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic-name">Topic Name</Label>
              <Input
                id="topic-name"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter topic name..."
                disabled={loading}
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {mode === 'edit' && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            
            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || !topicName.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  mode === 'create' ? 'Create Topic' : 'Save Changes'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{topicName}"? This will remove the topic 
              from all materials, but the materials themselves will not be deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Topic'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}