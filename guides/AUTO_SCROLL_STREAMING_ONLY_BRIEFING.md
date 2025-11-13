# Auto-Scroll Streaming-Only Implementation Briefing

## Project Overview

This is a Next.js-based AI learning chatbot application that uses the Vercel AI SDK with Google Gemini for streaming chat responses. The application features interactive learning components including MCQs, True/False questions, and flashcards. The current auto-scrolling behavior is too aggressive and needs to be refined to **only scroll when the assistant is actively streaming text**.

## Current Architecture

### Streaming Flow
1. **User Input** → `useChat` hook in `[lessonId]/page.tsx`
2. **API Request** → `/api/chat/route.ts` using `streamText` from Vercel AI SDK
3. **Streaming Response** → Vercel AI SDK streams text chunks back to client
4. **State Management** → `isLoading` from `useChat` becomes `isChatLoading` becomes `isGenerating`
5. **UI Updates** → Chat component receives streaming content and triggers scroll

### Current Scroll Implementation

The `useScrollToBottom` hook uses a `MutationObserver` that triggers on **any DOM change**:
- `childList` changes (new messages, components)
- `characterData` changes (streaming text updates)
- `attributes` changes (class/style modifications)

**Problem**: The hook scrolls for all DOM mutations, not just streaming text.

## File Architecture & Connections

### Core Files

#### 1. `nextjs/src/hooks/use-scroll-to-bottom.ts`
**Current Behavior**: 
- Uses `MutationObserver` to watch for any DOM changes
- Scrolls on `characterData`, `childList`, and `attributes` mutations
- No awareness of streaming state

**Required Changes**:
- Accept `isStreaming` parameter
- Only trigger auto-scroll during streaming when `isStreaming === true`
- Maintain manual scroll functionality for user-initiated scrolling

#### 2. `nextjs/src/components/ui/chat.tsx`
**Current Behavior**:
- Receives `isGenerating` prop from parent
- Passes configuration to `useScrollToBottom`
- Has effect that calls `scrollToBottom()` on every `messages.length` change

**Required Changes**:
- Pass `isGenerating` state to the `useScrollToBottom` hook
- Remove or modify the effect that scrolls on every message length change
- Ensure scroll still works for non-streaming scenarios (initial load, manual actions)

#### 3. `nextjs/src/app/app/learn/[lessonId]/page.tsx`
**Current Behavior**:
- Uses `useChat` hook which provides `isLoading` state
- Renames `isLoading` to `isChatLoading`
- Passes `isChatLoading` as `isGenerating` to Chat component

**No Changes Required**: This file correctly provides the streaming state.

### Supporting Files

#### 4. `nextjs/src/app/api/chat/route.ts`
**Context Only**: 
- Implements streaming using `streamText` from Vercel AI SDK
- The streaming is handled by the AI SDK and `useChat` hook
- No changes needed here

#### 5. `nextjs/src/components/ui/scroll-to-bottom-button.tsx`
**Context Only**:
- Manual scroll-to-bottom button implementation
- Shows best practices for scroll position detection
- Reference for maintaining manual scroll functionality

## Technical Implementation Strategy

### Problem Analysis
The current `MutationObserver` approach scrolls on every DOM change, including:
- ✅ Streaming text updates (desired)
- ❌ New message additions (should be manual)
- ❌ MCQ/TF component insertions (should be manual)
- ❌ Flashcard component updates (should be manual)
- ❌ Attribute changes from animations (should be ignored)

### Solution Design

#### Modified Hook Signature
```typescript
export function useScrollToBottom(options: UseScrollToBottomOptions & {
  isStreaming?: boolean;
}) {
  // Only auto-scroll when isStreaming === true
}
```

#### Streaming-Only Logic
```typescript
// Auto-scroll only if user is near bottom AND currently streaming
const autoScrollToBottom = useCallback(() => {
  if (isNearBottom() && isStreaming) {
    scrollToBottom();
  }
}, [isNearBottom, scrollToBottom, isStreaming]);
```

#### MutationObserver Refinement
```typescript
// Only observe text content changes when streaming
observerRef.current.observe(container, {
  childList: isStreaming,
  subtree: true,
  characterData: isStreaming, // Only watch text changes during streaming
  attributes: false // Ignore attribute changes entirely
});
```

## Success Criteria

### Must Have
1. **Streaming-Only Scroll**: Page only auto-scrolls when `isGenerating === true`
2. **Text Changes Only**: During streaming, only scroll on actual text content changes
3. **Manual Control**: User can manually scroll up and stay there without being forced down
4. **Near-Bottom Logic**: Maintain current "only scroll if near bottom" logic

### Should Have
1. **Smooth Performance**: No unnecessary scroll triggers
2. **Component Awareness**: Don't scroll for MCQ/TF/Flashcard component updates
3. **Responsive**: Works well on different screen sizes

### Must Not Break
1. **Initial Load**: First message should still cause scroll to bottom
2. **Manual Scroll Button**: Scroll-to-bottom button should continue working
3. **Resize Handling**: Window resize should still trigger scroll if appropriate
4. **Component Interactions**: MCQ/TF interactions shouldn't interfere with scroll logic

## Implementation Steps

1. **Modify Hook Interface**: Add `isStreaming` parameter to `useScrollToBottom`
2. **Update MutationObserver**: Only watch relevant changes during streaming
3. **Refine Auto-scroll Logic**: Only auto-scroll when streaming and near bottom
4. **Update Chat Component**: Pass `isGenerating` to the hook
5. **Remove Aggressive Scroll**: Remove/modify the effect that scrolls on every message
6. **Test Edge Cases**: Verify manual scrolling, component interactions, and streaming behavior

## Risk Mitigation

### Potential Issues
1. **Missing Scroll Events**: If streaming detection fails, user might not see new content
2. **Race Conditions**: Streaming state might not sync perfectly with content updates
3. **Component Interactions**: MCQ/TF submissions might need manual scroll triggers

### Fallback Strategy
- Maintain manual scroll-to-bottom button as primary fallback
- Add optional force-scroll parameter for specific scenarios
- Keep existing scroll logic for non-streaming events as a safety net

## Testing Scenarios

1. **Normal Streaming**: Start conversation, verify auto-scroll only during typing
2. **Manual Scroll Up**: Scroll up during streaming, verify no forced scroll-down
3. **Component Interactions**: Submit MCQ/TF, verify appropriate scroll behavior
4. **Window Resize**: Resize during and outside streaming, verify correct behavior
5. **Initial Load**: Load lesson with existing messages, verify proper positioning
6. **Connection Issues**: Test with slow/interrupted connections

---

This briefing provides the foundation for implementing streaming-only auto-scroll behavior while maintaining all existing functionality and user experience expectations.