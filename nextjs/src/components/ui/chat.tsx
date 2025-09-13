'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, User } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useCallback } from 'react'
import { type Message } from 'ai'
import ReactMarkdown from 'react-markdown'

interface ChatProps {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isGenerating?: boolean
  stop?: () => void
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
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageLengthRef = useRef(0)
  const isScrollingRef = useRef(false)

  // Enhanced smooth scroll function with better performance
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (!isScrollingRef.current || force)) {
      isScrollingRef.current = true
      
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
      
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false
      }, 300)
    }
  }, [])

  // Track content changes more precisely
  const currentMessageLength = messages.reduce((acc, msg) => acc + msg.content.length, 0)

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Scroll when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true)
    }
  }, [messages.length, scrollToBottom])

  // Smooth scroll during content generation with content-based detection
  useEffect(() => {
    if (isGenerating && currentMessageLength > lastMessageLengthRef.current) {
      lastMessageLengthRef.current = currentMessageLength
      scrollToBottom()
    } else if (!isGenerating) {
      lastMessageLengthRef.current = currentMessageLength
    }
  }, [currentMessageLength, isGenerating, scrollToBottom])

  // More frequent but optimized scrolling during generation
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        // Only scroll if content has actually changed
        const newLength = messages.reduce((acc, msg) => acc + msg.content.length, 0)
        if (newLength > lastMessageLengthRef.current) {
          lastMessageLengthRef.current = newLength
          scrollToBottom()
        }
      }, 50) // Increased frequency for smoother following
      
      return () => clearInterval(interval)
    }
  }, [isGenerating, messages, scrollToBottom])

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
            ref={scrollAreaRef} 
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
                .filter((message) => message.role === 'user' || message.role === 'assistant')
                .map((message) => (
                <div
                  key={message.id}
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
                        {message.content}
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
              ))}
              
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
              <div ref={messagesEndRef} className="h-4" />
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
                className="flex-1"
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
