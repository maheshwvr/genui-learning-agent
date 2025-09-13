'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, User } from 'lucide-react'
import { type FormEvent, useEffect, useRef } from 'react'
import { type Message } from 'ai'
import ReactMarkdown from 'react-markdown'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'
import { MCQComponent } from '@/components/ui/mcq-component'
import { type MCQ } from '@/lib/ai/lesson-schemas'

interface ChatProps {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isGenerating?: boolean
  stop?: () => void
}

// Helper function to safely parse JSON with error handling
function safeJSONParse(jsonString: string): any | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }
  
  // Check if string looks like JSON (starts with { or [)
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // Only log actual JSON parsing errors, not plain text
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      console.error('JSON parsing failed:', error instanceof Error ? error.message : String(error));
    }
    return null;
  }
}

// Helper function to validate MCQ structure
function validateMCQ(obj: any): obj is MCQ {
  return obj && 
    typeof obj.question === 'string' && 
    Array.isArray(obj.options) && 
    obj.options.length === 4 &&
    obj.options.every((opt: any) => 
      opt && 
      typeof opt.id === 'string' && 
      typeof opt.text === 'string' && 
      typeof opt.isCorrect === 'boolean'
    );
}

// Helper function to detect if message content contains MCQ data
function parseMCQFromContent(content: string): MCQ | null {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  try {
    // Look for MCQ marker format (new simple approach)
    const mcqMarkerMatch = content.match(/MCQ_DATA_START([\s\S]+?)MCQ_DATA_END/);
    if (mcqMarkerMatch && mcqMarkerMatch[1]) {
      const mcqData = safeJSONParse(mcqMarkerMatch[1].trim());
      if (mcqData && validateMCQ(mcqData)) {
        console.log('✅ Parsed MCQ from marker');
        return mcqData as MCQ;
      } else {
        console.warn('❌ Invalid MCQ structure in marker data');
      }
    }
    
    // Look for JSON string that contains MCQ data (legacy format)
    const jsonStringMatch = content.match(/\{\"type\":\"mcq\",\"data\":\{[\s\S]*?\}\}/);
    if (jsonStringMatch && jsonStringMatch[0]) {
      const toolResult = safeJSONParse(jsonStringMatch[0]);
      if (toolResult && toolResult.type === 'mcq' && validateMCQ(toolResult.data)) {
        console.log('✅ Parsed MCQ from JSON string');
        return toolResult.data as MCQ;
      }
    }
    
    // Look for tool call results in the content (legacy format)
    const toolCallMatch = content.match(/\{"type":"mcq","data":\{[\s\S]*?\}\}/);
    if (toolCallMatch && toolCallMatch[0]) {
      const toolResult = safeJSONParse(toolCallMatch[0]);
      if (toolResult && toolResult.type === 'mcq' && validateMCQ(toolResult.data)) {
        console.log('✅ Parsed MCQ from tool call');
        return toolResult.data as MCQ;
      }
    }

    // Also look for direct MCQ JSON structure
    const mcqMatch = content.match(/\{[^}]*"question"[^}]*"options"[^}]*\}/);
    if (mcqMatch && mcqMatch[0]) {
      const mcqData = safeJSONParse(mcqMatch[0]);
      if (mcqData && validateMCQ(mcqData)) {
        console.log('✅ Parsed direct MCQ');
        return mcqData as MCQ;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing MCQ from content:', error);
    return null;
  }
}

// Helper function to extract MCQ from message object (including toolInvocations)
function extractMCQFromMessage(message: any): MCQ | null {
  if (!message) {
    return null;
  }
  
  try {
    // Check message content first
    const contentMCQ = parseMCQFromContent(message.content || '');
    if (contentMCQ) return contentMCQ;
    
    // Check for toolInvocations property (AI SDK tool call format)
    if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
      for (const invocation of message.toolInvocations) {
        if (invocation && invocation.toolName === 'generateMCQ' && invocation.result) {
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
          } else if (invocation.result.type === 'mcq' && validateMCQ(invocation.result.data)) {
            console.log('✅ MCQ from tool invocation data');
            return invocation.result.data as MCQ;
          }
        }
      }
    }
    
    // Check for experimental_toolCalls property (alternative format)
    if (message.experimental_toolCalls && Array.isArray(message.experimental_toolCalls)) {
      for (const toolCall of message.experimental_toolCalls) {
        if (toolCall && toolCall.toolName === 'generateMCQ' && toolCall.result) {
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
          } else if (toolCall.result.type === 'mcq' && validateMCQ(toolCall.result.data)) {
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

export function Chat({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isGenerating = false,
  stop
}: ChatProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { containerRef, endRef, scrollToBottom } = useScrollToBottom({
    behavior: 'smooth',
    block: 'nearest',
    debounceMs: 100
  })

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
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start learning! Ask me anything you&apos;d like to know.</p>
                </div>
              )}
              
              {messages
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
                  
                  // Check if this message contains an MCQ (with error handling)
                  let mcqData: MCQ | null = null;
                  try {
                    mcqData = message.role === 'assistant' ? extractMCQFromMessage(message) : null;
                  } catch (error) {
                    console.error('Error extracting MCQ from message:', error);
                    mcqData = null;
                  }
                  
                  // Calculate cleaned content (content after removing MCQ markers)
                  let cleanedContent = message.content;
                  if (mcqData && message.role === 'assistant') {
                    cleanedContent = message.content
                      .replace(/MCQ_DATA_START[\s\S]*?MCQ_DATA_END/g, '')
                      .replace(/\{"type":"mcq"[\s\S]*?\}/g, '')
                      .replace(/\{[^}]*"question"[^}]*\}/g, '')
                      .trim();
                  }
                  
                  console.log('MCQ Data found:', !!mcqData);
                  console.log('Original content length:', message.content?.length || 0);
                  console.log('Cleaned content length:', cleanedContent?.length || 0);
                  console.log('Cleaned content:', cleanedContent);
                  
                  // If message has MCQ but no meaningful text content, don't render the message box
                  const shouldRenderMessageBox = message.role === 'user' || !mcqData || (cleanedContent && cleanedContent.length > 0);
                  
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
                              }}
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
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:0.4s]" />
                    </div>
                  </div>
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
