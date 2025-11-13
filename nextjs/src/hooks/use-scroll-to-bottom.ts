'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseScrollToBottomOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  threshold?: number;
  debounceMs?: number;
  isStreaming?: boolean;
}

export function useScrollToBottom(options: UseScrollToBottomOptions = {}) {
  const {
    behavior = 'smooth',
    block = 'nearest',
    inline = 'nearest',
    threshold = 100,
    debounceMs = 100,
    isStreaming = false
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const isScrollingRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth scroll function with debouncing
  const scrollToBottom = useCallback((force = false) => {
    if (!endRef.current || (!force && isScrollingRef.current)) return;

    // Clear any pending scroll
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!endRef.current) return;

      isScrollingRef.current = true;
      
      endRef.current.scrollIntoView({
        behavior,
        block,
        inline
      });

      // Reset scrolling flag after animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, behavior === 'smooth' ? 300 : 50);
    }, debounceMs);
  }, [behavior, block, inline, debounceMs]);

  // Check if user is near bottom
  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [threshold]);

  // Auto-scroll only if user is near bottom AND currently streaming
  const autoScrollToBottom = useCallback(() => {
    if (isNearBottom() && isStreaming) {
      scrollToBottom();
    }
  }, [isNearBottom, scrollToBottom, isStreaming]);

  // Set up MutationObserver for dynamic content changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create observer for DOM changes
    observerRef.current = new MutationObserver((mutations) => {
      let shouldScroll = false;

      mutations.forEach((mutation) => {
        // Skip mutations inside flashcard components
        const target = mutation.target as Element;
        if (target && (
          target.closest?.('.flashcard-container') ||
          target.closest?.('[data-scroll-ignore]')
        )) {
          return;
        }

        // During streaming, scroll for text content changes and relevant node additions
        if (isStreaming) {
          if (mutation.type === 'characterData') {
            shouldScroll = true;
          }
          // Also allow childList changes during streaming for new text nodes
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if added nodes contain text content (not just components)
            const hasTextContent = Array.from(mutation.addedNodes).some(node => 
              node.nodeType === Node.TEXT_NODE || 
              (node.nodeType === Node.ELEMENT_NODE && (node as Element).textContent?.trim())
            );
            if (hasTextContent) {
              shouldScroll = true;
            }
          }
        }
        // When not streaming, don't auto-scroll for any changes
        // This prevents scrolling when MCQ/TF components are added or updated
      });

      if (shouldScroll) {
        autoScrollToBottom();
      }
    });

    // Configure observer based on streaming state
    const observerConfig = {
      childList: true, // Always watch for new nodes
      subtree: true,
      characterData: isStreaming, // Only watch text changes during streaming
      attributes: false // Never watch attribute changes for auto-scroll
    };

    // Start observing
    observerRef.current.observe(container, observerConfig);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoScrollToBottom, isStreaming]);

  // Manual scroll to bottom (for initial load or force scroll)
  const scrollToBottomManual = useCallback(() => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      if (isNearBottom()) {
        scrollToBottomManual();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isNearBottom, scrollToBottomManual]);

  return {
    containerRef,
    endRef,
    scrollToBottom: scrollToBottomManual,
    isNearBottom
  };
}
