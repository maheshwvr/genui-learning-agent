"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ 
  text = "Loading...", 
  size = 'md',
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-4 py-8",
      className
    )}>
      <div 
        className={cn(
          "animate-spin rounded-full border-b-2 border-primary-600",
          sizeClasses[size]
        )}
        aria-label="Loading"
      />
      <p className={cn(
        "text-muted-foreground font-normal",
        textSizeClasses[size]
      )}>
        {text}
      </p>
    </div>
  );
}