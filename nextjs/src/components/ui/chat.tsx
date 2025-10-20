'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScrollToBottomButton } from '@/components/ui/scroll-to-bottom-button'
import { Send } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { type Message } from 'ai'
import { MarkdownRenderer } from '@/lib/markdown-renderer'
import iconGrey from '@/app/icon_grey.png'
import darkIcon from '@/app/icon.png'
import userIcon from '@/app/user.png'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'
import { MCQComponent } from '@/components/ui/mcq-component'
import { MCQLoading } from '@/components/ui/mcq-loading'
import { TFComponent } from '@/components/ui/tf-component'
import { TFLoading } from '@/components/ui/tf-loading'
import { FlashcardComponent } from '@/components/ui/flashcard-component'
import { FlashcardLoading } from '@/components/ui/flashcard-loading'
import { type MCQ, type TF, type FlashcardSet, type MCQOption } from '@/lib/ai/lesson-schemas'
import { type ChatMessage } from '@/lib/types'

interface ChatProps {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isGenerating?: boolean
  stop?: () => void
  append?: (message: { role: 'user' | 'assistant'; content: string }) => void
  updateMessage?: (messageId: string, updates: Partial<Message>) => void
}

// Type definitions for tool invocations
interface CustomToolInvocation {
  toolName: string
  result?: string | { type: string; data: unknown }
}

interface CustomToolCall {
  toolName: string
  result?: string | { type: string; data: unknown }
}

// Helper function to safely parse JSON with error handling
function safeJSONParse(jsonString: string): unknown {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }
  
  // Check if string looks like JSON (starts with { or [)
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  
  // Don't try to parse if the JSON looks incomplete (common during streaming)
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    return null;
  }
  
  try {
    return JSON.parse(trimmed);
  } catch {
    // Silently return null for parsing errors during streaming
    return null;
  }
}

// Helper function to validate MCQ structure
function validateMCQ(obj: unknown): obj is MCQ {
  return obj !== null && 
    typeof obj === 'object' &&
    obj !== undefined &&
    'question' in obj &&
    typeof (obj as Record<string, unknown>).question === 'string' && 
    'options' in obj &&
    Array.isArray((obj as Record<string, unknown>).options) && 
    (obj as Record<string, unknown[]>).options.length === 4 &&
    (obj as Record<string, unknown[]>).options.every((opt: unknown) => 
      opt !== null && 
      typeof opt === 'object' &&
      opt !== undefined &&
      'id' in opt &&
      'text' in opt &&
      'isCorrect' in opt &&
      typeof (opt as Record<string, unknown>).id === 'string' && 
      typeof (opt as Record<string, unknown>).text === 'string' && 
      typeof (opt as Record<string, unknown>).isCorrect === 'boolean'
    );
}

// Helper function to validate TF structure
function validateTF(obj: unknown): obj is TF {
  return obj !== null && 
    typeof obj === 'object' &&
    obj !== undefined &&
    'topic' in obj &&
    typeof (obj as Record<string, unknown>).topic === 'string' && 
    'statements' in obj &&
    Array.isArray((obj as Record<string, unknown>).statements) && 
    (obj as Record<string, unknown[]>).statements.length === 3 &&
    (obj as Record<string, unknown[]>).statements.every((stmt: unknown) => 
      stmt !== null && 
      typeof stmt === 'object' &&
      stmt !== undefined &&
      'id' in stmt &&
      'text' in stmt &&
      'isTrue' in stmt &&
      'explanation' in stmt &&
      typeof (stmt as Record<string, unknown>).id === 'string' && 
      typeof (stmt as Record<string, unknown>).text === 'string' && 
      typeof (stmt as Record<string, unknown>).isTrue === 'boolean' &&
      typeof (stmt as Record<string, unknown>).explanation === 'string'
    );
}

// Helper function to validate FlashcardSet structure
function validateFlashcardSet(obj: unknown): obj is FlashcardSet {
  return obj !== null && 
    typeof obj === 'object' &&
    obj !== undefined &&
    'topic' in obj &&
    typeof (obj as Record<string, unknown>).topic === 'string' && 
    'flashcards' in obj &&
    Array.isArray((obj as Record<string, unknown>).flashcards) && 
    (obj as Record<string, unknown[]>).flashcards.length === 3 &&
    (obj as Record<string, unknown[]>).flashcards.every((card: unknown) => 
      card !== null && 
      typeof card === 'object' &&
      card !== undefined &&
      'id' in card &&
      'concept' in card &&
      'definition' in card &&
      'topic' in card &&
      'difficulty' in card &&
      typeof (card as Record<string, unknown>).id === 'string' && 
      typeof (card as Record<string, unknown>).concept === 'string' && 
      typeof (card as Record<string, unknown>).definition === 'string' &&
      typeof (card as Record<string, unknown>).topic === 'string' &&
      typeof (card as Record<string, unknown>).difficulty === 'string'
    );
}

// Helper function to detect if message content contains TF data
function parseTFFromContent(content: string): TF | null {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  try {
    // Look for TF marker format (only if complete)
    const tfMarkerMatch = content.match(/TF_DATA_START([\s\S]+?)TF_DATA_END/);
    if (tfMarkerMatch && tfMarkerMatch[1]) {
      const tfData = safeJSONParse(tfMarkerMatch[1].trim());
      if (tfData && validateTF(tfData)) {
        return tfData as TF;
      }
    }
    
    // Only attempt to parse other JSON formats if they look complete
    // Look for JSON string that contains TF data (legacy format)
    const jsonStringMatch = content.match(/\{\"type\":\"tf\",\"data\":\{[\s\S]*?\}\}/);
    if (jsonStringMatch && jsonStringMatch[0] && jsonStringMatch[0].endsWith('}}')) {
      const toolResult = safeJSONParse(jsonStringMatch[0]) as { type?: string; data?: unknown } | null;
      if (toolResult && toolResult.type === 'tf' && validateTF(toolResult.data)) {
        return toolResult.data as TF;
      }
    }
    
    // Look for tool call results in the content (legacy format)
    const toolCallMatch = content.match(/\{"type":"tf","data":\{[\s\S]*?\}\}/);
    if (toolCallMatch && toolCallMatch[0] && toolCallMatch[0].endsWith('}}')) {
      const toolResult = safeJSONParse(toolCallMatch[0]) as { type?: string; data?: unknown } | null;
      if (toolResult && toolResult.type === 'tf' && validateTF(toolResult.data)) {
        return toolResult.data as TF;
      }
    }

    // Also look for direct TF JSON structure (only if complete)
    const tfMatch = content.match(/\{[^}]*"topic"[^}]*"statements"[^}]*\}/);
    if (tfMatch && tfMatch[0] && tfMatch[0].endsWith('}')) {
      const tfData = safeJSONParse(tfMatch[0]);
      if (tfData && validateTF(tfData)) {
        return tfData as TF;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Helper function to detect if message content contains MCQ data
function parseMCQFromContent(content: string): MCQ | null {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  try {
    // Look for MCQ marker format (only if complete)
    const mcqMarkerMatch = content.match(/MCQ_DATA_START([\s\S]+?)MCQ_DATA_END/);
    if (mcqMarkerMatch && mcqMarkerMatch[1]) {
      const mcqData = safeJSONParse(mcqMarkerMatch[1].trim());
      if (mcqData && validateMCQ(mcqData)) {
        return mcqData as MCQ;
      }
    }
    
    // Only attempt to parse other JSON formats if they look complete
    // Look for JSON string that contains MCQ data (legacy format)
    const jsonStringMatch = content.match(/\{\"type\":\"mcq\",\"data\":\{[\s\S]*?\}\}/);
    if (jsonStringMatch && jsonStringMatch[0] && jsonStringMatch[0].endsWith('}}')) {
      const toolResult = safeJSONParse(jsonStringMatch[0]) as { type?: string; data?: unknown } | null;
      if (toolResult && toolResult.type === 'mcq' && validateMCQ(toolResult.data)) {
        return toolResult.data as MCQ;
      }
    }
    
    // Look for tool call results in the content (legacy format)
    const toolCallMatch = content.match(/\{"type":"mcq","data":\{[\s\S]*?\}\}/);
    if (toolCallMatch && toolCallMatch[0] && toolCallMatch[0].endsWith('}}')) {
      const toolResult = safeJSONParse(toolCallMatch[0]) as { type?: string; data?: unknown } | null;
      if (toolResult && toolResult.type === 'mcq' && validateMCQ(toolResult.data)) {
        return toolResult.data as MCQ;
      }
    }

    // Also look for direct MCQ JSON structure (only if complete)
    const mcqMatch = content.match(/\{[^}]*"question"[^}]*"options"[^}]*\}/);
    if (mcqMatch && mcqMatch[0] && mcqMatch[0].endsWith('}')) {
      const mcqData = safeJSONParse(mcqMatch[0]);
      if (mcqData && validateMCQ(mcqData)) {
        return mcqData as MCQ;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Helper function to extract MCQ from message object (including toolInvocations)
function extractMCQFromMessage(message: Message): MCQ | null {
  if (!message) {
    return null;
  }
  
  try {
    // Check assessment metadata first (for persisted MCQs)
    if ('assessment' in message && message.assessment) {
      const assessment = (message as ChatMessage).assessment;
      if (assessment && assessment.type === 'mcq' && assessment.data) {
        return assessment.data as MCQ;
      }
    }
    
    // Check message content second
    const contentMCQ = parseMCQFromContent(message.content || '');
    if (contentMCQ) return contentMCQ;
    
    // Check for toolInvocations property (AI SDK tool call format)
    if ('toolInvocations' in message && Array.isArray((message as unknown as Record<string, unknown>).toolInvocations)) {
      const toolInvocations = (message as unknown as Record<string, unknown>).toolInvocations as CustomToolInvocation[];
      for (const invocation of toolInvocations) {
        if (invocation && invocation.toolName === 'generateMCQ' && 'result' in invocation && invocation.result) {
          if (typeof invocation.result === 'string') {
            // Only attempt JSON parsing if the string looks like JSON
            const trimmed = invocation.result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = safeJSONParse(trimmed);
              if (parsed && validateMCQ(parsed)) {
                return parsed as MCQ;
              }
            }
            // If it's a plain text response, it might contain MCQ markers
            const mcqFromText = parseMCQFromContent(invocation.result);
            if (mcqFromText) {
              return mcqFromText;
            }
          } else if (invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'mcq' && 'data' in invocation.result && validateMCQ(invocation.result.data)) {
            return invocation.result.data as MCQ;
          }
        }
      }
    }
    
    // Check for experimental_toolCalls property (alternative format)
    if ('experimental_toolCalls' in message && Array.isArray((message as unknown as Record<string, unknown>).experimental_toolCalls)) {
      const toolCalls = (message as unknown as Record<string, unknown>).experimental_toolCalls as CustomToolCall[];
      for (const toolCall of toolCalls) {
        if (toolCall && toolCall.toolName === 'generateMCQ' && 'result' in toolCall && toolCall.result) {
          if (typeof toolCall.result === 'string') {
            // Only attempt JSON parsing if the string looks like JSON
            const trimmed = toolCall.result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = safeJSONParse(trimmed);
              if (parsed && validateMCQ(parsed)) {
                return parsed as MCQ;
              }
            }
            // If it's a plain text response, it might contain MCQ markers
            const mcqFromText = parseMCQFromContent(toolCall.result);
            if (mcqFromText) {
              return mcqFromText;
            }
          } else if (toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'mcq' && 'data' in toolCall.result && validateMCQ(toolCall.result.data)) {
            return toolCall.result.data as MCQ;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting MCQ from message:', error);
    return null;
  }
}

// Helper function to extract TF from message object (including toolInvocations)
function extractTFFromMessage(message: Message): TF | null {
  if (!message) {
    return null;
  }
  
  try {
    // Check assessment metadata first (for persisted TFs)
    if ('assessment' in message && message.assessment) {
      const assessment = (message as ChatMessage).assessment;
      if (assessment && assessment.type === 'tf' && assessment.data) {
        return assessment.data as TF;
      }
    }
    
    // Check message content second
    const contentTF = parseTFFromContent(message.content || '');
    if (contentTF) return contentTF;
    
    // Check for toolInvocations property (AI SDK tool call format)
    if ('toolInvocations' in message && Array.isArray((message as unknown as Record<string, unknown>).toolInvocations)) {
      const toolInvocations = (message as unknown as Record<string, unknown>).toolInvocations as CustomToolInvocation[];
      for (const invocation of toolInvocations) {
        if (invocation && invocation.toolName === 'generateTF' && 'result' in invocation && invocation.result) {
          if (typeof invocation.result === 'string') {
            // Only attempt JSON parsing if the string looks like JSON
            const trimmed = invocation.result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = safeJSONParse(trimmed);
              if (parsed && validateTF(parsed)) {
                return parsed as TF;
              }
            }
            // If it's a plain text response, it might contain TF markers
            const tfFromText = parseTFFromContent(invocation.result);
            if (tfFromText) {
              return tfFromText;
            }
          } else if (invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'tf' && 'data' in invocation.result && validateTF(invocation.result.data)) {
            return invocation.result.data as TF;
          }
        }
      }
    }
    
    // Check for experimental_toolCalls property (alternative format)
    if ('experimental_toolCalls' in message && Array.isArray((message as unknown as Record<string, unknown>).experimental_toolCalls)) {
      const toolCalls = (message as unknown as Record<string, unknown>).experimental_toolCalls as CustomToolCall[];
      for (const toolCall of toolCalls) {
        if (toolCall && toolCall.toolName === 'generateTF' && 'result' in toolCall && toolCall.result) {
          if (typeof toolCall.result === 'string') {
            // Only attempt JSON parsing if the string looks like JSON
            const trimmed = toolCall.result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = safeJSONParse(trimmed);
              if (parsed && validateTF(parsed)) {
                return parsed as TF;
              }
            }
            // If it's a plain text response, it might contain TF markers
            const tfFromText = parseTFFromContent(toolCall.result);
            if (tfFromText) {
              return tfFromText;
            }
          } else if (toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'tf' && 'data' in toolCall.result && validateTF(toolCall.result.data)) {
            return toolCall.result.data as TF;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting TF from message:', error);
    return null;
  }
}

// Helper function to detect if message content contains Flashcard data
function parseFlashcardsFromContent(content: string): FlashcardSet | null {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  try {
    // Look for Flashcards marker format (only if complete)
    const flashcardsMarkerMatch = content.match(/FLASHCARDS_DATA_START([\s\S]+?)FLASHCARDS_DATA_END/);
    if (flashcardsMarkerMatch && flashcardsMarkerMatch[1]) {
      const flashcardsData = safeJSONParse(flashcardsMarkerMatch[1].trim());
      if (flashcardsData && validateFlashcardSet(flashcardsData)) {
        return flashcardsData as FlashcardSet;
      }
    }
    
    // Only attempt to parse other JSON formats if they look complete
    // Look for JSON string that contains Flashcards data (legacy format)
    const jsonStringMatch = content.match(/\{\"type\":\"flashcards\",\"data\":\{[\s\S]*?\}\}/);
    if (jsonStringMatch && jsonStringMatch[0] && jsonStringMatch[0].endsWith('}}')) {
      const toolResult = safeJSONParse(jsonStringMatch[0]) as { type?: string; data?: unknown } | null;
      if (toolResult && toolResult.type === 'flashcards' && validateFlashcardSet(toolResult.data)) {
        return toolResult.data as FlashcardSet;
      }
    }
    
    // Look for tool call results in the content (legacy format)
    const toolCallMatch = content.match(/\{"type":"flashcards","data":\{[\s\S]*?\}\}/);
    if (toolCallMatch && toolCallMatch[0] && toolCallMatch[0].endsWith('}}')) {
      const toolResult = safeJSONParse(toolCallMatch[0]) as { type?: string; data?: unknown } | null;
      if (toolResult && toolResult.type === 'flashcards' && validateFlashcardSet(toolResult.data)) {
        return toolResult.data as FlashcardSet;
      }
    }

    // Also look for direct FlashcardSet JSON structure (only if complete)
    const flashcardsMatch = content.match(/\{[^}]*"topic"[^}]*"flashcards"[^}]*\}/);
    if (flashcardsMatch && flashcardsMatch[0] && flashcardsMatch[0].endsWith('}')) {
      const flashcardsData = safeJSONParse(flashcardsMatch[0]);
      if (flashcardsData && validateFlashcardSet(flashcardsData)) {
        return flashcardsData as FlashcardSet;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Helper function to extract FlashcardSet from message object (including toolInvocations)
function extractFlashcardsFromMessage(message: Message): FlashcardSet | null {
  if (!message) {
    return null;
  }
  
  try {
    // Check assessment metadata first (for persisted flashcards)
    if ('assessment' in message && message.assessment) {
      const assessment = (message as ChatMessage).assessment;
      if (assessment && assessment.type === 'flashcards' && assessment.data) {
        return assessment.data as FlashcardSet;
      }
    }
    
    // Check message content second
    const contentFlashcards = parseFlashcardsFromContent(message.content || '');
    if (contentFlashcards) return contentFlashcards;
    
    // Check for toolInvocations property (AI SDK tool call format)
    if ('toolInvocations' in message && Array.isArray((message as unknown as Record<string, unknown>).toolInvocations)) {
      const toolInvocations = (message as unknown as Record<string, unknown>).toolInvocations as CustomToolInvocation[];
      for (const invocation of toolInvocations) {
        if (invocation && invocation.toolName === 'generateFlashcards' && 'result' in invocation && invocation.result) {
          if (typeof invocation.result === 'string') {
            // Only attempt JSON parsing if the string looks like JSON
            const trimmed = invocation.result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = safeJSONParse(trimmed);
              if (parsed && validateFlashcardSet(parsed)) {
                return parsed as FlashcardSet;
              }
            }
            // If it's a plain text response, it might contain flashcards markers
            const flashcardsFromText = parseFlashcardsFromContent(invocation.result);
            if (flashcardsFromText) {
              return flashcardsFromText;
            }
          } else if (invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'flashcards' && 'data' in invocation.result && validateFlashcardSet(invocation.result.data)) {
            return invocation.result.data as FlashcardSet;
          }
        }
      }
    }
    
    // Check for experimental_toolCalls property (alternative format)
    if ('experimental_toolCalls' in message && Array.isArray((message as unknown as Record<string, unknown>).experimental_toolCalls)) {
      const toolCalls = (message as unknown as Record<string, unknown>).experimental_toolCalls as CustomToolCall[];
      for (const toolCall of toolCalls) {
        if (toolCall && toolCall.toolName === 'generateFlashcards' && 'result' in toolCall && toolCall.result) {
          if (typeof toolCall.result === 'string') {
            // Only attempt JSON parsing if the string looks like JSON
            const trimmed = toolCall.result.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              const parsed = safeJSONParse(trimmed);
              if (parsed && validateFlashcardSet(parsed)) {
                return parsed as FlashcardSet;
              }
            }
            // If it's a plain text response, it might contain flashcards markers
            const flashcardsFromText = parseFlashcardsFromContent(toolCall.result);
            if (flashcardsFromText) {
              return flashcardsFromText;
            }
          } else if (toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'flashcards' && 'data' in toolCall.result && validateFlashcardSet(toolCall.result.data)) {
            return toolCall.result.data as FlashcardSet;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting flashcards from message:', error);
    return null;
  }
}

// Function to generate silent summary message for MCQ results
function generateMCQSummary(mcq: MCQ, selectedOption: MCQOption, isCorrect: boolean): string {
  const correctOption = mcq.options.find(opt => opt.isCorrect);
  const selectedText = selectedOption?.text || 'Unknown';
  const correctText = correctOption?.text || 'Unknown';
  
  return `SILENT_SUMMARY: User completed MCQ about "${mcq.topic}". Selected option ${selectedOption?.id?.toUpperCase()}: "${selectedText}". Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}. Correct answer was ${correctOption?.id?.toUpperCase()}: "${correctText}". Performance: ${isCorrect ? 'Strong understanding demonstrated' : 'Needs reinforcement of this concept'}.`;
}

// Function to generate silent summary message for TF results  
function generateTFSummary(tf: TF, results: Array<{statementId: string, isCorrect: boolean}>): string {
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalCount = results.length;
  
  const correctStatements = results
    .filter(r => r.isCorrect)
    .map(r => {
      const statement = tf.statements.find(s => s.id === r.statementId);
      return `${r.statementId}: "${statement?.text}"`;
    });
    
  const incorrectStatements = results
    .filter(r => !r.isCorrect)
    .map(r => {
      const statement = tf.statements.find(s => s.id === r.statementId);
      return `${r.statementId}: "${statement?.text}" (Correct: ${statement?.isTrue ? 'True' : 'False'})`;
    });
  
  const performanceAnalysis = correctCount === totalCount 
    ? 'Excellent understanding' 
    : correctCount >= totalCount * 0.67 
    ? 'Good understanding with some gaps' 
    : 'Significant misconceptions need addressing';
    
  return `SILENT_SUMMARY: User completed T/F about "${tf.topic}". Results: ${correctCount}/${totalCount} correct. Correct answers: [${correctStatements.join(', ')}]. Incorrect answers: [${incorrectStatements.join(', ')}]. Overall performance: ${performanceAnalysis}.`;
}

// Function to generate silent summary message for Flashcard results
function generateFlashcardsSummary(
  flashcardSet: FlashcardSet, 
  performance: Array<{flashcardId: string, performance: 'got-it' | 'on-track' | 'unclear', saved?: boolean}>
): string {
  const gotItCount = performance.filter(p => p.performance === 'got-it').length;
  const onTrackCount = performance.filter(p => p.performance === 'on-track').length;
  const unclearCount = performance.filter(p => p.performance === 'unclear').length;
  const savedCount = performance.filter(p => p.saved).length;
  const totalCount = performance.length;
  
  const performanceBreakdown = performance.map(p => {
    const flashcard = flashcardSet.flashcards.find(f => f.id === p.flashcardId);
    return `${p.flashcardId}: "${flashcard?.concept}" - ${p.performance}${p.saved ? ' (saved)' : ''}`;
  });
  
  const overallRetention = gotItCount === totalCount 
    ? 'Excellent retention across all concepts' 
    : gotItCount + onTrackCount >= totalCount * 0.67 
    ? 'Good retention with some concepts needing review' 
    : 'Significant concepts need reinforcement';
    
  return `SILENT_SUMMARY: User completed flashcard review about "${flashcardSet.topic}". Results: ${gotItCount} got it, ${onTrackCount} on track, ${unclearCount} unclear. Performance breakdown: [${performanceBreakdown.join(', ')}]. Overall retention: ${overallRetention}.`;
}

// Helper function to check if message has existing assessment results
function getExistingAssessmentResults(message: Message): ChatMessage['assessment'] | null {
  // Check if this is an enhanced ChatMessage with assessment metadata
  if ('assessment' in message && message.assessment) {
    return (message as ChatMessage).assessment;
  }
  return null;
}

export function Chat({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isGenerating = false,
  stop,
  append,
  updateMessage
}: ChatProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { containerRef, endRef, scrollToBottom } = useScrollToBottom({
    behavior: 'smooth',
    block: 'nearest',
    debounceMs: 100
  })

  // State to track if we're currently generating an assessment (MCQ or TF)
  const [assessmentGeneratingType, setAssessmentGeneratingType] = useState<'mcq' | 'tf' | 'flashcards' | null>(null)
  
  // Track processed assessments to prevent duplicate submissions
  const [processedAssessments, setProcessedAssessments] = useState<Set<string>>(new Set())

  // Check if the AI is currently generating an assessment by looking at the latest message
  useEffect(() => {
    if (isGenerating && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If the last message is from assistant and contains partial assessment data, show loading
      if (lastMessage && lastMessage.role === 'assistant') {
        const hasPartialMCQ = lastMessage.content.includes('MCQ_DATA_START');
        
        const hasPartialTF = lastMessage.content.includes('TF_DATA_START');
        
        const hasPartialFlashcards = lastMessage.content.includes('FLASHCARDS_DATA_START');
        
        if (hasPartialMCQ && !lastMessage.content.includes('MCQ_DATA_END')) {
          setAssessmentGeneratingType('mcq');
        } else if (hasPartialTF && !lastMessage.content.includes('TF_DATA_END')) {
          setAssessmentGeneratingType('tf');
        } else if (hasPartialFlashcards && !lastMessage.content.includes('FLASHCARDS_DATA_END')) {
          setAssessmentGeneratingType('flashcards');
        } else if (lastMessage.content.includes('MCQ_DATA_END') || lastMessage.content.includes('TF_DATA_END') || lastMessage.content.includes('FLASHCARDS_DATA_END')) {
          setAssessmentGeneratingType(null);
        }
      }
    } else if (!isGenerating) {
      // Reset when not generating
      setAssessmentGeneratingType(null);
    }
  }, [messages, isGenerating])

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Scroll when new messages are added or content changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages.length, scrollToBottom])

  // Auto-focus the input after each assistant message
  useEffect(() => {
    if (!isGenerating && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messages, isGenerating])

  return (
    <>
      <Card className="flex flex-col flex-1 min-h-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Learn</CardTitle>
          <CardDescription>Ask questions, explore topics, and learn with the help of AI</CardDescription>
        </div>
        {isGenerating && stop && (
          <Button variant="outline" size="sm" onClick={stop}>
            Stop
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        <ScrollArea 
          ref={containerRef} 
          className="flex-1 p-4" 
          style={{ 
            scrollBehavior: 'smooth',
            scrollPaddingBottom: '1rem'
          }}
        >
          <div className="space-y-4" style={{ scrollMarginBottom: '1rem' }}>
            {messages.filter(m => !(m.role === 'user' && (m.content.startsWith('SILENT_SUMMARY:') || m.content === '__INITIAL_CONTEXT_MESSAGE__'))).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <img src={darkIcon.src} alt="AI Assistant" className="w-12 h-12 mx-auto mb-4 opacity-80" />
              </div>
            )}
              
              {messages
                .filter((message) => {
                  // Filter out silent summary messages and initial context messages from UI display
                  if (message.role === 'user' && (message.content.startsWith('SILENT_SUMMARY:') || message.content === '__INITIAL_CONTEXT_MESSAGE__')) {
                    return false;
                  }
                  return true;
                })
                .map((message) => {
                  // Only render user and assistant messages visually
                  if (message.role !== 'user' && message.role !== 'assistant') {
                    return null;
                  }
                  
                  try {
                    // Wrap entire message rendering in try-catch to prevent one bad message from breaking all subsequent ones
                    
                    // Check if this message contains an MCQ, TF, or Flashcards (with error handling)
                    let mcqData: MCQ | null = null;
                    let tfData: TF | null = null;
                    let flashcardsData: FlashcardSet | null = null;
                    try {
                      mcqData = message.role === 'assistant' ? extractMCQFromMessage(message) : null;
                      tfData = message.role === 'assistant' ? extractTFFromMessage(message) : null;
                      flashcardsData = message.role === 'assistant' ? extractFlashcardsFromMessage(message) : null;
                    } catch (error) {
                      console.error('Error extracting MCQ/TF/Flashcards from message:', error);
                      mcqData = null;
                      tfData = null;
                      flashcardsData = null;
                    }
                    
                    // Calculate cleaned content (content after removing MCQ/TF/Flashcards markers)
                    let cleanedContent = message.content;
                    if ((mcqData || tfData || flashcardsData) && message.role === 'assistant') {
                      cleanedContent = message.content
                        .replace(/MCQ_DATA_START[\s\S]*?MCQ_DATA_END/g, '')
                        .replace(/TF_DATA_START[\s\S]*?TF_DATA_END/g, '')
                        .replace(/FLASHCARDS_DATA_START[\s\S]*?FLASHCARDS_DATA_END/g, '')
                        .replace(/\{"type":"mcq"[\s\S]*?\}/g, '')
                        .replace(/\{"type":"tf"[\s\S]*?\}/g, '')
                        .replace(/\{"type":"flashcards"[\s\S]*?\}/g, '')
                        .replace(/\{[^}]*"question"[^}]*\}/g, '')
                        .replace(/\{[^}]*"topic"[^}]*"statements"[^}]*\}/g, '')
                        .replace(/\{[^}]*"topic"[^}]*"flashcards"[^}]*\}/g, '')
                        .trim();
                    }
                    
                    // If message has MCQ/TF/Flashcards but no meaningful text content, don't render the message box
                    const shouldRenderMessageBox = message.role === 'user' || (!mcqData && !tfData && !flashcardsData) || (cleanedContent && cleanedContent.length > 0);
                  
                  return (
                    <div key={message.id} className="space-y-4">
                      {/* Only render message box if it has meaningful content */}
                      {shouldRenderMessageBox && (
                        <div
                          className={`flex gap-3 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <img src={iconGrey.src} alt="AI Assistant" className="w-8 h-8 flex-shrink-0" />
                          )}
                          
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <MarkdownRenderer 
                                variant="chat"
                                className="prose prose-sm max-w-none"
                              >
                                {cleanedContent}
                              </MarkdownRenderer>
                            )}
                          </div>
                          
                          {message.role === 'user' && (
                            <img src={userIcon.src} alt="User" className="w-8 h-8 flex-shrink-0" />
                          )}
                        </div>
                      )}
                      
                      {/* Render MCQ component if detected */}
                      {mcqData && (() => {
                        // Check for existing assessment results
                        const existingResults = getExistingAssessmentResults(message);
                        const mcqResults = existingResults?.type === 'mcq' ? existingResults.results : null;
                        
                        return (
                          <div className="flex justify-start">
                            <div className="w-8" /> {/* Spacer for alignment */}
                            <div className="max-w-[80%]">
                              <MCQComponent 
                                mcq={mcqData}
                                initialSelectedOptionId={mcqResults?.selectedOptionId}
                                initialIsSubmitted={mcqResults?.completed || false}
                                initialShowExplanation={mcqResults?.completed || false}
                                onAnswer={(selectedOption, isCorrect) => {
                                  // Store results in message assessment metadata
                                  if (updateMessage) {
                                    const assessmentData = {
                                      type: 'mcq' as const,
                                      data: mcqData,
                                      results: {
                                        selectedOptionId: selectedOption.id,
                                        isCorrect,
                                        submittedAt: new Date().toISOString(),
                                        completed: true
                                      }
                                    };
                                    
                                    updateMessage(message.id, {
                                      assessment: assessmentData
                                    } as Partial<Message>);
                                  }
                                  
                                  // Also send summary message for AI context
                                  if (append) {
                                    const assessmentKey = `mcq-${message.id}-${selectedOption.id}`;
                                    if (!processedAssessments.has(assessmentKey)) {
                                      setProcessedAssessments(prev => new Set(prev).add(assessmentKey));
                                      const summary = generateMCQSummary(mcqData, selectedOption, isCorrect);
                                      append({
                                        role: 'user',
                                        content: summary
                                      });
                                    }
                                  }
                                }}
                                className="my-2"
                              />
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Render TF component if detected */}
                      {tfData && (() => {
                        // Check for existing assessment results
                        const existingResults = getExistingAssessmentResults(message);
                        const tfResults = existingResults?.type === 'tf' ? existingResults.results : null;
                        
                        return (
                          <div className="flex justify-start">
                            <div className="w-8" /> {/* Spacer for alignment */}
                            <div className="max-w-[80%]">
                              <TFComponent 
                                tf={tfData}
                                initialSelectedAnswers={tfResults?.answers}
                                initialIsSubmitted={tfResults?.completed || false}
                                initialShowExplanation={tfResults?.completed || false}
                                onAnswer={(results) => {
                                  // Store results in message assessment metadata
                                  if (updateMessage) {
                                    // Convert results to answers format
                                    const answers: Record<string, boolean> = {};
                                    results.forEach(result => {
                                      const statement = tfData.statements.find(s => s.id === result.statementId);
                                      if (statement) {
                                        answers[result.statementId] = statement.isTrue === result.isCorrect ? statement.isTrue : !statement.isTrue;
                                      }
                                    });
                                    
                                    const assessmentData = {
                                      type: 'tf' as const,
                                      data: tfData,
                                      results: {
                                        answers,
                                        scores: results,
                                        submittedAt: new Date().toISOString(),
                                        completed: true
                                      }
                                    };
                                    
                                    updateMessage(message.id, {
                                      assessment: assessmentData
                                    } as Partial<Message>);
                                  }
                                  
                                  // Also send summary message for AI context
                                  if (append) {
                                    const assessmentKey = `tf-${message.id}-${JSON.stringify(results.map(r => r.statementId + r.isCorrect))}`;
                                    if (!processedAssessments.has(assessmentKey)) {
                                      setProcessedAssessments(prev => new Set(prev).add(assessmentKey));
                                      const summary = generateTFSummary(tfData, results);
                                      append({
                                        role: 'user',
                                        content: summary
                                      });
                                    }
                                  }
                                }}
                                className="my-2"
                              />
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Render Flashcard component if detected */}
                      {flashcardsData && (() => {
                        // Check for existing assessment results
                        const existingResults = getExistingAssessmentResults(message);
                        const flashcardsResults = existingResults?.type === 'flashcards' ? existingResults.results : null;
                        
                        return (
                          <div className="flex justify-start">
                            <div className="w-8" /> {/* Spacer for alignment */}
                            <div className="max-w-[80%]">
                              <FlashcardComponent 
                                flashcardSet={flashcardsData}
                                initialCurrentIndex={0}
                                initialFlippedCards={new Set()}
                                initialPerformance={flashcardsResults?.flashcardPerformance ? 
                                  flashcardsResults.flashcardPerformance.reduce((acc, perf) => {
                                    acc[perf.flashcardId] = perf.performance;
                                    return acc;
                                  }, {} as Record<string, 'got-it' | 'on-track' | 'unclear'>) : 
                                  {}
                                }
                                initialSavedCards={flashcardsResults?.flashcardPerformance ? 
                                  new Set(flashcardsResults.flashcardPerformance.filter(perf => perf.saved).map(perf => perf.flashcardId)) : 
                                  new Set()
                                }
                                initialIsCompleted={flashcardsResults?.completed || false}
                                onAnswer={(flashcardId, performance) => {
                                  // Store individual flashcard performance
                                  if (updateMessage) {
                                    const existingAssessment = getExistingAssessmentResults(message);
                                    const currentPerformance = existingAssessment?.results?.flashcardPerformance || [];
                                    
                                    // Update or add performance for this flashcard
                                    const updatedPerformance = currentPerformance.filter(p => p.flashcardId !== flashcardId);
                                    updatedPerformance.push({ flashcardId, performance });
                                    
                                    const assessmentData = {
                                      type: 'flashcards' as const,
                                      data: flashcardsData,
                                      results: {
                                        flashcardPerformance: updatedPerformance,
                                        submittedAt: new Date().toISOString(),
                                        completed: updatedPerformance.length === flashcardsData.flashcards.length
                                      }
                                    };
                                    
                                    updateMessage(message.id, {
                                      assessment: assessmentData
                                    } as Partial<Message>);
                                    
                                    // If all flashcards are completed, send summary
                                    if (assessmentData.results.completed && append) {
                                      const assessmentKey = `flashcards-${message.id}-completed`;
                                      if (!processedAssessments.has(assessmentKey)) {
                                        setProcessedAssessments(prev => new Set(prev).add(assessmentKey));
                                        const summary = generateFlashcardsSummary(flashcardsData, updatedPerformance);
                                        append({
                                          role: 'user',
                                          content: summary
                                        });
                                      }
                                    }
                                  }
                                }}
                                onSave={(flashcardId, shouldSave) => {
                                  // Handle individual flashcard saving to personal collection
                                  if (updateMessage) {
                                    const existingAssessment = getExistingAssessmentResults(message);
                                    const currentPerformance = existingAssessment?.results?.flashcardPerformance || [];
                                    
                                    // Update saved status for this flashcard
                                    const updatedPerformance = currentPerformance.map(p => 
                                      p.flashcardId === flashcardId ? { ...p, saved: shouldSave } : p
                                    );
                                    
                                    // If this flashcard doesn't have performance data yet, create it
                                    if (!updatedPerformance.find(p => p.flashcardId === flashcardId)) {
                                      updatedPerformance.push({ flashcardId, performance: 'got-it', saved: shouldSave });
                                    }
                                    
                                    const assessmentData = {
                                      type: 'flashcards' as const,
                                      data: flashcardsData,
                                      results: {
                                        flashcardPerformance: updatedPerformance,
                                        submittedAt: new Date().toISOString(),
                                        completed: existingAssessment?.results?.completed || false
                                      }
                                    };
                                    
                                    updateMessage(message.id, {
                                      assessment: assessmentData
                                    } as Partial<Message>);
                                  }
                                  
                                  // TODO: Actually save to database via flashcards.ts functions
                                  // This would involve calling saveFlashcard() function
                                }}
                                className="my-2"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                  } catch (error) {
                    console.error('Error rendering message:', message.id, error);
                    // Return a fallback message rendering to prevent breaking the entire chat
                    return (
                      <div key={message.id} className="space-y-4">
                        <div className="flex gap-3 justify-start">
                          <img src={iconGrey.src} alt="AI Assistant" className="w-8 h-8 flex-shrink-0" />
                          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                            <p className="text-sm text-red-500">Error rendering message content</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
                .filter(Boolean)}
              
              {isGenerating && (
                <div className="flex gap-3 justify-start">
                  <img src={iconGrey.src} alt="AI Assistant" className="w-8 h-8 flex-shrink-0" />
                  {assessmentGeneratingType === 'mcq' ? (
                    <div className="flex-1">
                      <MCQLoading />
                    </div>
                  ) : assessmentGeneratingType === 'tf' ? (
                    <div className="flex-1">
                      <TFLoading />
                    </div>
                  ) : assessmentGeneratingType === 'flashcards' ? (
                    <div className="flex-1">
                      <FlashcardLoading />
                    </div>
                  ) : (
                    <div className="flex gap-1 py-2">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Invisible div to scroll to with margin for better positioning */}
              <div ref={endRef} className="h-4" />
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                placeholder="Ask me anything you'd like to learn..."
                disabled={isGenerating}
                className="flex-1 border-purple-500 focus:border-purple-500 focus:ring-purple-500"
                autoFocus
              />
              <Button type="submit" disabled={isGenerating || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      
      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        containerRef={containerRef}
        onScrollToBottom={scrollToBottom}
        threshold={200}
      />
    </>
  )
}
