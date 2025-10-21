'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight, RotateCcw, Trash2, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SavedFlashcard } from '@/lib/supabase/flashcards';
import { MarkdownRenderer } from '@/lib/markdown-renderer';

interface FlashcardStudyModeProps {
  flashcards: SavedFlashcard[];
  isOpen: boolean;
  onClose: () => void;
  onFlashcardDelete: (flashcardId: string) => void;
  deleting?: Set<string>;
}

export function FlashcardStudyMode({
  flashcards,
  isOpen,
  onClose,
  onFlashcardDelete,
  deleting = new Set()
}: FlashcardStudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set());

  // Reset state when dialog opens/closes or flashcards change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setFlippedCards(new Set());
      setStudiedCards(new Set());
    }
  }, [isOpen, flashcards]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          flipCurrentCard();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, flashcards.length]);

  const currentFlashcard = flashcards[currentIndex];
  const isFlipped = currentFlashcard ? flippedCards.has(currentFlashcard.id) : false;
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  const flipCurrentCard = useCallback(() => {
    if (!currentFlashcard) return;
    
    const newFlippedCards = new Set(flippedCards);
    if (isFlipped) {
      newFlippedCards.delete(currentFlashcard.id);
    } else {
      newFlippedCards.add(currentFlashcard.id);
      // Mark as studied when flipped to definition
      setStudiedCards(prev => new Set(prev).add(currentFlashcard.id));
    }
    setFlippedCards(newFlippedCards);
  }, [currentFlashcard, isFlipped, flippedCards]);

  const goToNext = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, flashcards.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const resetProgress = () => {
    setCurrentIndex(0);
    setFlippedCards(new Set());
    setStudiedCards(new Set());
  };

  const handleDelete = () => {
    if (!currentFlashcard) return;
    
    onFlashcardDelete(currentFlashcard.id);
    
    // Adjust current index if needed
    if (currentIndex >= flashcards.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // If no flashcards, show empty state
  if (flashcards.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Study Flashcards</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No flashcards to study</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Study Flashcards
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{currentIndex + 1} of {flashcards.length}</span>
              <span>{studiedCards.size} studied</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Flashcard */}
          <div className="relative min-h-[300px]">
            <Card 
              className={cn(
                "w-full h-full cursor-pointer transition-all duration-300 transform-gpu",
                "hover:shadow-lg border-2",
                isFlipped ? "bg-muted/50" : "bg-background",
                studiedCards.has(currentFlashcard?.id || '') && "border-green-200"
              )}
              onClick={flipCurrentCard}
            >
              <CardContent className="p-6 h-full flex flex-col justify-center">
                <div className="text-center space-y-4">
                  {!isFlipped ? (
                    // Concept (front)
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground font-medium">
                        CONCEPT
                      </div>
                      <div className="text-lg font-semibold">
                        <MarkdownRenderer>{currentFlashcard?.concept || ''}</MarkdownRenderer>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Click to reveal definition
                      </div>
                    </div>
                  ) : (
                    // Definition (back)
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground font-medium">
                        DEFINITION
                      </div>
                      <div className="text-base">
                        <MarkdownRenderer>{currentFlashcard?.definition || ''}</MarkdownRenderer>
                      </div>
                      {currentFlashcard?.topic && (
                        <div className="flex justify-center">
                          <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground">
                            {currentFlashcard.topic}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={currentIndex === flashcards.length - 1}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={flipCurrentCard}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Flip
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetProgress}
                className="gap-2"
              >
                Reset
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting.has(currentFlashcard?.id || '')}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Keyboard shortcuts help */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <div>Use arrow keys to navigate • Space/Enter to flip • Escape to close</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}