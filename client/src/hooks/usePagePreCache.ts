import { useEffect, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { preCacheCommonData } from '@/lib/queryClient';

// Hook to pre-cache pages when hovering over navigation links
export function usePagePreCache() {
  const { currentTenant } = useTenant();
  const preCachedRef = useRef(false);

  useEffect(() => {
    if (currentTenant?.id && !preCachedRef.current) {
      // Pre-cache data immediately when tenant is available
      preCacheCommonData(currentTenant.id);
      preCachedRef.current = true;
    }
  }, [currentTenant?.id]);

  // Function to pre-cache specific page data
  const preCachePage = (route: string) => {
    if (!currentTenant?.id) return;

    // Add slight delay to avoid triggering on quick hovers
    setTimeout(() => {
      preCacheCommonData(currentTenant.id);
    }, 200);
  };

  return { preCachePage };
}