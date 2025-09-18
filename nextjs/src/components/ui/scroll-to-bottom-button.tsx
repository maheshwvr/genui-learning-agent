'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScrollToBottomButtonProps {
  /** Container element to monitor for scroll position */
  containerRef: React.RefObject<HTMLDivElement>
  /** Function to call when button is clicked */
  onScrollToBottom: () => void
  /** Distance from bottom in pixels to hide the button */
  threshold?: number
  /** Class name for custom styling */
  className?: string
}

export function ScrollToBottomButton({
  containerRef,
  onScrollToBottom,
  threshold = 200,
  className
}: ScrollToBottomButtonProps) {
  const [showButton, setShowButton] = useState(false)

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    
    // Show button if user has scrolled up more than the threshold
    setShowButton(distanceFromBottom > threshold)
  }, [containerRef, threshold])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Check initial position
    checkScrollPosition()

    // Add scroll listener
    container.addEventListener('scroll', checkScrollPosition, { passive: true })

    return () => {
      container.removeEventListener('scroll', checkScrollPosition)
    }
  }, [checkScrollPosition])

  // Also check on window resize
  useEffect(() => {
    window.addEventListener('resize', checkScrollPosition)
    return () => window.removeEventListener('resize', checkScrollPosition)
  }, [checkScrollPosition])

  if (!showButton) return null

  return (
    <Button
      onClick={onScrollToBottom}
      size="icon"
      variant="secondary"
      className={cn(
        // Base positioning
        "fixed bottom-20 right-6 z-50",
        // Circular shape with shadow
        "h-12 w-12 rounded-full shadow-lg",
        // Transition animations
        "transition-all duration-300 ease-in-out",
        // Hover effects
        "hover:scale-110 hover:shadow-xl",
        // Background and border
        "bg-white/90 backdrop-blur-sm border border-gray-200",
        "hover:bg-white/95",
        // Dark mode support
        "dark:bg-gray-800/90 dark:border-gray-700",
        "dark:hover:bg-gray-800/95",
        className
      )}
      title="Scroll to bottom"
      aria-label="Scroll to bottom of chat"
    >
      <ChevronDown className="h-5 w-5" />
    </Button>
  )
}