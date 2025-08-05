import { useState, useEffect } from "react";

/**
 * Hook for instant page loading with progressive enhancement
 * Shows UI immediately, then loads data in background
 */
export function useInstantLoad() {
  const [showSkeletons, setShowSkeletons] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<'instant' | 'progressive' | 'complete'>('instant');
  
  useEffect(() => {
    // Phase 1: Show UI instantly
    const timer1 = setTimeout(() => {
      setLoadingPhase('progressive');
    }, 100);
    
    // Phase 2: Progressive data loading
    const timer2 = setTimeout(() => {
      setShowSkeletons(false);
      setLoadingPhase('complete');
    }, 1000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  
  return {
    showSkeletons,
    loadingPhase,
    isInstantPhase: loadingPhase === 'instant',
    isProgressivePhase: loadingPhase === 'progressive',
    isComplete: loadingPhase === 'complete'
  };
}

/**
 * Hook to delay API calls for progressive loading
 */
export function useDelayedQuery(delay: number = 500) {
  const [enableQuery, setEnableQuery] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setEnableQuery(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  return enableQuery;
}