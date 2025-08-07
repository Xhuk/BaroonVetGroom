import { useState, useEffect } from 'react';

interface ScreenSize {
  width: number;
  height: number;
  isPhone: boolean;
  isSmallTablet: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
}

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      isPhone: width < 768, // Less than 8 inches (assuming ~96 DPI)
      isSmallTablet: width >= 768 && width < 1024, // 8-10 inches
      isTablet: width >= 1024 && width < 1440, // 10-13 inches
      isDesktop: width >= 1440, // 13+ inches and desktop
      deviceType: width < 768 ? 'phone' : width < 1024 ? 'small-tablet' : width < 1440 ? 'tablet' : 'desktop'
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isPhone: width < 768,
        isSmallTablet: width >= 768 && width < 1024,
        isTablet: width >= 1024 && width < 1440,
        isDesktop: width >= 1440,
        deviceType: width < 768 ? 'phone' : width < 1024 ? 'small-tablet' : width < 1440 ? 'tablet' : 'desktop'
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}