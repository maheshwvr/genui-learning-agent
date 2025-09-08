'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, User } from 'lucide-react'
import { type FormEvent, useEffect, useRef } from 'react'
import { type Message } from 'ai'

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

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Auto-focus the input after each assistant message
  useEffect(() => {
    if (!isGenerating && inputRef.current) {
      // Small delay to ensure the message has been rendered
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
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
