'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileIcon, Trash2, Tag, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import { formatFileSize } from '@/lib/utils/file-utils';

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  topic_tags: string[];
  created_at: string;
}

export interface DraggableMaterialItemProps {
  material: Material;
  onDelete: (materialId: string) => void;
  onTopicsEdit?: (materialId: string) => void;
  isDragging?: boolean;
  className?: string;
}

export function DraggableMaterialItem({
  material,
  onDelete,
  onTopicsEdit,
  isDragging = false,
  className
}: DraggableMaterialItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingFromKit,
  } = useDraggable({
    id: `material-${material.id}`,
    data: {
      type: 'material',
      material: material,
    },
  });

  // Don't apply transform when dragging to avoid conflicts with DragOverlay
  const style = transform && !isDraggingFromKit ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200 hover:bg-accent cursor-grab active:cursor-grabbing",
        (isDragging || isDraggingFromKit) && "opacity-30",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Drag Handle */}
            <div 
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" title={material.file_name}>
                {material.file_name}
              </p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{formatFileSize(material.file_size)}</span>
                <span>{formatDate(material.created_at)}</span>
              </div>
              
              {/* Topic Tags */}
              {material.topic_tags.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  <Tag className="h-3 w-3" />
                  <div className="flex flex-wrap gap-1">
                    {material.topic_tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {onTopicsEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTopicsEdit(material.id)}
                className="h-8 w-8 p-0"
                title="Edit topics"
              >
                <Tag className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(material.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}