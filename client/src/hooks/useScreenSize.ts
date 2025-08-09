import { useState, useEffect } from 'react';
import { isMobile, isTablet, isBrowser } from 'react-device-detect';

export interface ScreenSizeInfo {
  screenWidth: number;
  screenHeight: number;
  isSmallTablet: boolean; // 8-10 inch tablets like Xiaomi Tab 8
  isMediumTablet: boolean; // 10-12 inch tablets
  isLargeTablet: boolean; // 12+ inch tablets
  isDesktop: boolean;
  isMobilePhone: boolean;
  deviceType: 'mobile' | 'small-tablet' | 'medium-tablet' | 'large-tablet' | 'desktop';
  shouldCollapseNavigation: boolean;
  orientationLandscape: boolean;
  isTabletLandscape: boolean; // Tablet in landscape mode
  isTabletPortrait: boolean; // Tablet in portrait mode
  shouldUseRibbonNavigation: boolean; // Use ribbon instead of sidebar in landscape
  shouldHideBottomRibbon: boolean; // Hide ribbon in portrait
}

export function useScreenSize(): ScreenSizeInfo {
  const [screenInfo, setScreenInfo] = useState<ScreenSizeInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        screenWidth: 1920,
        screenHeight: 1080,
        isSmallTablet: false,
        isMediumTablet: false,
        isLargeTablet: false,
        isDesktop: true,
        isMobilePhone: false,
        deviceType: 'desktop',
        shouldCollapseNavigation: false,
        orientationLandscape: true,
        isTabletLandscape: false,
        isTabletPortrait: false,
        shouldUseRibbonNavigation: false,
        shouldHideBottomRibbon: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientationLandscape = width > height;
    
    // Enhanced tablet detection using both react-device-detect and screen size
    const userAgent = navigator.userAgent.toLowerCase();
    const isXiaomiTablet = userAgent.includes('xiaomi') && (userAgent.includes('pad') || userAgent.includes('tablet'));
    
    // Screen size breakpoints for tablets (considering both orientations)
    const screenDiagonal = Math.sqrt(width * width + height * height);
    const isSmallScreen = width >= 768 && width <= 1024; // 8-10 inch tablets
    const isMediumScreen = width > 1024 && width <= 1366; // 10-12 inch tablets
    const isLargeScreen = width > 1366; // 12+ inch tablets and desktop
    
    // Detect small tablets (8-10 inch) that should have collapsed navigation
    const isSmallTablet = (isTablet && isSmallScreen) || isXiaomiTablet || 
                         (width >= 768 && width <= 1024 && screenDiagonal < 1500);
    const isMediumTablet = isTablet && isMediumScreen && !isSmallTablet;
    const isLargeTablet = isTablet && isLargeScreen;
    const isDesktop = isBrowser && !isTablet && !isMobile && width > 1024;
    const isMobilePhone = isMobile && width < 768;
    
    // Tablet orientation logic
    const isAnyTablet = isSmallTablet || isMediumTablet || isLargeTablet;
    const isTabletLandscape = isAnyTablet && orientationLandscape;
    const isTabletPortrait = isAnyTablet && !orientationLandscape;
    
    // Navigation logic based on orientation
    const shouldUseRibbonNavigation = isTabletLandscape; // Use ribbon in landscape
    const shouldHideBottomRibbon = isTabletPortrait; // Hide ribbon in portrait
    const shouldCollapseNavigation = isTabletPortrait; // Collapse sidebar in portrait
    
    let deviceType: ScreenSizeInfo['deviceType'] = 'desktop';
    if (isMobilePhone) deviceType = 'mobile';
    else if (isSmallTablet) deviceType = 'small-tablet';
    else if (isMediumTablet) deviceType = 'medium-tablet';
    else if (isLargeTablet) deviceType = 'large-tablet';
    
    console.log(`📱 Device Detection: ${deviceType}, landscape: ${orientationLandscape}, useRibbon: ${shouldUseRibbonNavigation}, hideSidebar: ${isTabletLandscape}`);
    
    return {
      screenWidth: width,
      screenHeight: height,
      isSmallTablet,
      isMediumTablet,
      isLargeTablet,
      isDesktop,
      isMobilePhone,
      deviceType,
      shouldCollapseNavigation,
      orientationLandscape,
      isTabletLandscape,
      isTabletPortrait,
      shouldUseRibbonNavigation,
      shouldHideBottomRibbon,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientationLandscape = width > height;
      
      const userAgent = navigator.userAgent.toLowerCase();
      const isXiaomiTablet = userAgent.includes('xiaomi') && (userAgent.includes('pad') || userAgent.includes('tablet'));
      
      const screenDiagonal = Math.sqrt(width * width + height * height);
      const isSmallScreen = width >= 768 && width <= 1024;
      const isMediumScreen = width > 1024 && width <= 1366;
      const isLargeScreen = width > 1366;
      
      const isSmallTablet = (isTablet && isSmallScreen) || isXiaomiTablet || 
                           (width >= 768 && width <= 1024 && screenDiagonal < 1500);
      const isMediumTablet = isTablet && isMediumScreen && !isSmallTablet;
      const isLargeTablet = isTablet && isLargeScreen;
      const isDesktop = isBrowser && !isTablet && !isMobile && width > 1024;
      const isMobilePhone = isMobile && width < 768;
      
      // Tablet orientation logic
      const isAnyTablet = isSmallTablet || isMediumTablet || isLargeTablet;
      const isTabletLandscape = isAnyTablet && orientationLandscape;
      const isTabletPortrait = isAnyTablet && !orientationLandscape;
      
      // Navigation logic based on orientation
      const shouldUseRibbonNavigation = isTabletLandscape;
      const shouldHideBottomRibbon = isTabletPortrait;
      const shouldCollapseNavigation = isTabletPortrait;
      
      let deviceType: ScreenSizeInfo['deviceType'] = 'desktop';
      if (isMobilePhone) deviceType = 'mobile';
      else if (isSmallTablet) deviceType = 'small-tablet';
      else if (isMediumTablet) deviceType = 'medium-tablet';
      else if (isLargeTablet) deviceType = 'large-tablet';
      
      console.log(`📱 Resize Event: ${deviceType}, landscape: ${orientationLandscape}, useRibbon: ${shouldUseRibbonNavigation}`);
      
      setScreenInfo({
        screenWidth: width,
        screenHeight: height,
        isSmallTablet,
        isMediumTablet,
        isLargeTablet,
        isDesktop,
        isMobilePhone,
        deviceType,
        shouldCollapseNavigation,
        orientationLandscape,
        isTabletLandscape,
        isTabletPortrait,
        shouldUseRibbonNavigation,
        shouldHideBottomRibbon,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenInfo;
}