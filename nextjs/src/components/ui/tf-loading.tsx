'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TFLoadingProps {
  className?: string;
}

export function TFLoading({ className }: TFLoadingProps) {
  return (
    <Card className={cn("my-4 max-w-2xl border-2 border-dashed border-primary/30 bg-primary/5", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <HelpCircle className="w-6 h-6 text-primary animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-primary">True/False loading</span>
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
          Generating true/false statements for you...
        </p>
        
        {/* Optional decorative elements */}
        <div className="flex justify-center mt-4 gap-2">
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0.3s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0.6s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:0.9s]" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-ping [animation-delay:1.2s]" />
        </div>
      </CardContent>
    </Card>
  );
}