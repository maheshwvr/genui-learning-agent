'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Play, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SavedFlashcard } from '@/lib/supabase/flashcards';
import { MarkdownRenderer } from '@/lib/markdown-renderer';

interface CourseFlashcardGroupProps {
  courseId: string | null;
  courseName: string;
  flashcards: SavedFlashcard[];
  onFlashcardDelete: (flashcardId: string) => void;
  onStudyMode: (flashcards: SavedFlashcard[]) => void;
  deleting?: Set<string>;
  className?: string;
}

export function CourseFlashcardGroup({
  courseId,
  courseName,
  flashcards,
  onFlashcardDelete,
  onStudyMode,
  deleting = new Set(),
  className = ''
}: CourseFlashcardGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const previewFlashcards = flashcards.slice(0, 3);
  const hasMoreFlashcards = flashcards.length > 3;

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2",
        "hover:border-primary/20",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Animated background gradient */}
      {isHovered && (
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary)), transparent 40%)`,
          }}
        />
      )}

      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{courseName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''}
                </span>
                {courseId && (
                  <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground">
                    Course
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onStudyMode(flashcards)}
              className="gap-2"
              size="sm"
            >
              <Play className="h-4 w-4" />
              Study All
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Preview flashcards (always shown) */}
        <div className="space-y-3">
          {previewFlashcards.map((flashcard) => (
            <div
              key={flashcard.id}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border transition-colors hover:bg-muted/80"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-1 line-clamp-1">
                  <MarkdownRenderer className="inline">{flashcard.concept}</MarkdownRenderer>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  <MarkdownRenderer className="inline">{flashcard.definition}</MarkdownRenderer>
                </div>
                {flashcard.topic && (
                  <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground mt-2">
                    {flashcard.topic}
                  </span>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFlashcardDelete(flashcard.id)}
                disabled={deleting.has(flashcard.id)}
                className="ml-2 p-1 h-auto text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Show more indicator */}
        {hasMoreFlashcards && !isExpanded && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-xs text-muted-foreground"
            >
              +{flashcards.length - 3} more flashcards
            </Button>
          </div>
        )}

        {/* Expanded flashcards */}
        {isExpanded && hasMoreFlashcards && (
          <div className="space-y-3 border-t pt-4">
            {flashcards.slice(3).map((flashcard) => (
              <div
                key={flashcard.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border transition-colors hover:bg-muted/80"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1 line-clamp-1">
                    <MarkdownRenderer className="inline">{flashcard.concept}</MarkdownRenderer>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    <MarkdownRenderer className="inline">{flashcard.definition}</MarkdownRenderer>
                  </div>
                  {flashcard.topic && (
                    <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground mt-2">
                      {flashcard.topic}
                    </span>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFlashcardDelete(flashcard.id)}
                  disabled={deleting.has(flashcard.id)}
                  className="ml-2 p-1 h-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state (shouldn't happen since we only render groups with flashcards) */}
        {flashcards.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No flashcards in this course
          </div>
        )}
      </CardContent>
    </Card>
  );
}