"use client";

import React, { useState, useRef, MouseEvent, forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface AnimatedButtonProps extends ButtonProps {
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, icon: Icon, iconPosition = 'left', className, onClick, onMouseMove, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
    const [showHoverRipple, setShowHoverRipple] = useState(false);
    const [hoverRipplePosition, setHoverRipplePosition] = useState({ x: 0, y: 0 });
    const internalRef = useRef<HTMLButtonElement>(null);

    // Color detection function to determine animation colors from className
    const getAnimationColors = (className: string = '') => {
      // Primary colors
      if (className.includes('border-primary') || className.includes('bg-primary')) {
        return {
          glow: 'bg-primary-400',
          glowCenter: 'bg-primary-300',
          hoverRipple: 'bg-primary-300',
          clickRipple: 'bg-primary-200'
        };
      }
      
      // Blue colors
      if (className.includes('border-blue') || className.includes('bg-blue')) {
        return {
          glow: 'bg-blue-400',
          glowCenter: 'bg-blue-300',
          hoverRipple: 'bg-blue-300',
          clickRipple: 'bg-blue-200'
        };
      }
      
      // Green colors
      if (className.includes('border-green') || className.includes('bg-green')) {
        return {
          glow: 'bg-green-400',
          glowCenter: 'bg-green-300',
          hoverRipple: 'bg-green-300',
          clickRipple: 'bg-green-200'
        };
      }
      
      // Red colors
      if (className.includes('border-red') || className.includes('bg-red')) {
        return {
          glow: 'bg-red-400',
          glowCenter: 'bg-red-300',
          hoverRipple: 'bg-red-300',
          clickRipple: 'bg-red-200'
        };
      }
      
      // Purple colors
      if (className.includes('border-purple') || className.includes('bg-purple')) {
        return {
          glow: 'bg-purple-400',
          glowCenter: 'bg-purple-300',
          hoverRipple: 'bg-purple-300',
          clickRipple: 'bg-purple-200'
        };
      }
      
      // Default gray colors for outline and other buttons
      return {
        glow: 'bg-gray-400',
        glowCenter: 'bg-gray-300',
        hoverRipple: 'bg-gray-300',
        clickRipple: 'bg-gray-200'
      };
    };

    const colors = getAnimationColors(className);

    const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
      if (!internalRef.current) return;
      
      const rect = internalRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePosition({ x, y });
      
      // Call original onMouseMove if provided
      if (onMouseMove) {
        onMouseMove(e);
      }
    };

    const handleMouseEnter = (e: MouseEvent<HTMLButtonElement>) => {
      if (!internalRef.current) return;
      
      // Capture the position where the mouse entered
      const rect = internalRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setHoverRipplePosition({ x, y });
      setIsHovered(true);
      setShowHoverRipple(true);
      
      // Reset the hover ripple after animation completes
      setTimeout(() => {
        setShowHoverRipple(false);
      }, 800);
      
      // Call original onMouseEnter if provided
      if (onMouseEnter) {
        onMouseEnter(e);
      }
    };

    const handleMouseLeave = (e: MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      
      // Call original onMouseLeave if provided
      if (onMouseLeave) {
        onMouseLeave(e);
      }
    };

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (!internalRef.current) return;
      
      const rect = internalRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setClickPosition({ x, y });
      setIsClicked(true);
      
      // Reset the click animation after it completes
      setTimeout(() => {
        setIsClicked(false);
      }, 1000);
      
      // Call original onClick if provided
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <Button
        ref={(node) => {
          if (internalRef.current !== node) {
            (internalRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          }
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={`relative overflow-hidden ${className}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...props}
      >
        {/* Hover glow effect */}
        {isHovered && (
          <div
            className="absolute pointer-events-none z-0"
            style={{
              left: mousePosition.x,
              top: mousePosition.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outermost glow layer */}
            <div className={`w-8 h-8 rounded-full opacity-5 blur-lg ${colors.glow}`} />
            {/* Mid glow layer */}
            <div className={`absolute inset-1 w-6 h-6 rounded-full opacity-8 blur-md ${colors.glow}`} />
            {/* Inner glow layer */}
            <div className={`absolute inset-2 w-4 h-4 rounded-full opacity-12 blur-sm ${colors.glow}`} />
            {/* Core glow */}
            <div className={`absolute inset-3 w-2 h-2 rounded-full opacity-15 blur-xs ${colors.glow}`} />
            {/* Center point */}
            <div className={`absolute inset-3.5 w-1 h-1 rounded-full opacity-20 ${colors.glowCenter}`} />
          </div>
        )}

        {/* Hover entry ripple effect */}
        {showHoverRipple && (
          <div
            className="absolute pointer-events-none z-0"
            style={{
              left: hoverRipplePosition.x,
              top: hoverRipplePosition.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`w-0 h-0 rounded-full opacity-25 blur-sm animate-hover-ripple ${colors.hoverRipple}`} />
          </div>
        )}

        {/* Click ripple effect */}
        {isClicked && (
          <div
            className="absolute pointer-events-none z-0"
            style={{
              left: clickPosition.x,
              top: clickPosition.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`w-0 h-0 rounded-full opacity-40 blur-sm animate-ripple ${colors.clickRipple}`} />
          </div>
        )}

        {/* Content with proper z-index */}
        <div className="relative z-10 flex items-center justify-center gap-2">
          {Icon && iconPosition === 'left' && <Icon className="h-4 w-4" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="h-4 w-4" />}
        </div>
      </Button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };