import { useState, useEffect } from 'react';

// Simple direct detection - bypass library issues
function getScreenInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    userAgent: navigator.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height
  };
}

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
  const { width, height, userAgent, screenWidth, screenHeight } = getScreenInfo();
  const screenDensity = window.devicePixelRatio || 1;

  // Direct detection based on screen width
  let detectedDeviceType: 'phone' | 'small-tablet' | 'tablet' | 'desktop';
  let isPhone = false, isSmallTablet = false, isTabletDevice = false, isDesktopDevice = false;
  
  console.log(`🔍 DIRECT DEVICE DETECTION (bypassing library):`);
  console.log(`📐 Window size: ${width}x${height}`);
  console.log(`📐 Screen size: ${screenWidth}x${screenHeight}`);
  console.log(`📐 Device pixel ratio: ${screenDensity}x`);
  console.log(`🌐 User Agent: ${userAgent}`);
  
  // Classify based on width
  if (width < 640) {
    detectedDeviceType = 'phone';
    isPhone = true;
    console.log(`📱 PHONE detected (width < 640px)`);
  } else if (width >= 640 && width < 1024) {
    // This should catch Xiaomi Tab 8 and similar tablets
    detectedDeviceType = 'small-tablet';
    isSmallTablet = true;
    console.log(`📱 SMALL TABLET detected (640px ≤ width < 1024px) - NAVIGATION SHOULD COLLAPSE`);
  } else if (width >= 1024 && width < 1440) {
    detectedDeviceType = 'tablet';
    isTabletDevice = true;
    console.log(`📱 LARGE TABLET detected (1024px ≤ width < 1440px)`);
  } else {
    detectedDeviceType = 'desktop';
    isDesktopDevice = true;
    console.log(`💻 DESKTOP detected (width ≥ 1440px)`);
  }
  
  let deviceName = `${detectedDeviceType} (${width}x${height})`;
  
  console.log(`✅ Final classification: isSmallTablet=${isSmallTablet} (navigation should ${isSmallTablet ? 'COLLAPSE' : 'stay expanded'})`);
  console.log(`====================================`);
  
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
    browserName: 'unknown',
    osName: 'unknown',
    screenDensity
  };
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const info = detectDevice();
    // Force immediate logging on hook initialization
    console.log(`🔍 Hook initialized - Device detection complete`);
    return info;
  });

  useEffect(() => {
    // Log on first mount
    console.log(`🚀 Device detection hook mounted`);
    
    const handleResize = () => {
      console.log(`📱 Window resized, re-detecting device...`);
      setDeviceInfo(detectDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
}