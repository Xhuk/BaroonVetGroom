import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

const isDevelopment = import.meta.env.DEV;

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 60 * 60 * 1000, // 1 hour - ultra aggressive caching
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache much longer
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'offlineFirst',
    // Add custom query function for ultra-fast auth
    queryFn: async () => {
      // Always clear the logout flag when checking auth (to prevent getting stuck)
      localStorage.removeItem('auth_logged_out');
      
      // Check localStorage first for instant response
      const cachedUser = localStorage.getItem('auth_user_cache');
      const cacheTime = localStorage.getItem('auth_cache_time');
      
      if (cachedUser && cacheTime) {
        const ageMinutes = (Date.now() - parseInt(cacheTime)) / (1000 * 60);
        if (ageMinutes < 30) { // Use cache if less than 30 minutes old
          return JSON.parse(cachedUser);
        }
      }
      
      // Environment-dependent auth endpoint
      const authEndpoint = isDevelopment ? '/api/user' : '/api/user';
      const response = await fetch(authEndpoint, { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        // Cache the result
        localStorage.setItem('auth_user_cache', JSON.stringify(userData));
        localStorage.setItem('auth_cache_time', Date.now().toString());
        return userData;
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    }
  });

  const logout = () => {
    // Clear cache and redirect to appropriate logout endpoint
    localStorage.removeItem('auth_user_cache');
    localStorage.removeItem('auth_cache_time');
    localStorage.setItem('auth_logged_out', 'true');
    
    // Environment-dependent logout endpoint
    const logoutEndpoint = isDevelopment ? '/api/logout' : '/api/auth/logout';
    window.location.href = logoutEndpoint;
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
    isDevelopment, // Expose environment info
  };
}
