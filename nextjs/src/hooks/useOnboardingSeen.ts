"use client";

import { useState, useEffect } from 'react';

const ONBOARDING_SEEN_KEY = 'onboarding_seen';

export function useOnboardingSeen() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(true); // Default to true to prevent flash
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
    setHasSeenOnboarding(seen);
    setIsLoaded(true);
  }, []);

  const markOnboardingAsSeen = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    setHasSeenOnboarding(true);
  };

  return {
    hasSeenOnboarding,
    markOnboardingAsSeen,
    isLoaded, // Use this to prevent showing pulse before localStorage is checked
  };
}