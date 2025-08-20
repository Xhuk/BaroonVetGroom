import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Preloads critical routes for instant navigation
 * Eliminates white page delays between routes
 */
export function InstantNavigation() {
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (!currentTenant?.id) return;

    // Preload critical route components
    const preloadRoutes = async () => {
      try {
        console.log('🎯 [InstantNavigation] Preloading data for tenant:', currentTenant.id);
        // Preload appointments data for instant loading
        fetch(`/api/appointments-fast/${currentTenant.id}`, {
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
  }, [currentTenant?.id]);

  return null; // This component doesn't render anything
}