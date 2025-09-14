'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MCQ, type MCQOption } from '@/lib/ai/lesson-schemas';

interface MCQComponentProps {
  mcq: MCQ;
  onAnswer?: (selectedOption: MCQOption, isCorrect: boolean) => void;
  className?: string;
}

export function MCQComponent({ mcq, onAnswer, className }: MCQComponentProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const selectedOption = selectedOptionId 
    ? mcq.options.find(option => option.id === selectedOptionId)
    : null;

  const correctOption = mcq.options.find(option => option.isCorrect);

  const handleOptionSelect = (optionId: string) => {
    if (isSubmitted) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption || isSubmitted) return;
    
    setIsSubmitted(true);
    setShowExplanation(true);
    
    if (onAnswer) {
      onAnswer(selectedOption, selectedOption.isCorrect);
    }
  };

  const getOptionStyles = (option: MCQOption) => {
    const baseStyles = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md";
    
    if (!isSubmitted) {
      return cn(
        baseStyles,
        selectedOptionId === option.id
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border hover:border-primary/50",
        "cursor-pointer"
      );
    }

    // After submission - show correct/incorrect states
    if (option.isCorrect) {
      return cn(baseStyles, "border-green-500 bg-green-50 text-green-800 cursor-default");
    }
    
    if (selectedOptionId === option.id && !option.isCorrect) {
      return cn(baseStyles, "border-red-500 bg-red-50 text-red-800 cursor-default");
    }
    
    return cn(baseStyles, "border-border bg-muted/30 text-muted-foreground cursor-default");
  };

  const getOptionIcon = (option: MCQOption) => {
    if (!isSubmitted) return null;
    
    if (option.isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    
    if (selectedOptionId === option.id && !option.isCorrect) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    
    return null;
  };

  const getDifficultyBoxStyles = () => {
    switch (mcq.difficulty) {
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

  return (
    <Card className={cn("my-4 max-w-2xl", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Quick Check</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {/* Grey topic box */}
            <div className="px-3 py-1 rounded-md bg-gray-100 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">Topic:</span>
              <span className="text-sm text-gray-800 font-bold ml-1">{mcq.topic}</span>
            </div>
            {/* Difficulty-colored box showing difficulty level */}
            <div className={cn(
              "px-3 py-1 rounded-md border",
              getDifficultyBoxStyles().bg,
              getDifficultyBoxStyles().border
            )}>
              <span className={cn("text-sm", getDifficultyBoxStyles().text)}>
                {mcq.difficulty}
              </span>
            </div>
          </div>
        </div>
        <CardDescription className="text-base font-medium text-foreground mt-2">
          {mcq.question}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {mcq.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            className={getOptionStyles(option)}
            disabled={isSubmitted}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm">
                  {option.id.toUpperCase()}
                </span>
                <span className="text-sm">{option.text}</span>
              </div>
              {getOptionIcon(option)}
            </div>
          </button>
        ))}
        
        {!isSubmitted && (
          <div className="pt-4">
            <Button 
              onClick={handleSubmit}
              disabled={!selectedOptionId}
              className="w-full"
              size="lg"
            >
              Submit Answer
            </Button>
          </div>
        )}
        
        {showExplanation && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              {selectedOption?.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold">
                {selectedOption?.isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
              {!selectedOption?.isCorrect && correctOption && (
                <span className="text-sm text-muted-foreground">
                  (Correct answer: {correctOption.id.toUpperCase()})
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {mcq.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
