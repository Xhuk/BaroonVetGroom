import { useState, useEffect } from 'react';

interface ScreenSize {
  width: number;
  height: number;
  isPhone: boolean;
  isSmallTablet: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isActualTablet: boolean;
}

function detectDeviceType(width: number, userAgent: string): {
  isPhone: boolean;
  isSmallTablet: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
  isMobile: boolean;
  isActualTablet: boolean;
} {
  const ua = userAgent.toLowerCase();
  
  // Check for actual mobile/tablet devices using Navigator API
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isActualTablet = /ipad|android(?!.*mobile)/i.test(ua) || 
    (ua.includes('android') && !/mobile/i.test(ua)) ||
    /tablet/i.test(ua);
  
  // For actual tablets (like your Xiaomi Tab 8), use device-aware breakpoints
  if (isActualTablet) {
    if (width < 900) {
      return {
        isPhone: false,
        isSmallTablet: true, // 8-10 inch tablets
        isTablet: false,
        isDesktop: false,
        deviceType: 'small-tablet',
        isMobile,
        isActualTablet
      };
    } else {
      return {
        isPhone: false,
        isSmallTablet: false,
        isTablet: true, // 10+ inch tablets
        isDesktop: false,
        deviceType: 'tablet',
        isMobile,
        isActualTablet
      };
    }
  }
  
  // For phones
  if (isMobile || width < 640) {
    return {
      isPhone: true,
      isSmallTablet: false,
      isTablet: false,
      isDesktop: false,
      deviceType: 'phone',
      isMobile,
      isActualTablet
    };
  }
  
  // For desktop/laptop screens
  return {
    isPhone: false,
    isSmallTablet: false,
    isTablet: width < 1440,
    isDesktop: width >= 1440,
    deviceType: width < 1440 ? 'tablet' : 'desktop',
    isMobile,
    isActualTablet
  };
}

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    const deviceInfo = detectDeviceType(width, userAgent);
    
    return {
      width,
      height,
      userAgent,
      platform,
      ...deviceInfo
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      
      const deviceInfo = detectDeviceType(width, userAgent);
      
      setScreenSize({
        width,
        height,
        userAgent,
        platform,
        ...deviceInfo
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}