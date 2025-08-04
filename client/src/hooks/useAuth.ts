import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Check if we're on Replit domain to decide which endpoint to use
  const isReplitDomain = window.location.hostname.includes('replit.dev');
  
  // Use preview endpoints for Replit domain, normal auth for localhost
  const authEndpoint = isReplitDomain ? "/api/preview/user" : "/api/auth/user";
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: [authEndpoint],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPreviewMode: isReplitDomain,
  };
}
