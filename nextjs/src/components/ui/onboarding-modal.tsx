"use client";

import React, { useState, useEffect } from 'react';
import { X, Upload, MessageCircle, BookOpen } from 'lucide-react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    id: 1,
    title: "Upload Materials",
    description: "Add your study materials to get started with Itergora. Upload PDFs, documents, and notes.",
    icon: Upload,
    delay: 0
  },
  {
    id: 2,
    title: "Chat with Itergora", 
    description: "Ask questions and explore your materials with our AI-powered chat assistant.",
    icon: MessageCircle,
    delay: 500
  },
  {
    id: 3,
    title: "Review Flashcards",
    description: "Study with AI-generated flashcards tailored to your uploaded materials.",
    icon: BookOpen,
    delay: 1000
  }
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset visible steps when modal opens
      setVisibleSteps([]);
      
      // Animate steps in with staged delays
      steps.forEach((step) => {
        setTimeout(() => {
          setVisibleSteps(prev => [...prev, step.id]);
        }, step.delay);
      });
    }
  }, [isOpen]);

  const handleClose = () => {
    setVisibleSteps([]);
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="onboarding-backdrop fixed inset-0 z-50" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto border-0 bg-transparent p-4 sm:p-8 shadow-none focus:outline-none">
          {/* Main Glassmorphism Card Container */}
          <div className="onboarding-main-card rounded-2xl p-6 sm:p-8 lg:p-12 relative">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 text-white/80 hover:text-white transition-colors duration-200 bg-black/20 rounded-full p-2 backdrop-blur-sm"
              title="Close onboarding"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </button>

            {/* Welcome text */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Welcome to Itergora
              </h1>
              <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
                Transform your study materials into interactive learning experiences
              </p>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {steps.map((step) => {
                const isVisible = visibleSteps.includes(step.id);
                const IconComponent = step.icon;
                
                return (
                  <div
                    key={step.id}
                    className={`onboarding-step-card rounded-xl p-6 sm:p-8 text-center transition-all duration-600 ${
                      isVisible 
                        ? 'onboarding-card-enter opacity-100' 
                        : 'opacity-0 scale-75'
                    }`}
                    style={{
                      animationDelay: isVisible ? '0ms' : `${step.delay}ms`
                    }}
                  >
                    {/* Icon */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <IconComponent className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                      {step.title}
                    </h3>
                    <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Get Started button */}
            <div className="text-center mt-8 sm:mt-12">
              <Button 
                onClick={handleClose}
                className="bg-white text-primary-700 hover:bg-white/90 px-8 py-3 text-lg font-semibold rounded-lg transition-colors duration-200"
              >
                Get Started
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}