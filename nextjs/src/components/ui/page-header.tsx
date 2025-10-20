import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2 } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  editable?: boolean;
  onTitleChange?: (newTitle: string) => Promise<void>;
}

export function PageHeader({ title, description, children, className = "", editable = false, onTitleChange }: PageHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setIsEditingTitle(true);
    setEditingTitle(title);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  const cancelEditing = () => {
    setIsEditingTitle(false);
    setEditingTitle(title);
  };

  const saveTitle = async () => {
    if (!editingTitle.trim() || editingTitle === title || !onTitleChange) {
      cancelEditing();
      return;
    }

    setIsUpdating(true);
    try {
      await onTitleChange(editingTitle.trim());
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
      cancelEditing();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleEditClick = () => {
    if (isEditingTitle) {
      saveTitle();
    } else {
      startEditing();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className={children ? "flex flex-row items-center justify-between" : ""}>
        <div className="flex-1">
          {editable ? (
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <Input
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveTitle}
                  className="border-0 p-0 text-2xl font-semibold bg-transparent focus:ring-0 focus:border-0 h-auto"
                  disabled={isUpdating}
                />
              ) : (
                <CardTitle>{title}</CardTitle>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEditClick}
                className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                disabled={isUpdating}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <CardTitle>{title}</CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {children && <div>{children}</div>}
      </CardHeader>
    </Card>
  );
}