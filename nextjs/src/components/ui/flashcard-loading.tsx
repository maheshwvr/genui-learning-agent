'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashcardLoadingProps {
  className?: string;
}

export function FlashcardLoading({ className }: FlashcardLoadingProps) {
  return (
    <Card className={cn("my-4 max-w-2xl border-2 border-dashed border-primary/30 bg-primary/5", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-primary animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-primary">Flashcards loading</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0s] [animation-duration:1.4s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:1.4s]" />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:1.4s]" />
            </div>
          </div>
        </div>
        
        {/* Animated progress bar */}
        <div className="w-full bg-primary/20 rounded-full h-2 mb-3 overflow-hidden">
          <div className="bg-primary h-2 rounded-full animate-pulse" style={{ 
            width: '70%',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
        </div>
        
        <p className="text-sm text-primary/80 text-center font-medium">
          Creating flashcards from your materials...
        </p>
        
        {/* Card flip animation preview */}
        <div className="flex justify-center mt-4 gap-3">
          <div className="relative w-8 h-6 perspective-1000">
            <div className="absolute inset-0 w-full h-full bg-primary/30 rounded-sm transform-gpu animate-flip-slow" 
                 style={{ 
                   transformStyle: 'preserve-3d',
                   animation: 'flip 2s ease-in-out infinite'
                 }} />
          </div>
          <div className="relative w-8 h-6 perspective-1000">
            <div className="absolute inset-0 w-full h-full bg-primary/30 rounded-sm transform-gpu animate-flip-slow" 
                 style={{ 
                   transformStyle: 'preserve-3d',
                   animation: 'flip 2s ease-in-out infinite 0.3s'
                 }} />
          </div>
          <div className="relative w-8 h-6 perspective-1000">
            <div className="absolute inset-0 w-full h-full bg-primary/30 rounded-sm transform-gpu animate-flip-slow" 
                 style={{ 
                   transformStyle: 'preserve-3d',
                   animation: 'flip 2s ease-in-out infinite 0.6s'
                 }} />
          </div>
        </div>
        
        {/* Optional decorative elements */}
        <div className="flex justify-center mt-4 gap-2">
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0.3s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0.6s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0.9s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:1.2s]" />
        </div>
      </CardContent>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        @keyframes flip {
          0%, 100% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(180deg);
          }
        }
      `}</style>
    </Card>
  );
}