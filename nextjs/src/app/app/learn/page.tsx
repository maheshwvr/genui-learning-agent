'use client';

import { useChat } from 'ai/react';
import { Chat } from '@/components/ui/chat';

export default function LearnPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat();

  return (
    <div className="h-full flex flex-col">
      <Chat
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isGenerating={isLoading}
        stop={stop}
      />
    </div>
  );
}
