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
      isPhone: width < 640, // Less than 7 inches
      isSmallTablet: width >= 640 && width < 1024, // 7-10 inches (includes 8-inch tablets)
      isTablet: width >= 1024 && width < 1440, // 10-13 inches
      isDesktop: width >= 1440, // 13+ inches and desktop
      deviceType: width < 640 ? 'phone' : width < 1024 ? 'small-tablet' : width < 1440 ? 'tablet' : 'desktop'
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isPhone: width < 640,
        isSmallTablet: width >= 640 && width < 1024,
        isTablet: width >= 1024 && width < 1440,
        isDesktop: width >= 1440,
        deviceType: width < 640 ? 'phone' : width < 1024 ? 'small-tablet' : width < 1440 ? 'tablet' : 'desktop'
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}