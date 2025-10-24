'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Trash2 } from 'lucide-react';
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

  // Get up to 4 flashcards for the stack
  const stackFlashcards = flashcards.slice(0, 4);
  const totalCards = flashcards.length;

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
          <div>
            <CardTitle className="text-lg">{courseName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                {totalCards} flashcard{totalCards !== 1 ? 's' : ''}
              </span>
              {courseId && (
                <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground">
                  Course
                </span>
              )}
            </div>
          </div>
          
          <Button
            onClick={() => onStudyMode(flashcards)}
            className="gap-2"
            size="sm"
          >
            <Play className="h-4 w-4" />
            Study All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-2">
        {/* Stacked Flashcard Design */}
        <div className="relative h-64">
          {stackFlashcards.map((flashcard, index) => {
            const isTopCard = index === 0;
            const zIndex = stackFlashcards.length - index;
            const translateY = index * 6; // 6px offset per layer
            const scale = 1 - (index * 0.02); // Slightly smaller for cards behind
            const opacity = isTopCard ? 1 : 0.85;
            
            return (
              <div
                key={flashcard.id}
                className={cn(
                  "absolute left-1 right-1 rounded-lg border bg-background transition-all duration-200",
                  isTopCard ? "shadow-lg border-2 p-4" : "shadow-sm p-3"
                )}
                style={{
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  zIndex,
                  opacity
                }}
              >
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="font-semibold text-sm mb-2 line-clamp-3">
                      <MarkdownRenderer className="inline">{flashcard.concept}</MarkdownRenderer>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-4">
                      <MarkdownRenderer className="inline">{flashcard.definition}</MarkdownRenderer>
                    </div>
                    {flashcard.topic && (
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground mt-2">
                        {flashcard.topic}
                      </span>
                    )}
                  </div>
                  
                  {isTopCard && (
                    <div className="flex items-center justify-end mt-3">
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
                  )}
                </div>
              </div>
            );
          })}

          {/* placeholders to indicate capacity up to 4 when fewer cards exist */}
          {stackFlashcards.length < 4 && Array.from({ length: 4 - stackFlashcards.length }).map((_, i) => {
            const placeholderIndex = stackFlashcards.length + i;
            const translateY = placeholderIndex * 6;
            return (
              <div
                key={`placeholder-${i}`}
                className="absolute left-2 right-2 rounded-lg border border-dashed border-muted bg-muted/10 h-8"
                style={{ transform: `translateY(${translateY}px)` }}
              />
            );
          })}
        </div>
        
        {/* Stack indicator for more than 4 cards */}
        {totalCards > 4 && (
          <div className="text-center mt-4">
            <span className="text-xs text-muted-foreground">
              +{totalCards - 4} more cards
            </span>
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