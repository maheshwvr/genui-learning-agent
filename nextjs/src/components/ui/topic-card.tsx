'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

export interface TopicCardProps {
  id: string;
  name: string;
  materialCount: number;
  materials?: Array<{
    id: string;
    file_name: string;
    file_size: number;
    created_at: string;
  }>;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  isDragOver?: boolean;
}

export function TopicCard({
  id,
  name,
  materialCount,
  materials = [],
  onEdit,
  onDelete,
  className,
  isDragOver = false
}: TopicCardProps) {
  const [showMaterials, setShowMaterials] = useState(false);

  const { isOver, setNodeRef } = useDroppable({
    id: `topic-${id}`,
  });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "min-w-[256px] max-w-[288px] h-fit transition-all duration-200",
        "border border-border/40 hover:border-border/60 hover:shadow-md",
        (isOver || isDragOver) && "border-primary bg-primary/5 scale-105 shadow-lg border-2 border-primary/50",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle 
              className="text-sm font-medium cursor-pointer hover:text-primary transition-colors line-clamp-2" 
              onClick={() => setShowMaterials(!showMaterials)}
              title={name}
            >
              {name}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onEdit}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {materialCount} material{materialCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      {(isOver || isDragOver) && (
        <CardContent className="pt-0 pb-4">
          <div className="text-xs text-primary font-medium text-center py-2 px-3 bg-primary/10 rounded-md border border-primary/20">
            Drop material here
          </div>
        </CardContent>
      )}

      {showMaterials && materials.length > 0 && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md"
              >
                <FileIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs truncate flex-1" title={material.file_name}>
                  {material.file_name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {!showMaterials && !isOver && !isDragOver && materialCount === 0 && (
        <CardContent className="pt-0 pb-4">
          <div className="text-xs text-muted-foreground text-center py-2">
            Drag materials here
          </div>
        </CardContent>
      )}
    </Card>
  );
}