import { useState, useEffect } from "react";
import type { User } from "@shared/schema";

/**
 * Ultra-fast authentication hook with instant loading
 * Uses multiple caching layers for maximum speed
 */
export function useFastAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        // INSTANT: Check localStorage first (0ms response)
        const cachedUser = localStorage.getItem('auth_user_cache');
        const cacheTime = localStorage.getItem('auth_cache_time');
        
        if (cachedUser && cacheTime) {
          const ageMinutes = (Date.now() - parseInt(cacheTime)) / (1000 * 60);
          if (ageMinutes < 30) { // Use 30-minute cache
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setIsAuthenticated(true);
            setIsLoading(false);
            return; // INSTANT RETURN - No network request needed
          }
        }

        // Fallback: Network request with aggressive caching
        const response = await fetch('/api/auth/user', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'max-age=1800' // 30 minutes
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          
          // Cache for next time
          localStorage.setItem('auth_user_cache', JSON.stringify(userData));
          localStorage.setItem('auth_cache_time', Date.now().toString());
        } else {
          setUser(null);
          setIsAuthenticated(false);
          // Clear invalid cache
          localStorage.removeItem('auth_user_cache');
          localStorage.removeItem('auth_cache_time');
        }
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated
  };
}