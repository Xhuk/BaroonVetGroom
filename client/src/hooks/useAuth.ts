import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
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
      // Check if user has been explicitly logged out
      const loggedOut = localStorage.getItem('auth_logged_out');
      if (loggedOut === 'true') {
        throw new Error('401: User logged out');
      }
      
      // Check localStorage first for instant response
      const cachedUser = localStorage.getItem('auth_user_cache');
      const cacheTime = localStorage.getItem('auth_cache_time');
      
      if (cachedUser && cacheTime) {
        const ageMinutes = (Date.now() - parseInt(cacheTime)) / (1000 * 60);
        if (ageMinutes < 30) { // Use cache if less than 30 minutes old
          return JSON.parse(cachedUser);
        }
      }
      
      // Fallback to network request
      const response = await fetch('/api/auth/user', { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        // Cache the result
        localStorage.setItem('auth_user_cache', JSON.stringify(userData));
        localStorage.setItem('auth_cache_time', Date.now().toString());
        localStorage.removeItem('auth_logged_out'); // Clear logout flag on successful auth
        return userData;
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    }
  });

  const logout = () => {
    // Mark user as explicitly logged out
    localStorage.setItem('auth_logged_out', 'true');
    // Clear all authentication cache
    localStorage.removeItem('auth_user_cache');
    localStorage.removeItem('auth_cache_time');
    // Clear tenant cache as well
    localStorage.removeItem('tenant_cache');
    localStorage.removeItem('tenant_cache_time');
    // Redirect to logout endpoint which will handle session cleanup
    window.location.href = '/api/logout';
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
  };
}
