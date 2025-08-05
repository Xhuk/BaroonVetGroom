import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 15 * 60 * 1000, // 15 minutes - much longer cache
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache much longer
    refetchOnWindowFocus: false, // Prevent refetch on focus change
    refetchOnMount: false, // Don't refetch on remount if data exists
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
