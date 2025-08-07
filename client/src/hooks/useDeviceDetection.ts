import { useState, useEffect } from 'react';

interface DeviceInfo {
  width: number;
  height: number;
  isPhone: boolean;
  isSmallTablet: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
  userAgent: string;
  deviceName: string;
  isAndroidTablet: boolean;
  isIPad: boolean;
  screenDensity: number;
}

function detectDevice(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const userAgent = navigator.userAgent;
  const ua = userAgent.toLowerCase();
  const screenDensity = window.devicePixelRatio || 1;
  
  // Advanced device detection using navigator
  const isAndroidTablet = ua.includes('android') && !ua.includes('mobile');
  const isIPad = ua.includes('ipad') || (ua.includes('macintosh') && 'ontouchend' in document);
  const isTabletUA = isAndroidTablet || isIPad || ua.includes('tablet');
  const isPhoneUA = (ua.includes('android') && ua.includes('mobile')) || 
                    ua.includes('iphone') || ua.includes('ipod') ||
                    ua.includes('blackberry') || ua.includes('windows phone');
  
  // Device name detection
  let deviceName = 'Unknown Device';
  if (ua.includes('sm-x')) {
    // Samsung Galaxy Tab series
    if (ua.includes('sm-x200') || ua.includes('sm-x205')) {
      deviceName = 'Samsung Galaxy Tab A7 Lite';
    } else if (ua.includes('sm-x700') || ua.includes('sm-x706')) {
      deviceName = 'Samsung Galaxy Tab S7';
    } else if (ua.includes('sm-x800') || ua.includes('sm-x806')) {
      deviceName = 'Samsung Galaxy Tab S8';
    } else {
      deviceName = 'Samsung Galaxy Tab';
    }
  } else if (ua.includes('xiaomi') || ua.includes('mi pad')) {
    deviceName = 'Xiaomi Tablet';
  } else if (ua.includes('ipad')) {
    if (ua.includes('ipad air')) {
      deviceName = 'iPad Air';
    } else if (ua.includes('ipad pro')) {
      deviceName = 'iPad Pro';
    } else if (ua.includes('ipad mini')) {
      deviceName = 'iPad Mini';
    } else {
      deviceName = 'iPad';
    }
  } else if (ua.includes('iphone')) {
    deviceName = 'iPhone';
  } else if (ua.includes('android')) {
    deviceName = isTabletUA ? 'Android Tablet' : 'Android Phone';
  } else if (ua.includes('macintosh')) {
    deviceName = 'Mac';
  } else if (ua.includes('windows')) {
    deviceName = 'Windows PC';
  }
  
  // Intelligent device classification combining UA and screen metrics
  let deviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
  let isPhone = false, isSmallTablet = false, isTablet = false, isDesktop = false;
  
  if (isPhoneUA || (width < 640 && !isTabletUA)) {
    deviceType = 'phone';
    isPhone = true;
  } else if (isTabletUA || (width >= 640 && width < 1024)) {
    // 8-10 inch tablets (like Xiaomi Tab 8)
    deviceType = 'small-tablet';
    isSmallTablet = true;
  } else if (width >= 1024 && width < 1440) {
    // 10-13 inch tablets
    deviceType = 'tablet';
    isTablet = true;
  } else {
    // Desktop/laptop
    deviceType = 'desktop';
    isDesktop = true;
  }
  
  console.log(`Device detected: ${deviceName} (${deviceType}) - ${width}x${height}, UA: ${ua.substring(0, 100)}...`);
  
  return {
    width,
    height,
    isPhone,
    isSmallTablet,
    isTablet,
    isDesktop,
    deviceType,
    userAgent,
    deviceName,
    isAndroidTablet,
    isIPad,
    screenDensity
  };
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(detectDevice);

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
}