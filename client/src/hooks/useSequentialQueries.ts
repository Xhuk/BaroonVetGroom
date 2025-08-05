import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface SequentialQueryConfig {
  queryKey: any[];
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  priority: number; // 1 = highest priority (load first), higher numbers load later
}

/**
 * Hook for sequential loading to prevent concurrent request storms
 * Loads queries in priority order with delays between them
 */
export function useSequentialQueries(configs: SequentialQueryConfig[]) {
  const [enabledQueries, setEnabledQueries] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Sort configs by priority
  const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);
  
  // Initialize first query immediately
  useEffect(() => {
    if (sortedConfigs.length > 0) {
      const firstQuery = sortedConfigs[0];
      setEnabledQueries(new Set([JSON.stringify(firstQuery.queryKey)]));
    }
  }, []);
  
  // Create queries with conditional enabling
  const queries = sortedConfigs.map(config => {
    const keyString = JSON.stringify(config.queryKey);
    const shouldEnable = enabledQueries.has(keyString) && (config.enabled !== false);
    
    return useQuery({
      queryKey: config.queryKey,
      enabled: shouldEnable,
      staleTime: config.staleTime || 5 * 60 * 1000,
      gcTime: config.gcTime || 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    });
  });
  
  // Sequential loading logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const enableNextQuery = () => {
      const currentEnabled = Array.from(enabledQueries);
      const nextConfig = sortedConfigs.find(config => {
        const keyString = JSON.stringify(config.queryKey);
        return !enabledQueries.has(keyString) && (config.enabled !== false);
      });
      
      if (nextConfig) {
        setEnabledQueries(prev => new Set([...prev, JSON.stringify(nextConfig.queryKey)]));
        
        // Schedule next query after short delay
        timeoutId = setTimeout(enableNextQuery, 100); // 100ms between requests
      } else {
        setIsLoading(false);
      }
    };
    
    // Check if current query is completed, then enable next
    const completedQueries = queries.filter((query, index) => {
      const keyString = JSON.stringify(sortedConfigs[index].queryKey);
      return enabledQueries.has(keyString) && !query.isLoading;
    });
    
    if (completedQueries.length === enabledQueries.size && enabledQueries.size < sortedConfigs.length) {
      timeoutId = setTimeout(enableNextQuery, 50);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [queries.map(q => q.isLoading), enabledQueries.size]);
  
  return {
    queries,
    isLoading,
    isSequentialLoadingComplete: enabledQueries.size === sortedConfigs.length
  };
}