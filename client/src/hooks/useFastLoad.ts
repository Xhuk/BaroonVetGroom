import { useState, useEffect, useCallback } from "react";

/**
 * Ultra-fast loading hook inspired by the attached files
 * Uses direct state management instead of React Query for instant UI
 */
export function useFastLoad() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'instant' | 'background' | 'complete'>('instant');
  
  // Show UI instantly, load data in background
  useEffect(() => {
    // Phase 1: Instant UI (0ms)
    setLoadingPhase('instant');
    
    // Phase 2: Background loading after UI is shown
    const timer = setTimeout(() => {
      setLoadingPhase('background');
    }, 50); // Ultra-fast transition
    
    return () => clearTimeout(timer);
  }, []);
  
  const startBackgroundLoad = useCallback(() => {
    setIsLoading(true);
    setLoadingPhase('background');
  }, []);
  
  const completeLoad = useCallback(() => {
    setIsLoading(false);
    setLoadingPhase('complete');
  }, []);
  
  return {
    isLoading,
    loadingPhase,
    isInstant: loadingPhase === 'instant',
    isBackground: loadingPhase === 'background',
    isComplete: loadingPhase === 'complete',
    startBackgroundLoad,
    completeLoad
  };
}

/**
 * Direct data fetching without React Query overhead
 */
export function useFastFetch<T>(url: string, enabled: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled]);
  
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);
  
  return { data, isLoading, error, refetch: fetchData };
}