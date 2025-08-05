import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 minutes - aggressive caching
    gcTime: 120 * 60 * 1000, // 2 hours - keep in cache longer
    refetchOnWindowFocus: false, // Prevent refetch on focus change
    refetchOnMount: false, // Don't refetch on remount if data exists
    refetchOnReconnect: false, // Don't refetch on network reconnect
    networkMode: 'offlineFirst', // Use cache when possible
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
