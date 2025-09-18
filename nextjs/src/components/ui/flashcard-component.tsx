'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FlashcardSet, type Flashcard } from '@/lib/ai/lesson-schemas';

interface FlashcardComponentProps {
  flashcardSet: FlashcardSet;
  onAnswer?: (flashcardId: string, performance: 'got-it' | 'on-track' | 'unclear') => void;
  onSave?: (flashcardId: string, shouldSave: boolean) => void;
  className?: string;
  lessonContext?: {
    courseId?: string;
    topicSelection?: string[];
  };
  // Props for pre-filled state
  initialCurrentIndex?: number;
  initialFlippedCards?: Set<string>;
  initialPerformance?: Record<string, 'got-it' | 'on-track' | 'unclear'>;
  initialSavedCards?: Set<string>;
  initialIsCompleted?: boolean;
}

export function FlashcardComponent({ 
  flashcardSet, 
  onAnswer,
  onSave,
  className,
  lessonContext,
  initialCurrentIndex = 0,
  initialFlippedCards = new Set(),
  initialPerformance = {},
  initialSavedCards = new Set(),
  initialIsCompleted = false
}: FlashcardComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(initialFlippedCards);
  const [performance, setPerformance] = useState<Record<string, 'got-it' | 'on-track' | 'unclear'>>(initialPerformance);
  const [savedCards, setSavedCards] = useState<Set<string>>(initialSavedCards);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);

  const currentFlashcard = flashcardSet.flashcards[currentIndex];
  const isFlipped = flippedCards.has(currentFlashcard.id);
  const currentPerformance = performance[currentFlashcard.id];
  const isSaved = savedCards.has(currentFlashcard.id);

  // Types for markdown component props
  interface MarkdownComponentProps {
    children?: React.ReactNode;
  }

  interface LinkProps extends MarkdownComponentProps {
    href?: string;
  }

  // Custom markdown components for flashcard content
  const markdownComponents = {
    h1: ({ children }: MarkdownComponentProps) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
    h2: ({ children }: MarkdownComponentProps) => <h2 className="text-sm font-semibold mt-2 mb-1">{children}</h2>,
    h3: ({ children }: MarkdownComponentProps) => <h3 className="text-sm font-medium mt-1 mb-1">{children}</h3>,
    p: ({ children }: MarkdownComponentProps) => <p className="text-sm mb-1 last:mb-0">{children}</p>,
    strong: ({ children }: MarkdownComponentProps) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: MarkdownComponentProps) => <em className="italic">{children}</em>,
    code: ({ children }: MarkdownComponentProps) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
    pre: ({ children }: MarkdownComponentProps) => <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto my-1">{children}</pre>,
    ul: ({ children }: MarkdownComponentProps) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
    ol: ({ children }: MarkdownComponentProps) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
    li: ({ children }: MarkdownComponentProps) => <li className="text-sm">{children}</li>,
    blockquote: ({ children }: MarkdownComponentProps) => <blockquote className="border-l-2 border-muted-foreground pl-2 italic my-1">{children}</blockquote>,
    a: ({ children, href }: LinkProps) => <a href={href} className="text-primary hover:underline text-sm">{children}</a>,
  };

  const handleFlip = () => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentFlashcard.id)) {
        newSet.delete(currentFlashcard.id);
      } else {
        newSet.add(currentFlashcard.id);
      }
      return newSet;
    });
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < flashcardSet.flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePerformance = (performanceLevel: 'got-it' | 'on-track' | 'unclear') => {
    setPerformance(prev => ({
      ...prev,
      [currentFlashcard.id]: performanceLevel
    }));

    if (onAnswer) {
      onAnswer(currentFlashcard.id, performanceLevel);
    }

    // Check if all cards have been reviewed
    const newPerformance = { ...performance, [currentFlashcard.id]: performanceLevel };
    const allReviewed = flashcardSet.flashcards.every(card => newPerformance.hasOwnProperty(card.id));
    
    if (allReviewed) {
      setIsCompleted(true);
    }
  };

  const handleSave = () => {
    const shouldSave = !isSaved;
    setSavedCards(prev => {
      const newSet = new Set(prev);
      if (shouldSave) {
        newSet.add(currentFlashcard.id);
      } else {
        newSet.delete(currentFlashcard.id);
      }
      return newSet;
    });

    if (onSave) {
      onSave(currentFlashcard.id, shouldSave);
    }
  };

  const getDifficultyBoxStyles = () => {
    switch (flashcardSet.difficulty) {
      case 'easy': 
        return {
          bg: 'bg-green-100',
          text: 'text-green-800 font-bold',
          border: 'border-green-200'
        };
      case 'medium': 
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800 font-bold',
          border: 'border-yellow-200'
        };
      case 'hard': 
        return {
          bg: 'bg-red-100',
          text: 'text-red-800 font-bold',
          border: 'border-red-200'
        };
      default: 
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800 font-bold',
          border: 'border-gray-200'
        };
    }
  };

  const getPerformanceButtonStyles = (level: 'got-it' | 'on-track' | 'unclear') => {
    const baseStyles = "flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all duration-200";
    const isSelected = currentPerformance === level;

    switch (level) {
      case 'got-it':
        return cn(
          baseStyles,
          isSelected 
            ? "bg-green-500 text-white shadow-md" 
            : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
        );
      case 'on-track':
        return cn(
          baseStyles,
          isSelected 
            ? "bg-orange-500 text-white shadow-md" 
            : "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300"
        );
      case 'unclear':
        return cn(
          baseStyles,
          isSelected 
            ? "bg-red-500 text-white shadow-md" 
            : "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
        );
    }
  };

  return (
    <Card className={cn("my-2 w-full max-w-4xl", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Quick Review: Flashcards</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Topic box */}
            <div className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">Topic:</span>
              <span className="text-xs text-gray-800 font-bold ml-1">{flashcardSet.topic}</span>
            </div>
            
            {/* Difficulty box */}
            <div className={cn(
              "px-2 py-0.5 rounded-md border",
              getDifficultyBoxStyles().bg,
              getDifficultyBoxStyles().border
            )}>
              <span className={cn("text-xs", getDifficultyBoxStyles().text)}>
                {flashcardSet.difficulty}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Flashcard */}
        <div className="relative">
          <div 
            className={cn(
              "relative w-full h-40 cursor-pointer rounded-lg border-2 border-primary/20 shadow-md transition-all duration-500 preserve-3d",
              isFlipped && "rotate-y-180"
            )}
            onClick={handleFlip}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front side - Concept */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-center p-4",
              "hover:bg-primary/10 transition-colors duration-200"
            )}>
              <div className="text-center">
                <div className="text-xs text-primary/60 font-medium mb-2">CONCEPT</div>
                <div className="text-base font-semibold text-foreground">
                  <ReactMarkdown components={markdownComponents}>
                    {currentFlashcard.concept}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Back side - Definition */}
            <div className={cn(
              "absolute inset-0 w-full h-full backface-hidden bg-muted/50 rounded-lg border border-muted flex items-center justify-center p-4 rotate-y-180"
            )}>
              <div className="text-center">
                <div className="text-xs text-muted-foreground font-medium mb-2">DEFINITION</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <ReactMarkdown components={markdownComponents}>
                    {currentFlashcard.definition}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
          
          {/* Click hint with navigation and save controls */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              Click card to {isFlipped ? 'show concept' : 'reveal definition'}
            </span>
            <div className="flex items-center gap-2">
              {/* Navigation controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigation('prev')}
                  disabled={currentIndex === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {currentIndex + 1} / {flashcardSet.flashcards.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigation('next')}
                  disabled={currentIndex === flashcardSet.flashcards.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
              
              {/* Save button */}
              <Button
                onClick={handleSave}
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1 text-xs",
                  isSaved ? "bg-blue-50 border-blue-200 text-blue-700" : ""
                )}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-3 h-3" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3 h-3" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Performance buttons - only show when flipped */}
        {isFlipped && (
          <div className="space-y-2">
            <div className="text-center">
              <span className="text-xs font-medium text-muted-foreground">How well do you know this?</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handlePerformance('got-it')}
                className={getPerformanceButtonStyles('got-it')}
                variant="outline"
              >
                Got it!
              </Button>
              <Button
                onClick={() => handlePerformance('on-track')}
                className={getPerformanceButtonStyles('on-track')}
                variant="outline"
              >
                On the right track
              </Button>
              <Button
                onClick={() => handlePerformance('unclear')}
                className={getPerformanceButtonStyles('unclear')}
                variant="outline"
              >
                Still unclear
              </Button>
            </div>
          </div>
        )}

        {/* Completion summary */}
        {isCompleted && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-sm font-medium text-blue-800 mb-1">
              Flashcard Review Complete!
            </div>
            <div className="text-xs text-blue-600">
              You've reviewed all {flashcardSet.flashcards.length} flashcards from "{flashcardSet.topic}".
            </div>
          </div>
        )}
      </CardContent>

      <style jsx>{`
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </Card>
  );
}