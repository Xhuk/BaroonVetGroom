import { useEffect } from 'react';

/**
 * Preloads critical routes for instant navigation
 * Eliminates white page delays between routes
 */
export function InstantNavigation() {
  useEffect(() => {
    // Preload critical route components
    const preloadRoutes = async () => {
      try {
        // Preload appointments data for instant loading
        fetch('/api/appointments-fast/vetgroom1', {
          headers: { 'Cache-Control': 'max-age=300' }
        });
        
        // Prefetch other critical routes
        const routes = ['/appointments', '/dashboard'];
        routes.forEach(route => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = route;
          document.head.appendChild(link);
        });
      } catch (error) {
        console.log('Preload optimization failed:', error);
      }
    };

    preloadRoutes();
  }, []);

  return null; // This component doesn't render anything
}