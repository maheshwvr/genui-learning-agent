'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseScrollToBottomOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  threshold?: number;
  debounceMs?: number;
}

export function useScrollToBottom(options: UseScrollToBottomOptions = {}) {
  const {
    behavior = 'smooth',
    block = 'nearest',
    inline = 'nearest',
    threshold = 100,
    debounceMs = 100
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

  // Auto-scroll only if user is near bottom
  const autoScrollToBottom = useCallback(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [isNearBottom, scrollToBottom]);

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

        // Check for added nodes (new messages, MCQ components, etc.)
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldScroll = true;
        }
        
        // Check for text content changes (streaming messages)
        if (mutation.type === 'characterData') {
          shouldScroll = true;
        }
        
        // Check for attribute changes that might affect layout
        if (mutation.type === 'attributes') {
          const attributeName = mutation.attributeName;
          if (attributeName === 'class' || attributeName === 'style') {
            shouldScroll = true;
          }
        }
      });

      if (shouldScroll) {
        autoScrollToBottom();
      }
    });

    // Start observing
    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoScrollToBottom]);

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
