'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, User } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { type Message } from 'ai'
import ReactMarkdown from 'react-markdown'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'
import { MCQComponent } from '@/components/ui/mcq-component'
import { MCQLoading } from '@/components/ui/mcq-loading'
import { TFComponent } from '@/components/ui/tf-component'
import { TFLoading } from '@/components/ui/tf-loading'
import { type MCQ, type TF } from '@/lib/ai/lesson-schemas'

interface ChatProps {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isGenerating?: boolean
  stop?: () => void
  append?: (message: { role: 'user' | 'assistant'; content: string }) => void
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    return null;
  }
}

// Helper function to extract MCQ from message object (including toolInvocations)
function extractMCQFromMessage(message: Message): MCQ | null {
  if (!message) {
    return null;
  }
  
  try {
    // Check message content first
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
                console.log('✅ MCQ from tool invocation JSON');
                return parsed as MCQ;
              }
            }
            // If it's a plain text response, it might contain MCQ markers
            const mcqFromText = parseMCQFromContent(invocation.result);
            if (mcqFromText) {
              console.log('✅ MCQ from tool invocation text');
              return mcqFromText;
            }
          } else if (invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'mcq' && 'data' in invocation.result && validateMCQ(invocation.result.data)) {
            console.log('✅ MCQ from tool invocation data');
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
                console.log('✅ MCQ from experimental tool call JSON');
                return parsed as MCQ;
              }
            }
            // If it's a plain text response, it might contain MCQ markers
            const mcqFromText = parseMCQFromContent(toolCall.result);
            if (mcqFromText) {
              console.log('✅ MCQ from experimental tool call text');
              return mcqFromText;
            }
          } else if (toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'mcq' && 'data' in toolCall.result && validateMCQ(toolCall.result.data)) {
            console.log('✅ MCQ from experimental tool call data');
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
    // Check message content first
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
                console.log('✅ TF from tool invocation JSON');
                return parsed as TF;
              }
            }
            // If it's a plain text response, it might contain TF markers
            const tfFromText = parseTFFromContent(invocation.result);
            if (tfFromText) {
              console.log('✅ TF from tool invocation text');
              return tfFromText;
            }
          } else if (invocation.result && typeof invocation.result === 'object' && 'type' in invocation.result && invocation.result.type === 'tf' && 'data' in invocation.result && validateTF(invocation.result.data)) {
            console.log('✅ TF from tool invocation data');
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
                console.log('✅ TF from experimental tool call JSON');
                return parsed as TF;
              }
            }
            // If it's a plain text response, it might contain TF markers
            const tfFromText = parseTFFromContent(toolCall.result);
            if (tfFromText) {
              console.log('✅ TF from experimental tool call text');
              return tfFromText;
            }
          } else if (toolCall.result && typeof toolCall.result === 'object' && 'type' in toolCall.result && toolCall.result.type === 'tf' && 'data' in toolCall.result && validateTF(toolCall.result.data)) {
            console.log('✅ TF from experimental tool call data');
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

// Function to generate silent summary message for MCQ results
function generateMCQSummary(mcq: MCQ, selectedOption: any, isCorrect: boolean): string {
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

export function Chat({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isGenerating = false,
  stop,
  append
}: ChatProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { containerRef, endRef, scrollToBottom } = useScrollToBottom({
    behavior: 'smooth',
    block: 'nearest',
    debounceMs: 100
  })

  // State to track if we're currently generating an assessment (MCQ or TF)
  const [assessmentGeneratingType, setAssessmentGeneratingType] = useState<'mcq' | 'tf' | null>(null)

  // Check if the AI is currently generating an assessment by looking at the latest message
  useEffect(() => {
    if (isGenerating && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // If the last message is from assistant and contains partial assessment data, show loading
      if (lastMessage && lastMessage.role === 'assistant') {
        const hasPartialMCQ = lastMessage.content.includes('MCQ_DATA_START') || 
                             lastMessage.content.includes('quiz question') ||
                             lastMessage.content.includes('multiple choice');
        
        const hasPartialTF = lastMessage.content.includes('TF_DATA_START') || 
                            lastMessage.content.includes('True/False') ||
                            lastMessage.content.includes('true/false statements');
        
        if (hasPartialMCQ && !lastMessage.content.includes('MCQ_DATA_END')) {
          setAssessmentGeneratingType('mcq');
        } else if (hasPartialTF && !lastMessage.content.includes('TF_DATA_END')) {
          setAssessmentGeneratingType('tf');
        } else if (lastMessage.content.includes('MCQ_DATA_END') || lastMessage.content.includes('TF_DATA_END')) {
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
    <div className="space-y-6 p-6">
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
              {messages.filter(m => !(m.role === 'user' && m.content.startsWith('SILENT_SUMMARY:'))).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start learning! Ask me anything you&apos;d like to know.</p>
                </div>
              )}
              
              {messages
                .filter((message) => {
                  // Filter out silent summary messages from UI display
                  if (message.role === 'user' && message.content.startsWith('SILENT_SUMMARY:')) {
                    return false;
                  }
                  return true;
                })
                .map((message) => {
                  // Only render user and assistant messages visually
                  if (message.role !== 'user' && message.role !== 'assistant') {
                    return null;
                  }
                  
                  // DETAILED LOGGING: Log the entire message structure
                  console.log('=== FULL MESSAGE STRUCTURE ===');
                  console.log('Message ID:', message.id);
                  console.log('Role:', message.role);
                  console.log('Content:', message.content);
                  console.log('Full message object:', JSON.stringify(message, null, 2));
                  console.log('=== END MESSAGE STRUCTURE ===');
                  
                  // Check if this message contains an MCQ or TF (with error handling)
                  let mcqData: MCQ | null = null;
                  let tfData: TF | null = null;
                  try {
                    mcqData = message.role === 'assistant' ? extractMCQFromMessage(message) : null;
                    tfData = message.role === 'assistant' ? extractTFFromMessage(message) : null;
                  } catch (error) {
                    console.error('Error extracting MCQ/TF from message:', error);
                    mcqData = null;
                    tfData = null;
                  }
                  
                  // Calculate cleaned content (content after removing MCQ/TF markers)
                  let cleanedContent = message.content;
                  if ((mcqData || tfData) && message.role === 'assistant') {
                    cleanedContent = message.content
                      .replace(/MCQ_DATA_START[\s\S]*?MCQ_DATA_END/g, '')
                      .replace(/TF_DATA_START[\s\S]*?TF_DATA_END/g, '')
                      .replace(/\{"type":"mcq"[\s\S]*?\}/g, '')
                      .replace(/\{"type":"tf"[\s\S]*?\}/g, '')
                      .replace(/\{[^}]*"question"[^}]*\}/g, '')
                      .replace(/\{[^}]*"topic"[^}]*"statements"[^}]*\}/g, '')
                      .trim();
                  }
                  
                  console.log('MCQ Data found:', !!mcqData);
                  console.log('TF Data found:', !!tfData);
                  console.log('Original content length:', message.content?.length || 0);
                  console.log('Cleaned content length:', cleanedContent?.length || 0);
                  console.log('Cleaned content:', cleanedContent);
                  
                  // If message has MCQ/TF but no meaningful text content, don't render the message box
                  const shouldRenderMessageBox = message.role === 'user' || (!mcqData && !tfData) || (cleanedContent && cleanedContent.length > 0);
                  
                  console.log('Should render message box:', shouldRenderMessageBox);
                  
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
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>
                                <Bot className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
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
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-base font-semibold mt-2 mb-1">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
                                  h4: ({ children }) => <h4 className="text-sm font-medium mt-1 mb-1">{children}</h4>,
                                  h5: ({ children }) => <h5 className="text-sm font-medium mt-1 mb-1">{children}</h5>,
                                  h6: ({ children }) => <h6 className="text-sm font-medium mt-1 mb-1">{children}</h6>,
                                  p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  code: ({ children }) => <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                  pre: ({ children }) => <pre className="bg-muted-foreground/10 p-2 rounded-lg overflow-x-auto text-xs font-mono mb-2 last:mb-0">{children}</pre>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="text-sm">{children}</li>,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2 last:mb-0">{children}</blockquote>,
                                  a: ({ children, href }) => <a href={href} className="text-primary hover:underline">{children}</a>,
                                  hr: () => <hr className="border-muted-foreground/20 my-2" />,
                                  table: ({ children }) => <table className="min-w-full border-collapse border border-muted-foreground/20 mb-2 last:mb-0">{children}</table>,
                                  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                                  tbody: ({ children }) => <tbody>{children}</tbody>,
                                  tr: ({ children }) => <tr className="border-b border-muted-foreground/20">{children}</tr>,
                                  th: ({ children }) => <th className="border border-muted-foreground/20 px-2 py-1 text-xs font-medium text-left">{children}</th>,
                                  td: ({ children }) => <td className="border border-muted-foreground/20 px-2 py-1 text-xs">{children}</td>,
                                }}
                                className="prose prose-sm max-w-none"
                              >
                                {cleanedContent}
                              </ReactMarkdown>
                            )}
                          </div>
                          
                          {message.role === 'user' && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      
                      {/* Render MCQ component if detected */}
                      {mcqData && (
                        <div className="flex justify-start">
                          <div className="w-8" /> {/* Spacer for alignment */}
                          <div className="max-w-[80%]">
                            <MCQComponent 
                              mcq={mcqData}
                              onAnswer={(selectedOption, isCorrect) => {
                                console.log('MCQ answered:', { selectedOption, isCorrect });
                                
                                // Generate and send silent summary message immediately
                                if (append) {
                                  const summary = generateMCQSummary(mcqData, selectedOption, isCorrect);
                                  append({
                                    role: 'user',
                                    content: summary
                                  });
                                }
                              }}
                              className="my-2"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Render TF component if detected */}
                      {tfData && (
                        <div className="flex justify-start">
                          <div className="w-8" /> {/* Spacer for alignment */}
                          <div className="max-w-[80%]">
                            <TFComponent 
                              tf={tfData}
                              onAnswer={(results) => {
                                console.log('TF answered:', results);
                                
                                // Generate and send silent summary message immediately
                                if (append) {
                                  const summary = generateTFSummary(tfData, results);
                                  append({
                                    role: 'user',
                                    content: summary
                                  });
                                }
                              }}
                              className="my-2"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
                .filter(Boolean)}
              
              {isGenerating && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  {assessmentGeneratingType === 'mcq' ? (
                    <div className="flex-1">
                      <MCQLoading />
                    </div>
                  ) : assessmentGeneratingType === 'tf' ? (
                    <div className="flex-1">
                      <TFLoading />
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
    </div>
  )
}
