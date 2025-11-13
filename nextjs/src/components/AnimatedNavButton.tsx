"use client";
import { useState, useRef, MouseEvent } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface AnimatedNavButtonProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
}

export default function AnimatedNavButton({ name, href, icon: Icon, isActive }: AnimatedNavButtonProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [showHoverRipple, setShowHoverRipple] = useState(false);
  const [hoverRipplePosition, setHoverRipplePosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!buttonRef.current) return;
    
    // Capture the position where the mouse entered
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setHoverRipplePosition({ x, y });
    setIsHovered(true);
    setShowHoverRipple(true);
    
    // Reset the hover ripple after animation completes
    setTimeout(() => {
      setShowHoverRipple(false);
    }, 800);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setClickPosition({ x, y });
    setIsClicked(true);
    
    // Reset the click animation after it completes
    setTimeout(() => {
      setIsClicked(false);
    }, 1000);
  };

  return (
    <Link
      ref={buttonRef}
      href={href}
      className={`group relative flex items-center px-2 py-2 text-sm font-medium rounded-md overflow-hidden transition-colors duration-200 ${
        isActive
          ? 'bg-primary-50 text-primary-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Hover glow effect */}
      {isHovered && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Outermost glow layer */}
          <div
            className={`w-8 h-8 rounded-full opacity-5 blur-lg ${
              isActive 
                ? 'bg-primary-400' 
                : 'bg-gray-400'
            }`}
          />
          {/* Mid glow layer */}
          <div
            className={`absolute inset-1 w-6 h-6 rounded-full opacity-8 blur-md ${
              isActive 
                ? 'bg-primary-400' 
                : 'bg-gray-400'
            }`}
          />
          {/* Inner glow layer */}
          <div
            className={`absolute inset-2 w-4 h-4 rounded-full opacity-12 blur-sm ${
              isActive 
                ? 'bg-primary-400' 
                : 'bg-gray-400'
            }`}
          />
          {/* Core glow */}
          <div
            className={`absolute inset-3 w-2 h-2 rounded-full opacity-15 blur-xs ${
              isActive 
                ? 'bg-primary-400' 
                : 'bg-gray-400'
            }`}
          />
          {/* Center point */}
          <div
            className={`absolute inset-3.5 w-1 h-1 rounded-full opacity-20 ${
              isActive 
                ? 'bg-primary-300' 
                : 'bg-gray-300'
            }`}
          />
        </div>
      )}

      {/* Hover entry ripple effect */}
      {showHoverRipple && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: hoverRipplePosition.x,
            top: hoverRipplePosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className={`w-0 h-0 rounded-full opacity-25 blur-sm animate-hover-ripple ${
              isActive 
                ? 'bg-primary-300' 
                : 'bg-gray-300'
            }`}
          />
        </div>
      )}

      {/* Click ripple effect */}
      {isClicked && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: clickPosition.x,
            top: clickPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className={`w-0 h-0 rounded-full opacity-40 blur-sm animate-ripple ${
              isActive 
                ? 'bg-primary-200' 
                : 'bg-gray-200'
            }`}
          />
        </div>
      )}

      <Icon
        className={`mr-3 h-5 w-5 relative z-10 ${
          isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
        }`}
      />
      <span className="relative z-10">{name}</span>
    </Link>
  );
}