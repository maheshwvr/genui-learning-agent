'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MCQ, type MCQOption } from '@/lib/ai/lesson-schemas';

interface MCQComponentProps {
  mcq: MCQ;
  onAnswer?: (selectedOption: MCQOption, isCorrect: boolean) => void;
  className?: string;
  // New props for pre-filled state
  initialSelectedOptionId?: string | null;
  initialIsSubmitted?: boolean;
  initialShowExplanation?: boolean;
}

export function MCQComponent({ 
  mcq, 
  onAnswer, 
  className, 
  initialSelectedOptionId = null,
  initialIsSubmitted = false,
  initialShowExplanation = false
}: MCQComponentProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialSelectedOptionId);
  const [isSubmitted, setIsSubmitted] = useState(initialIsSubmitted);
  const [showExplanation, setShowExplanation] = useState(initialShowExplanation);

  const selectedOption = selectedOptionId 
    ? mcq.options.find(option => option.id === selectedOptionId)
    : null;

  const correctOption = mcq.options.find(option => option.isCorrect);

  // Types for markdown component props - made compatible with ReactMarkdown
  interface MarkdownComponentProps {
    children?: React.ReactNode;
  }

  interface LinkProps extends MarkdownComponentProps {
    href?: string;
  }

  // Custom markdown components for MCQ content
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
    const baseStyles = "w-full text-left p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md";
    
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
    <Card className={cn("my-2 max-w-2xl", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Quick Check: MCQ</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Grey topic box */}
            <div className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">Topic:</span>
              <span className="text-xs text-gray-800 font-bold ml-1">{mcq.topic}</span>
            </div>
            {/* Difficulty-colored box showing difficulty level */}
            <div className={cn(
              "px-2 py-0.5 rounded-md border",
              getDifficultyBoxStyles().bg,
              getDifficultyBoxStyles().border
            )}>
              <span className={cn("text-xs", getDifficultyBoxStyles().text)}>
                {mcq.difficulty}
              </span>
            </div>
          </div>
        </div>
        <div className="text-sm font-medium text-foreground mt-1">
          <ReactMarkdown components={markdownComponents}>
            {mcq.question}
          </ReactMarkdown>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {mcq.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            className={getOptionStyles(option)}
            disabled={isSubmitted}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">
                  {option.id.toUpperCase()}
                </span>
                <div className="text-sm">
                  <ReactMarkdown components={markdownComponents}>
                    {option.text}
                  </ReactMarkdown>
                </div>
              </div>
              {getOptionIcon(option)}
            </div>
          </button>
        ))}
        
        {!isSubmitted && (
          <div className="pt-2">
            <Button 
              onClick={handleSubmit}
              disabled={!selectedOptionId}
              className="w-full"
              size="sm"
            >
              Submit Answer
            </Button>
          </div>
        )}
        
        {showExplanation && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              {selectedOption?.isCorrect ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-semibold text-sm">
                {selectedOption?.isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
              {!selectedOption?.isCorrect && correctOption && (
                <span className="text-xs text-muted-foreground">
                  (Correct answer: {correctOption.id.toUpperCase()})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <ReactMarkdown components={markdownComponents}>
                {mcq.explanation}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
