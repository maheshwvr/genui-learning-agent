"use client";
import React, { useState, useRef, MouseEvent } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getFirstName } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { FlashcardLibrary } from '@/components/ui/flashcard-library';
import { CalendarDays, FolderOpen, BookOpen } from 'lucide-react';
import Link from 'next/link';

// Animated Link Card Component
interface AnimatedLinkCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
}

function AnimatedLinkCard({ href, icon: Icon, title, description, className = '' }: AnimatedLinkCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [showHoverRipple, setShowHoverRipple] = useState(false);
  const [hoverRipplePosition, setHoverRipplePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setHoverRipplePosition({ x, y });
    setIsHovered(true);
    setShowHoverRipple(true);
    
    setTimeout(() => {
      setShowHoverRipple(false);
    }, 800);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setClickPosition({ x, y });
    setIsClicked(true);
    
    setTimeout(() => {
      setIsClicked(false);
    }, 1000);
  };

  return (
    <Link
      ref={cardRef}
      href={href}
      className={`relative flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
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
          <div className="w-8 h-8 rounded-full opacity-5 blur-lg bg-primary-400" />
          <div className="absolute inset-1 w-6 h-6 rounded-full opacity-8 blur-md bg-primary-400" />
          <div className="absolute inset-2 w-4 h-4 rounded-full opacity-12 blur-sm bg-primary-400" />
          <div className="absolute inset-3 w-2 h-2 rounded-full opacity-15 blur-xs bg-primary-400" />
          <div className="absolute inset-3.5 w-1 h-1 rounded-full opacity-20 bg-primary-300" />
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
          <div className="w-0 h-0 rounded-full opacity-25 blur-sm animate-hover-ripple bg-primary-300" />
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
          <div className="w-0 h-0 rounded-full opacity-40 blur-sm animate-ripple bg-primary-200" />
        </div>
      )}

      {/* Content with proper z-index */}
      <div className="relative z-10 p-2 bg-primary-50 rounded-full">
        <Icon className="h-4 w-4 text-primary-600" />
      </div>
      <div className="relative z-10">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

export default function DashboardContent() {
    const { loading, user } = useGlobal();

    const getDaysSinceRegistration = () => {
        if (!user?.registered_at) return 0;
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - user.registered_at.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const daysSinceRegistration = getDaysSinceRegistration();

    return (
        <div className="h-full flex flex-col">
            <div className="flex-none p-4">
                <div className="mb-4">
                    <PageHeader
                        title={`Welcome, ${getFirstName(user)}!`}
                        description={
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                Member for {daysSinceRegistration} days
                            </div>
                        }
                    />
                </div>
            </div>
            <div className="flex-1 px-4 pb-4 space-y-6 overflow-y-auto">
                {/* Get Started Section */}
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold">Get Started</h2>
                                <p className="text-muted-foreground mb-6">So much to learn, so little time</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <AnimatedLinkCard
                                    href="/app/storage"
                                    icon={FolderOpen}
                                    title="Materials"
                                    description="Upload and manage your study materials"
                                />

                                <AnimatedLinkCard
                                    href="/app/learn"
                                    icon={BookOpen}
                                    title="Learn"
                                    description="Start interactive lessons and courses"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Flashcard Library Section */}
                <FlashcardLibrary />
            </div>
        </div>
    );
}