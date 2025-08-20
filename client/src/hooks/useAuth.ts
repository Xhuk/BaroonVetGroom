import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

const isDevelopment = import.meta.env.DEV;

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    retryOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 60 * 1000, // 10 hours  
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'online',
    enabled: !localStorage.getItem('auth_check_disabled'), // Allow disabling auth checks
    // Add custom query function with proper error handling
    queryFn: async () => {
      // Check if user was manually logged out to prevent auth loops
      const loggedOut = localStorage.getItem('auth_logged_out');
      if (loggedOut === 'true') {
        return null; // Don't make request if manually logged out
      }
      
      // Check if auth failed recently to prevent loops
      const authFailTime = localStorage.getItem('auth_fail_time');
      if (authFailTime) {
        const timeSinceFailure = Date.now() - parseInt(authFailTime);
        if (timeSinceFailure < 30000) { // 30 seconds cooldown
          return null;
        }
      }
      
      // Check localStorage first for instant response
      const cachedUser = localStorage.getItem('auth_user_cache');
      const cacheTime = localStorage.getItem('auth_cache_time');
      
      if (cachedUser && cacheTime) {
        const ageMinutes = (Date.now() - parseInt(cacheTime)) / (1000 * 60);
        if (ageMinutes < 5) { // Use cache if less than 5 minutes old
          return JSON.parse(cachedUser);
        }
      }
      
      try {
        // Environment-dependent auth endpoint
        const authEndpoint = '/api/user';
        const response = await fetch(authEndpoint, { 
          credentials: 'include',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Cache the result
          localStorage.setItem('auth_user_cache', JSON.stringify(userData));
          localStorage.setItem('auth_cache_time', Date.now().toString());
          localStorage.removeItem('auth_fail_time'); // Clear failure time
          return userData;
        }
        
        // Handle 401 gracefully - return null instead of throwing
        if (response.status === 401) {
          localStorage.removeItem('auth_user_cache');
          localStorage.removeItem('auth_cache_time');
          localStorage.setItem('auth_fail_time', Date.now().toString());
          return null;
        }
        
        // For other errors, mark failure and return null
        localStorage.setItem('auth_fail_time', Date.now().toString());
        return null;
      } catch (error) {
        // Network errors or timeouts - mark failure and return null
        localStorage.setItem('auth_fail_time', Date.now().toString());
        return null;
      }
    }
  });

  const logout = () => {
    // Clear all auth-related cache and state
    localStorage.removeItem('auth_user_cache');
    localStorage.removeItem('auth_cache_time');
    localStorage.removeItem('auth_fail_time');
    localStorage.setItem('auth_logged_out', 'true');
    localStorage.setItem('auth_check_disabled', 'true');
    
    // Environment-dependent logout endpoint
    const logoutEndpoint = isDevelopment ? '/api/logout' : '/api/auth/logout';
    window.location.href = logoutEndpoint;
  };

  const enableAuthChecking = () => {
    // Re-enable auth checking and clear logout state
    localStorage.removeItem('auth_logged_out');
    localStorage.removeItem('auth_check_disabled');
    localStorage.removeItem('auth_fail_time');
    // Refresh the page to restart auth checking
    window.location.reload();
  };

  // Add computed states for better UX
  const authDisabled = !!localStorage.getItem('auth_check_disabled');
  const hasRecentAuthFailure = (() => {
    const failTime = localStorage.getItem('auth_fail_time');
    if (!failTime) return false;
    return (Date.now() - parseInt(failTime)) < 30000; // 30 seconds
  })();

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    authDisabled,
    hasRecentAuthFailure,
    logout,
    enableAuthChecking,
    isDevelopment, // Expose environment info
  };
}
