import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetching
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
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
