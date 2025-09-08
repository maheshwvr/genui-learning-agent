'use client';

import { useChat } from 'ai/react';
import { Chat } from '@/components/ui/chat';

export default function LearnPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat();

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 px-4">
        <h1 className="text-2xl font-bold mb-2">AI Learning Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions, explore topics, and learn with the help of AI. 
          Whether you're looking to understand complex concepts or need quick explanations, I'm here to help!
        </p>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <Chat
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={isLoading}
          stop={stop}
        />
      </div>
    </div>
  );
}
