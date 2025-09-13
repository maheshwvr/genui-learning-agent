'use client';

import React from 'react';

// Simple AI Provider for potential future use
// Currently not used as we're using the standard useChat hook

// Define the AI state and UI state types for future use
export type AIState = Array<{
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}>;

export type UIState = Array<{
  id: string;
  display: React.ReactNode;
  timestamp: Date;
}>;

// Simple provider component that just passes through children
// Can be enhanced later if we want to add AI RSC functionality
export function AIProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
