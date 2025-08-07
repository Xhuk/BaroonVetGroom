import { useState, useEffect } from 'react';
import { 
  isMobile, 
  isTablet, 
  isDesktop,
  deviceType,
  browserName,
  osName,
  mobileVendor,
  mobileModel
} from 'mobile-device-detect';

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
  browserName: string;
  osName: string;
  screenDensity: number;
}

function detectDevice(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const userAgent = navigator.userAgent;
  const screenDensity = window.devicePixelRatio || 1;
  
  // Use mobile-device-detect for reliable detection
  let detectedDeviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
  let isPhone = false, isSmallTablet = false, isTabletDevice = false, isDesktopDevice = false;
  
  if (isMobile && !isTablet) {
    // Phone
    detectedDeviceType = 'phone';
    isPhone = true;
  } else if (isTablet) {
    // Tablet - determine size based on screen width
    if (width < 1024) {
      // Small tablets (8-10 inch) like iPad Mini, Android 8" tablets
      detectedDeviceType = 'small-tablet';
      isSmallTablet = true;
    } else {
      // Large tablets (10+ inch) like iPad Pro, large Android tablets
      detectedDeviceType = 'tablet';
      isTabletDevice = true;
    }
  } else {
    // Fallback: If mobile-device-detect fails (like in development), use screen size
    if (width < 640) {
      detectedDeviceType = 'phone';
      isPhone = true;
    } else if (width >= 640 && width < 1024) {
      // For Xiaomi Tab 8 and similar - force small tablet classification
      detectedDeviceType = 'small-tablet';
      isSmallTablet = true;
    } else if (width >= 1024 && width < 1440) {
      detectedDeviceType = 'tablet';
      isTabletDevice = true;
    } else {
      detectedDeviceType = 'desktop';
      isDesktopDevice = true;
    }
  }
  
  // Generate device name
  let deviceName = 'Unknown Device';
  if (mobileVendor && mobileModel) {
    deviceName = `${mobileVendor} ${mobileModel}`;
  } else if (mobileVendor) {
    deviceName = `${mobileVendor} Device`;
  } else if (isTablet) {
    deviceName = `${osName} Tablet`;
  } else if (isMobile) {
    deviceName = `${osName} Phone`;
  } else {
    deviceName = `${osName} Computer`;
  }
  
  console.log(`Device detected by mobile-device-detect:`);
  console.log(`- Device: ${deviceName} (${detectedDeviceType})`);
  console.log(`- Screen: ${width}x${height} (${screenDensity}x density)`);
  console.log(`- Library detection: isMobile=${isMobile}, isTablet=${isTablet}, isDesktop=${isDesktop}`);
  console.log(`- Browser: ${browserName} on ${osName}`);
  console.log(`- Final classification: isSmallTablet=${isSmallTablet} (should collapse navigation)`);
  
  return {
    width,
    height,
    isPhone,
    isSmallTablet,
    isTablet: isTabletDevice,
    isDesktop: isDesktopDevice,
    deviceType: detectedDeviceType,
    userAgent,
    deviceName,
    browserName,
    osName,
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