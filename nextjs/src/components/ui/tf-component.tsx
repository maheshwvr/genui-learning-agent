'use client';

import React, { useState } from 'react';
import { MarkdownRenderer } from '@/lib/markdown-renderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TF, type TFStatement } from '@/lib/ai/lesson-schemas';

interface TFComponentProps {
  tf: TF;
  onAnswer?: (results: { statementId: string; isCorrect: boolean }[]) => void;
  className?: string;
  // New props for pre-filled state
  initialSelectedAnswers?: Record<string, boolean>;
  initialIsSubmitted?: boolean;
  initialShowExplanation?: boolean;
}

export function TFComponent({ 
  tf, 
  onAnswer, 
  className,
  initialSelectedAnswers = {},
  initialIsSubmitted = false,
  initialShowExplanation = false
}: TFComponentProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, boolean>>(initialSelectedAnswers);
  const [isSubmitted, setIsSubmitted] = useState(initialIsSubmitted);
  const [showExplanation, setShowExplanation] = useState(initialShowExplanation);

  // Check if all statements have been answered
  const allAnswered = tf.statements.every(statement => 
    selectedAnswers.hasOwnProperty(statement.id)
  );



  const handleAnswerSelect = (statementId: string, isTrue: boolean) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [statementId]: isTrue
    }));
  };

  const handleSubmit = () => {
    if (!allAnswered || isSubmitted) return;
    
    setIsSubmitted(true);
    setShowExplanation(true);
    
    if (onAnswer) {
      const results = tf.statements.map(statement => ({
        statementId: statement.id,
        isCorrect: selectedAnswers[statement.id] === statement.isTrue
      }));
      onAnswer(results);
    }
  };

  const getStatementStyles = (statement: TFStatement) => {
    const baseStyles = "w-full text-left p-3 rounded-lg border-2 transition-all duration-200";
    
    if (!isSubmitted) {
      return cn(
        baseStyles,
        selectedAnswers.hasOwnProperty(statement.id)
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border hover:border-primary/50",
        "cursor-pointer"
      );
    }

    // After submission - show correct/incorrect states
    const userAnswer = selectedAnswers[statement.id];
    const isCorrect = userAnswer === statement.isTrue;
    
    if (isCorrect) {
      return cn(baseStyles, "border-green-500 bg-green-50 text-green-800 cursor-default");
    } else {
      return cn(baseStyles, "border-red-500 bg-red-50 text-red-800 cursor-default");
    }
  };

  const getStatementIcon = (statement: TFStatement) => {
    if (!isSubmitted) return null;
    
    const userAnswer = selectedAnswers[statement.id];
    const isCorrect = userAnswer === statement.isTrue;
    
    if (isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getButtonStyles = (statementId: string, isTrue: boolean) => {
    const baseStyles = "px-3 py-1 rounded text-sm font-medium transition-all duration-200";
    const isSelected = selectedAnswers[statementId] === isTrue;
    
    if (!isSubmitted) {
      if (isSelected) {
        return cn(baseStyles, "bg-primary text-primary-foreground");
      } else {
        return cn(baseStyles, "bg-muted hover:bg-muted/80 text-muted-foreground");
      }
    }
    
    // After submission, show correct answer
    const statement = tf.statements.find(s => s.id === statementId);
    if (!statement) return baseStyles;
    
    const isCorrectAnswer = statement.isTrue === isTrue;
    const userSelected = selectedAnswers[statementId] === isTrue;
    
    if (isCorrectAnswer) {
      return cn(baseStyles, "bg-green-500 text-white");
    } else if (userSelected) {
      return cn(baseStyles, "bg-red-500 text-white");
    } else {
      return cn(baseStyles, "bg-muted text-muted-foreground");
    }
  };

  const getDifficultyBoxStyles = () => {
    switch (tf.difficulty) {
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

  const getOverallScore = () => {
    const correctCount = tf.statements.filter(statement => 
      selectedAnswers[statement.id] === statement.isTrue
    ).length;
    return { correct: correctCount, total: tf.statements.length };
  };

  return (
    <Card className={cn("my-2 max-w-2xl", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Quick Check: True/False</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Grey topic box */}
            <div className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">Topic:</span>
              <span className="text-xs text-gray-800 font-bold ml-1">{tf.topic}</span>
            </div>
            {/* Difficulty-colored box showing difficulty level */}
            <div className={cn(
              "px-2 py-0.5 rounded-md border",
              getDifficultyBoxStyles().bg,
              getDifficultyBoxStyles().border
            )}>
              <span className={cn("text-xs", getDifficultyBoxStyles().text)}>
                {tf.difficulty}
              </span>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Determine whether each statement is true or false
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {tf.statements.map((statement) => (
          <div key={statement.id} className={getStatementStyles(statement)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2 flex-1">
                <span className="font-semibold text-sm w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs mt-0.5">
                  {statement.id}
                </span>
                <div className="text-sm flex-1">
                  <MarkdownRenderer variant="lesson">
                    {statement.text}
                  </MarkdownRenderer>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAnswerSelect(statement.id, true)}
                    disabled={isSubmitted}
                    className={getButtonStyles(statement.id, true)}
                  >
                    True
                  </button>
                  <button
                    onClick={() => handleAnswerSelect(statement.id, false)}
                    disabled={isSubmitted}
                    className={getButtonStyles(statement.id, false)}
                  >
                    False
                  </button>
                </div>
                {getStatementIcon(statement)}
              </div>
            </div>
            
            {isSubmitted && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">
                    Correct answer: {statement.isTrue ? 'True' : 'False'}
                  </span>
                  <div className="mt-1">
                    <MarkdownRenderer variant="lesson">
                      {statement.explanation}
                    </MarkdownRenderer>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {!isSubmitted && (
          <div className="pt-2">
            <Button 
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="w-full"
              size="sm"
            >
              Submit All Answers
            </Button>
          </div>
        )}
        
        {showExplanation && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const score = getOverallScore();
                const isFullScore = score.correct === score.total;
                return (
                  <>
                    {isFullScore ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-orange-600" />
                    )}
                    <span className="font-semibold text-sm">
                      Score: {score.correct}/{score.total}
                      {isFullScore ? ' - Perfect!' : ''}
                    </span>
                  </>
                );
              })()}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <MarkdownRenderer variant="lesson">
                {tf.overallExplanation}
              </MarkdownRenderer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}